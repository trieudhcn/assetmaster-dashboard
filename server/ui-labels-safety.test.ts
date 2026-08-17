import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("safe inline UI labels", () => {
  it("chỉ cho Admin lưu nhãn hợp lệ và hỗ trợ Enter/Escape cho thao tác trực tiếp", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const editor = readFileSync(new URL("../client/src/components/EditableSectionLabel.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

    expect(router).toContain("uiLabels: router");
    expect(router).toContain("list: protectedProcedure");
    expect(router).toContain("save: adminProcedure");
    expect(router).toContain("value: z.string().trim().min(2).max(120)");
    expect(editor).toContain('if (event.key === "Enter")');
    expect(editor).toContain('if (event.key === "Escape")');
    expect(editor).toContain("Nhãn cần có từ 2 đến 120 ký tự.");
    expect(editor).toContain("Nhấp đúp để chỉnh sửa");
    expect(home).not.toContain("assetmaster-dashboard-pattern_109e8935.png");
    expect(home).toContain('labelKey="dashboard-operations"');
  });
});
