import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

describe("branch settings", () => {
  it("provides safe admin CRUD in System Settings without modifying the department hierarchy", () => {
    const schema = readProjectFile("drizzle/schema.ts");
    const database = readProjectFile("server/db.ts");
    const routers = readProjectFile("server/routers.ts");
    const settings = readProjectFile("client/src/components/BranchSettings.tsx");
    const home = readProjectFile("client/src/pages/Home.tsx");
    const employees = readProjectFile("client/src/pages/EmployeeManagementView.tsx");

    expect(schema).toContain('mysqlTable("branches"');
    expect(schema).toContain('branchId: int("branchId")');
    expect(database).toContain("getBranchUsageCounts");
    expect(database).toContain("deleteBranch");
    expect(routers).toContain("branches: router");
    expect(routers).toContain("confirmUsage");
    expect(routers).toContain("Mã Chi nhánh đã tồn tại");
    expect(settings).toContain("Quản lý Chi nhánh");
    expect(settings).toContain("branches.create");
    expect(settings).toContain("branches.update");
    expect(settings).toContain("branches.remove");
    expect(settings).toContain("chưa thay đổi dữ liệu vận hành hiện hữu");
    expect(home).toContain("<BranchSettings />");
    expect(routers).toContain('getBranchByCode("HO-HEAD OFFICE")');
    expect(home).toContain("branchId: formData.branchId ?? null");
    expect(home).toContain("data-asset-branch");
    expect(home).toContain("AssetBranchSelector");
    expect(home).not.toContain('document.querySelector<HTMLElement>("[data-asset-modal]")');
    expect(employees).toContain("employees.updateBranch");
    expect(employees).toContain("data-employee-branch");
    expect(employees).toContain("EmployeeBranchAllocation");
    expect(employees).not.toContain("document.createElement");
    expect(home).toContain("const [branchFilter, setBranchFilter]");
    expect(home).toContain("matchesBranch");
    expect(home).toContain("branchOptions");
    expect(home).toContain("onBranchChange");
    expect(home).toContain('["Chi nhánh", item.branch || "Chưa gán"]');
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    expect(operations).toContain("branchNameForAsset");
    expect(operations).toContain('"Chi nhánh": branchNameForAsset(asset)');
    expect(operations).toContain("Chi nhánh: ${row.branchName}");
    const handoverPdf = readProjectFile("client/src/lib/handoverAssetPdf.ts");
    const supplyIssues = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");
    expect(handoverPdf).toContain("branchName?: string | null");
    expect(handoverPdf).toContain('["Chi nhánh", input.branchName || "Chưa gán"]');
    expect(supplyIssues).toContain("const branchName = handoverAsset?.branchId");
    expect(supplyIssues).toContain("branchName, recipientName");
    expect(supplyIssues).toContain("Chi nhánh tài sản:");
    expect(home).toContain('get("handoverId")');
    expect(operations).toContain('get("auditSession")');
  });
});
