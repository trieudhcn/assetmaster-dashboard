import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { buildRetirementDetailWorkbook, serviceCostsByAsset } from "../client/src/lib/retirementExcel";

describe("retirement detail workbook", () => {
  it("exports one row per asset with warranty, repair, salvage values, and a total row", () => {
    const costs = serviceCostsByAsset([
      { assetId: 10, serviceChannel: "warranty" as const, actualCost: "12000" },
      { assetId: 10, serviceChannel: "repair" as const, actualCost: "30000" },
      { assetId: 11, serviceChannel: "repair" as const, actualCost: null },
    ]);
    const { workbook, summary, totalRowNumber } = buildRetirementDetailWorkbook({
      assets: [
        { id: 10, assetCode: "MOUSE-00001", name: "Chuột", serialNumber: "M-01", purchaseDate: new Date("2025-01-02"), warrantyUntil: new Date("2026-01-02"), purchaseValue: "160000", retirementReason: "Hỏng" },
        { id: 11, assetCode: "KEY-00001", name: "Bàn phím", serialNumber: null, purchaseDate: null, warrantyUntil: null, purchaseValue: "700000", retirementReason: "Hết hạn sử dụng" },
      ],
      salvageValueByAssetId: new Map([[10, 50000], [11, 100000]]),
      serviceCostByAssetId: costs,
    });

    const sheet = workbook.Sheets["Danh sách thanh lý"];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    expect(rows[0]).toEqual(["Mã TS", "Tên TS", "Số seri", "Ngày mua", "Hạn bảo hành", "Giá mua (VNĐ)", "Phí Bảo hành (VNĐ)", "Phí Sửa chữa (VNĐ)", "Giá thanh lý (VNĐ)", "Lý do thanh lý"]);
    expect(rows[1]).toMatchObject(["MOUSE-00001", "Chuột", "M-01", "02/01/2025", "02/01/2026", 160000, 12000, 30000, 50000, "Hỏng"]);
    expect(rows[totalRowNumber - 1]).toEqual(["TỔNG CỘNG", "", "", "", "", 860000, 12000, 30000, 150000, ""]);
    expect(summary).toEqual({ totalPurchaseValue: 860000, totalWarrantyCost: 12000, totalRepairCost: 30000, totalSalvageValue: 150000 });
  });
});
