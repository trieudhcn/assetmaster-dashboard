import * as XLSX from "xlsx";

export type RetirementExcelAsset = {
  id: number;
  assetCode: string;
  name: string;
  serialNumber: string | null;
  purchaseDate: Date | string | number | null;
  warrantyUntil: Date | string | number | null;
  purchaseValue: string | number | null;
  retirementReason: string | null;
};

export type RetirementServiceCost = {
  warrantyCost: number;
  repairCost: number;
};

const numeric = (value: string | number | null | undefined) => Number(value || 0) || 0;
const dateLabel = (value: Date | string | number | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export function serviceCostsByAsset<T extends { assetId: number; serviceChannel: "warranty" | "repair"; actualCost: string | number | null }>(tickets: T[]) {
  const result = new Map<number, RetirementServiceCost>();
  tickets.forEach((ticket) => {
    const current = result.get(ticket.assetId) || { warrantyCost: 0, repairCost: 0 };
    if (ticket.serviceChannel === "warranty") current.warrantyCost += numeric(ticket.actualCost);
    else current.repairCost += numeric(ticket.actualCost);
    result.set(ticket.assetId, current);
  });
  return result;
}

export function buildRetirementDetailWorkbook({ assets, salvageValueByAssetId, serviceCostByAssetId }: {
  assets: RetirementExcelAsset[];
  salvageValueByAssetId: Map<number, number>;
  serviceCostByAssetId: Map<number, RetirementServiceCost>;
}) {
  const headers = ["Mã TS", "Tên TS", "Số seri", "Ngày mua", "Hạn bảo hành", "Giá mua (VNĐ)", "Phí Bảo hành (VNĐ)", "Phí Sửa chữa (VNĐ)", "Giá thanh lý (VNĐ)", "Lý do thanh lý"];
  let totalPurchaseValue = 0;
  let totalWarrantyCost = 0;
  let totalRepairCost = 0;
  let totalSalvageValue = 0;
  const detailRows = assets.map((asset) => {
    const serviceCost = serviceCostByAssetId.get(asset.id) || { warrantyCost: 0, repairCost: 0 };
    const purchaseValue = numeric(asset.purchaseValue);
    const salvageValue = salvageValueByAssetId.get(asset.id) || 0;
    totalPurchaseValue += purchaseValue;
    totalWarrantyCost += serviceCost.warrantyCost;
    totalRepairCost += serviceCost.repairCost;
    totalSalvageValue += salvageValue;
    return [asset.assetCode, asset.name, asset.serialNumber || "", dateLabel(asset.purchaseDate), dateLabel(asset.warrantyUntil), purchaseValue, serviceCost.warrantyCost, serviceCost.repairCost, salvageValue, asset.retirementReason || ""];
  });
  const totalRow = ["TỔNG CỘNG", "", "", "", "", totalPurchaseValue, totalWarrantyCost, totalRepairCost, totalSalvageValue, ""];
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...detailRows, [], totalRow]);
  sheet["!cols"] = [{ wch: 16 }, { wch: 36 }, { wch: 18 }, { wch: 15 }, { wch: 16 }, { wch: 19 }, { wch: 21 }, { wch: 21 }, { wch: 20 }, { wch: 42 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Danh sách thanh lý");
  return { workbook, summary: { totalPurchaseValue, totalWarrantyCost, totalRepairCost, totalSalvageValue }, totalRowNumber: detailRows.length + 3 };
}
