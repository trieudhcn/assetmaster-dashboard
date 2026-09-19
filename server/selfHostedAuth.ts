import crypto from "node:crypto";
import { lookup } from "node:dns/promises";
import { lstat, readFile } from "node:fs/promises";
import net from "node:net";
import type { Request, Response } from "express";
import argon2 from "argon2";
import { Client, escapeFilter } from "ldapts";
import {
  createSelfHostedSession,
  deleteSelfHostedSession,
  getBootstrapUserByEmail,
  getDirectorySettings,
  getUserByDirectorySessionTokenHash,
  upsertDirectoryUser,
} from "./db";

export const SELF_HOSTED_SESSION_COOKIE = "assetmaster_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DOCKER_DIRECTORY_SECRET_PATH = /^\/run\/secrets\/[A-Za-z0-9._-]{1,128}$/;
const LOCAL_DIRECTORY_SECRET_PATH =
  /^\/etc\/assetmaster\/secrets\/[A-Za-z0-9._-]{1,128}$/;
const ATTRIBUTE_NAME = /^[A-Za-z][A-Za-z0-9-]{0,63}$/;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

type DirectorySettings = NonNullable<
  Awaited<ReturnType<typeof getDirectorySettings>>
>;
type DirectoryConnectionInput = Pick<
  DirectorySettings,
  | "ldapUrl"
  | "usersDn"
  | "groupsDn"
  | "bindDn"
  | "bindSecretRef"
  | "loginAttribute"
  | "emailAttribute"
  | "displayNameAttribute"
  | "directoryIdAttribute"
  | "departmentAttribute"
  | "jobTitleAttribute"
  | "adminGroupDn"
  | "userGroupDn"
  | "allowNestedGroups"
  | "caCertificatePem"
>;

function isDirectorySecretPath(value: string) {
  return (
    DOCKER_DIRECTORY_SECRET_PATH.test(value) ||
    LOCAL_DIRECTORY_SECRET_PATH.test(value)
  );
}

export function selfHostedAuthEnabled() {
  return process.env.SELF_HOSTED_AUTH_ENABLED === "true";
}

export function normalizeLoginEmail(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

export function validateDirectorySettings(
  settings: Pick<
    DirectorySettings,
    | "ldapUrl"
    | "usersDn"
    | "loginAttribute"
    | "emailAttribute"
    | "displayNameAttribute"
    | "directoryIdAttribute"
    | "departmentAttribute"
    | "jobTitleAttribute"
    | "bindDn"
    | "bindSecretRef"
  >
) {
  let url: URL;
  try {
    url = new URL(settings.ldapUrl);
  } catch {
    return "Địa chỉ LDAP không hợp lệ.";
  }
  if (
    url.protocol !== "ldaps:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    !["", "/"].includes(url.pathname) ||
    (url.port && url.port !== "636")
  )
    return "Chỉ chấp nhận URL LDAPS dạng ldaps://host:636.";
  if (!settings.usersDn.trim()) return "Cần khai báo DN tìm kiếm người dùng.";
  const attributes = [
    settings.loginAttribute,
    settings.emailAttribute,
    settings.displayNameAttribute,
    settings.directoryIdAttribute,
    settings.departmentAttribute,
    settings.jobTitleAttribute,
  ];
  if (attributes.some(attribute => !ATTRIBUTE_NAME.test(attribute)))
    return "Tên thuộc tính LDAP chỉ được chứa chữ cái, số hoặc dấu gạch ngang.";
  if (settings.bindDn && !settings.bindSecretRef)
    return "Tài khoản bind cần tham chiếu tệp secret an toàn.";
  if (settings.bindSecretRef && !isDirectorySecretPath(settings.bindSecretRef))
    return "Tham chiếu secret chỉ được phép ở /run/secrets/ hoặc /etc/assetmaster/secrets/.";
  return null;
}

function parseCookie(request: Request, name: string) {
  const source = request.headers.cookie || "";
  const part = source
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(`${name}=`));
  if (!part) return null;
  try {
    return decodeURIComponent(part.slice(name.length + 1));
  } catch {
    return null;
  }
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sessionCookieOptions(request: Request) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      request.protocol === "https" ||
      request.headers["x-forwarded-proto"] === "https",
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

function retryKey(email: string) {
  return `login:${email}`;
}

function assertNotRateLimited(email: string) {
  const value = failedAttempts.get(retryKey(email));
  if (!value || value.resetAt <= Date.now()) {
    failedAttempts.delete(retryKey(email));
    return;
  }
  if (value.count >= 5)
    throw new Error(
      "Đăng nhập tạm thời bị giới hạn. Vui lòng thử lại sau 15 phút."
    );
}

function markFailedAttempt(email: string) {
  const key = retryKey(email);
  const current = failedAttempts.get(key);
  const resetAt = Date.now() + 15 * 60 * 1000;
  failedAttempts.set(key, {
    count:
      (current?.resetAt && current.resetAt > Date.now() ? current.count : 0) +
      1,
    resetAt,
  });
}

function clearFailedAttempts(email: string) {
  failedAttempts.delete(retryKey(email));
}

export async function createSelfHostedLogin(
  userId: number,
  request: Request,
  response: Response
) {
  const token = crypto.randomBytes(32).toString("base64url");
  await createSelfHostedSession({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  response.cookie(
    SELF_HOSTED_SESSION_COOKIE,
    token,
    sessionCookieOptions(request)
  );
}

export async function getSelfHostedUser(request: Request) {
  const token = parseCookie(request, SELF_HOSTED_SESSION_COOKIE);
  if (!token || token.length < 32) return null;
  return (await getUserByDirectorySessionTokenHash(hashToken(token))) ?? null;
}

export async function clearSelfHostedLogin(
  request: Request,
  response: Response
) {
  const token = parseCookie(request, SELF_HOSTED_SESSION_COOKIE);
  if (token) await deleteSelfHostedSession(hashToken(token));
  const { maxAge: _maxAge, ...clearOptions } = sessionCookieOptions(request);
  response.clearCookie(SELF_HOSTED_SESSION_COOKIE, clearOptions);
}

export type DirectorySecretInspection = {
  mounted: boolean;
  readable: boolean;
  label: "Đã mount" | "Chưa mount";
  status: "success" | "error";
  message: string;
};

function filesystemErrorCode(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : null;
}

export async function inspectDirectoryBindSecret(
  settings: Pick<DirectorySettings, "bindDn" | "bindSecretRef">
): Promise<DirectorySecretInspection> {
  if (!settings.bindDn || !settings.bindSecretRef)
    return {
      mounted: false,
      readable: false,
      label: "Chưa mount",
      status: "error",
      message:
        "Chưa cấu hình Bind DN hoặc đường dẫn tệp secret LDAP trong AssetMaster.",
    };
  if (!isDirectorySecretPath(settings.bindSecretRef))
    return {
      mounted: false,
      readable: false,
      label: "Chưa mount",
      status: "error",
      message:
        "Đường dẫn secret chỉ được phép ở /run/secrets/ hoặc /etc/assetmaster/secrets/.",
    };

  let details;
  try {
    details = await lstat(settings.bindSecretRef);
  } catch (error) {
    const code = filesystemErrorCode(error);
    return {
      mounted: code !== "ENOENT",
      readable: false,
      label: code === "ENOENT" ? "Chưa mount" : "Đã mount",
      status: "error",
      message:
        code === "ENOENT"
          ? "Không tìm thấy tệp secret trong container. Hãy kiểm tra tên Docker secret và cấu hình mount."
          : code === "EACCES" || code === "EPERM"
            ? "Container nhìn thấy đường dẫn nhưng không có quyền kiểm tra tệp secret."
            : "Không thể kiểm tra tệp secret LDAP trong container.",
    };
  }

  if (
    !details.isFile() ||
    details.isSymbolicLink() ||
    (details.mode & 0o022) !== 0
  )
    return {
      mounted: true,
      readable: false,
      label: "Đã mount",
      status: "error",
      message:
        "Tệp đã mount nhưng phải là tệp thường, không là symlink và không được cho phép ghi bởi group/other.",
    };

  try {
    const secret = (await readFile(settings.bindSecretRef, "utf8")).trim();
    if (!secret)
      return {
        mounted: true,
        readable: false,
        label: "Đã mount",
        status: "error",
        message: "Tệp secret đã mount nhưng đang trống.",
      };
  } catch (error) {
    const code = filesystemErrorCode(error);
    return {
      mounted: true,
      readable: false,
      label: "Đã mount",
      status: "error",
      message:
        code === "EACCES" || code === "EPERM"
          ? "Tệp secret đã mount nhưng container không có quyền đọc."
          : "Tệp secret đã mount nhưng không thể đọc.",
    };
  }

  return {
    mounted: true,
    readable: true,
    label: "Đã mount",
    status: "success",
    message:
      "Tệp secret tồn tại, là tệp thường và container có quyền đọc. Nội dung không được hiển thị hoặc ghi log.",
  };
}

async function readBindSecret(
  settings: Pick<DirectorySettings, "bindDn" | "bindSecretRef">
) {
  if (!settings.bindDn || !settings.bindSecretRef) return null;
  const inspection = await inspectDirectoryBindSecret(settings);
  if (!inspection.readable) throw new Error(inspection.message);
  return (await readFile(settings.bindSecretRef, "utf8")).trim();
}

function entryValue(entry: Record<string, unknown>, attribute: string) {
  const value = entry[attribute];
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized instanceof Uint8Array)
    return Buffer.from(normalized).toString("hex");
  if (Array.isArray(value)) return value.length ? String(value[0]) : null;
  return value === undefined || value === null ? null : String(value);
}

function entryValues(entry: Record<string, unknown>, attribute: string) {
  const value = entry[attribute];
  return (
    Array.isArray(value)
      ? value
      : value === undefined || value === null
        ? []
        : [value]
  ).map(String);
}

const DIRECTORY_EMAIL_FALLBACK_ATTRIBUTE = "userPrincipalName";

export function resolveDirectoryEmail(
  entry: Record<string, unknown>,
  settings: Pick<DirectorySettings, "emailAttribute" | "loginAttribute">
) {
  const configuredEmail = entryValue(entry, settings.emailAttribute);
  if (configuredEmail) return configuredEmail;

  const userPrincipalName = entryValue(
    entry,
    DIRECTORY_EMAIL_FALLBACK_ATTRIBUTE
  );
  if (userPrincipalName) return userPrincipalName;

  const loginValue = entryValue(entry, settings.loginAttribute);
  return loginValue?.includes("@") ? loginValue : null;
}

function groupMatches(groups: string[], groupDn: string | null) {
  return Boolean(
    groupDn &&
      groups.some(
        group =>
          group.localeCompare(groupDn, undefined, { sensitivity: "accent" }) ===
          0
      )
  );
}

async function resolveDirectoryRole(
  client: Client,
  settings: Pick<
    DirectorySettings,
    "adminGroupDn" | "userGroupDn" | "allowNestedGroups" | "groupsDn"
  >,
  entryDn: string,
  groups: string[]
) {
  if (groupMatches(groups, settings.adminGroupDn)) return "admin" as const;
  if (groupMatches(groups, settings.userGroupDn)) return "user" as const;
  if (!settings.allowNestedGroups || !settings.groupsDn) return null;
  const hasNestedMembership = async (groupDn: string | null) => {
    if (!groupDn) return false;
    const result = await client.search(settings.groupsDn!, {
      scope: "sub",
      filter: escapeFilter`(&(distinguishedName=${groupDn})(member:1.2.840.113556.1.4.1941:=${entryDn}))`,
      attributes: ["distinguishedName"],
      sizeLimit: 1,
      timeLimit: 5,
    });
    return result.searchEntries.length === 1;
  };
  if (await hasNestedMembership(settings.adminGroupDn)) return "admin" as const;
  if (await hasNestedMembership(settings.userGroupDn)) return "user" as const;
  return null;
}

export function safeDirectoryMessage(
  error: unknown,
  stage: "bind" | "search" | "user" | "directory" = "directory"
) {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  const code =
    typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "number"
      ? error.code
      : undefined;
  if (/certificate|self.?signed|unable to verify|hostname/i.test(message))
    return "Không xác thực được chứng chỉ TLS của máy chủ LDAPS.";
  if (/timeout|connect|socket|ECONN/i.test(message))
    return "Không thể kết nối máy chủ LDAPS.";
  if (code === 49 || /invalid credentials|data 52e|ldap.*49/i.test(message))
    return stage === "bind"
      ? "Tài khoản bind hoặc mật khẩu bind không đúng (LDAP 49)."
      : stage === "user"
        ? "Email hoặc mật khẩu Active Directory không đúng (LDAP 49)."
        : "Active Directory từ chối thông tin xác thực (LDAP 49).";
  if (code === 32 || /no such object/i.test(message))
    return stage === "search"
      ? "Không tìm thấy Users Base DN hoặc tài khoản bind không có quyền truy cập DN này (LDAP 32)."
      : "Không tìm thấy đối tượng trong Active Directory (LDAP 32).";
  if (code === 50 || /insufficient access/i.test(message))
    return "Tài khoản bind không đủ quyền đọc người dùng hoặc nhóm trong Active Directory (LDAP 50).";
  if (/^Directory không tìm thấy tài khoản hợp lệ\.$/.test(message))
    return message;
  if (/^Directory không trả về DN tài khoản\.$/.test(message))
    return message;
  if (/^Directory thiếu định danh bất biến hoặc email/.test(message))
    return message;
  if (/^Tài khoản chưa thuộc nhóm/.test(message)) return message;
  if (stage === "search")
    return "Không thể tìm tài khoản trong Directory. Kiểm tra Login attribute, Users Base DN và quyền đọc của bind account.";
  if (stage === "user")
    return "Tìm thấy tài khoản nhưng không thể xác thực mật khẩu Active Directory. Kiểm tra UPN/DN đăng nhập, mật khẩu và trạng thái tài khoản.";
  return "Không thể xác thực với Directory. Vui lòng kiểm tra cấu hình, thuộc tính tìm kiếm và thông tin đăng nhập.";
}

function ldapClient(
  settings: Pick<DirectorySettings, "ldapUrl" | "caCertificatePem">
) {
  return new Client({
    url: settings.ldapUrl,
    timeout: 10_000,
    connectTimeout: 7_000,
    strictDN: true,
    tlsOptions: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
      ...(settings.caCertificatePem ? { ca: [settings.caCertificatePem] } : {}),
    },
  });
}

export type DirectoryDiagnosticCheck = {
  id: "secret" | "dns" | "tcp" | "ca" | "ldaps";
  label: string;
  status: "success" | "warning" | "error";
  message: string;
};

export type DirectoryDiagnosticReport = {
  ready: boolean;
  summary: string;
  checkedAt: string;
  checks: DirectoryDiagnosticCheck[];
};

export function inspectDirectoryCaCertificate(
  caCertificatePem: string | null | undefined
): DirectoryDiagnosticCheck {
  if (!caCertificatePem?.trim())
    return {
      id: "ca",
      label: "CA certificate",
      status: "warning",
      message:
        "Chưa cấu hình CA riêng; kết nối TLS sẽ dùng kho CA hệ thống của container.",
    };

  const certificatePem = caCertificatePem.match(
    /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/
  )?.[0];
  if (!certificatePem)
    return {
      id: "ca",
      label: "CA certificate",
      status: "error",
      message: "Nội dung CA không đúng định dạng PEM.",
    };

  try {
    const certificate = new crypto.X509Certificate(certificatePem);
    const now = Date.now();
    if (Date.parse(certificate.validFrom) > now)
      return {
        id: "ca",
        label: "CA certificate",
        status: "error",
        message: "CA certificate chưa đến thời gian có hiệu lực.",
      };
    if (Date.parse(certificate.validTo) <= now)
      return {
        id: "ca",
        label: "CA certificate",
        status: "error",
        message: "CA certificate đã hết hạn.",
      };
    return {
      id: "ca",
      label: "CA certificate",
      status: "success",
      message:
        "CA certificate đúng định dạng và còn hiệu lực; chuỗi tin cậy sẽ được xác nhận ở bước TLS.",
    };
  } catch {
    return {
      id: "ca",
      label: "CA certificate",
      status: "error",
      message: "Không thể đọc CA certificate đã nhập.",
    };
  }
}

async function testDirectoryTcpPort(hostname: string, port: number) {
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host: hostname, port });
    const finish = (error?: Error) => {
      socket.removeAllListeners();
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };
    socket.setTimeout(5_000);
    socket.once("connect", () => finish());
    socket.once("timeout", () =>
      finish(new Error("Hết thời gian chờ kết nối TCP."))
    );
    socket.once("error", error => finish(error));
  });
}

export async function diagnoseLdapsDirectoryDraft(
  settings: DirectoryConnectionInput
): Promise<DirectoryDiagnosticReport> {
  const checks: DirectoryDiagnosticCheck[] = [];
  const secret = await inspectDirectoryBindSecret(settings);
  checks.push({
    id: "secret",
    label: "Tệp secret LDAP",
    status: secret.status,
    message: secret.message,
  });

  let url: URL | null = null;
  try {
    url = new URL(settings.ldapUrl);
  } catch {
    url = null;
  }

  let dnsReady = false;
  if (url?.protocol === "ldaps:" && url.hostname) {
    try {
      const addresses = await lookup(url.hostname, {
        all: true,
        verbatim: true,
      });
      dnsReady = addresses.length > 0;
      checks.push({
        id: "dns",
        label: "Phân giải DNS",
        status: dnsReady ? "success" : "error",
        message: dnsReady
          ? `Đã phân giải tên máy chủ qua DNS (${addresses.length} địa chỉ).`
          : "DNS không trả về địa chỉ cho máy chủ LDAPS.",
      });
    } catch {
      checks.push({
        id: "dns",
        label: "Phân giải DNS",
        status: "error",
        message:
          "Container không phân giải được tên máy chủ LDAPS. Hãy kiểm tra DNS của Docker.",
      });
    }
  } else {
    checks.push({
      id: "dns",
      label: "Phân giải DNS",
      status: "error",
      message: "URL LDAPS chưa hợp lệ nên chưa thể kiểm tra DNS.",
    });
  }

  const usesStandardPort = Boolean(
    url && (url.port === "" || url.port === "636")
  );
  if (url && dnsReady && usesStandardPort) {
    try {
      await testDirectoryTcpPort(url.hostname, 636);
      checks.push({
        id: "tcp",
        label: "Cổng TCP 636",
        status: "success",
        message: "Container kết nối được tới cổng TCP 636 của máy chủ LDAPS.",
      });
    } catch {
      checks.push({
        id: "tcp",
        label: "Cổng TCP 636",
        status: "error",
        message:
          "Không kết nối được TCP 636. Hãy kiểm tra firewall, routing và dịch vụ LDAPS.",
      });
    }
  } else {
    checks.push({
      id: "tcp",
      label: "Cổng TCP 636",
      status: "error",
      message: usesStandardPort
        ? "Chưa thể kiểm tra TCP 636 vì bước DNS chưa thành công."
        : "URL LDAPS phải sử dụng cổng TCP 636.",
    });
  }

  const ca = inspectDirectoryCaCertificate(settings.caCertificatePem);
  checks.push(ca);

  const validation = validateDirectorySettings(settings);
  const blockingCheck = checks.find(check => check.status === "error");
  if (!validation && !blockingCheck) {
    try {
      await testDirectoryConnection(settings);
      checks.push({
        id: "ldaps",
        label: "LDAPS và tài khoản bind",
        status: "success",
        message:
          "Bắt tay TLS, tài khoản bind và Users Base DN đều hợp lệ.",
      });
    } catch (error) {
      checks.push({
        id: "ldaps",
        label: "LDAPS và tài khoản bind",
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không thể hoàn tất kiểm tra LDAPS.",
      });
    }
  } else {
    checks.push({
      id: "ldaps",
      label: "LDAPS và tài khoản bind",
      status: "error",
      message:
        validation ||
        "Chưa chạy bước LDAPS vì secret, DNS, TCP hoặc CA chưa đạt.",
    });
  }

  const firstError = checks.find(check => check.status === "error");
  const ready = !firstError;
  return {
    ready,
    summary: ready
      ? "Secret, DNS, TCP 636, CA/TLS và tài khoản bind đã sẵn sàng để kích hoạt LDAPS."
      : `Chưa sẵn sàng: ${firstError?.label} — ${firstError?.message}`,
    checkedAt: new Date().toISOString(),
    checks,
  };
}

async function testDirectoryConnection(settings: DirectoryConnectionInput) {
  const validation = validateDirectorySettings(settings);
  if (validation) throw new Error(validation);
  const client = ldapClient(settings);
  let stage: "bind" | "search" = "bind";
  try {
    const secret = await readBindSecret(settings);
    if (!settings.bindDn || !secret)
      throw new Error(
        "Cần cấu hình tài khoản bind và Docker secret trước khi kiểm tra kết nối."
      );
    await client.bind(settings.bindDn, secret);
    stage = "search";
    await client.search(settings.usersDn, {
      scope: "base",
      filter: "(objectClass=*)",
      attributes: ["objectClass"],
      sizeLimit: 1,
      timeLimit: 5,
    });
    return "Kết nối LDAPS, chứng chỉ TLS và tài khoản bind hợp lệ.";
  } catch (error) {
    throw new Error(safeDirectoryMessage(error, stage));
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

export async function testLdapsDirectoryDraft(
  settings: DirectoryConnectionInput
) {
  return testDirectoryConnection(settings);
}

export async function diagnoseLdapsDirectory() {
  const settings = await getDirectorySettings();
  if (!settings) throw new Error("Chưa có cấu hình Directory LDAP/AD.");
  return diagnoseLdapsDirectoryDraft(settings);
}

export async function testLdapsDirectory() {
  const settings = await getDirectorySettings();
  if (!settings) throw new Error("Chưa có cấu hình Directory LDAP/AD.");
  return testDirectoryConnection(settings);
}

export async function searchLdapsGroups(
  settings: DirectoryConnectionInput,
  query = ""
) {
  if (!settings.groupsDn?.trim())
    throw new Error("Cần khai báo Groups Base DN để tìm kiếm nhóm.");
  await testDirectoryConnection(settings);
  const client = ldapClient(settings);
  try {
    const secret = await readBindSecret(settings);
    if (!settings.bindDn || !secret)
      throw new Error(
        "Cần cấu hình tài khoản bind và Docker secret trước khi tìm kiếm nhóm."
      );
    await client.bind(settings.bindDn, secret);
    const keyword = query.trim();
    const filter = keyword
      ? escapeFilter`(&(|(objectClass=group)(objectClass=groupOfNames)(objectClass=groupOfUniqueNames))(cn=*${keyword}*))`
      : "(|(objectClass=group)(objectClass=groupOfNames)(objectClass=groupOfUniqueNames))";
    const result = await client.search(settings.groupsDn, {
      scope: "sub",
      filter,
      attributes: ["cn", "description"],
      sizeLimit: 50,
      timeLimit: 8,
    });
    return result.searchEntries
      .map(entry => {
        const raw = entry as Record<string, unknown> & { dn?: string };
        return {
          dn: raw.dn || "",
          name: entryValue(raw, "cn") || raw.dn || "Nhóm chưa có tên",
          description: entryValue(raw, "description"),
        };
      })
      .filter(group => Boolean(group.dn));
  } catch (error) {
    throw new Error(safeDirectoryMessage(error));
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

export const DIRECTORY_SYNC_PAGE_SIZE = 100;
export const DIRECTORY_SYNC_MAX_USERS = 500;

export async function syncLdapsUsers(limit = 200) {
  const settings = await getDirectorySettings();
  if (!settings || settings.lastTestStatus !== "success")
    throw new Error("Hãy lưu và kiểm tra LDAPS thành công trước khi đồng bộ.");
  const validation = validateDirectorySettings(settings);
  if (validation) throw new Error(validation);
  const client = ldapClient(settings);
  try {
    const secret = await readBindSecret(settings);
    if (!settings.bindDn || !secret)
      throw new Error("Thiếu tài khoản bind LDAPS.");
    await client.bind(settings.bindDn, secret);
    const attributes = Array.from(
      new Set([
        settings.loginAttribute,
        settings.emailAttribute,
        settings.displayNameAttribute,
        settings.directoryIdAttribute,
        settings.departmentAttribute,
        settings.jobTitleAttribute,
        DIRECTORY_EMAIL_FALLBACK_ATTRIBUTE,
        "memberOf",
      ])
    );
    const entries: Array<Record<string, unknown> & { dn?: string }> = [];
    const pages = client.searchPaginated(settings.usersDn, {
      scope: "sub",
      // AD may leave `mail` empty while userPrincipalName is populated. Do not
      // filter those users out before the fallback email mapping runs.
      filter: "(objectClass=person)",
      attributes,
      sizeLimit: limit,
      timeLimit: 20,
      paged: { pageSize: DIRECTORY_SYNC_PAGE_SIZE },
    });
    for await (const page of pages) {
      entries.push(
        ...page.searchEntries.map(
          entry => entry as Record<string, unknown> & { dn?: string }
        )
      );
      if (entries.length >= limit) break;
    }
    const outcome: Array<{
      email: string;
      name: string | null;
      role: "admin" | "user";
      status: "synced" | "skipped";
      reason?: string;
    }> = [];
    for (const entry of entries.slice(0, limit)) {
      const directoryObjectId = entryValue(
        entry,
        settings.directoryIdAttribute
      );
      const emailRaw = resolveDirectoryEmail(entry, settings);
      if (!entry.dn || !directoryObjectId || !emailRaw) {
        outcome.push({
          email: emailRaw || "—",
          name: entryValue(entry, settings.displayNameAttribute),
          role: "user",
          status: "skipped",
          reason: "Thiếu DN, email hoặc ID bất biến.",
        });
        continue;
      }
      const role = await resolveDirectoryRole(
        client,
        settings,
        entry.dn,
        entryValues(entry, "memberOf")
      );
      if (!role) {
        outcome.push({
          email: normalizeLoginEmail(emailRaw),
          name: entryValue(entry, settings.displayNameAttribute),
          role: "user",
          status: "skipped",
          reason: "Ngoài nhóm được ánh xạ.",
        });
        continue;
      }
      const openId = `ldap:${crypto.createHash("sha256").update(directoryObjectId).digest("hex").slice(0, 58)}`;
      await upsertDirectoryUser({
        openId,
        directoryObjectId,
        directoryUsername:
          entryValue(entry, settings.loginAttribute) ||
          normalizeLoginEmail(emailRaw),
        name: entryValue(entry, settings.displayNameAttribute),
        email: normalizeLoginEmail(emailRaw),
        department: entryValue(entry, settings.departmentAttribute),
        jobTitle: entryValue(entry, settings.jobTitleAttribute),
        role,
      });
      outcome.push({
        email: normalizeLoginEmail(emailRaw),
        name: entryValue(entry, settings.displayNameAttribute),
        role,
        status: "synced",
      });
    }
    return {
      scanned: entries.length,
      synced: outcome.filter(entry => entry.status === "synced").length,
      skipped: outcome.filter(entry => entry.status === "skipped").length,
      pageSize: DIRECTORY_SYNC_PAGE_SIZE,
      reachedLimit: entries.length >= limit,
      users: outcome,
    };
  } catch (error) {
    throw new Error(safeDirectoryMessage(error));
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

export async function authenticateBootstrapAdmin(
  emailInput: string,
  password: string,
  request: Request,
  response: Response
) {
  if (!selfHostedAuthEnabled())
    throw new Error("Đăng nhập cục bộ chỉ hoạt động trên bản self-hosted.");
  const email = normalizeLoginEmail(emailInput);
  assertNotRateLimited(email);
  const user = await getBootstrapUserByEmail(email);
  if (
    !user?.passwordHash ||
    !(await argon2.verify(user.passwordHash, password))
  ) {
    markFailedAttempt(email);
    throw new Error("Email hoặc mật khẩu không đúng.");
  }
  clearFailedAttempts(email);
  await createSelfHostedLogin(user.id, request, response);
  return user;
}

export async function authenticateDirectoryUser(
  emailInput: string,
  password: string,
  request: Request,
  response: Response
) {
  if (!selfHostedAuthEnabled())
    throw new Error("Đăng nhập Directory chỉ hoạt động trên bản self-hosted.");
  const email = normalizeLoginEmail(emailInput);
  assertNotRateLimited(email);
  const settings = await getDirectorySettings();
  if (
    !settings ||
    settings.status !== "active" ||
    settings.lastTestStatus !== "success"
  )
    throw new Error("Xác thực Directory chưa được kích hoạt.");
  const validation = validateDirectorySettings(settings);
  if (validation) throw new Error(validation);
  const client = ldapClient(settings);
  let stage: "bind" | "search" | "user" = "bind";
  try {
    const bindSecret = await readBindSecret(settings);
    if (!settings.bindDn || !bindSecret)
      throw new Error("Thiếu tài khoản bind LDAPS.");
    await client.bind(settings.bindDn, bindSecret);
    const attributes = [
      settings.loginAttribute,
      settings.emailAttribute,
      settings.displayNameAttribute,
      settings.directoryIdAttribute,
      settings.departmentAttribute,
      settings.jobTitleAttribute,
      DIRECTORY_EMAIL_FALLBACK_ATTRIBUTE,
      "memberOf",
    ];
    stage = "search";
    const result = await client.search(settings.usersDn, {
      scope: "sub",
      filter: escapeFilter`(${settings.loginAttribute}=${email})`,
      attributes,
      sizeLimit: 2,
      timeLimit: 5,
    });
    if (result.searchEntries.length !== 1)
      throw new Error("Directory không tìm thấy tài khoản hợp lệ.");
    const entry = result.searchEntries[0] as Record<string, unknown> & {
      dn?: string;
    };
    if (!entry.dn) throw new Error("Directory không trả về DN tài khoản.");
    const groups = entryValues(entry, "memberOf");
    const role = await resolveDirectoryRole(client, settings, entry.dn, groups);
    if (!role)
      throw new Error(
        "Tài khoản chưa thuộc nhóm được phép truy cập AssetMaster."
      );
    await client.unbind().catch(() => undefined);
    const passwordClient = ldapClient(settings);
    try {
      stage = "user";
      const userBindIdentity =
        entryValue(entry, DIRECTORY_EMAIL_FALLBACK_ATTRIBUTE) || entry.dn;
      await passwordClient.bind(userBindIdentity, password);
    } finally {
      await passwordClient.unbind().catch(() => undefined);
    }
    const directoryObjectId = entryValue(entry, settings.directoryIdAttribute);
    const directoryEmail = resolveDirectoryEmail(entry, settings);
    if (!directoryObjectId || !directoryEmail)
      throw new Error(
        "Directory thiếu định danh bất biến hoặc email/userPrincipalName của người dùng."
      );
    const openId = `ldap:${crypto.createHash("sha256").update(directoryObjectId).digest("hex").slice(0, 58)}`;
    const user = await upsertDirectoryUser({
      openId,
      directoryObjectId,
      directoryUsername: entryValue(entry, settings.loginAttribute) || email,
      name: entryValue(entry, settings.displayNameAttribute),
      email: normalizeLoginEmail(directoryEmail),
      department: entryValue(entry, settings.departmentAttribute),
      jobTitle: entryValue(entry, settings.jobTitleAttribute),
      role,
    });
    clearFailedAttempts(email);
    await createSelfHostedLogin(user.id, request, response);
    return user;
  } catch (error) {
    markFailedAttempt(email);
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    console.warn("[AssetMaster][LDAP] authentication failed", {
      stage,
      code: errorCode,
      message: error instanceof Error ? error.message : "Unknown LDAP error",
      loginAttribute: settings.loginAttribute,
      usersDn: settings.usersDn,
    });
    if (
      error instanceof Error &&
      /chưa thuộc nhóm|thiếu định danh|chưa được kích hoạt/.test(error.message)
    )
      throw error;
    throw new Error(safeDirectoryMessage(error, stage));
  } finally {
    await client.unbind().catch(() => undefined);
  }
}
