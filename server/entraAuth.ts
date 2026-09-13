import crypto from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createSelfHostedLogin, selfHostedAuthEnabled } from "./selfHostedAuth";
import { upsertEntraUser } from "./db";

const ENTRA_STATE_COOKIE = "assetmaster_entra_state";
const ENTRA_NONCE_COOKIE = "assetmaster_entra_nonce";
const ENTRA_VERIFIER_COOKIE = "assetmaster_entra_verifier";
const AUTH_REQUEST_TTL_MS = 10 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const entraJwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

type EntraConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  adminRole: string;
  userRole: string;
};

function configuredRedirectUri() {
  const raw = process.env.ENTRA_REDIRECT_URI?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const localHttp =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !localHttp) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function configuredSecretReference() {
  return process.env.ENTRA_CLIENT_SECRET_FILE?.trim() || null;
}

export function entraAuthEnabled() {
  return (
    selfHostedAuthEnabled() &&
    process.env.ENTRA_AUTH_ENABLED === "true" &&
    UUID_PATTERN.test(process.env.ENTRA_TENANT_ID?.trim() || "") &&
    UUID_PATTERN.test(process.env.ENTRA_CLIENT_ID?.trim() || "") &&
    Boolean(configuredRedirectUri()) &&
    Boolean(process.env.ENTRA_CLIENT_SECRET?.trim() || configuredSecretReference())
  );
}

async function readClientSecret() {
  const direct = process.env.ENTRA_CLIENT_SECRET?.trim();
  if (direct) return direct;

  const secretPath = configuredSecretReference();
  if (
    !secretPath ||
    !/^\/(?:run\/secrets|etc\/assetmaster\/secrets)\/[A-Za-z0-9._-]{1,128}$/.test(
      secretPath
    )
  )
    throw new Error("Tham chiếu secret Entra không hợp lệ.");

  const details = await lstat(secretPath);
  if (
    !details.isFile() ||
    details.isSymbolicLink() ||
    (details.mode & 0o022) !== 0
  )
    throw new Error("Tệp secret Entra không an toàn.");

  const value = (await readFile(secretPath, "utf8")).trim();
  if (!value) throw new Error("Tệp secret Entra trống.");
  return value;
}

async function getEntraConfig(): Promise<EntraConfig> {
  if (!entraAuthEnabled()) throw new Error("Đăng nhập Entra ID chưa được cấu hình đầy đủ.");
  return {
    tenantId: process.env.ENTRA_TENANT_ID!.trim(),
    clientId: process.env.ENTRA_CLIENT_ID!.trim(),
    clientSecret: await readClientSecret(),
    redirectUri: configuredRedirectUri()!,
    adminRole: process.env.ENTRA_ADMIN_APP_ROLE?.trim() || "AssetMaster.Admin",
    userRole: process.env.ENTRA_USER_APP_ROLE?.trim() || "AssetMaster.User",
  };
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

function redirectWithError(res: Response, code: string) {
  res.redirect(302, `/?entra_error=${encodeURIComponent(code)}`);
}

export function registerEntraAuthRoutes(app: Express) {
  app.get("/api/auth/entra/start", async (req: Request, res: Response) => {
    if (!entraAuthEnabled()) return res.status(404).end();

    try {
      const config = await getEntraConfig();
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
    if (!entraAuthEnabled()) return res.status(404).end();

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
      const config = await getEntraConfig();
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
        error_description?: string;
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
      if (!safeEqual(typeof payload.nonce === "string" ? payload.nonce : undefined, expectedNonce))
        throw new Error("Entra nonce mismatch");
      if (payload.tid !== config.tenantId)
        throw new Error("Entra tenant mismatch");

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
      const assertedRole = resolveEntraRole(
        roles,
        config.adminRole,
        config.userRole
      );
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
