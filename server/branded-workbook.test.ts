import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

const { previewSpy } = vi.hoisted(() => ({ previewSpy: vi.fn() }));
vi.mock("../client/src/components/ExportPreviewHost", () => ({ openExportPreview: previewSpy }));

import { writeBrandedWorkbook } from "../client/src/lib/brandedWorkbook";

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
      company: { name: "Công ty Kiểm thử", brandColor: "#0F8C8C" },
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
  });
});
