import { describe, expect, it } from "vitest";
import { assetImportHeaders, parseAssetImportRows, parseVietnameseCurrency, parseVietnameseDate, validateAssetImportHeaders } from "../client/src/lib/assetImport";

describe("asset Excel import", () => {
  it("parses a valid available asset row into an import candidate", () => {
    const result = parseAssetImportRows([{ "Tên tài sản*": "Laptop nhập", "Phân loại*": "Laptop", "Trạng thái (Sẵn có/Bảo trì)": "Sẵn có", "Tình trạng": "Tốt", "Giá trị (VNĐ)": "25000000" }]);
    expect(result.issues).toEqual([]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ assetCode: "", category: "Laptop", status: "available", condition: "good", purchaseValue: "25000000" });
  });

  it("requires a maintenance reason and a category in the same file", () => {
    const result = parseAssetImportRows([
      { "Tên tài sản*": "Máy in", "Phân loại*": "Máy in", "Trạng thái (Sẵn có/Bảo trì)": "Bảo trì", "Tình trạng": "Tốt" },
      { "Tên tài sản*": "Máy quét", "Trạng thái (Sẵn có/Bảo trì)": "Sẵn có", "Tình trạng": "Tốt" },
    ]);
    expect(result.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(["Tài sản Bảo trì cần có Lý do bảo trì.", "Cần nhập Tên tài sản và Phân loại."]));
  });

  it("parses Vietnamese dates in the template format", () => {
    expect(parseVietnameseDate("15/08/2026")).toBe(new Date(2026, 7, 15).getTime());
    expect(parseVietnameseDate("không phải ngày")).toBeNull();
    expect(parseVietnameseDate("31/02/2026")).toBeNull();
  });

  it("accepts only the exact template header and whole-number Vietnamese currency", () => {
    expect(validateAssetImportHeaders([...assetImportHeaders]).valid).toBe(true);
    expect(validateAssetImportHeaders(["Tên tài sản*", "Phân loại"] as string[]).valid).toBe(false);
    expect(parseVietnameseCurrency("25.000.000 VNĐ")).toBe("25000000");
    expect(parseVietnameseCurrency("25,000,000")).toBeNull();
    expect(parseVietnameseCurrency("1,5")).toBeNull();
  });

  it("does not require an input code because the server generates it from the category prefix", () => {
    const result = parseAssetImportRows([{ "Tên tài sản*": "Laptop cập nhật", "Phân loại*": "Laptop", "Trạng thái (Sẵn có/Bảo trì)": "Sẵn có", "Tình trạng": "Khá" }]);
    expect(result.issues).toEqual([]);
    expect(result.candidates[0]).toMatchObject({ assetCode: "", category: "Laptop", condition: "fair" });
  });

  it("preserves category and location values for the import preview table", () => {
    const result = parseAssetImportRows([{ "Tên tài sản*": "Màn hình xem trước", "Phân loại*": "Thiết bị CNTT", "Vị trí": "Kho tầng 3", "Trạng thái (Sẵn có/Bảo trì)": "Sẵn có", "Tình trạng": "Tốt" }]);
    expect(result.candidates[0]).toMatchObject({ category: "Thiết bị CNTT", location: "Kho tầng 3" });
  });

  it("keeps a corrected maintenance reason available for direct preview edits", () => {
    const result = parseAssetImportRows([{ "Tên tài sản*": "Thiết bị bảo trì", "Phân loại*": "Laptop", "Trạng thái (Sẵn có/Bảo trì)": "Bảo trì", "Lý do bảo trì": "Thay màn hình", "Tình trạng": "Cần kiểm tra" }]);
    expect(result.issues).toEqual([]);
    expect(result.candidates[0]).toMatchObject({ status: "maintenance", maintenanceReason: "Thay màn hình", condition: "needs_inspection" });
  });

  it("rejects invalid dates and ambiguous currency before import", () => {
    const result = parseAssetImportRows([{ "Tên tài sản*": "Máy in sai dữ liệu", "Phân loại*": "Máy in", "Trạng thái (Sẵn có/Bảo trì)": "Sẵn có", "Tình trạng": "Tốt", "Ngày mua (dd/mm/yyyy)": "31/02/2026", "Giá trị (VNĐ)": "1,5" }]);
    expect(result.issues.map((issue) => issue.message)).toContain("Ngày mua phải theo định dạng dd/mm/yyyy.");
  });
});
