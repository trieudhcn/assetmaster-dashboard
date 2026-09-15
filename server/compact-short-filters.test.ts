import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(import.meta.dirname, "..", path), "utf8");

function dropdown(source: string, valueMarker: string) {
  const valueIndex = source.indexOf(valueMarker);
  expect(valueIndex, `Không tìm thấy ${valueMarker}`).toBeGreaterThanOrEqual(0);
  const start = source.lastIndexOf("<", valueIndex);
  const end = source.indexOf("/>", valueIndex);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(valueIndex);
  return source.slice(start, end + 2);
}

describe("compact non-status filters with two to four choices", () => {
  it.each([
    ["client/src/pages/Home.tsx", "value={roleFilter}"],
    ["client/src/pages/AssetCategoryManagementPage.tsx", "value={assetFilter}"],
    [
      "client/src/pages/LicensesServicesManagementView.tsx",
      "value={serviceTypeFilter}",
    ],
    [
      "client/src/pages/LicensesServicesManagementView.tsx",
      "value={expirySortDirection}",
    ],
    [
      "client/src/pages/ReportsManagementView.tsx",
      "value={serviceCostChannel}",
    ],
    ["client/src/pages/OperationsModules.tsx", "value={costSummaryChannel}"],
    ["client/src/pages/Home.tsx", "value={maintenanceTicketCostSort}"],
  ])("uses compact mode without search for %s", (path, marker) => {
    const control = dropdown(read(path), marker);
    expect(control).toContain('variant="compact"');
    expect(control).not.toContain("searchPlaceholder=");
  });

  it("replaces the remaining native role filter", () => {
    const home = read("client/src/pages/Home.tsx");
    expect(home).not.toContain("<select value={roleFilter}");
    expect(home).toContain(
      "<SearchableSelect value={roleFilter} onChange={setRoleFilter}"
    );
  });

  it.each([
    ["client/src/pages/EmployeeManagementView.tsx", "value={employee.role}"],
    ["client/src/pages/OperationsModules.tsx", "value={serviceChannel}"],
    ["client/src/pages/ReportsManagementView.tsx", "value={currencyMode}"],
    [
      "client/src/pages/LicensesServicesManagementView.tsx",
      "value={licenseForm.activationMode}",
    ],
  ])("keeps search for short non-filter dropdowns in %s", (path, marker) => {
    const control = dropdown(read(path), marker);
    expect(control).not.toContain('variant="compact"');
    expect(control).toContain("searchPlaceholder=");
  });
});
