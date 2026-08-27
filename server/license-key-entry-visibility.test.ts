import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Kiểm tra key trước khi lưu", () => {
  it("luôn hiển thị key đang nhập và dùng biểu tượng mắt để xem key đã lưu", () => {
    const view = read("client/src/pages/LicensesServicesManagementView.tsx");

    expect(view).not.toContain("showPendingKey");
    expect(view).toContain('input[placeholder="Nhập một key kích hoạt"]');
    expect(view).toContain('pendingKeyInput.type = "text"');
    expect(view).toContain("useLayoutEffect(() => {");
    expect(view).toContain('button.dataset.licenseKeyRevealIcon = "true"');
    expect(view).toContain('button.setAttribute("aria-label", "Xem key")');
    expect(view).toContain('icon.innerHTML = \'<path d="M2 12');
  });
});
