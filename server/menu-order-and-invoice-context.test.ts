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

    expect(invoiceView).toContain("needsSourceAllocation");
    expect(invoiceView).toContain("<InvoiceLinkedAssetQuickLinks");
    expect(invoiceView).toContain("quantity: String(Number(line.quantity))");
    expect(invoiceView).toContain("receivedQuantity: String(Number(receipt.receivedQuantity))");
    expect(linkedAssetLinks).toContain("data-invoice-linked-asset-links");
    expect(linkedAssetLinks).toContain("Chi tiết Tài sản");
    expect(linkedAssetLinks).toContain("statusMeta");
    expect(linkedAssetLinks).toContain("grid-cols-[78px_minmax(0,1fr)_auto_15px]");
    expect(invoiceView).toContain('startsWith("Tài sản liên kết:")');
  });

  it("supports drag-and-drop menu ordering and aligns the compact settings panels", () => {
    const menuSettings = readProjectFile("client/src/components/MenuOrderSettings.tsx");
    const branches = readProjectFile("client/src/components/BranchSettings.tsx");
    const supplyUnits = readProjectFile("client/src/components/SupplyUnitSettings.tsx");

    expect(menuSettings).toContain("draggable={!isSaving}");
    expect(menuSettings).toContain("onReorder(next.map");
    expect(branches).toContain("max-w-[1100px]");
    expect(supplyUnits).toContain("max-w-[1100px]");
  });
});
