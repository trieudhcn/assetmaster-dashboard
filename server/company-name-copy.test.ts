import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "client/src/components/CompanyBrandSettings.tsx"), "utf8");

describe("Cài đặt thương hiệu — sao chép tên công ty", () => {
  it("dùng lại helper sao chép có toast trên trường Tên công ty", () => {
    expect(source).toContain('{copyButton(draft.name, "Tên công ty")}');
    expect(source).toContain('className="field-input pr-10"');
    expect(source).toContain('toast.success(`Đã sao chép ${label}.`)');
  });
});
