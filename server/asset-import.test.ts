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
});
