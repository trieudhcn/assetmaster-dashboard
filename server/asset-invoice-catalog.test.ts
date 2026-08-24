import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("asset catalog invoice code", () => {
  it("maps invoice keys and filters assets by the visual invoice code", () => {
    expect(home).toContain("invoiceKeyById");
    expect(home).toContain("invoiceFilterOptions");
    expect(home).toContain('const [invoiceFilter, setInvoiceFilter] = useState("Tất cả Hóa đơn")');
    expect(home).toContain('matchesVietnameseSearch(asset.invoiceKey || "", invoiceFilter)');
    expect(home).toContain('setInvoiceFilter("Tất cả Hóa đơn")');
  });

  it("maps invoice keys together with every asset-row refresh so filters cannot clear them", () => {
    expect(home).toContain("const invoiceKeyById = new Map((dashboardInvoicesQuery.data || []).map");
    expect(home).toContain("purchaseInvoiceId: asset.purchaseInvoiceId ?? null");
    expect(home).toContain("invoiceKey: asset.purchaseInvoiceId ? invoiceKeyById.get(asset.purchaseInvoiceId) || null : null");
    expect(home).toContain("dashboardInvoicesQuery.data, repairCostByAssetId");
    expect(home).not.toContain("setAssetRows((current) => current.map((asset) => ({ ...asset, invoiceKey:");
  });

  it("keeps the invoice column hidden by default while making it selectable and renderable", () => {
    expect(home).toContain('invoice: false');
    expect(home).toContain('{ key: "invoice", label: "Mã Hóa đơn" }');
    expect(home).toContain('visibleColumns[key]');
    expect(home).toContain('key === "invoice"');
    expect(home).toContain('title="Chưa liên kết"');
  });

  it("provides an invoice filter beside the narrower catalog search field", () => {
    expect(home).toContain("flex-[1_1_260px]");
    expect(home).toContain("<FilterSelect value={invoice} onChange={onInvoiceChange} options={invoiceOptions} isLoading={isFilterDataLoading} />");
    expect(home).toContain("onBranchChange={onBranchChange}");
    expect(home).toContain("onReset={resetAndGoFirst}");
    expect(home).not.toContain("assetCatalogPreferences");
  });

  it("uses the active Department directory instead of hard-coded or holder-name matching", () => {
    expect(home).toContain("assetDepartmentsQuery = trpc.departments.listAll.useQuery");
    expect(home).toContain("departmentFilterOptions");
    expect(home).toContain("asset.departmentName === department");
    expect(home).toContain("options={departmentOptions}");
    expect(home).not.toContain('asset.holder.includes(department)');
  });

  it("shows the asset count for each Department and keeps filters visibly loading until data is ready", () => {
    expect(home).toContain("departmentFilterCounts");
    expect(home).toContain("departmentCounts={departmentFilterCounts}");
    expect(home).toContain("counts={departmentCounts} optionLabels={departmentOptionLabels} isLoading={isFilterDataLoading}");
    expect(home).toContain("assetFilterDataLoading");
    expect(home).toContain("loading={isLoading}");
  });

  it("shows counts for Vendors and Brands while clearly labeling inactive Departments", () => {
    expect(home).toContain("vendorFilterCounts");
    expect(home).toContain("brandFilterCounts");
    expect(home).toContain("counts={vendorCounts} isLoading={isFilterDataLoading}");
    expect(home).toContain("counts={brandCounts} isLoading={isFilterDataLoading}");
    expect(home).toContain("departmentOptionLabels");
    expect(home).toContain("Ngừng hoạt động");
  });

  it("exports every matching asset rather than only the current pagination page", () => {
    expect(home).toContain("allFilteredAssets = assets");
    expect(home).toContain("allAssetExportRows");
    expect(home).toContain("data-asset-export-menu");
    expect(home).toContain("Xuất Excel");
    expect(home).toContain("Xuất theo bộ lọc");
    expect(home).toContain("Xuất tất cả</span>");
    expect(home).toContain(">{allAssetCount}</span>");
    expect(home).toContain("onExportAllAssets={exportAllAssetsExcel}");
    expect(home).not.toContain("Xuất danh sách (${assets.length})");
  });

  it("opens the corresponding invoice detail when a linked invoice code is activated", () => {
    expect(home).toContain('url.searchParams.set("view", "invoices")');
    expect(home).toContain('url.searchParams.set("invoiceId", String(asset.purchaseInvoiceId))');
    expect(home).toContain('onClick={() => { window.sessionStorage.setItem("assetmaster-return-to-asset-catalog", "true")');
    expect(home).toContain('window.sessionStorage.setItem("assetmaster-return-to-asset-catalog", "true")');
    expect(home).toContain("onOpenInvoice(asset)");
  });

  it("uses the compact invoice-code typography in line with asset identifiers", () => {
    expect(home).toContain('font-mono !text-[11px] font-medium leading-none text-[#2666A8]');
  });

  it("keeps the invoice link compact while allowing the table to fit the available width", () => {
    expect(home).toContain('invoice: "Hóa đơn"');
    expect(home).toContain('tableLayout: "auto"');
    expect(home).toContain('data-asset-catalog-empty');
    expect(home).toContain('Xóa tất cả bộ lọc');
    expect(home).toContain('assetmaster-return-to-asset-catalog');
    expect(home).toContain('assetmaster:return-to-asset-catalog');
    expect(home).toContain('assetmaster-asset-catalog-scroll-y');
    expect(home).toContain("window.scrollTo(0, savedScrollY)");
  });
});
