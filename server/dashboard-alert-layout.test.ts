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

  it("keeps both alert headers aligned and limits each priority list to three rows", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

    expect(home).toContain('data-low-stock-supply-alert');
    expect(home).toContain('min-h-[72px]');
    expect(home).toContain('visibleOverdueAuditReminders.slice(0, 3)');
    expect(home).toContain('const lowStockSupplyPreview = visibleLowStockSupplies.slice(0, 3);');
    expect(home).toContain('left.dueAt.getTime() - right.dueAt.getTime()');
    expect(home).toContain('Math.abs(Number(left.stockQuantity)) - Math.abs(Number(right.stockQuantity))');
    expect(home).toContain('Ưu tiên số lượng tồn gần 0 nhất để bổ sung kịp thời.');
  });

  it("shows overdue days and lets each active dashboard warning be marked as reviewed", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

    expect(home).toContain("assetmaster-dismissed-dashboard-alert-ids");
    expect(home).toContain("dismissDashboardAlert");
    expect(home).toContain("Quá hạn {overdueDays(reminder.dueAt)} ngày");
    expect(home).toContain("Đã xem");
    expect(home).toContain("data-dismissed-dashboard-alerts");
    expect(home).toContain("Hiện lại");
    expect(home).toContain("visibleOverdueAuditReminders");
    expect(home).toContain("visibleLowStockSupplies");
  });
});
