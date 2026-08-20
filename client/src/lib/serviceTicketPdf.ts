import { jsPDF } from "jspdf";
import { drawPdfCorporateFooter, handoverPdfFontUrl, registerVietnamesePdfFont, vietnamesePdfFontFamily } from "@/lib/handoverPdf";
import { applyPdfLogoWatermark, createPdfLogoWatermark, openPdfPreview } from "@/lib/pdfExport";

export type ServiceTicketPdfCompany = {
  name?: string | null;
  address?: string | null;
  taxCode?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
};

type ServiceTicketPdfArgs = {
  ticket: any;
  asset?: any;
  assigneeName?: string;
  company?: ServiceTicketPdfCompany | null;
  autoPrint?: boolean;
};

const assetConditionLabels: Record<string, string> = { good: "Tốt", fair: "Đã qua sử dụng", needs_inspection: "Cần kiểm tra", damaged: "Hư hỏng" };

async function loadPdfImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Không thể tải logo công ty dùng cho phiếu.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function pdfImageFormat(dataUrl: string) {
  if (dataUrl.startsWith("data:image/jpeg")) return "JPEG" as const;
  if (dataUrl.startsWith("data:image/webp")) return "WEBP" as const;
  return "PNG" as const;
}

export async function previewServiceTicketPdf({ ticket, asset, assigneeName, company: suppliedCompany, autoPrint = false }: ServiceTicketPdfArgs) {
  const company = suppliedCompany || {};
  const warranty = ticket.serviceChannel === "warranty";
  const channelLabel = warranty ? "Bảo hành" : "Sửa chữa";
  const documentLabel = `Phiếu ${channelLabel.toLowerCase()} tài sản`;
  const documentTitle = warranty ? "PHIẾU BẢO HÀNH TÀI SẢN" : "PHIẾU SỬA CHỮA TÀI SẢN";
  const fileName = `${ticket.ticketCode}-${warranty ? "phieu-bao-hanh" : "phieu-sua-chua"}.pdf`;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fontResponse = await fetch(handoverPdfFontUrl);
  if (!fontResponse.ok) throw new Error("Không thể tải phông chữ tiếng Việt.");
  registerVietnamesePdfFont(doc, await fontResponse.arrayBuffer());
  const logoDataUrl = company.logoUrl ? await loadPdfImage(company.logoUrl).catch(() => undefined) : undefined;
  const left = 16;
  const right = 194;
  const width = right - left;
  let y = 18;

  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, pdfImageFormat(logoDataUrl), left, y - 7, 18, 18, undefined, "FAST"); } catch { /* Dùng tiêu đề chữ khi logo không tương thích. */ }
  }
  doc.setTextColor(16, 42, 67);
  doc.setFont(vietnamesePdfFontFamily, "bold");
  doc.setFontSize(12);
  doc.text(company.name || "ĐƠN VỊ QUẢN LÝ TÀI SẢN", logoDataUrl ? left + 22 : left, y);
  doc.setFont(vietnamesePdfFontFamily, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(96, 117, 138);
  const companyMeta = [company.address, company.taxCode ? `MST: ${company.taxCode}` : "", company.phone ? `ĐT: ${company.phone}` : ""].filter(Boolean).join(" · ");
  doc.text(doc.splitTextToSize(companyMeta || "Hệ thống Quản lý Tài sản Doanh nghiệp", logoDataUrl ? width - 22 : width), logoDataUrl ? left + 22 : left, y + 5);
  y += 27;
  doc.setDrawColor(15, 140, 140);
  doc.setLineWidth(0.7);
  doc.line(left, y, right, y);
  y += 11;
  doc.setTextColor(16, 42, 67);
  doc.setFont(vietnamesePdfFontFamily, "bold");
  doc.setFontSize(17);
  doc.text(documentTitle, 105, y, { align: "center" });
  y += 7;
  doc.setFontSize(9.5);
  doc.setTextColor(56, 85, 166);
  doc.text(ticket.ticketCode, 105, y, { align: "center" });
  y += 10;

  const preparedBy = ticket.reporterName || "Chưa cập nhật";
  const issuedAt = new Date(ticket.createdAt || ticket.openedAt);
  doc.setDrawColor(207, 226, 248);
  doc.setFillColor(239, 247, 255);
  doc.roundedRect(left, y - 4.5, width, 10, 2, 2, "FD");
  doc.setFont(vietnamesePdfFontFamily, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(38, 102, 168);
  doc.text("Người lập phiếu", left + 4, y);
  doc.text("Ngày lập phiếu", 117, y);
  doc.setFont(vietnamesePdfFontFamily, "normal");
  doc.setTextColor(25, 59, 87);
  doc.text(doc.splitTextToSize(preparedBy, 55), left + 31, y);
  doc.text(issuedAt.toLocaleDateString("vi-VN"), right - 4, y, { align: "right" });
  y += 16;

  doc.setFont(vietnamesePdfFontFamily, "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 140, 140);
  doc.text("THÔNG TIN TÀI SẢN", left, y);
  y += 5;
  const warrantyUntil = asset?.warrantyUntil ? new Date(asset.warrantyUntil) : null;
  const hasActiveWarranty = Boolean(warrantyUntil && !Number.isNaN(warrantyUntil.getTime()) && warrantyUntil.getTime() >= new Date().setHours(0, 0, 0, 0));
  const assetColumns = hasActiveWarranty ? [
    { label: "Mã tài sản", value: asset?.assetCode || `Tài sản #${ticket.assetId}`, width: 22 },
    { label: "Tên tài sản", value: asset?.name || "Không còn trong danh mục", width: 36 },
    { label: "Serial", value: asset?.serialNumber || "Chưa cập nhật", width: 26 },
    { label: "Tình trạng lỗi", value: ticket.description || asset?.maintenanceReason || "Chưa ghi nhận", width: 50 },
    { label: "Ngày mua", value: asset?.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN") : "Chưa cập nhật", width: 22 },
    { label: "Hạn bảo hành", value: warrantyUntil!.toLocaleDateString("vi-VN"), width: 22 },
  ] : [
    { label: "Mã tài sản", value: asset?.assetCode || `Tài sản #${ticket.assetId}`, width: 24 },
    { label: "Tên tài sản", value: asset?.name || "Không còn trong danh mục", width: 42 },
    { label: "Serial", value: asset?.serialNumber || "Chưa cập nhật", width: 28 },
    { label: "Tình trạng lỗi", value: ticket.description || asset?.maintenanceReason || "Chưa ghi nhận", width: 58 },
    { label: "Ngày mua", value: asset?.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN") : "Chưa cập nhật", width: 26 },
  ];
  const assetValueLines = assetColumns.map((column) => doc.splitTextToSize(String(column.value), column.width - 4));
  const assetValueHeight = Math.max(10, Math.max(...assetValueLines.map((lines) => lines.length)) * 4.2 + 4);
  let assetColumnX = left;
  assetColumns.forEach((column) => {
    doc.setDrawColor(205, 222, 238);
    doc.setFillColor(234, 243, 251);
    doc.rect(assetColumnX, y, column.width, 7, "FD");
    doc.setFont(vietnamesePdfFontFamily, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(82, 112, 137);
    doc.text(column.label, assetColumnX + 2, y + 4.5);
    assetColumnX += column.width;
  });
  assetColumnX = left;
  assetColumns.forEach((column, index) => {
    doc.setDrawColor(221, 231, 240);
    doc.setFillColor(255, 255, 255);
    doc.rect(assetColumnX, y + 7, column.width, assetValueHeight, "FD");
    doc.setFont(vietnamesePdfFontFamily, "normal");
    doc.setFontSize(8);
    doc.setTextColor(25, 59, 87);
    doc.text(assetValueLines[index], assetColumnX + 2, y + 11.5);
    assetColumnX += column.width;
  });
  y += 7 + assetValueHeight + 6;
  if (y > 242) { doc.addPage(); y = 26; }
  y += 12;
  doc.setDrawColor(221, 231, 240);
  doc.line(left, y, right, y);
  y += 9;
  doc.setFont(vietnamesePdfFontFamily, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(96, 117, 138);
  doc.text("Đại diện nhà cung cấp", left + 22, y, { align: "center" });
  doc.text("Người bàn giao", 105, y, { align: "center" });
  doc.text("Xác nhận quản lý", right - 22, y, { align: "center" });
  doc.setFontSize(7.5);
  doc.text(`Tạo ngày ${new Date().toLocaleDateString("vi-VN")}`, left, 286);
  applyPdfLogoWatermark(doc, await createPdfLogoWatermark(company.logoUrl).catch(() => null));
  drawPdfCorporateFooter(doc, company, documentLabel);
  openPdfPreview(doc, fileName, `${warranty ? "Phiếu Bảo hành" : "Phiếu Sửa chữa"} ${ticket.ticketCode}`, { autoPrint });
}
