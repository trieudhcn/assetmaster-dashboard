import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatQuantity, isInvalidWholeQuantity, quantityValueForExport, requiresWholeQuantity } from "../shared/quantity";

const readProjectFile = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("quantity formatting and whole-unit validation", () => {
  it("formats whole quantities without a decimal suffix while preserving fractional units", () => {
    expect(formatQuantity("1.00")).toBe("1");
    expect(formatQuantity(12)).toBe("12");
    expect(formatQuantity("1.25")).toBe("1,25");
    expect(quantityValueForExport("1.00")).toBe(1);
  });

  it("requires whole quantities for standard count-based units but not weight and length", () => {
    expect(requiresWholeQuantity("Cái")).toBe(true);
    expect(requiresWholeQuantity("Bộ")).toBe(true);
    expect(requiresWholeQuantity("Kg")).toBe(false);
    expect(requiresWholeQuantity("Mét")).toBe(false);
    expect(isInvalidWholeQuantity("Cái", "1.5")).toBe(true);
    expect(isInvalidWholeQuantity("Cái", "2")).toBe(false);
    expect(isInvalidWholeQuantity("Kg", "1.5")).toBe(false);
  });

  it("routes Excel, PDF and supply workflows through the shared quantity rules", () => {
    const workbook = readProjectFile("../client/src/lib/brandedWorkbook.ts");
    const supplyPdf = readProjectFile("../client/src/lib/supplyIssueSlipPdf.ts");
    const handoverPdf = readProjectFile("../client/src/lib/handoverAssetPdf.ts");
    const supplies = readProjectFile("../client/src/pages/SuppliesInventoryView.tsx");
    const router = readProjectFile("./routers.ts");

    expect(workbook).toContain("quantityValueForExport");
    expect(workbook).toContain('numFmt = "0.###"');
    expect(supplyPdf).toContain("formatQuantity(item.issuedQuantity)");
    expect(handoverPdf).toContain("formatQuantity(Number(item.issuedQuantity)");
    expect(supplies).toContain("Đơn vị ${form.unit || \"Cái\"} chỉ nhận số lượng nguyên.");
    expect(supplies).toContain("issueItemsHaveFractionalWholeUnit");
    expect(router).toContain("function requireWholeQuantity");
    expect(router).toContain("Số lượng tiếp nhận");
    expect(router).toContain("Số lượng cấp phát");
  });
});
