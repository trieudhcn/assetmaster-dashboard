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
  });
});
