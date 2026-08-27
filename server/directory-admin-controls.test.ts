import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Directory admin controls", () => {
  it("cung cấp kiểm tra bản nháp và nhóm/tài khoản có giới hạn an toàn", async () => {
    const [auth, router] = await Promise.all([
      readFile(path.join(root, "server/selfHostedAuth.ts"), "utf8"),
      readFile(path.join(root, "server/routers.ts"), "utf8"),
    ]);
    expect(auth).toContain("testLdapsDirectoryDraft");
    expect(auth).toContain("searchLdapsGroups");
    expect(auth).toContain("syncLdapsUsers(limit = 100)");
    expect(auth).toContain("sizeLimit: limit");
    expect(router).toContain("testDraft:");
    expect(router).toContain("searchGroups:");
    expect(router).toContain("syncUsers:");
    expect(router).toContain("max(200)");
  });

  it("hiển thị rõ kiểm tra nháp, tìm nhóm và đồng bộ mà không đề nghị đồng bộ mật khẩu", async () => {
    const source = await readFile(path.join(root, "client/src/components/DirectorySettingsPanel.tsx"), "utf8");
    expect(source).toContain("Kiểm tra bản nháp");
    expect(source).toContain("Tìm tên nhóm LDAPS");
    expect(source).toContain("Đồng bộ thủ công");
    expect(source).toContain("Không đồng bộ mật khẩu nhân viên.");
  });
});
