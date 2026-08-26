import { afterEach, describe, expect, it } from "vitest";
import { credentialFingerprint, decryptLicenseCredential, encryptLicenseCredential, maskLicenseKey } from "./licenseCredentials";

const originalSecret = process.env.JWT_SECRET;

afterEach(() => {
  process.env.JWT_SECRET = originalSecret;
});

describe("license credential protection", () => {
  it("mã hóa AES-GCM không để lộ key gốc và giải mã đúng trên máy chủ", () => {
    process.env.JWT_SECRET = "test-license-secret";
    const key = "AAAA-BBBB-CCCC-1234";
    const encrypted = encryptLicenseCredential(key);

    expect(encrypted).not.toContain(key);
    expect(encrypted.split(".")).toHaveLength(4);
    expect(decryptLicenseCredential(encrypted)).toBe(key);
  });

  it("tạo dấu vân tay ổn định để ngăn cùng một key bị nhập hai lần", () => {
    process.env.JWT_SECRET = "test-license-secret";
    expect(credentialFingerprint("AAAA-BBBB-CCCC-1234")).toBe(credentialFingerprint("AAAA-BBBB-CCCC-1234"));
    expect(credentialFingerprint("AAAA-BBBB-CCCC-1234")).not.toBe(credentialFingerprint("ZZZZ-BBBB-CCCC-1234"));
  });

  it("chỉ hiển thị phần cuối của key trong danh sách", () => {
    expect(maskLicenseKey("AAAA-BBBB-CCCC-1234")).toMatch(/1234$/);
    expect(maskLicenseKey("AAAA-BBBB-CCCC-1234")).not.toContain("AAAA");
    expect(maskLicenseKey("1234")).toBe("••••");
  });
});
