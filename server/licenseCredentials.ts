import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

const CREDENTIAL_VERSION = "v1";

function masterKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Không thể bảo vệ thông tin xác thực vì thiếu khóa hệ thống.");
  return createHash("sha256").update(`assetmaster-license-credential:${secret}`).digest();
}

export function encryptLicenseCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [CREDENTIAL_VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptLicenseCredential(payload: string) {
  const [version, ivValue, tagValue, encryptedValue] = payload.split(".");
  if (version !== CREDENTIAL_VERSION || !ivValue || !tagValue || !encryptedValue) throw new Error("Dữ liệu xác thực Bản quyền không hợp lệ.");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export function credentialFingerprint(value: string) {
  return createHmac("sha256", masterKey()).update(value.trim()).digest("hex");
}

export function maskLicenseKey(value: string) {
  const compact = value.trim();
  if (compact.length <= 4) return "••••";
  return `${"•".repeat(Math.min(12, Math.max(4, compact.length - 4)))}${compact.slice(-4)}`;
}
