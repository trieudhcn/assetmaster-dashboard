import type { jsPDF } from "jspdf";

export const handoverPdfFontUrl = "/manus-storage/DejaVuSans-Vietnamese-full_d828ad5d.ttf";
export const vietnamesePdfFontFamily = "DejaVuSansVietnamese";

export type PdfCorporateIdentity = { name?: string | null };

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
    doc.text(`Lập ngày ${new Date().toLocaleDateString("vi-VN")} · Trang ${page}/${pageCount}`, right, pageHeight - 8, { align: "right" });
  }
}
