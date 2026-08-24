import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("dashboard KPI financial metrics", () => {
  it("shows retirement value and total service cost from existing business data", () => {
    expect(home).toContain("retirementCertificatesQuery");
    expect(home).toContain("totalRetirementValue");
    expect(home).toContain('label: "Giá trị thanh lý"');
    expect(home).toContain("totalMaintenanceServiceCost");
    expect(home).toContain("Tổng chi phí:");
    expect(home).toContain("xl:grid-cols-5");
    expect(home).toContain("compactValue: true");
    expect(home).toContain("whitespace-nowrap text-[20px]");
  });
});
