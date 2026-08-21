import { describe, expect, it } from "vitest";
import { buildSupplyImportTemplate } from "../client/src/lib/supplyImportTemplate";

describe("supply import template", () => {
  it("provides dropdowns for every catalog-select field on the supply form", async () => {
    const workbook = await buildSupplyImportTemplate({ categories: ["Thiết bị CNTT", "Phụ kiện"], vendors: ["Nhà cung cấp A"], brands: ["Hãng B", "Hãng A"] });
    const template = workbook.getWorksheet("Danh sách phụ kiện");
    const lists = workbook.getWorksheet("Danh sách chọn");

    expect(template?.getRow(1).values).toEqual(expect.arrayContaining(["Phân loại", "Nhà cung cấp", "Hãng"]));
    expect(lists?.getCell("A2").value).toBe("Phụ kiện");
    expect(lists?.getCell("B2").value).toBe("Nhà cung cấp A");
    expect(lists?.getCell("C2").value).toBe("Hãng A");
    expect(template?.getCell("H2").dataValidation).toMatchObject({ type: "list", formulae: ["SupplyCategories"] });
    expect(template?.getCell("I2").dataValidation).toMatchObject({ type: "list", formulae: ["SupplyVendors"] });
    expect(template?.getCell("J2").dataValidation).toMatchObject({ type: "list", formulae: ["SupplyBrands"] });
  });
});
