import type { jsPDF } from "jspdf";

export const handoverPdfFontUrl = "/manus-storage/DejaVuSans-Vietnamese-full_d828ad5d.ttf";
export const vietnamesePdfFontFamily = "DejaVuSansVietnamese";

export type PdfCorporateIdentity = {
  name?: string | null;
  address?: string | null;
  taxCode?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.byteLength; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

export function registerVietnamesePdfFont(doc: jsPDF, fontBuffer: ArrayBuffer) {
  const filename = "DejaVuSans-Vietnamese-full.ttf";
  doc.addFileToVFS(filename, arrayBufferToBase64(fontBuffer));
  doc.addFont(filename, vietnamesePdfFontFamily, "normal");
  // The same complete Unicode face is intentionally registered for bold so
  // every PDF heading retains Vietnamese diacritics instead of falling back.
  doc.addFont(filename, vietnamesePdfFontFamily, "bold");
  doc.setFont(vietnamesePdfFontFamily, "normal");
}

/** A consistent corporate header for all printable AssetMaster records. */
export function drawPdfCorporateHeader(
  doc: jsPDF,
  company: PdfCorporateIdentity,
  options: { logoDataUrl?: string | null; left?: number; right?: number; top?: number; fallbackName?: string } = {},
) {
  const left = options.left ?? 16;
  const right = options.right ?? (doc.internal.pageSize.getWidth() - 16);
  const top = options.top ?? 10;
  const logoSize = 18;
  const hasLogo = Boolean(options.logoDataUrl);
  const textX = hasLogo ? left + 24 : left;
  const textWidth = right - textX;

  if (options.logoDataUrl) {
    try { doc.addImage(options.logoDataUrl, "PNG", left, top, logoSize, logoSize, undefined, "FAST"); } catch { /* Giữ tiêu đề chữ khi logo không khả dụng. */ }
  }

  doc.setTextColor(15, 140, 140);
  doc.setFont(vietnamesePdfFontFamily, "bold");
  doc.setFontSize(12);
  doc.text(company.name || options.fallbackName || "ĐƠN VỊ QUẢN LÝ TÀI SẢN", textX, top + 6);

  doc.setFont(vietnamesePdfFontFamily, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(96, 117, 138);
  let lineY = top + 12;
  const address = company.address ? `Địa chỉ: ${company.address}` : "";
  if (address) {
    const addressLines = doc.splitTextToSize(address, textWidth);
    doc.text(addressLines, textX, lineY);
    lineY += Math.max(4.3, addressLines.length * 4.3);
  }
  const primaryContactLine = [
    company.taxCode ? `MST: ${company.taxCode}` : "",
    company.phone ? `Điện thoại: ${company.phone}` : "",
  ].filter(Boolean).join(" · ");
  if (primaryContactLine) {
    const contactLines = doc.splitTextToSize(primaryContactLine, textWidth);
    doc.text(contactLines, textX, lineY);
    lineY += Math.max(4.3, contactLines.length * 4.3);
  }
  const emailLine = company.email ? `Email: ${company.email}` : "";
  if (emailLine) {
    const emailLines = doc.splitTextToSize(emailLine, textWidth);
    doc.text(emailLines, textX, lineY);
    lineY += Math.max(4.3, emailLines.length * 4.3);
  }
  const websiteLine = company.websiteUrl ? `Website: ${company.websiteUrl}` : "";
  if (websiteLine) {
    const websiteLines = doc.splitTextToSize(websiteLine, textWidth);
    doc.text(websiteLines, textX, lineY);
    lineY += Math.max(4.3, websiteLines.length * 4.3);
  }

  const dividerY = Math.max(top + 25, lineY + 5);
  doc.setDrawColor(15, 140, 140);
  doc.setLineWidth(0.45);
  doc.line(left, dividerY, right, dividerY);
  return { dividerY, contentY: dividerY + 11, left, right };
}

export function drawPdfCorporateFooter(doc: jsPDF, company: PdfCorporateIdentity, documentLabel: string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 16;
  const right = pageWidth - 16;

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont(vietnamesePdfFontFamily, "normal");
    doc.setDrawColor(221, 231, 240);
    doc.line(left, pageHeight - 14, right, pageHeight - 14);
    doc.setTextColor(112, 134, 154);
    doc.setFontSize(7.5);
    doc.text(`${company.name || "Đơn vị quản lý tài sản"} · ${documentLabel}`, left, pageHeight - 8);
    doc.text(`Trang ${page}/${pageCount}`, right, pageHeight - 8, { align: "right" });
  }
}
