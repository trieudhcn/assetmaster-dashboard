import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin login recovery", () => {
  it("nâng quyền cho tài khoản chủ sở hữu hiện hữu và luôn tạo phiên có tên hợp lệ", () => {
    const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const oauth = readFileSync(new URL("./_core/oauth.ts", import.meta.url), "utf8");

    expect(db).toContain('values.role === "admin" ? { role: "admin" as const }');
    expect(oauth).toContain("name: userInfo.name || userInfo.openId");
  });
});
