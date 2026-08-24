import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("menu order settings and invoice context", () => {
  it("keeps tRPC hooks in the invoice page provider tree, not the independently mounted panel", () => {
    const invoiceView = readProjectFile("client/src/pages/PurchaseInvoiceManagementView.tsx");
    const operationsPanel = readProjectFile("client/src/components/InvoiceLineOperationsPanel.tsx");

    expect(invoiceView).toContain("const categoriesQuery = trpc.assetCategories.list.useQuery()");
    expect(invoiceView).toContain("const brandsQuery = trpc.brands.list.useQuery()");
    expect(invoiceView).toContain("categories={categoriesQuery.data || []}");
    expect(operationsPanel).not.toContain("trpc.");
    expect(operationsPanel).toContain("categories: CatalogItem[]");
  });

  it("renders a compact persisted menu-order setting that applies to the sidebar", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const menuSettings = readProjectFile("client/src/components/MenuOrderSettings.tsx");
    const schema = readProjectFile("drizzle/schema.ts");
    const router = readProjectFile("server/routers.ts");

    expect(schema).toContain("export const userMenuPreferences");
    expect(router).toContain("menuPreferences: router");
    expect(home).toContain("trpc.menuPreferences.get.useQuery");
    expect(home).toContain("trpc.menuPreferences.save.useMutation");
    expect(home).toContain("<MenuOrderSettings");
    expect(home).toContain("sidebarMenuOrder.map");
    expect(menuSettings).toContain("Thứ tự menu điều hướng");
    expect(menuSettings).toContain("đồng bộ theo tài khoản");
  });

  it("keeps linked assets actionable and suppresses allocation when every source is fulfilled", () => {
    const invoiceView = readProjectFile("client/src/pages/PurchaseInvoiceManagementView.tsx");
    const linkedAssetLinks = readProjectFile("client/src/components/InvoiceLinkedAssetQuickLinks.tsx");
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(invoiceView).toContain("needsSourceAllocation");
    expect(invoiceView).toContain("<InvoiceLinkedAssetQuickLinks");
    expect(invoiceView).toContain("quantity: String(Number(line.quantity))");
    expect(invoiceView).toContain("receivedQuantity: String(Number(receipt.receivedQuantity))");
    expect(linkedAssetLinks).toContain("data-invoice-linked-asset-links");
    expect(linkedAssetLinks).toContain("Chi tiết Tài sản");
    expect(linkedAssetLinks).toContain("statusMeta");
    expect(linkedAssetLinks).toContain("warrantyMeta");
    expect(linkedAssetLinks).toContain("grid-cols-[78px_minmax(0,1fr)_auto_auto_15px]");
    expect(linkedAssetLinks).toContain("title={tooltip}");
    expect(linkedAssetLinks).toContain('const tooltip = "Mở chi tiết tài sản"');
    expect(linkedAssetLinks).toContain("aria-label={`Mở chi tiết Tài sản ${asset.assetCode}: ${asset.name}`}");
    expect(linkedAssetLinks).toContain("Mở tài sản");
    expect(linkedAssetLinks).toContain("/?view=assets&openAsset=");
    expect(linkedAssetLinks).toContain("returnInvoice=");
    expect(home).toContain('url.searchParams.get("openAsset")');
    expect(home).toContain("Quay lại Hóa đơn");
    expect(invoiceView).toContain('url.searchParams.get("invoiceId")');
    expect(invoiceView).toContain('startsWith("Tài sản liên kết:")');
    expect(invoiceView).toContain("const [returnToAssetCatalog, setReturnToAssetCatalog]");
    expect(invoiceView).toContain('url.searchParams.get("fromAssetCatalog") === "true"');
    expect(invoiceView).toContain('aside.fixed button[aria-label="Đóng"]');
    expect(invoiceView).toContain('button.textContent = "← Quay lại Danh mục Tài sản"');
    expect(invoiceView).toContain('assetmaster:return-to-asset-catalog');
    expect(home).toContain('window.addEventListener("assetmaster:return-to-asset-catalog"');
    expect(invoiceView).toContain("queueMicrotask(() => {");
    expect(invoiceView).toContain("root.unmount();");
  });

  it("supports drag-and-drop menu ordering and aligns the compact settings panels", () => {
    const menuSettings = readProjectFile("client/src/components/MenuOrderSettings.tsx");
    const branches = readProjectFile("client/src/components/BranchSettings.tsx");
    const supplyUnits = readProjectFile("client/src/components/SupplyUnitSettings.tsx");

    expect(menuSettings).toContain("draggable={!isSaving}");
    expect(menuSettings).toContain("onReorder(next.map");
    expect(menuSettings).toContain('className="mt-5 grid grid-flow-col grid-cols-2 gap-2"');
    expect(menuSettings).toContain("rowsPerColumn");
    expect(branches).toContain("max-w-[1100px]");
    expect(supplyUnits).toContain("max-w-[1100px]");
  });
});
