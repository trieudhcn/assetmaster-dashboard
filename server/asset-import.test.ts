import { describe, expect, it } from "vitest";
import { parseAssetImportRows, parseVietnameseDate } from "../client/src/lib/assetImport";

describe("asset Excel import", () => {
  it("parses a valid available asset row into an import candidate", () => {
    const result = parseAssetImportRows([{ "Mã tài sản*": "TS-IMP-001", "Tên tài sản*": "Laptop nhập", "Trạng thái (Sẵn có/Bảo trì)": "Sẵn có", "Tình trạng": "Tốt", "Giá trị (VNĐ)": "25000000" }]);
    expect(result.issues).toEqual([]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ assetCode: "TS-IMP-001", status: "available", condition: "good", purchaseValue: "25000000" });
  });

  it("requires a maintenance reason and prevents duplicate codes in the same file", () => {
    const result = parseAssetImportRows([
      { "Mã tài sản*": "TS-IMP-002", "Tên tài sản*": "Máy in", "Trạng thái (Sẵn có/Bảo trì)": "Bảo trì", "Tình trạng": "Tốt" },
      { "Mã tài sản*": "TS-IMP-003", "Tên tài sản*": "Máy quét", "Trạng thái (Sẵn có/Bảo trì)": "Sẵn có", "Tình trạng": "Tốt" },
      { "Mã tài sản*": "TS-IMP-003", "Tên tài sản*": "Máy quét thứ hai", "Trạng thái (Sẵn có/Bảo trì)": "Sẵn có", "Tình trạng": "Tốt" },
    ]);
    expect(result.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(["Tài sản Bảo trì cần có Lý do bảo trì.", "Mã tài sản TS-IMP-003 bị lặp trong tệp."]));
  });

  it("parses Vietnamese dates in the template format", () => {
    expect(parseVietnameseDate("15/08/2026")).toBe(new Date(2026, 7, 15).getTime());
    expect(parseVietnameseDate("không phải ngày")).toBeNull();
  });

  it("keeps a valid asset code as a candidate so the server can apply update-by-code mode", () => {
    const result = parseAssetImportRows([{ "Mã tài sản*": "TS-EXISTING-001", "Tên tài sản*": "Laptop cập nhật", "Trạng thái (Sẵn có/Bảo trì)": "Sẵn có", "Tình trạng": "Khá" }]);
    expect(result.issues).toEqual([]);
    expect(result.candidates[0]).toMatchObject({ assetCode: "TS-EXISTING-001", condition: "fair" });
  });

  it("preserves category and location values for the import preview table", () => {
    const result = parseAssetImportRows([{ "Mã tài sản*": "TS-PREVIEW-001", "Tên tài sản*": "Màn hình xem trước", "Phân loại": "Thiết bị CNTT", "Vị trí": "Kho tầng 3", "Trạng thái (Sẵn có/Bảo trì)": "Sẵn có", "Tình trạng": "Tốt" }]);
    expect(result.candidates[0]).toMatchObject({ category: "Thiết bị CNTT", location: "Kho tầng 3" });
  });

  it("keeps a corrected maintenance reason available for direct preview edits", () => {
    const result = parseAssetImportRows([{ "Mã tài sản*": "TS-EDIT-001", "Tên tài sản*": "Thiết bị bảo trì", "Trạng thái (Sẵn có/Bảo trì)": "Bảo trì", "Lý do bảo trì": "Thay màn hình", "Tình trạng": "Cần kiểm tra" }]);
    expect(result.issues).toEqual([]);
    expect(result.candidates[0]).toMatchObject({ status: "maintenance", maintenanceReason: "Thay màn hình", condition: "needs_inspection" });
  });
});
