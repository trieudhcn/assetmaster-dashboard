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

    expect(home).toContain("assetmaster-sidebar-menu-order");
    expect(home).toContain("<MenuOrderSettings");
    expect(home).toContain("sidebarMenuOrder.map");
    expect(menuSettings).toContain("Thứ tự menu điều hướng");
    expect(menuSettings).toContain("Khôi phục mặc định");
  });
});
