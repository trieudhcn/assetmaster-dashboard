import { afterEach, describe, expect, it } from "vitest";
import {
  normalizeLoginEmail,
  selfHostedAuthEnabled,
  validateDirectorySettings,
} from "./selfHostedAuth";

const validSettings = {
  ldapUrl: "ldaps://dc01.congty.local:636",
  usersDn: "OU=Users,DC=congty,DC=local",
  loginAttribute: "mail",
  emailAttribute: "mail",
  displayNameAttribute: "displayName",
  directoryIdAttribute: "objectGUID",
  departmentAttribute: "department",
  jobTitleAttribute: "title",
  bindDn: "CN=svc-assetmaster,OU=Service Accounts,DC=congty,DC=local",
  bindSecretRef: "/run/secrets/assetmaster_ldap_bind_password",
};

afterEach(() => {
  delete process.env.SELF_HOSTED_AUTH_ENABLED;
});

describe("self-hosted directory authentication safeguards", () => {
  it("chỉ chấp nhận URL LDAPS và secret trong hai thư mục an toàn", () => {
    expect(validateDirectorySettings(validSettings)).toBeNull();
    expect(
      validateDirectorySettings({
        ...validSettings,
        bindSecretRef:
          "/etc/assetmaster/secrets/assetmaster_ldap_bind_password",
      })
    ).toBeNull();
    expect(
      validateDirectorySettings({
        ...validSettings,
        ldapUrl: "ldap://dc01.congty.local:389",
      })
    ).toContain("LDAPS");
    expect(
      validateDirectorySettings({
        ...validSettings,
        bindSecretRef: "/tmp/ldap-password",
      })
    ).toContain("/etc/assetmaster/secrets/");
    expect(
      validateDirectorySettings({
        ...validSettings,
        bindSecretRef: "/etc/assetmaster/ldap-bind-password",
      })
    ).toContain("/etc/assetmaster/secrets/");
  });

  it("chuẩn hóa email nội bộ trước khi tra cứu Directory", () => {
    expect(normalizeLoginEmail("  NGUYEN.VAN.A@CONGTY.VN  ")).toBe(
      "nguyen.van.a@congty.vn"
    );
  });

  it("chỉ chuyển sang session cục bộ khi self-hosted được bật rõ ràng", () => {
    expect(selfHostedAuthEnabled()).toBe(false);
    process.env.SELF_HOSTED_AUTH_ENABLED = "true";
    expect(selfHostedAuthEnabled()).toBe(true);
  });
});
