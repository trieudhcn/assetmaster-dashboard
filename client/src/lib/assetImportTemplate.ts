export type TemplateCatalogValues = {
  categories: string[];
  vendors: string[];
  brands: string[];
};

export const uniqueTemplateNames = (values: Array<string | null | undefined>) => [
  ...new Set(
    values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  ),
];

export function configureAssetImportTemplate(workbook: any, { categories, vendors, brands }: TemplateCatalogValues) {
  const templateSheet = workbook.getWorksheet("Danh sách tài sản");
  if (!templateSheet) return;

  templateSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F3F5" } };
  templateSheet.getRow(1).font = { bold: true, color: { argb: "FF193B57" } };
  templateSheet.getRow(1).alignment = { vertical: "middle", wrapText: true };

  const optionSheet = workbook.addWorksheet("Danh mục chọn");
  optionSheet.state = "veryHidden";
  const dropdowns = [
    { key: "ImportCategories", header: "Phân loại", values: categories, column: "A", target: "B2:B101" },
    { key: "ImportVendors", header: "Nhà cung cấp", values: vendors, column: "B", target: "I2:I101" },
    { key: "ImportBrands", header: "Hãng", values: brands, column: "C", target: "J2:J101" },
  ];

  dropdowns.forEach(({ key, header, values, column, target }) => {
    optionSheet.getCell(`${column}1`).value = header;
    values.forEach((value, index) => optionSheet.getCell(`${column}${index + 2}`).value = value);
    if (!values.length) return;
    workbook.definedNames.add(`'Danh mục chọn'!$${column}$2:$${column}$${values.length + 1}`, key);
    templateSheet.dataValidations.add(target, { type: "list", allowBlank: true, formulae: [`=${key}`] });
  });
}
