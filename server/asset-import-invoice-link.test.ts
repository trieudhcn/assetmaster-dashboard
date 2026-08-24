import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("asset import invoice linkage", () => {
  it("creates a direct-download template with a dedicated invoice-number column", () => {
    const modal = readProjectFile("client/src/components/AssetImportModal.tsx");
    const workbook = readProjectFile("client/src/lib/brandedWorkbook.ts");
    const parser = readProjectFile("client/src/lib/assetImport.ts");

    expect(parser).toContain('"Số Hóa đơn"');
    expect(modal).toContain("downloadDirect: true");
    expect(modal).toContain("isDownloadingTemplate");
    expect(workbook).toContain("downloadDirect?: boolean");
    expect(workbook).toContain("link.download = options.fileName");
  });

  it("resolves an imported invoice number to a valid existing purchase invoice", () => {
    const router = readProjectFile("server/routers.ts");
    const parser = readProjectFile("client/src/lib/assetImport.ts");
    const template = readProjectFile("client/src/lib/assetImportTemplate.ts");

    expect(parser).toContain("invoiceNumber: string | null");
    expect(parser).toContain('text(row["Số Hóa đơn"]) || null');
    expect(router).toContain("const invoiceByKey = new Map");
    expect(router).toContain("const invoicesByNumber = new Map");
    expect(router).toContain("Không tìm thấy Hóa đơn");
    expect(router).toContain("purchaseInvoiceId");
    expect(template).toContain('target: "I2:I101"');
    expect(template).toContain('target: "J2:J101"');
  });
});
