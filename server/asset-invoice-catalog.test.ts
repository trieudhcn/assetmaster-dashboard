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
    expect(home).toContain("setInvoiceFilter(\"Tất cả Hóa đơn\")");
  });

  it("keeps the invoice column hidden by default while making it selectable and renderable", () => {
    expect(home).toContain('invoice: false');
    expect(home).toContain('{ key: "invoice", label: "Mã Hóa đơn" }');
    expect(home).toContain('visibleColumns.invoice && <th className="px-4 py-3.5">Mã Hóa đơn</th>');
    expect(home).toContain('title={asset.invoiceKey || "Chưa liên kết"}');
  });

  it("provides an invoice filter beside the narrower catalog search field", () => {
    expect(home).toContain("flex-[1_1_260px]");
    expect(home).toContain("<FilterSelect value={invoice} onChange={onInvoiceChange} options={invoiceOptions} />");
  });

  it("opens the corresponding invoice detail when a linked invoice code is activated", () => {
    expect(home).toContain('url.searchParams.set("view", "invoices")');
    expect(home).toContain('url.searchParams.set("invoiceId", String(asset.purchaseInvoiceId))');
    expect(home).toContain('invoiceLink.textContent = asset.invoiceKey');
    expect(home).toContain('window.sessionStorage.setItem("assetmaster-return-to-asset-catalog", "true")');
    expect(home).toContain("onOpenInvoice(asset)");
  });

  it("uses the compact invoice-code typography in line with asset identifiers", () => {
    expect(home).toContain('font-mono !text-[11px] font-medium leading-none text-[#2666A8]');
  });

  it("keeps the invoice column compact and remembers its originating asset catalog", () => {
    expect(home).toContain('header.style.width = "130px"');
    expect(home).toContain('cell.style.maxWidth = "130px"');
    expect(home).toContain('assetmaster-return-to-asset-catalog');
    expect(home).toContain('assetmaster:return-to-asset-catalog');
    expect(home).toContain('assetmaster-asset-catalog-scroll-y');
    expect(home).toContain("window.scrollTo(0, savedScrollY)");
  });
});
