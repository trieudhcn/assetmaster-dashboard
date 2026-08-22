import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

const { previewSpy } = vi.hoisted(() => ({ previewSpy: vi.fn() }));
vi.mock("../client/src/components/ExportPreviewHost", () => ({ openExportPreview: previewSpy }));

import { writeBrandedWorkbook } from "../client/src/lib/brandedWorkbook";
import { configureAssetImportTemplate, uniqueTemplateNames } from "../client/src/lib/assetImportTemplate";

describe("branded workbook", () => {
  it("creates a readable workbook without the cross-library XML conversion", async () => {
    const source = XLSX.utils.book_new();
    const fieldwork = XLSX.utils.aoa_to_sheet([
      ["Mã tài sản", "Trạng thái thực tế", "Kết quả kiểm kê"],
      ["LT-0001", "Sẵn có", "Khớp"],
    ]);
    fieldwork["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 20 }];
    fieldwork["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(source, fieldwork, "Danh sách kiểm kê");

    await writeBrandedWorkbook(source, {
      documentTitle: "DANH SÁCH KIỂM KÊ THỰC ĐỊA",
      fileName: "kiem-ke.xlsx",
      company: { name: "Công ty Kiểm thử", email: "contact@example.vn", websiteUrl: "https://example.vn", brandColor: "#0F8C8C" },
      prepareWorkbook: (workbook) => {
        const sheet = workbook.getWorksheet("Danh sách kiểm kê");
        sheet.getCell("B2").dataValidation = { type: "list", allowBlank: true, formulae: ['"Chưa ghi nhận,Sẵn có"'] };
      },
    });

    expect(previewSpy).toHaveBeenCalledTimes(1);
    const payload = previewSpy.mock.calls[0][0] as { blob: Blob };
    const { Workbook } = await import("exceljs");
    const reopened = new Workbook();
    await reopened.xlsx.load(await payload.blob.arrayBuffer());
    expect(reopened.worksheets.map((sheet) => sheet.name)).toEqual(["Thông tin doanh nghiệp", "Danh sách kiểm kê"]);
    expect(reopened.getWorksheet("Danh sách kiểm kê")?.getCell("A2").value).toBe("LT-0001");
    expect(reopened.getWorksheet("Danh sách kiểm kê")?.getCell("B2").dataValidation.type).toBe("list");
    expect(reopened.getWorksheet("Thông tin doanh nghiệp")?.getCell("B7").value).toBe("contact@example.vn");
    expect(reopened.getWorksheet("Thông tin doanh nghiệp")?.getCell("C7").value).toBe("Website");
    expect(reopened.getWorksheet("Thông tin doanh nghiệp")?.getCell("D7").value).toBe("https://example.vn");
  });

  it("localizes technical preview and import labels in the generated workbook", async () => {
    const source = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(source, XLSX.utils.aoa_to_sheet([["Preview import"], ["TEMPLATE IMPORT TÀI SẢN"]]), "Preview import");

    await writeBrandedWorkbook(source, {
      documentTitle: "PREVIEW CẬP NHẬT KIỂM KÊ",
      fileName: "kiem-ke-preview.xlsx",
      company: { name: "Công ty Kiểm thử", brandColor: "#0F8C8C" },
    });

    const payload = previewSpy.mock.calls.at(-1)?.[0] as { blob: Blob; title: string };
    const { Workbook } = await import("exceljs");
    const reopened = new Workbook();
    await reopened.xlsx.load(await payload.blob.arrayBuffer());
    expect(payload.title).toBe("XEM TRƯỚC CẬP NHẬT KIỂM KÊ");
    expect(reopened.getWorksheet("Xem trước nhập liệu")?.getCell("A2").value).toBe("MẪU NHẬP TÀI SẢN");
  });

  it("formats the bulk asset template header and adds catalog dropdowns", async () => {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    const template = workbook.addWorksheet("Danh sách tài sản");
    template.addRow(["Tên tài sản*", "Phân loại*", "Trạng thái", "Lý do", "Tình trạng", "Ngày mua", "Giá trị", "Nhà cung cấp", "Hãng"]);
    template.addRow(["Laptop mẫu", "Laptop", "Sẵn có", "", "Tốt", "15/08/2026", "25000000", "Nhà cung cấp A", "Hãng A"]);

    configureAssetImportTemplate(workbook, { categories: ["Laptop", "Thiết bị mạng"], vendors: ["Nhà cung cấp A"], brands: ["Hãng A"] });

    expect(template.getRow(1).fill).toMatchObject({ fgColor: { argb: "FFF1F3F5" } });
    expect(workbook.getWorksheet("Danh mục chọn")?.state).toBe("veryHidden");
    expect(workbook.getWorksheet("Danh mục chọn")?.getCell("A2").value).toBe("Laptop");
    const reopened = new Workbook();
    await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
    const reopenedTemplate = reopened.getWorksheet("Danh sách tài sản");
    expect(reopenedTemplate?.getCell("B2").dataValidation).toMatchObject({ type: "list", formulae: ["=ImportCategories"] });
    expect(reopenedTemplate?.getCell("H2").dataValidation).toMatchObject({ type: "list", formulae: ["=ImportVendors"] });
    expect(reopenedTemplate?.getCell("I2").dataValidation).toMatchObject({ type: "list", formulae: ["=ImportBrands"] });
    expect(uniqueTemplateNames(["Laptop", " Laptop ", "", null, "Màn hình"])).toEqual(["Laptop", "Màn hình"]);
  });
});
