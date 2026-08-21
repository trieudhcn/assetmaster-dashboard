import * as XLSX from "xlsx";

export type ServiceCostExcelTicket = {
  ticketCode: string;
  warrantyRequestCode?: string | null;
  serviceChannel: "warranty" | "repair";
  assetCode: string;
  assetName: string;
  serialNumber?: string | null;
  purchaseDate?: Date | string | number | null;
  warrantyUntil?: Date | string | number | null;
  openedAt?: Date | string | number | null;
  resolvedAt?: Date | string | number | null;
  actualCost?: string | number | null;
};

const numeric = (value: string | number | null | undefined) => Number(value || 0) || 0;
const dateLabel = (value: Date | string | number | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export function buildServiceCostWorkbook(tickets: ServiceCostExcelTicket[]) {
  const headers = ["Mã phiếu BH/SC", "Kênh xử lý", "Mã TS", "Tên TS", "Seri", "Ngày mua", "Hạn Bảo hành", "Ngày gửi BH/SC", "Ngày trả BH/SC", "Chi phí BH/SC (VNĐ)"];
  let warrantyCost = 0;
  let repairCost = 0;
  const detailRows = tickets.map((ticket) => {
    const actualCost = numeric(ticket.actualCost);
    if (ticket.serviceChannel === "warranty") warrantyCost += actualCost;
    else repairCost += actualCost;
    return [ticket.warrantyRequestCode || ticket.ticketCode, ticket.serviceChannel === "warranty" ? "Bảo hành" : "Sửa chữa", ticket.assetCode, ticket.assetName, ticket.serialNumber || "", dateLabel(ticket.purchaseDate), dateLabel(ticket.warrantyUntil), dateLabel(ticket.openedAt), dateLabel(ticket.resolvedAt), actualCost];
  });
  const totalCost = warrantyCost + repairCost;
  const totalRow = ["TỔNG CHI PHÍ", "", "", "", "", "", "", "", "", totalCost];
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...detailRows, [], totalRow]);
  sheet["!cols"] = [{ wch: 18 }, { wch: 15 }, { wch: 16 }, { wch: 34 }, { wch: 18 }, { wch: 15 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 22 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Chi phí BH-SC");
  return { workbook, summary: { warrantyCost, repairCost, totalCost, ticketCount: tickets.length }, totalRowNumber: detailRows.length + 3 };
}
