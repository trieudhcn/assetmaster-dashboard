import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const dashboardCss = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("dashboard KPI financial metrics", () => {
  it("shows retirement value and total service cost from existing business data", () => {
    expect(home).toContain("retirementCertificatesQuery");
    expect(home).toContain("totalRetirementValue");
    expect(home).toContain('label: "Giá trị thanh lý"');
    expect(home).toContain("totalMaintenanceServiceCost");
    expect(home).toContain("Tổng chi phí:");
    expect(home).toContain("lg:grid-cols-5");
    expect(home).toContain("compactValue: true");
    expect(home).toContain("whitespace-nowrap text-[18px]");
    expect(home).toContain("maintenanceAssetCount");
    expect(home).toContain("alertValue: maintenanceAssetCount > 0");
    expect(home).toContain('kpi.alertValue ? "text-[#C75419]"');
    expect(home).not.toContain('detail: "Cần theo dõi xử lý"');
    expect(home).not.toContain('border-t border-[#EDF2F5] pt-1 text-[10px] font-extrabold text-[#A86B00]');
    expect(dashboardCss).toContain("font-size: 1.125rem !important");
    expect(dashboardCss).toContain(".animate-kpi > div:nth-child(4)");
    expect(dashboardCss).toContain("min-height: 10.5rem");
    expect(dashboardCss).toContain("margin-top: 0.35rem");
  });
});
