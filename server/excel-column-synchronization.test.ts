import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Đồng bộ cột Excel", () => {
  it("giữ nhãn Mã Hóa đơn thống nhất giữa template import và danh mục", () => {
    const assetImport = readProjectFile("client/src/lib/assetImport.ts");
    const assetImportModal = readProjectFile(
      "client/src/components/AssetImportModal.tsx"
    );
    const catalog = readProjectFile("client/src/lib/catalogUi.ts");

    expect(assetImport).toContain('"Mã Hóa đơn"');
    expect(assetImportModal).toContain("Mã Hóa đơn là tùy chọn");
    expect(catalog).toContain(
      '"Mã Hóa đơn": asset.invoiceKey || "Chưa liên kết"'
    );
  });

  it("đưa Chi nhánh và License vào các workbook Tài sản có liên quan", () => {
    const catalog = readProjectFile("client/src/lib/catalogUi.ts");
    const reports = readProjectFile(
      "client/src/pages/ReportsManagementView.tsx"
    );
    const audits = readProjectFile("client/src/pages/OperationsModules.tsx");

    expect(catalog).toMatch(
      /"Chi nhánh":\s*asset\.branch\s*\|\|\s*asset\.branchLabel/
    );
    expect(catalog).toMatch(
      /License:\s*asset\.licenseLabels\?\.join\("; "\)\s*\|\|\s*"Chưa cấp"/
    );
    expect(reports).toContain("activeLicenseLabelsByAssetId");
    expect(reports).toContain('"Mã Hóa đơn": asset.purchaseInvoiceId');
    expect(audits).toContain("const assetInvoiceKey");
    expect(audits).toMatch(/"License":\s*assetLicenseLabels\(asset\)/);
    expect(audits).toContain(
      "fieldworkSheet.getCell(`L${row}`).dataValidation"
    );
  });
});
