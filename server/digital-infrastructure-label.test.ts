import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "client/src/pages/LicensesServicesManagementView.tsx"), "utf8");

describe("Nhãn Hạ tầng số", () => {
  it("dùng component nhấp đúp có phân quyền quản trị và khóa nhãn riêng", () => {
    expect(source).toContain('import { EditableSectionLabel } from "@/components/EditableSectionLabel"');
    expect(source).toContain('const { user } = useAuth();');
    expect(source).toContain('const isAdmin = user?.role === "admin";');
    expect(source).toContain('<EditableSectionLabel labelKey="digital-infrastructure" fallback="Hạ tầng số" canEdit={isAdmin} />');
  });
});
