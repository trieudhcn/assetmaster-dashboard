import { jsPDF } from "jspdf";
import { formatVnd } from "@/lib/formatters";
import { drawPdfCorporateFooter, handoverPdfFontUrl, registerVietnamesePdfFont } from "@/lib/handoverPdf";
import { applyPdfLogoWatermark, createPdfLogoWatermark, openPdfPreview } from "@/lib/pdfExport";

export type RetirementPdfCompany = { name?: string | null; address?: string | null; taxCode?: string | null; phone?: string | null;
  email?: string | null; websiteUrl?: string | null; logoUrl?: string | null };
export type RetirementPdfAsset = {
  code: string;
  name: string;
  purchaseDate?: Date | string | number | null;
  value: string | number | null | undefined;
  salvageValue?: string | number | null | undefined;
  serial?: string | null;
  retiredAt?: Date | string | number | null;
  retirementReason?: string | null;
  retirementCertificateNumber?: string | null;
  note?: string | null;
};

const columns = [
  { key: "code", label: "Mã TS", width: 24 },
  { key: "name", label: "Tên tài sản", width: 55 },
  { key: "serial", label: "Seri", width: 30 },
  { key: "purchaseDate", label: "Ngày mua", width: 21 },
  { key: "value", label: "Nguyên giá\n(chưa gồm SC)", width: 30 },
  { key: "salvageValue", label: "Giá thanh lý", width: 30 },
  { key: "retirementReason", label: "Lý do thanh lý", width: 83 },
] as const;

async function loadImageData(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Không thể tải ảnh dùng cho biên bản.");
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
}

async function loadPdfFont() {
  const response = await fetch(handoverPdfFontUrl);
  if (!response.ok) throw new Error("Không thể tải phông chữ tiếng Việt cho biên bản.");
  return response.arrayBuffer();
}

function drawBrandMark(doc: jsPDF, x: number, y: number, logoDataUrl?: string) {
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", x, y - 12, 18, 18, undefined, "FAST"); return; } catch { /* fallback below */ }
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
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("vi-VN") : "";
}

function cellValue(asset: RetirementPdfAsset, key: typeof columns[number]["key"]) {
  if (key === "purchaseDate") return displayDate(asset.purchaseDate) || "—";
  if (key === "value") return `${formatVnd(asset.value)} VNĐ`;
  if (key === "salvageValue") return asset.salvageValue === null || asset.salvageValue === undefined || String(asset.salvageValue).trim() === "" ? "Chưa cập nhật" : `${formatVnd(asset.salvageValue)} VNĐ`;
  if (key === "serial") return asset.serial || "—";
  if (key === "retirementReason") return asset.retirementReason || DEFAULT_REASON;
  return asset[key] || "—";
}

const DEFAULT_REASON = "Thanh lý theo thời gian quy định";

function drawPageHeading(doc: jsPDF, certificateCode: string, company: RetirementPdfCompany, logoDataUrl: string | undefined) {
  const left = 12;
  drawBrandMark(doc, left, 18, logoDataUrl);
  doc.setTextColor(15, 140, 140);
  doc.setFontSize(9.5);
  doc.text(company.name || "AssetMaster", left + 23, 13);
  doc.setTextColor(96, 117, 138);
  doc.setFontSize(7);
  doc.text(`Địa chỉ: ${company.address || "Chưa cập nhật"}`, left + 23, 18);
  doc.text(`MST: ${company.taxCode || "Chưa cập nhật"} · Điện thoại: ${company.phone || "Chưa cập nhật"} · Email: ${company.email || "Chưa cập nhật"}${company.websiteUrl ? ` · Website: ${company.websiteUrl}` : ""}`, left + 23, 22.5);
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(14);
  doc.text("BIÊN BẢN KHẤU HAO / THANH LÝ TÀI SẢN", 148.5, 33, { align: "center" });
  doc.setFontSize(8.5);
  doc.setTextColor(15, 140, 140);
  doc.text(`Số biên bản: ${certificateCode}`, 148.5, 39, { align: "center" });
  doc.setTextColor(96, 117, 138);
  doc.setFontSize(7.5);
  doc.text("Danh sách tài sản thanh lý kèm theo biên bản", 148.5, 44.5, { align: "center" });
}

function drawTableHeader(doc: jsPDF, y: number) {
  let x = 12;
  doc.setFillColor(235, 239, 242);
  doc.rect(x, y, 273, 11, "F");
  doc.setTextColor(25, 59, 87);
  doc.setFontSize(6.6);
  columns.forEach((column) => {
    doc.rect(x, y, column.width, 11);
    const label = column.label.split("\n");
    doc.text(label, x + column.width / 2, y + (label.length > 1 ? 4 : 6.5), { align: "center" });
    x += column.width;
  });
  return y + 11;
}

function drawAssetRow(doc: jsPDF, asset: RetirementPdfAsset, y: number) {
  const lines = columns.map((column) => doc.splitTextToSize(String(cellValue(asset, column.key)), column.width - 3));
  const rowHeight = Math.max(11, ...lines.map((line) => line.length * 3.15 + 4));
  let x = 12;
  doc.setDrawColor(210, 224, 232);
  doc.setTextColor(25, 59, 87);
  doc.setFontSize(6.4);
  columns.forEach((column, index) => {
    doc.rect(x, y, column.width, rowHeight);
    doc.text(lines[index], x + column.width / 2, y + 3.5, { align: "center" });
    x += column.width;
  });
  return y + rowHeight;
}

function drawSalvageTotal(doc: jsPDF, y: number, assets: RetirementPdfAsset[]) {
  const salvageRows = assets.filter((asset) => asset.salvageValue !== null && asset.salvageValue !== undefined && String(asset.salvageValue).trim() !== "");
  const total = salvageRows.reduce((sum, asset) => sum + Number(String(asset.salvageValue).replace(/,/g, "")), 0);
  const originalCost = assets.reduce((sum, asset) => sum + Number(String(asset.value || "0").replace(/,/g, "")), 0);
  doc.setFillColor(247, 249, 250);
  doc.setDrawColor(210, 224, 232);
  doc.rect(12, y, 273, 10, "FD");
  doc.setTextColor(25, 59, 87);
  doc.setFontSize(7.4);
  doc.text("TỔNG NGUYÊN GIÁ", 226, y + 6.3, { align: "right" });
  doc.setFontSize(8);
  doc.text(`${formatVnd(originalCost)} VNĐ`, 282, y + 6.3, { align: "right" });
  y += 10;
  doc.setFillColor(247, 249, 250);
  doc.rect(12, y, 273, 10, "FD");
  doc.setTextColor(25, 59, 87);
  doc.setFontSize(7.4);
  doc.text("TỔNG CỘNG GIÁ TRỊ THANH LÝ", 226, y + 6.3, { align: "right" });
  doc.setFontSize(8);
  doc.text(salvageRows.length ? `${formatVnd(total)} VNĐ` : "Chưa cập nhật", 282, y + 6.3, { align: "right" });
  return y + 10;
}

function drawSignatures(doc: jsPDF, y: number) {
  const signatureY = Math.max(y + 9, 158);
  doc.setDrawColor(221, 231, 240);
  doc.line(12, signatureY - 5, 285, signatureY - 5);
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(8.5);
  doc.text("XÁC NHẬN CỦA CÁC BÊN", 12, signatureY);
  doc.setFontSize(7.2);
  doc.setTextColor(96, 117, 138);
  doc.text("Người lập biên bản", 58, signatureY + 11, { align: "center" });
  doc.text("Đại diện bộ phận quản lý", 148.5, signatureY + 11, { align: "center" });
  doc.text("Đại diện đơn vị xử lý", 239, signatureY + 11, { align: "center" });
}

export async function openRetirementPdf(assets: RetirementPdfAsset[], company: RetirementPdfCompany, fileName?: string, title?: string) {
  if (!assets.length) throw new Error("Chưa có biên bản thanh lý để xuất.");
  const certificateCode = assets[0].retirementCertificateNumber || "TL-DRAFT";
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  registerVietnamesePdfFont(doc, await loadPdfFont());
  const logoDataUrl = company.logoUrl ? await loadImageData(company.logoUrl).catch(() => undefined) : undefined;
  drawPageHeading(doc, certificateCode, company, logoDataUrl);
  let y = drawTableHeader(doc, 51);
  assets.forEach((asset) => {
    const estimatedHeight = Math.max(11, ...columns.map((column) => doc.splitTextToSize(String(cellValue(asset, column.key)), column.width - 3).length * 3.15 + 4));
    if (y + estimatedHeight > 151) {
      doc.addPage("a4", "landscape");
      drawPageHeading(doc, certificateCode, company, logoDataUrl);
      y = drawTableHeader(doc, 51);
    }
    y = drawAssetRow(doc, asset, y);
  });
  if (y + 25 > 151) {
    doc.addPage("a4", "landscape");
    drawPageHeading(doc, certificateCode, company, logoDataUrl);
    y = drawTableHeader(doc, 51);
  }
  y = drawSalvageTotal(doc, y, assets);
  drawSignatures(doc, y);
  applyPdfLogoWatermark(doc, await createPdfLogoWatermark(company.logoUrl).catch(() => null));
  drawPdfCorporateFooter(doc, company, "Biên bản thanh lý gộp");
  openPdfPreview(doc, fileName || `${certificateCode}-bien-ban-thanh-ly.pdf`, title || `Biên bản thanh lý ${certificateCode}`);
}
