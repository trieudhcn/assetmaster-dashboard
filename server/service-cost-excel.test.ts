import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { buildServiceCostWorkbook } from "../client/src/lib/serviceCostExcel";

describe("service cost workbook", () => {
  it("exports filtered warranty and repair tickets with asset dates and a total cost row", () => {
    const { workbook, summary, totalRowNumber } = buildServiceCostWorkbook([
      { ticketCode: "BH-2026-001", warrantyRequestCode: "BH-2026-001", serviceChannel: "warranty", assetCode: "LAP-00001", assetName: "Laptop", serialNumber: "SN-01", purchaseDate: new Date("2025-02-03"), warrantyUntil: new Date("2027-02-03"), openedAt: new Date("2026-01-10"), resolvedAt: new Date("2026-01-15"), actualCost: "120000" },
      { ticketCode: "SC-2026-004", serviceChannel: "repair", assetCode: "MOUSE-00001", assetName: "Chuột", serialNumber: null, purchaseDate: new Date("2024-06-01"), warrantyUntil: null, openedAt: new Date("2026-03-04"), resolvedAt: null, actualCost: "30000" },
    ]);

    const sheet = workbook.Sheets["Chi phí BH-SC"];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    expect(rows[0]).toEqual(["Mã phiếu BH/SC", "Kênh xử lý", "Mã TS", "Tên TS", "Seri", "Ngày mua", "Hạn Bảo hành", "Ngày gửi BH/SC", "Ngày trả BH/SC", "Chi phí BH/SC (VNĐ)"]);
    expect(rows[1]).toMatchObject(["BH-2026-001", "Bảo hành", "LAP-00001", "Laptop", "SN-01", "03/02/2025", "03/02/2027", "10/01/2026", "15/01/2026", 120000]);
    expect(rows[2]).toMatchObject(["SC-2026-004", "Sửa chữa", "MOUSE-00001", "Chuột", "", "01/06/2024", "", "04/03/2026", "", 30000]);
    expect(rows[totalRowNumber - 1]).toEqual(["TỔNG CHI PHÍ", "", "", "", "", "", "", "", "", 150000]);
    expect(summary).toEqual({ warrantyCost: 120000, repairCost: 30000, totalCost: 150000, ticketCount: 2 });
  });
});
