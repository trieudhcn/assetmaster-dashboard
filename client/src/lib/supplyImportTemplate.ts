export type SupplyImportDropdowns = {
  categories: string[];
  vendors: string[];
  brands: string[];
};

const headers = ["Mã vật tư", "Tên vật tư", "Đơn vị tính", "Tồn đầu kỳ", "Mức tồn tối thiểu", "Đơn giá VNĐ", "Vị trí kho", "Phân loại", "Nhà cung cấp", "Hãng", "Ghi chú"];
const cleanOptions = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean).sort((left, right) => left.localeCompare(right, "vi"))));

export async function buildSupplyImportTemplate(dropdowns: SupplyImportDropdowns) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const template = workbook.addWorksheet("Danh sách phụ kiện");
  const lists = workbook.addWorksheet("Danh sách chọn");
  const categories = cleanOptions(dropdowns.categories);
  const vendors = cleanOptions(dropdowns.vendors);
  const brands = cleanOptions(dropdowns.brands);

  template.addRow(headers);
  template.addRow(["PK-CHUOT-M100", "Chuột Logitech M100", "Cái", 10, 3, 50000, "Kho CNTT - Kệ A", "", "", "", ""]);
  template.views = [{ state: "frozen", ySplit: 1 }];
  template.columns = [{ width: 20 }, { width: 34 }, { width: 16 }, { width: 15 }, { width: 20 }, { width: 18 }, { width: 28 }, { width: 28 }, { width: 30 }, { width: 28 }, { width: 38 }];
  template.getRow(1).height = 27;
  template.getRow(1).font = { bold: true, color: { argb: "FF193B57" } };
  template.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF3F4" } };
  template.getRow(1).alignment = { vertical: "middle", wrapText: true };
  template.getRow(2).alignment = { vertical: "middle" };
  template.getCell("F2").numFmt = "#,##0";

  lists.addRow(["Phân loại", "Nhà cung cấp", "Hãng"]);
  const maxRows = Math.max(categories.length, vendors.length, brands.length, 1);
  for (let index = 0; index < maxRows; index += 1) lists.addRow([categories[index] || "", vendors[index] || "", brands[index] || ""]);
  lists.columns = [{ width: 32 }, { width: 36 }, { width: 32 }];
  lists.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  lists.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF087A6A" } };
  lists.getRow(1).alignment = { vertical: "middle" };
  lists.getRow(1).height = 24;
  lists.getCell("A1").note = "Danh sách được lấy từ các dropdown hiện có của form Phụ kiện.";
  workbook.definedNames.add(`'Danh sách chọn'!$A$2:$A$${maxRows + 1}`, "SupplyCategories");
  workbook.definedNames.add(`'Danh sách chọn'!$B$2:$B$${maxRows + 1}`, "SupplyVendors");
  workbook.definedNames.add(`'Danh sách chọn'!$C$2:$C$${maxRows + 1}`, "SupplyBrands");

  for (let row = 2; row <= 201; row += 1) {
    template.getCell(`H${row}`).dataValidation = { type: "list", allowBlank: true, formulae: ["SupplyCategories"], showErrorMessage: true, errorTitle: "Phân loại không hợp lệ", error: "Chọn Phân loại từ danh sách có sẵn." };
    template.getCell(`I${row}`).dataValidation = { type: "list", allowBlank: true, formulae: ["SupplyVendors"], showErrorMessage: true, errorTitle: "Nhà cung cấp không hợp lệ", error: "Chọn Nhà cung cấp từ danh sách có sẵn." };
    template.getCell(`J${row}`).dataValidation = { type: "list", allowBlank: true, formulae: ["SupplyBrands"], showErrorMessage: true, errorTitle: "Hãng không hợp lệ", error: "Chọn Hãng từ danh sách có sẵn." };
  }
  return workbook;
}
