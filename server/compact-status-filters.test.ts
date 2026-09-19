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

describe("compact status filters across AssetMaster", () => {
  it.each([
    [
      "client/src/components/SupplyIssueSlipManager.tsx",
      "value={slipStatusFilter}",
    ],
    [
      "client/src/components/TechnologyVendorDirectoryPanel.tsx",
      "value={expiryFilter}",
    ],
    [
      "client/src/pages/AssetCategoryManagementPage.tsx",
      "value={activityFilter}",
    ],
    [
      "client/src/pages/EmployeeManagementView.tsx",
      "value={statusFilter}",
    ],
    ["client/src/pages/Home.tsx", "value={handoverLicenseFilter}"],
    ["client/src/pages/Home.tsx", "value={accountStatusFilter}"],
    [
      "client/src/pages/LicensesServicesManagementView.tsx",
      "value={historyLicenseStatusFilter}",
    ],
  ])("uses compact mode without search for %s", (path, marker) => {
    const control = dropdown(read(path), marker);
    expect(control).toContain('variant="compact"');
    expect(control).not.toContain("searchPlaceholder=");
  });

  it("replaces the remaining native account status filter", () => {
    const home = read("client/src/pages/Home.tsx");
    expect(home).not.toContain('<select value={accountStatusFilter}');
    expect(home).toContain(
      '<SearchableSelect value={accountStatusFilter} onChange={setAccountStatusFilter}'
    );
  });

  it("forwards compact mode through the license dropdown wrapper", () => {
    const licenses = read(
      "client/src/pages/LicensesServicesManagementView.tsx"
    );
    expect(licenses).toContain('variant?: "default" | "compact"');
    expect(licenses).toContain("variant={variant}");
  });

  it.each([
    [
      "client/src/components/SupplyReturnRequestQueue.tsx",
      "value={processedConditionFilter}",
    ],
    ["client/src/pages/OperationsModules.tsx", "value={auditStatusFilter}"],
    [
      "client/src/pages/PurchaseContractManagementView.tsx",
      "value={statusFilter}",
    ],
    [
      "client/src/pages/PurchaseInvoiceManagementView.tsx",
      "value={statusFilter}",
    ],
    [
      "client/src/pages/LicensesServicesManagementView.tsx",
      'value={tab === "licenses" ? licenseStatusFilter : serviceStatusFilter}',
    ],
  ])("keeps search for status-like filters with five or more choices in %s", (path, marker) => {
    const control = dropdown(read(path), marker);
    expect(control).not.toContain('variant="compact"');
    expect(control).toContain("searchPlaceholder=");
  });
});
