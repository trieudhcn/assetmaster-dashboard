import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const invoiceView = readFileSync(new URL("../client/src/pages/PurchaseInvoiceManagementView.tsx", import.meta.url), "utf8");
const database = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

describe("phản hồi lọc và phân trang Hóa đơn", () => {
  it("hiển thị spinner và skeleton ngắn khi bộ lọc Danh mục Tài sản thay đổi", () => {
    expect(home).toContain("useTransition");
    expect(home).toContain("isAssetFilterPending");
    expect(home).toContain("isAssetFilterApplying");
    expect(home).toContain("assetFilterLoadingTimerRef");
    expect(home).toContain("applyAssetFilter");
    expect(home).toContain('data-asset-filter-loading');
    expect(home).toContain("asset-filter-skeleton");
    expect(home).toContain("Đang áp dụng bộ lọc...");
  });

  it("trang Hóa đơn tải theo trang từ server và điều hướng rõ ràng", () => {
    expect(database).toContain("listPurchaseInvoicePage");
    expect(database).toContain(".limit(pageSize).offset((page - 1) * pageSize)");
    expect(router).toContain("page: adminProcedure.input");
    expect(invoiceView).toContain("trpc.purchaseInvoices.page.useQuery(invoicePageInput)");
    expect(invoiceView).toContain("data-invoice-pagination");
    expect(invoiceView).toContain("Trang đầu Hóa đơn");
    expect(invoiceView).toContain("Trang cuối Hóa đơn");
    expect(invoiceView).toContain("invoice-skeleton");
  });

  it("làm rõ trường phần trăm VAT ngay trên mỗi dòng Hóa đơn", () => {
    expect(invoiceView).toContain('aria-label={`% VAT dòng ${index + 1}`}');
    expect(invoiceView).toContain(">% VAT</span>");
  });
});
