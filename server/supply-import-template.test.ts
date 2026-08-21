import { describe, expect, it } from "vitest";
import { buildSupplyImportTemplate, resolveActiveSupplyImportCatalog, standardSupplyUnits } from "../client/src/lib/supplyImportTemplate";

describe("supply import template", () => {
  it("provides dropdowns for every catalog-select field on the supply form", async () => {
    const workbook = await buildSupplyImportTemplate({ categories: ["Thiết bị CNTT", "Phụ kiện"], vendors: ["Nhà cung cấp A"], brands: ["Hãng B", "Hãng A"] });
    const template = workbook.getWorksheet("Danh sách phụ kiện");
    const lists = workbook.getWorksheet("Danh sách chọn");

    expect(template?.getRow(1).values).toEqual(expect.arrayContaining(["Đơn vị tính", "Phân loại", "Nhà cung cấp", "Hãng"]));
    expect(lists?.getCell("A2").value).toBe("Bộ");
    expect(lists?.getCell("B2").value).toBe("Phụ kiện");
    expect(lists?.getCell("C2").value).toBe("Nhà cung cấp A");
    expect(lists?.getCell("D2").value).toBe("Hãng A");
    expect(template?.getCell("C2").dataValidation).toMatchObject({ type: "list", formulae: ["SupplyUnits"] });
    expect(template?.getCell("H2").dataValidation).toMatchObject({ type: "list", formulae: ["SupplyCategories"] });
    expect(template?.getCell("I2").dataValidation).toMatchObject({ type: "list", formulae: ["SupplyVendors"] });
    expect(template?.getCell("J2").dataValidation).toMatchObject({ type: "list", formulae: ["SupplyBrands"] });
    expect(standardSupplyUnits).toContain("Cái");
  });

  it("flags catalog values that have been disabled before import", () => {
    const result = resolveActiveSupplyImportCatalog("Nhà cung cấp cũ", [{ value: "6", label: "Nhà cung cấp cũ", isActive: false }], "Nhà cung cấp");
    expect(result).toEqual({ id: null, error: "Nhà cung cấp “Nhà cung cấp cũ” đã bị vô hiệu hóa" });
  });

  it("uses the configured unit list when provided", async () => {
    const workbook = await buildSupplyImportTemplate({ units: ["Tấm", "Túi"], categories: [], vendors: [], brands: [] });
    const lists = workbook.getWorksheet("Danh sách chọn");
    expect(lists?.getCell("A2").value).toBe("Tấm");
    expect(lists?.getCell("A3").value).toBe("Túi");
  });
});
