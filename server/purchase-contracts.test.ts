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
  const invoicesView = readFileSync(resolve(import.meta.dirname, "../client/src/pages/PurchaseInvoiceManagementView.tsx"), "utf8");
  const procurementView = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ProcurementManagementView.tsx"), "utf8");
  const invoiceOperations = readFileSync(resolve(import.meta.dirname, "../client/src/components/InvoiceLineOperationsPanel.tsx"), "utf8");
  const globalStyles = readFileSync(resolve(import.meta.dirname, "../client/src/index.css"), "utf8");
  const vendorsView = readFileSync(resolve(import.meta.dirname, "../client/src/pages/VendorBrandManagementPage.tsx"), "utf8");
  const employeeView = readFileSync(resolve(import.meta.dirname, "../client/src/pages/EmployeeManagementView.tsx"), "utf8");
  const activeDirectoryPreview = readFileSync(resolve(import.meta.dirname, "../client/src/components/ActiveDirectoryPreviewDialog.tsx"), "utf8");

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
    expect(home).toContain('label: "Hợp đồng & Hóa đơn"');
    expect(home).toContain('contracts: "Hợp đồng & Hóa đơn"');
    expect(home).toContain('invoices: "Hợp đồng & Hóa đơn"');
    expect(home).toContain("ProcurementManagementView");
    expect(procurementView).toContain("PurchaseContractManagementView");
    expect(procurementView).toContain("PurchaseInvoiceManagementView");
    expect(procurementView).toContain('selectSection("invoices")');
    expect(procurementView).toContain("Tìm kiếm chung Hợp đồng và Hóa đơn");
    expect(procurementView).toContain("purchaseContracts.list.useQuery()");
    expect(procurementView).toContain("purchaseInvoices.list.useQuery()");
    expect(procurementView).toContain("counts.contracts");
    expect(procurementView).toContain("counts.invoices");
    expect(home).toContain("purchaseContractId: formData.purchaseContractId ?? null");
    expect(home).toContain("data-asset-purchase-invoice");
    expect(supplies).toContain("purchaseContractId: form.purchaseContractId ? Number(form.purchaseContractId) : null");
    expect(supplies).toContain("data-supply-purchase-contract");
    expect(supplies).toContain("data-edit-supply-contract");
    expect(contractsView).toContain("Hợp đồng mua bán");
    expect(contractsView).not.toContain("Tài sản & phụ kiện thuộc hợp đồng");
    expect(contractsView).toContain("Tải chứng từ");
    expect(contractsView).toContain("vendorFilterOptions");
    expect(contractsView).toContain('value={vendorFilter}');
    expect(contractsView).toContain('setVendorFilter("all")');
    expect(contractsView).toContain("disabled={!hasActiveFilters}");
    expect(contractsView).toContain("<DatePickerField");
    expect(contractsView).toContain("<CurrencyInput");
    expect(contractsView).toContain("showWords");
    expect(contractsView).toContain("Bản Hợp đồng giấy đã ký");
    expect(contractsView).toContain("paperContractFile");
    expect(contractsView).toContain('documentType: "signed_contract"');
    expect(contractsView).toContain("Đã tạo Hợp đồng và lưu bản giấy đã ký.");
    expect(home).toContain('input[placeholder="Nhập số serial"]');
    expect(home).toContain("serialField.after(field)");
    expect(home).toContain('field.dataset.assetPurchaseInvoice = "true"');
  });

  it("uses the vendor profile as a contract index instead of a second contract upload flow", () => {
    expect(vendorsView).toContain("Hợp đồng mua bán · {vendor.name}");
    expect(vendorsView).toContain("Tạo và lưu chứng từ tại menu Hợp đồng mua bán");
    expect(vendorsView).toContain('url.searchParams.set("view", "contracts")');
    expect(vendorsView).toContain('url.searchParams.set("vendorId", String(vendor.id))');
    expect(vendorsView).toContain('url.searchParams.set("create", "1")');
    expect(vendorsView).not.toContain("<VendorDocuments documentsRef=");
    expect(contractsView).toContain('const routeIntentHandled = useRef(false)');
    expect(contractsView).toContain('params.get("create") !== "1"');
    expect(contractsView).toContain('const nextForm = { ...emptyForm, vendorId: String(vendorId) }');
    expect(contractsView).toContain('formSnapshotRef.current = JSON.stringify({ form: nextForm, paperContractFileName: null })');
  });

  it("clears one-time contract deep-link parameters after consumption and during menu navigation", () => {
    expect(contractsView).toContain("const clearContractRouteIntent");
    expect(contractsView).toContain('url.searchParams.delete("vendorId")');
    expect(contractsView).toContain('url.searchParams.delete("create")');
    expect(contractsView).toContain('url.searchParams.delete("contractId")');
    expect(contractsView).toContain("clearContractRouteIntent();");
    expect(contractsView).toContain("setFormOpen(true)");
    expect(home).toContain('url.searchParams.delete("vendorId")');
    expect(home).toContain('url.searchParams.delete("create")');
    expect(home).toContain('url.searchParams.delete("contractId")');
  });

  it("models invoices as the direct purchase source while keeping contracts optional", () => {
    expect(schema).toContain("export const purchaseInvoices");
    expect(schema).toContain("export const purchaseInvoiceLines");
    expect(schema).toContain("export const purchaseInvoiceDocuments");
    expect(schema).toContain("export const purchaseInvoiceSupplyReceipts");
    expect(schema).toContain('purchaseInvoiceId: int("purchaseInvoiceId")');
    expect(schema).toContain('purchaseInvoiceLineId: int("purchaseInvoiceLineId")');
    expect(schema).toContain('purchaseContractId: int("purchaseContractId").references(() => purchaseContracts.id, { onDelete: "set null"');
    expect(schema).toContain('uniqueIndex("purchase_invoice_lines_invoice_number_unique")');
    expect(database).toContain("createPurchaseInvoice");
    expect(database).toContain("createPurchaseInvoiceLine");
    expect(database).toContain("createPurchaseInvoiceDocument");
    expect(database).toContain("updateAssetPurchaseInvoiceReference");
    expect(database).toContain("createPurchaseInvoiceSupplyReceipt");
    expect(database).toContain("runPurchaseInvoiceTransaction");
  });

  it("exposes controlled invoice APIs, direct asset links and S3 invoice documents", () => {
    expect(router).toContain("purchaseInvoices: router({");
    expect(router).toContain('purchaseContractId: z.number().int().positive().nullable().optional()');
    expect(router).toContain(' : " không gán Hợp đồng"');
    expect(router).toContain("createLine: adminProcedure");
    expect(router).toContain("attachAsset: adminProcedure");
    expect(router).toContain("detachAsset: adminProcedure");
    expect(router).toContain("receiveSupply: adminProcedure");
    expect(router).toContain("Nhập từ Hóa đơn ${invoice.invoiceKey}");
    expect(router).toContain("Số lượng nhập vượt số lượng trên dòng Hóa đơn");
    expect(router).toContain("Chỉ dòng loại Tài sản mới được dùng để gán Tài sản.");
    expect(router).toContain("purchase-invoices/${invoice.id}/documents/");
    expect(router).toContain('documentType: z.enum(["invoice_pdf", "invoice_xml", "scan", "delivery_note", "adjustment", "other"])');
  });

  it("provides invoice management, document preview and invoice-first asset selection", () => {
    expect(home).toContain('invoices: "Hợp đồng & Hóa đơn"');
    expect(home).toContain("ProcurementManagementView");
    expect(procurementView).toContain("PurchaseInvoiceManagementView");
    expect(home).toContain("purchaseInvoiceId: formData.purchaseInvoiceId ?? null");
    expect(home).toContain("purchaseInvoiceLineId: formData.purchaseInvoiceLineId ?? null");
    expect(home).toContain('label.textContent = "Hóa đơn mua bán"');
    expect(home).toContain('field.dataset.assetPurchaseInvoice = "true"');
    expect(invoicesView).toContain("Hóa đơn mua bán");
    expect(invoicesView).toContain("trpc.purchaseInvoices.list.useQuery()");
    expect(invoicesView).toContain("purchaseContractId: form.purchaseContractId ? Number(form.purchaseContractId) : null");
    expect(invoicesView).toContain("queuedDocuments");
    expect(invoicesView).toContain("uploadInvoiceDocument");
    expect(invoicesView).toContain("application/xml");
    expect(invoicesView).toContain("DocumentPreview");
    expect(invoicesView).toContain("Dòng Hóa đơn");
  });

  it("supports line-level reconciliation, asset allocation, supply receiving and Excel export", () => {
    expect(router).toContain("reconciliation: adminProcedure");
    expect(router).toContain("supplyReceipts");
    expect(router).toContain("receivedQuantity");
    expect(invoicesView).toContain("InvoiceLineOperationsPanel");
    expect(invoicesView).toContain("trpc.purchaseInvoices.attachAsset.useMutation");
    expect(invoicesView).toContain("trpc.purchaseInvoices.receiveSupply.useMutation");
    expect(invoicesView).toContain("Phân bổ nguồn mua theo dòng");
    expect(invoicesView).toContain("Xuất đối soát Excel");
    expect(invoicesView).toContain("XLSX.writeFile");
    expect(invoicesView).toContain('data-invoice-reconciliation-export="true"');
    expect(invoicesView.indexOf("data-invoice-reconciliation-export")).toBeLessThan(invoicesView.indexOf("Tạo hóa đơn"));
    expect(invoicesView).toContain("sm:grid-cols-[140px_minmax(0,0.8fr)_84px_96px_minmax(180px,1.35fr)]");
    expect(invoicesView).toContain('inputMode="numeric"');
    expect(invoicesView).toContain("wholeQuantity(event.target.value)");
    expect(router).toContain('Số lượng dòng Hóa đơn phải là số nguyên.');
  });

  it("creates a new supply atomically from a supply invoice line and keeps contracts value-free in the form", () => {
    expect(router).toContain("createSupplyAndReceive: adminProcedure");
    expect(router).toContain("Tạo và nhập từ Hóa đơn");
    expect(router).toContain("Mã Phụ kiện này đã tồn tại. Hãy chọn Phụ kiện có sẵn để tiếp nhận.");
    expect(invoicesView).toContain("trpc.purchaseInvoices.createSupplyAndReceive.useMutation");
    expect(invoiceOperations).toContain("Tạo Phụ kiện mới");
    expect(invoiceOperations).toContain("Tạo & tiếp nhận");
    expect(invoiceOperations).toContain("Đơn giá");
    expect(contractsView).toContain('label === "Tổng giá trị" ? "hidden"');
    expect(contractsView).not.toContain("totalValue: form.totalValue");
  });

  it("shows contract validity dates instead of total value in the contract list", () => {
    const tableStart = contractsView.indexOf('<table className={`w-full text-left text-xs');
    const tableEnd = contractsView.indexOf('{selectedId !== null', tableStart);
    const contractTable = contractsView.slice(tableStart, tableEnd);

    expect(contractTable).toContain("Ngày bắt đầu");
    expect(contractTable).toContain("Ngày hết hiệu lực");
    expect(contractTable).toContain("dateLabel(contract.effectiveFrom)");
    expect(contractTable).toContain("dateLabel(contract.effectiveTo)");
    expect(contractTable).not.toContain("Tổng giá trị");
  });

  it("highlights active contracts that will expire within the next 30 days", () => {
    expect(contractsView).toContain('contract.status === "active"');
    expect(contractsView).toContain("remainingDays >= 0 && remainingDays <= 30");
    expect(contractsView).toContain("Sắp hết hiệu lực");
    expect(contractsView).toContain("Hết hạn hôm nay");
  });

  it("offers a read-only Active Directory preview before any employee sync is applied", () => {
    expect(employeeView).toContain("ActiveDirectoryPreviewDialog");
    expect(employeeView).toContain("Xem trước Active Directory");
    expect(activeDirectoryPreview).toContain("Xem trước đồng bộ Active Directory");
    expect(activeDirectoryPreview).toContain("CSV/JSON");
    expect(activeDirectoryPreview).toContain("Màn hình này chỉ đọc và không ghi bất kỳ dữ liệu Nhân sự nào");
    expect(activeDirectoryPreview).toContain("Khớp email");
    expect(activeDirectoryPreview).toContain("Cần đối chiếu");
  });

  it("warns before discarding changed contract or invoice forms and defaults invoice lines to supplies", () => {
    expect(contractsView).toContain("Đóng form chưa lưu?");
    expect(contractsView).toContain("Các thay đổi Hợp đồng hiện tại sẽ bị hủy.");
    expect(contractsView).toContain("requestCloseForm");
    expect(invoicesView).toContain("Đóng form chưa lưu?");
    expect(invoicesView).toContain("Các thay đổi Hóa đơn hiện tại sẽ bị hủy.");
    expect(invoicesView).toContain("guardInvoiceClose");
    expect(invoicesView).toContain('itemType: "supply"');
  });

  it("supports camera barcode scanning and keeps invoice action labels horizontally aligned", () => {
    expect(invoiceOperations).toContain('import { BrowserMultiFormatReader } from "@zxing/browser"');
    expect(invoiceOperations).toContain("decodeFromConstraints");
    expect(invoiceOperations).toContain("facingMode: { ideal: \"environment\" }");
    expect(invoiceOperations).toContain("Quét mã vạch");
    expect(invoiceOperations).toContain("Quét mã");
    expect(invoiceOperations).toContain("Quyền camera đang bị chặn");
    expect(globalStyles).toContain(".filter-action { display: inline-flex");
    expect(globalStyles).toContain("white-space: nowrap");
  });

  it("categorizes a supply created from an invoice line with an active group and brand", () => {
    expect(invoiceOperations).toContain("QuickSupplyClassificationFields");
    expect(invoiceOperations).toContain("trpc.assetCategories.list.useQuery()");
    expect(invoiceOperations).toContain("trpc.brands.list.useQuery()");
    expect(invoiceOperations).toContain("categoryId: categoryId ? Number(categoryId) : null");
    expect(invoiceOperations).toContain("brandId: brandId ? Number(brandId) : null");
  });

  it("keeps contracts focused on agreements and hides direct asset or supply linkage from the contract profile", () => {
    expect(contractsView).not.toContain("Tài sản & phụ kiện thuộc hợp đồng");
    expect(contractsView).not.toContain("Chưa có tài sản liên kết.");
    expect(contractsView).not.toContain("Chưa có phụ kiện liên kết.");
    expect(contractsView).toContain("Tài sản và Phụ kiện được đối soát trực tiếp theo Hóa đơn mua bán.");
  });
});
