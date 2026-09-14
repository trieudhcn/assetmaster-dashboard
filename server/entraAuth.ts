import crypto from "node:crypto";
import { lookup } from "node:dns/promises";
import { lstat, readFile } from "node:fs/promises";
import { isIP } from "node:net";
import { connect as connectTls } from "node:tls";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createSelfHostedLogin, selfHostedAuthEnabled } from "./selfHostedAuth";
import {
  applyEntraGraphProfiles,
  getEntraSettings,
  listEntraGraphSyncTargets,
  upsertEntraUser,
} from "./db";

const ENTRA_STATE_COOKIE = "assetmaster_entra_state";
const ENTRA_NONCE_COOKIE = "assetmaster_entra_nonce";
const ENTRA_VERIFIER_COOKIE = "assetmaster_entra_verifier";
const AUTH_REQUEST_TTL_MS = 10 * 60 * 1000;
const GRAPH_REQUEST_TIMEOUT_MS = 15_000;
const PREFLIGHT_TIMEOUT_MS = 7_000;
const ENTRA_CALLBACK_PATH = "/api/auth/entra/callback";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const entraJwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export type EntraRuntimeConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  adminRole: string;
  userRole: string;
};

type EntraConfigMetadata = Omit<EntraRuntimeConfig, "clientSecret"> & {
  enabled: boolean;
  secretRef: string | null;
  secretConfigured: boolean;
  source: "database" | "environment";
};

type GraphUser = {
  id?: string;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
  department?: string | null;
  jobTitle?: string | null;
};

type GraphGroup = {
  id?: string;
  displayName?: string | null;
};

type GraphCollection<T> = {
  value?: T[];
  "@odata.nextLink"?: string;
};

export type EntraPreflightStep = {
  key: "redirect_uri" | "dns" | "tls" | "nginx";
  label: string;
  status: "success" | "failed" | "skipped";
  message: string;
};

export function validateEntraRedirectUri(raw: string | undefined | null) {
  if (!raw?.trim())
    return { ok: false as const, message: "Chưa nhập Redirect URI." };
  try {
    const url = new URL(raw.trim());
    const localHttp =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !localHttp)
      return {
        ok: false as const,
        message: "Redirect URI production phải dùng HTTPS.",
      };
    if (url.username || url.password)
      return {
        ok: false as const,
        message: "Redirect URI không được chứa thông tin đăng nhập.",
      };
    if (url.search || url.hash)
      return {
        ok: false as const,
        message: "Redirect URI không được chứa query string hoặc fragment.",
      };
    if (url.pathname !== ENTRA_CALLBACK_PATH)
      return {
        ok: false as const,
        message: `Đường dẫn callback phải là ${ENTRA_CALLBACK_PATH}.`,
      };
    return { ok: true as const, url };
  } catch {
    return { ok: false as const, message: "Redirect URI không hợp lệ." };
  }
}

function normalizeRedirectUri(raw: string | undefined | null) {
  const result = validateEntraRedirectUri(raw);
  return result.ok ? result.url.toString() : null;
}

function preflightError(error: unknown) {
  return error instanceof Error ? error.message : "Lỗi không xác định.";
}

async function withPreflightTimeout<T>(
  promise: Promise<T>,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            `${label} timeout sau ${PREFLIGHT_TIMEOUT_MS / 1000} giây.`
          )
        ),
      PREFLIGHT_TIMEOUT_MS
    );
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function probeTls(hostname: string, port: number) {
  return new Promise<string>((resolve, reject) => {
    const socket = connectTls({
      host: hostname,
      port,
      servername: isIP(hostname) ? undefined : hostname,
      rejectUnauthorized: true,
    });
    let settled = false;
    const finish = (error?: Error, message?: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(message || "TLS hợp lệ.");
    };
    socket.setTimeout(PREFLIGHT_TIMEOUT_MS, () =>
      finish(new Error(`TLS timeout sau ${PREFLIGHT_TIMEOUT_MS / 1000} giây.`))
    );
    socket.once("error", error => finish(error));
    socket.once("secureConnect", () => {
      if (!socket.authorized) {
        const reason = socket.authorizationError;
        return finish(
          new Error(
            reason instanceof Error
              ? reason.message
              : reason || "Chứng chỉ TLS không được tin cậy."
          )
        );
      }
      const certificate = socket.getPeerCertificate();
      const validTo = certificate.valid_to ? Date.parse(certificate.valid_to) : NaN;
      if (Number.isFinite(validTo) && validTo <= Date.now())
        return finish(new Error("Chứng chỉ TLS đã hết hạn."));
      const expiry = Number.isFinite(validTo)
        ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(validTo)
        : "không xác định";
      finish(
        undefined,
        `${socket.getProtocol() || "TLS"}; chứng chỉ hợp lệ đến ${expiry}.`
      );
    });
  });
}

export async function preflightEntraEndpoint(rawRedirectUri: string) {
  const steps: EntraPreflightStep[] = [];
  const validation = validateEntraRedirectUri(rawRedirectUri);
  if (!validation.ok) {
    steps.push({
      key: "redirect_uri",
      label: "Entra Redirect URI",
      status: "failed",
      message: validation.message,
    });
    for (const [key, label] of [
      ["dns", "DNS"],
      ["tls", "TLS certificate"],
      ["nginx", "Nginx /readyz"],
    ] as const)
      steps.push({
        key,
        label,
        status: "skipped",
        message: "Bỏ qua vì Redirect URI chưa hợp lệ.",
      });
    return { success: false, origin: null, redirectUri: null, steps };
  }

  const url = validation.url;
  const normalizedRedirectUri = url.toString();
  steps.push({
    key: "redirect_uri",
    label: "Entra Redirect URI",
    status: "success",
    message:
      "Đúng HTTPS/localhost và đúng đường dẫn callback AssetMaster; vẫn cần khai báo URI này giống hệt trong Entra Portal.",
  });

  try {
    const addresses = await withPreflightTimeout(
      lookup(url.hostname, { all: true, verbatim: true }),
      "DNS"
    );
    const unique = [...new Set(addresses.map(item => item.address))];
    if (!unique.length) throw new Error("DNS không trả về địa chỉ IP.");
    steps.push({
      key: "dns",
      label: "DNS",
      status: "success",
      message: `Phân giải ${url.hostname} thành ${unique.join(", ")}.`,
    });
  } catch (error) {
    steps.push({
      key: "dns",
      label: "DNS",
      status: "failed",
      message: preflightError(error),
    });
    steps.push({
      key: "tls",
      label: "TLS certificate",
      status: "skipped",
      message: "Bỏ qua vì DNS chưa sẵn sàng.",
    });
    steps.push({
      key: "nginx",
      label: "Nginx /readyz",
      status: "skipped",
      message: "Bỏ qua vì DNS chưa sẵn sàng.",
    });
    return {
      success: false,
      origin: url.origin,
      redirectUri: normalizedRedirectUri,
      steps,
    };
  }

  if (url.protocol === "https:") {
    try {
      const message = await probeTls(url.hostname, Number(url.port || 443));
      steps.push({
        key: "tls",
        label: "TLS certificate",
        status: "success",
        message,
      });
    } catch (error) {
      steps.push({
        key: "tls",
        label: "TLS certificate",
        status: "failed",
        message: preflightError(error),
      });
      steps.push({
        key: "nginx",
        label: "Nginx /readyz",
        status: "skipped",
        message: "Bỏ qua vì TLS chưa sẵn sàng.",
      });
      return {
        success: false,
        origin: url.origin,
        redirectUri: normalizedRedirectUri,
        steps,
      };
    }
  } else {
    steps.push({
      key: "tls",
      label: "TLS certificate",
      status: "skipped",
      message: "Localhost HTTP chỉ dành cho UAT; production phải dùng HTTPS.",
    });
  }

  try {
    const response = await fetch(new URL("/readyz", url.origin), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
      headers: { "User-Agent": "AssetMaster-Entra-Preflight/1.0" },
    });
    const status = response.status;
    await response.body?.cancel();
    if (status !== 200)
      throw new Error(`Reverse proxy trả HTTP ${status}, cần HTTP 200.`);
    steps.push({
      key: "nginx",
      label: "Nginx /readyz",
      status: "success",
      message: `${url.origin}/readyz trả HTTP 200.`,
    });
  } catch (error) {
    steps.push({
      key: "nginx",
      label: "Nginx /readyz",
      status: "failed",
      message: preflightError(error),
    });
  }

  return {
    success: steps.every(step => step.status !== "failed"),
    origin: url.origin,
    redirectUri: normalizedRedirectUri,
    steps,
  };
}

async function getEntraConfigMetadata(): Promise<EntraConfigMetadata> {
  const settings = await getEntraSettings();
  const source = settings ? "database" : "environment";
  const tenantId = settings?.tenantId || process.env.ENTRA_TENANT_ID?.trim() || "";
  const clientId = settings?.clientId || process.env.ENTRA_CLIENT_ID?.trim() || "";
  const redirectUri = normalizeRedirectUri(
    settings?.redirectUri || process.env.ENTRA_REDIRECT_URI
  );
  const secretRef =
    settings?.clientSecretRef || process.env.ENTRA_CLIENT_SECRET_FILE?.trim() || null;
  const secretConfigured = Boolean(
    process.env.ENTRA_CLIENT_SECRET?.trim() || secretRef
  );
  const enabled = settings
    ? settings.status === "active" && settings.lastTestStatus === "success"
    : process.env.ENTRA_AUTH_ENABLED === "true";

  if (!UUID_PATTERN.test(tenantId))
    throw new Error("Tenant ID Microsoft Entra không hợp lệ.");
  if (!UUID_PATTERN.test(clientId))
    throw new Error("Client ID Microsoft Entra không hợp lệ.");
  if (!redirectUri)
    throw new Error("Redirect URI phải dùng HTTPS hoặc localhost.");
  if (!secretConfigured)
    throw new Error("Chưa cấu hình Client Secret Microsoft Entra.");

  return {
    tenantId,
    clientId,
    redirectUri,
    secretRef,
    secretConfigured,
    enabled,
    source,
    adminRole:
      settings?.adminAppRole ||
      process.env.ENTRA_ADMIN_APP_ROLE?.trim() ||
      "AssetMaster.Admin",
    userRole:
      settings?.userAppRole ||
      process.env.ENTRA_USER_APP_ROLE?.trim() ||
      "AssetMaster.User",
  };
}

async function readClientSecret(secretRef: string | null) {
  const direct = process.env.ENTRA_CLIENT_SECRET?.trim();
  if (direct) return direct;

  if (
    !secretRef ||
    !/^\/(?:run\/secrets|etc\/assetmaster\/secrets)\/[A-Za-z0-9._-]{1,128}$/.test(
      secretRef
    )
  )
    throw new Error("Tham chiếu secret Entra không hợp lệ.");

  const details = await lstat(secretRef);
  if (!details.isFile() || details.isSymbolicLink() || (details.mode & 0o022) !== 0)
    throw new Error("Tệp secret Entra không an toàn.");

  const value = (await readFile(secretRef, "utf8")).trim();
  if (!value) throw new Error("Tệp secret Entra trống.");
  return value;
}

export async function getEntraRuntimeConfig(
  options: { requireActive?: boolean } = {}
): Promise<EntraRuntimeConfig> {
  if (!selfHostedAuthEnabled())
    throw new Error("Entra ID chỉ khả dụng khi xác thực self-hosted được bật.");
  const metadata = await getEntraConfigMetadata();
  if (options.requireActive !== false && !metadata.enabled)
    throw new Error("Đăng nhập Entra ID chưa được kích hoạt.");
  return {
    tenantId: metadata.tenantId,
    clientId: metadata.clientId,
    clientSecret: await readClientSecret(metadata.secretRef),
    redirectUri: metadata.redirectUri,
    adminRole: metadata.adminRole,
    userRole: metadata.userRole,
  };
}

export async function entraAuthEnabled() {
  if (!selfHostedAuthEnabled()) return false;
  try {
    const metadata = await getEntraConfigMetadata();
    return metadata.enabled;
  } catch {
    return false;
  }
}

export async function getEntraConfigurationStatus() {
  const settings = await getEntraSettings();
  try {
    const metadata = await getEntraConfigMetadata();
    return {
      selfHosted: selfHostedAuthEnabled(),
      configured: true,
      enabled: selfHostedAuthEnabled() && metadata.enabled,
      source: metadata.source,
      secretConfigured: metadata.secretConfigured,
      settings,
      error: null,
    } as const;
  } catch (error) {
    return {
      selfHosted: selfHostedAuthEnabled(),
      configured: Boolean(settings),
      enabled: false,
      source: settings ? ("database" as const) : ("environment" as const),
      secretConfigured: Boolean(
        process.env.ENTRA_CLIENT_SECRET?.trim() ||
          settings?.clientSecretRef ||
          process.env.ENTRA_CLIENT_SECRET_FILE?.trim()
      ),
      settings,
      error:
        error instanceof Error ? error.message : "Cấu hình Entra ID chưa hợp lệ.",
    } as const;
  }
}

function transientCookieOptions(req: Request) {
  const secure =
    req.protocol === "https" ||
    String(req.headers["x-forwarded-proto"] || "")
      .split(",")
      .some(value => value.trim().toLowerCase() === "https");
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: AUTH_REQUEST_TTL_MS,
  };
}

function clearTransientCookies(req: Request, res: Response) {
  const { maxAge: _maxAge, ...options } = transientCookieOptions(req);
  res.clearCookie(ENTRA_STATE_COOKIE, options);
  res.clearCookie(ENTRA_NONCE_COOKIE, options);
  res.clearCookie(ENTRA_VERIFIER_COOKIE, options);
}

function safeEqual(left: string | undefined, right: string | undefined) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function base64UrlSha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

export function resolveEntraRole(
  roles: string[],
  adminRole: string,
  userRole: string
): "admin" | "user" | null {
  if (roles.includes(adminRole)) return "admin";
  if (roles.includes(userRole)) return "user";
  return null;
}

function entraEndpoint(tenantId: string, endpoint: "authorize" | "token" | "keys") {
  const base = `https://login.microsoftonline.com/${tenantId}`;
  if (endpoint === "keys") return `${base}/discovery/v2.0/keys`;
  return `${base}/oauth2/v2.0/${endpoint}`;
}

async function requestGraphAccessToken(config: EntraRuntimeConfig) {
  const response = await fetch(entraEndpoint(config.tenantId, "token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    signal: AbortSignal.timeout(GRAPH_REQUEST_TIMEOUT_MS),
  });
  const payload = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.access_token)
    throw new Error(
      payload.error_description || payload.error || "Không lấy được Graph access token."
    );
  return payload.access_token;
}

function normalizeGraphUrl(value: string) {
  const url = new URL(value, "https://graph.microsoft.com");
  if (url.protocol !== "https:" || url.hostname !== "graph.microsoft.com")
    throw new Error("Microsoft Graph trả về URL phân trang không hợp lệ.");
  return url;
}

async function graphGet<T>(url: string, accessToken: string): Promise<T> {
  const target = normalizeGraphUrl(url);
  const response = await fetch(target, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(GRAPH_REQUEST_TIMEOUT_MS),
  });
  const payload = (await response.json()) as T & {
    error?: { code?: string; message?: string };
  };
  if (!response.ok)
    throw new Error(
      payload.error?.message ||
        payload.error?.code ||
        `Microsoft Graph trả về HTTP ${response.status}.`
    );
  return payload;
}

async function graphCollection<T>(
  initialUrl: string,
  accessToken: string,
  limit: number
) {
  const output: T[] = [];
  let nextUrl: string | undefined = initialUrl;
  while (nextUrl && output.length < limit) {
    const page: GraphCollection<T> = await graphGet(nextUrl, accessToken);
    output.push(...(Array.isArray(page.value) ? page.value : []));
    nextUrl = page["@odata.nextLink"];
  }
  return output.slice(0, limit);
}

export async function testEntraConnection() {
  const config = await getEntraRuntimeConfig({ requireActive: false });
  const preflight = await preflightEntraEndpoint(config.redirectUri);
  if (!preflight.success) {
    const failed = preflight.steps.find(step => step.status === "failed");
    throw new Error(
      `Preflight Nginx/TLS/DNS chưa đạt: ${failed?.message || "Lỗi không xác định."}`
    );
  }
  const accessToken = await requestGraphAccessToken(config);
  await graphGet<GraphCollection<{ id?: string }>>(
    "https://graph.microsoft.com/v1.0/users?$select=id&$top=1",
    accessToken
  );
  await graphGet<GraphCollection<{ id?: string }>>(
    "https://graph.microsoft.com/v1.0/groups?$select=id&$top=1",
    accessToken
  );
  return "Kết nối Microsoft Entra ID và Microsoft Graph thành công.";
}

async function getGraphGroupNames(objectId: string, accessToken: string) {
  const groups = await graphCollection<GraphGroup>(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(objectId)}/transitiveMemberOf/microsoft.graph.group?$select=id,displayName&$top=100`,
    accessToken,
    500
  );
  return [...new Set(groups.map(group => group.displayName?.trim()).filter((name): name is string => Boolean(name)))].sort((left, right) =>
    left.localeCompare(right, "vi")
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await mapper(items[index]);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

export async function syncEntraGraphUsers(limit = 500) {
  const config = await getEntraRuntimeConfig();
  const accessToken = await requestGraphAccessToken(config);
  const targets = await listEntraGraphSyncTargets(limit);
  const targetObjectIds = new Set(
    targets.map(target => target.entraObjectId).filter((id): id is string => Boolean(id))
  );
  const targetEmails = new Set(
    targets
      .map(target => target.email?.trim().toLocaleLowerCase("en-US"))
      .filter((email): email is string => Boolean(email))
  );
  const graphUsers = await graphCollection<GraphUser>(
    "https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,department,jobTitle&$top=100",
    accessToken,
    limit
  );
  const matched = graphUsers.filter(user => {
    const email = (user.mail || user.userPrincipalName || "")
      .trim()
      .toLocaleLowerCase("en-US");
    return Boolean(
      user.id &&
        email &&
        (targetObjectIds.has(user.id) || targetEmails.has(email))
    );
  });
  const profiles = await mapWithConcurrency(matched, 5, async user => {
    const objectId = user.id!;
    const email = (user.mail || user.userPrincipalName || "")
      .trim()
      .toLocaleLowerCase("en-US");
    return {
      objectId,
      email,
      name: user.displayName?.trim() || null,
      department: user.department?.trim() || null,
      jobTitle: user.jobTitle?.trim() || null,
      groupNames: await getGraphGroupNames(objectId, accessToken),
    };
  });
  const results = await applyEntraGraphProfiles(profiles);
  const synced = results.filter(result => result.status === "synced").length;
  const skipped = results.length - synced;
  return {
    scanned: graphUsers.length,
    matched: matched.length,
    synced,
    skipped,
    reachedLimit: graphUsers.length >= limit,
    users: results,
  };
}

function redirectWithError(res: Response, code: string) {
  res.redirect(302, `/?entra_error=${encodeURIComponent(code)}`);
}

export function registerEntraAuthRoutes(app: Express) {
  app.get("/api/auth/entra/start", async (req: Request, res: Response) => {
    if (!(await entraAuthEnabled())) return res.status(404).end();

    try {
      const config = await getEntraRuntimeConfig();
      const state = crypto.randomBytes(32).toString("base64url");
      const nonce = crypto.randomBytes(32).toString("base64url");
      const verifier = crypto.randomBytes(48).toString("base64url");
      const options = transientCookieOptions(req);
      res.cookie(ENTRA_STATE_COOKIE, state, options);
      res.cookie(ENTRA_NONCE_COOKIE, nonce, options);
      res.cookie(ENTRA_VERIFIER_COOKIE, verifier, options);

      const authorizationUrl = new URL(entraEndpoint(config.tenantId, "authorize"));
      authorizationUrl.searchParams.set("client_id", config.clientId);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
      authorizationUrl.searchParams.set("response_mode", "query");
      authorizationUrl.searchParams.set("scope", "openid profile email");
      authorizationUrl.searchParams.set("state", state);
      authorizationUrl.searchParams.set("nonce", nonce);
      authorizationUrl.searchParams.set("code_challenge", base64UrlSha256(verifier));
      authorizationUrl.searchParams.set("code_challenge_method", "S256");
      res.redirect(302, authorizationUrl.toString());
    } catch (error) {
      console.error("[AssetMaster][Entra] start failed", {
        message: error instanceof Error ? error.message : "Unknown Entra error",
      });
      redirectWithError(res, "configuration");
    }
  });

  app.get("/api/auth/entra/callback", async (req: Request, res: Response) => {
    if (!(await entraAuthEnabled())) return res.status(404).end();

    const cookies = parseCookieHeader(req.headers.cookie || "");
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const providerError =
      typeof req.query.error === "string" ? req.query.error : undefined;
    const expectedState = cookies[ENTRA_STATE_COOKIE];
    const expectedNonce = cookies[ENTRA_NONCE_COOKIE];
    const verifier = cookies[ENTRA_VERIFIER_COOKIE];
    clearTransientCookies(req, res);

    if (providerError) return redirectWithError(res, "cancelled");
    if (!code || !safeEqual(state, expectedState) || !expectedNonce || !verifier)
      return redirectWithError(res, "invalid_response");

    try {
      const config = await getEntraRuntimeConfig();
      const tokenResponse = await fetch(entraEndpoint(config.tenantId, "token"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: config.redirectUri,
          code_verifier: verifier,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const tokenPayload = (await tokenResponse.json()) as {
        id_token?: string;
        error?: string;
      };
      if (!tokenResponse.ok || !tokenPayload.id_token)
        throw new Error(tokenPayload.error || "Entra token exchange failed");

      let jwks = entraJwks.get(config.tenantId);
      if (!jwks) {
        jwks = createRemoteJWKSet(new URL(entraEndpoint(config.tenantId, "keys")));
        entraJwks.set(config.tenantId, jwks);
      }
      const issuer = `https://login.microsoftonline.com/${config.tenantId}/v2.0`;
      const { payload } = await jwtVerify(tokenPayload.id_token, jwks, {
        issuer,
        audience: config.clientId,
        algorithms: ["RS256"],
      });
      if (
        !safeEqual(
          typeof payload.nonce === "string" ? payload.nonce : undefined,
          expectedNonce
        )
      )
        throw new Error("Entra nonce mismatch");
      if (payload.tid !== config.tenantId) throw new Error("Entra tenant mismatch");

      const objectId = typeof payload.oid === "string" ? payload.oid : "";
      const emailClaim =
        typeof payload.email === "string"
          ? payload.email
          : typeof payload.preferred_username === "string"
            ? payload.preferred_username
            : "";
      const email = emailClaim.trim().toLocaleLowerCase("en-US");
      if (!UUID_PATTERN.test(objectId) || !email.includes("@"))
        throw new Error("Entra identity claims are incomplete");

      const roles = Array.isArray(payload.roles)
        ? payload.roles.filter((role): role is string => typeof role === "string")
        : [];
      const assertedRole = resolveEntraRole(roles, config.adminRole, config.userRole);
      const user = await upsertEntraUser({
        tenantId: config.tenantId,
        objectId,
        email,
        name: typeof payload.name === "string" ? payload.name : null,
        assertedRole,
      });
      await createSelfHostedLogin(user.id, req, res);
      res.redirect(302, "/");
    } catch (error) {
      console.error("[AssetMaster][Entra] callback failed", {
        message: error instanceof Error ? error.message : "Unknown Entra error",
      });
      redirectWithError(res, "failed");
    }
  });
}
