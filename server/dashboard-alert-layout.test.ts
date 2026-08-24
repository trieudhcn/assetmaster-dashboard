import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard alert layout", () => {
  it("places audit and supply alerts together after the branch-value section", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const branchChart = home.indexOf("data-branch-asset-value-chart");
    const alertRow = home.lastIndexOf("data-dashboard-alert-row");
    const auditAlert = home.indexOf("data-overdue-audit-alert");
    const supplyAlert = home.indexOf("Phụ kiện chạm mức tồn tối thiểu", alertRow);

    expect(branchChart).toBeGreaterThan(-1);
    expect(alertRow).toBeGreaterThan(branchChart);
    expect(auditAlert).toBeGreaterThan(alertRow);
    expect(supplyAlert).toBeGreaterThan(alertRow);
    expect(home).toContain('"xl:grid-cols-2"');
    expect(home).toContain('document.querySelector<HTMLElement>("[data-dashboard-alert-row]")');
  });
});
