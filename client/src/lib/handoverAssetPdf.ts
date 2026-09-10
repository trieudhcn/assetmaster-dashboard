import { jsPDF } from "jspdf";
import { applyPdfLogoWatermark, createPdfLogoWatermark, openPdfPreview } from "@/lib/pdfExport";
import { drawPdfCorporateFooter, drawPdfCorporateHeader, handoverPdfFontUrl, loadPdfImageData, registerVietnamesePdfFont } from "@/lib/handoverPdf";
import { formatQuantity } from "@shared/quantity";

export type HandoverPdfCompany = { name?: string | null; address?: string | null; taxCode?: string | null; phone?: string | null;
  email?: string | null; websiteUrl?: string | null; hideWebsiteOnInternalPdf?: boolean | null; logoUrl?: string | null };
export type HandoverPdfInput = { referenceCode: string; assetCode: string; assetName: string; branchName?: string | null; recipientName: string; recipientDepartmentName?: string | null; handoverByName?: string | null; handedOverAt: Date; conditionOut?: string | null; accessories?: string | null; note?: string | null; status?: string | null; supplyItems: Array<{ supplyCode: string; supplyName: string; unit: string; issuedQuantity: string; returnedQuantity?: string | null }> };

function drawBrandMark(doc: jsPDF, x: number, y: number, logoDataUrl?: string) {
  if (logoDataUrl) { try { doc.addImage(logoDataUrl, "PNG", x, y - 12, 18, 18, undefined, "FAST"); return; } catch { /* Use brand fallback. */ } }
  doc.setFillColor(15, 140, 140); doc.roundedRect(x, y - 12, 18, 18, 3, 3, "F"); doc.setFillColor(16, 42, 67); doc.roundedRect(x + 3, y - 9, 12, 12, 2, 2, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.text("AM", x + 9, y - 1, { align: "center" });
}

export async function openHandoverAssetPdf(input: HandoverPdfInput, company: HandoverPdfCompany, options?: { autoPrint?: boolean; fileName?: string }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fontResponse = await fetch(handoverPdfFontUrl);
  if (!fontResponse.ok) throw new Error("Không thể tải phông chữ tiếng Việt cho biên bản.");
  registerVietnamesePdfFont(doc, await fontResponse.arrayBuffer());
  const logoDataUrl = company.logoUrl ? await loadPdfImageData(company.logoUrl).catch(() => undefined) : undefined;
  const left = 18;
  const header = drawPdfCorporateHeader(doc, company, { logoDataUrl, left, right: 192 });
  let y = header.contentY + 4;
  doc.setTextColor(16, 42, 67); doc.setFontSize(15); doc.text("BIÊN BẢN BÀN GIAO TÀI SẢN", 105, y, { align: "center" }); y += 12;
  doc.setFontSize(13); doc.text(`Số phiếu: ${input.referenceCode}`, left, y); y += 12;
  const rows = [["Tài sản", `${input.assetName} (${input.assetCode})`], ["Chi nhánh", input.branchName || "Chưa gán"], ["Người nhận", input.recipientName], ["Phòng ban", input.recipientDepartmentName || "Chưa gán"], ["Ngày bàn giao", new Date(input.handedOverAt).toLocaleDateString("vi-VN")], ["Người lập", input.handoverByName || "Quản trị viên"], ["Tình trạng", input.conditionOut || "Không ghi nhận"], ["Phụ kiện", input.accessories || "Không có"], ["Ghi chú", input.note || "Không có"], ["Trạng thái", input.status || "Đã bàn giao"]];
  rows.forEach(([label, value]) => { const wrappedValue = doc.splitTextToSize(String(value), 118); doc.setFontSize(10); doc.setTextColor(112, 134, 154); doc.text(label, left, y); doc.setTextColor(25, 59, 87); doc.text(wrappedValue, 70, y); y += Math.max(9, wrappedValue.length * 5 + 3); });
  const outstandingItems = input.supplyItems.filter((item) => Number(item.issuedQuantity) - Number(item.returnedQuantity || 0) > 0);
  if (outstandingItems.length) { y += 4; doc.setDrawColor(221, 231, 240); doc.line(left, y, 192, y); y += 9; doc.setFontSize(10); doc.setTextColor(16, 42, 67); doc.text("PHỤ KIỆN CÒN ĐANG GIỮ", left, y); y += 7; outstandingItems.forEach((item) => { doc.setFontSize(8.5); doc.setTextColor(25, 59, 87); doc.text(`${item.supplyName} (${item.supplyCode})`, left, y); doc.setTextColor(8, 122, 106); doc.text(`Còn ${formatQuantity(Number(item.issuedQuantity) - Number(item.returnedQuantity || 0))} ${item.unit}`, 192, y, { align: "right" }); y += 6; }); }
  y = Math.min(y + 16, 250); doc.setDrawColor(221, 231, 240); doc.line(left, y, 192, y); y += 13; doc.setTextColor(16, 42, 67); doc.setFontSize(10); doc.text("NGƯỜI BÀN GIAO", 53, y, { align: "center" }); doc.text("NGƯỜI NHẬN", 157, y, { align: "center" }); doc.setFontSize(8); doc.setTextColor(112, 134, 154); doc.text("(Ký, ghi rõ họ tên)", 53, y + 5, { align: "center" }); doc.text("(Ký, ghi rõ họ tên)", 157, y + 5, { align: "center" });
  const watermark = await createPdfLogoWatermark(company.logoUrl).catch(() => null); applyPdfLogoWatermark(doc, watermark); drawPdfCorporateFooter(doc, company, "Biên bản bàn giao tài sản");
  const fallbackFileName = `${input.referenceCode}-phieu-cap-phat-tai-san`;
  const sanitizedBaseName = (options?.fileName || fallbackFileName).trim().replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || fallbackFileName;
  openPdfPreview(doc, `${sanitizedBaseName}.pdf`, `Biên bản bàn giao ${input.referenceCode}`, { autoPrint: options?.autoPrint, skipFilenamePrompt: Boolean(options?.fileName) });
}
