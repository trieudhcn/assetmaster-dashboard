import { describe, expect, it } from "vitest";
import { validateSetupDatabase } from "./selfHostedSetup";

describe("self-hosted installer database validation", () => {
  const valid = { host: "mysql.internal.example", port: 3306, databaseName: "assetmaster", username: "assetmaster_app", password: "not-a-real-secret" };

  it("chấp nhận thông số MySQL nội bộ hợp lệ", () => {
    expect(validateSetupDatabase(valid)).toBeNull();
  });

  it("từ chối host, cổng và tên database không an toàn", () => {
    expect(validateSetupDatabase({ ...valid, host: "mysql.internal/path" })).toContain("máy chủ MySQL");
    expect(validateSetupDatabase({ ...valid, port: 0 })).toContain("Cổng MySQL");
    expect(validateSetupDatabase({ ...valid, databaseName: "assetmaster; DROP TABLE users" })).toContain("Tên database");
  });

  it("yêu cầu thông tin xác thực MySQL trước khi kiểm tra", () => {
    expect(validateSetupDatabase({ ...valid, username: "" })).toContain("tài khoản MySQL");
    expect(validateSetupDatabase({ ...valid, password: "" })).toContain("mật khẩu MySQL");
  });
});
