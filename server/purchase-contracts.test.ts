import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("purchase contract management", () => {
  const schema = readFileSync(resolve(import.meta.dirname, "../drizzle/schema.ts"), "utf8");
  const database = readFileSync(resolve(import.meta.dirname, "./db.ts"), "utf8");
  const router = readFileSync(resolve(import.meta.dirname, "./routers.ts"), "utf8");
  const home = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Home.tsx"), "utf8");
  const supplies = readFileSync(resolve(import.meta.dirname, "../client/src/pages/SuppliesInventoryView.tsx"), "utf8");
  const contractsView = readFileSync(resolve(import.meta.dirname, "../client/src/pages/PurchaseContractManagementView.tsx"), "utf8");

  it("models one contract with reusable documents and links to assets or supplies", () => {
    expect(schema).toContain("export const purchaseContracts");
    expect(schema).toContain("export const purchaseContractDocuments");
    expect(schema).toContain("export const purchaseContractItems");
    expect(schema).toContain('purchaseContractId: int("purchaseContractId")');
    expect(schema).toContain('referenceCode: varchar("referenceCode", { length: 64 }).notNull().unique()');
    expect(database).toContain("createPurchaseContractDocument");
    expect(database).toContain("listAssetsByPurchaseContractId");
    expect(database).toContain("listInventorySuppliesByPurchaseContractId");
  });

  it("exposes controlled CRUD, S3 document handling and contract-item synchronization", () => {
    expect(router).toContain("purchaseContracts: router({");
    expect(router).toContain("requireUsablePurchaseContract");
    expect(router).toContain("syncAssetPurchaseContractItem");
    expect(router).toContain("syncSupplyPurchaseContractItem");
    expect(router).toContain("uploadDocument: adminProcedure");
    expect(router).toContain("purchase-contracts/${contract.id}/documents/");
    expect(router).toContain("Không thể xóa vì hợp đồng đang liên kết");
    expect(router).toContain("Nhà cung cấp của Tài sản được lấy theo Hợp đồng đã chọn");
    expect(router).toContain("Nhà cung cấp của Phụ kiện được lấy theo Hợp đồng đã chọn");
  });

  it("provides navigation and contract selectors across the purchase, asset and supply workflows", () => {
    expect(home).toContain('label: "Hợp đồng mua bán"');
    expect(home).toContain('contracts: "Hợp đồng mua bán"');
    expect(home).toContain("PurchaseContractManagementView");
    expect(home).toContain("purchaseContractId: formData.purchaseContractId ?? null");
    expect(home).toContain("data-asset-purchase-contract");
    expect(supplies).toContain("purchaseContractId: form.purchaseContractId ? Number(form.purchaseContractId) : null");
    expect(supplies).toContain("data-supply-purchase-contract");
    expect(supplies).toContain("data-edit-supply-contract");
    expect(contractsView).toContain("Hợp đồng mua bán");
    expect(contractsView).toContain("Tài sản & phụ kiện thuộc hợp đồng");
    expect(contractsView).toContain("Tải chứng từ");
  });
});
