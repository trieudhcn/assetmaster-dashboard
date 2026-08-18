import { jsPDF } from "jspdf";
import { createPdfLogoWatermark, applyPdfLogoWatermark, openPdfPreview } from "@/lib/pdfExport";
import { handoverPdfFontUrl, registerVietnamesePdfFont } from "@/lib/handoverPdf";

type CompanyInfo = { name?: string | null; address?: string | null; taxCode?: string | null; phone?: string | null; logoUrl?: string | null };
type SupplyIssueSlipPdf = { referenceCode: string; recipientName: string; issuedByName: string | null; issuedAt: Date; note: string | null };
type SupplyIssueItemPdf = { supplyCode: string; supplyName: string; unit: string; issuedQuantity: string; returnedQuantity: string };

function companyInfo(): CompanyInfo {
  try { return JSON.parse(localStorage.getItem("assetmaster-company-info") || "{}"); } catch { return {}; }
}

export async function openSupplyIssueSlipPdf(slip: SupplyIssueSlipPdf, items: SupplyIssueItemPdf[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let hasVietnameseFont = false;
  try {
    const response = await fetch(handoverPdfFontUrl);
    if (response.ok) { registerVietnamesePdfFont(doc, await response.arrayBuffer()); hasVietnameseFont = true; }
  } catch { /* Fallback font is used when the custom font is temporarily unavailable. */ }
  const company = companyInfo();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(15);
  doc.text(company.name || "THÔNG TIN DOANH NGHIỆP", margin, 19);
  doc.setFontSize(9);
  const companyLines = [company.address && `Địa chỉ: ${company.address}`, company.taxCode && `MST: ${company.taxCode}`, company.phone && `Điện thoại: ${company.phone}`].filter(Boolean) as string[];
  companyLines.forEach((line, index) => doc.text(line, margin, 25 + index * 5));
  doc.setDrawColor(15, 140, 140);
  doc.line(margin, 39, pageWidth - margin, 39);
  doc.setFontSize(17);
  doc.setTextColor(16, 42, 67);
  doc.text("PHIẾU CẤP PHÁT VẬT TƯ", pageWidth / 2, 51, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Mã phiếu: ${slip.referenceCode}`, pageWidth / 2, 58, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Người nhận: ${slip.recipientName}`, margin, 69);
  doc.text(`Người cấp: ${slip.issuedByName || "Quản trị viên"}`, margin, 75);
  doc.text(`Ngày cấp: ${new Date(slip.issuedAt).toLocaleString("vi-VN")}`, margin, 81);
  if (slip.note) doc.text(`Ghi chú: ${slip.note}`, margin, 87, { maxWidth: pageWidth - margin * 2 });
  const startY = slip.note ? 96 : 90;
  const widths = [12, 32, 68, 22, 26, 26];
  const headers = ["STT", "Mã", "Tên vật tư", "Đơn vị", "Số lượng", "Đã trả"];
  let y = startY;
  const drawRow = (cells: string[], height = 9, bold = false) => {
    let x = margin;
    cells.forEach((cell, index) => { doc.rect(x, y, widths[index], height); doc.setFontSize(8.5); if (hasVietnameseFont) doc.setFont("DejaVuSansVietnamese", "normal"); doc.text(cell, x + 2, y + 5.8, { maxWidth: widths[index] - 4 }); x += widths[index]; });
    y += height;
  };
  drawRow(headers, 9, true);
  items.forEach((item, index) => {
    if (y > 255) { doc.addPage(); y = 20; drawRow(headers, 9, true); }
    drawRow([String(index + 1), item.supplyCode, item.supplyName, item.unit, Number(item.issuedQuantity).toLocaleString("vi-VN"), Number(item.returnedQuantity).toLocaleString("vi-VN")]);
  });
  const signatureY = Math.min(y + 20, 265);
  doc.setFontSize(10);
  doc.text("NGƯỜI CẤP", margin + 30, signatureY, { align: "center" });
  doc.text("NGƯỜI NHẬN", pageWidth - margin - 30, signatureY, { align: "center" });
  doc.setFontSize(8);
  doc.text("(Ký, ghi rõ họ tên)", margin + 30, signatureY + 5, { align: "center" });
  doc.text("(Ký, ghi rõ họ tên)", pageWidth - margin - 30, signatureY + 5, { align: "center" });
  const watermark = await createPdfLogoWatermark(company.logoUrl);
  applyPdfLogoWatermark(doc, watermark);
  openPdfPreview(doc, `${slip.referenceCode}.pdf`, `Phiếu cấp phát ${slip.referenceCode}`);
}
