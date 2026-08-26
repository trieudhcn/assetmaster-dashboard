import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Kiểm tra key trước khi lưu", () => {
  it("mặc định hiển thị key đang nhập và cho phép Admin ẩn lại", () => {
    const view = read("client/src/pages/LicensesServicesManagementView.tsx");

    expect(view).toContain('const [showPendingKey, setShowPendingKey] = useState(true)');
    expect(view).toContain('input.type = showPendingKey ? "text" : "password"');
    expect(view).toContain('button.textContent = showPendingKey ? "Ẩn key" : "Hiện key"');
    expect(view).toContain('button.setAttribute("aria-label", showPendingKey ? "Ẩn key đang nhập" : "Hiển thị key đang nhập")');
  });
});
