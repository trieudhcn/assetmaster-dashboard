import { jsPDF } from "jspdf";
import { formatVnd } from "@/lib/formatters";
import { drawPdfCorporateFooter, handoverPdfFontUrl, registerVietnamesePdfFont } from "@/lib/handoverPdf";
import { applyPdfLogoWatermark, createPdfLogoWatermark, openPdfPreview } from "@/lib/pdfExport";

export type RetirementPdfCompany = { name?: string | null; address?: string | null; taxCode?: string | null; phone?: string | null; logoUrl?: string | null };
export type RetirementPdfAsset = {
  code: string;
  name: string;
  category?: string | null;
  purchaseDate?: Date | string | number | null;
  value: string | number | null | undefined;
  serial?: string | null;
  location?: string | null;
  retiredAt?: Date | string | number | null;
  retirementReason?: string | null;
  retirementCertificateNumber?: string | null;
  retirementAttachmentName?: string | null;
  note?: string | null;
};

async function loadImageData(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Không thể tải ảnh dùng cho biên bản.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
}

async function loadPdfFont() {
  const response = await fetch(handoverPdfFontUrl);
  if (!response.ok) throw new Error("Không thể tải phông chữ tiếng Việt cho biên bản.");
  return response.arrayBuffer();
}

function drawBrandMark(doc: jsPDF, x: number, y: number, logoDataUrl?: string) {
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", x, y - 12, 18, 18, undefined, "FAST"); return; } catch { /* Use the fallback brand mark. */ }
  }
  doc.setFillColor(15, 140, 140);
  doc.roundedRect(x, y - 12, 18, 18, 3, 3, "F");
  doc.setFillColor(16, 42, 67);
  doc.roundedRect(x + 3, y - 9, 12, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text("AM", x + 9, y - 1, { align: "center" });
}

function displayDate(value?: Date | string | number | null) {
  if (!value) return "Chưa ghi nhận";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("vi-VN") : "Chưa ghi nhận";
}

function drawRetirementRecord(doc: jsPDF, asset: RetirementPdfAsset, company: RetirementPdfCompany, logoDataUrl: string | undefined, page: number, totalPages: number) {
  const left = 18;
  let y = 22;
  doc.setTextColor(16, 42, 67);
  drawBrandMark(doc, left, y, logoDataUrl);
  doc.setTextColor(15, 140, 140);
  doc.setFontSize(10);
  doc.text(company.name || "AssetMaster", left + 24, y - 4);
  doc.setFontSize(8);
  doc.setTextColor(112, 134, 154);
  doc.text(`Địa chỉ: ${company.address || "Chưa cập nhật"}`, left + 24, y + 2);
  doc.text(`MST: ${company.taxCode || "Chưa cập nhật"} · Điện thoại: ${company.phone || "Chưa cập nhật"}`, left + 24, y + 8);
  y += 36;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(15);
  doc.text("BIÊN BẢN KHẤU HAO / THANH LÝ TÀI SẢN", 105, y, { align: "center" });
  y += 14;
  doc.setFontSize(10);
  const rows = [
    ["Số biên bản thanh lý", asset.retirementCertificateNumber || "Đang cấp số"],
    ["Mã tài sản", asset.code],
    ["Tên tài sản", asset.name],
    ["Phân loại", asset.category || "Chưa phân loại"],
    ["Ngày mua", displayDate(asset.purchaseDate)],
    ["Nguyên giá", `${formatVnd(asset.value)} VNĐ`],
    ["Số serial / IMEI", asset.serial || "Chưa cập nhật"],
    ["Vị trí lưu trữ", asset.location || "Chưa cập nhật"],
    ["Ngày thanh lý", displayDate(asset.retiredAt)],
    ["Lý do thanh lý", asset.retirementReason || "Chưa ghi nhận"],
    ["Chứng từ đính kèm", asset.retirementAttachmentName || "Không đính kèm"],
    ["Ghi chú", asset.note || "Không có"],
  ];
  rows.forEach(([label, value]) => {
    const wrapped = doc.splitTextToSize(String(value), 120);
    doc.setTextColor(112, 134, 154);
    doc.text(label, left, y);
    doc.setTextColor(25, 59, 87);
    doc.text(wrapped, 72, y);
    y += Math.max(9, wrapped.length * 5 + 3);
  });
  y = Math.min(y + 10, 235);
  doc.setDrawColor(221, 231, 240);
  doc.line(left, y, 192, y);
  y += 16;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(10);
  doc.text("XÁC NHẬN CỦA CÁC BÊN", left, y);
  doc.setFontSize(8);
  doc.setTextColor(112, 134, 154);
  doc.text("Người lập biên bản", 42, y + 10, { align: "center" });
  doc.text("Đại diện bộ phận quản lý", 105, y + 10, { align: "center" });
  doc.text("Người phê duyệt", 168, y + 10, { align: "center" });
}

export async function openRetirementPdf(assets: RetirementPdfAsset[], company: RetirementPdfCompany, fileName?: string, title?: string) {
  if (!assets.length) throw new Error("Chưa có biên bản thanh lý để xuất.");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registerVietnamesePdfFont(doc, await loadPdfFont());
  const logoDataUrl = company.logoUrl ? await loadImageData(company.logoUrl).catch(() => undefined) : undefined;
  assets.forEach((asset, index) => {
    if (index) doc.addPage();
    drawRetirementRecord(doc, asset, company, logoDataUrl, index + 1, assets.length);
  });
  applyPdfLogoWatermark(doc, await createPdfLogoWatermark(company.logoUrl).catch(() => null));
  drawPdfCorporateFooter(doc, company, assets.length === 1 ? "Biên bản thanh lý tài sản" : "Biên bản thanh lý gộp");
  const defaultName = assets.length === 1 ? `${assets[0].retirementCertificateNumber || assets[0].code}-bien-ban-thanh-ly.pdf` : "assetmaster-bien-ban-thanh-ly-gop.pdf";
  const defaultTitle = assets.length === 1 ? `Biên bản thanh lý ${assets[0].retirementCertificateNumber || assets[0].code}` : `Biên bản thanh lý gộp (${assets.length} tài sản)`;
  openPdfPreview(doc, fileName || defaultName, title || defaultTitle);
}
