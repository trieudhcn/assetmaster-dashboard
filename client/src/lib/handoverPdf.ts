import type { jsPDF } from "jspdf";
import vietnameseFontUrl from "@/assets/DejaVuSans.ttf?url";

// Keep the font inside the application bundle. The old Manus storage URL is
// not available in self-hosted/Docker deployments, which made every PDF flow
// fail before jsPDF could generate the document.
export const handoverPdfFontUrl = vietnameseFontUrl;
export const vietnamesePdfFontFamily = "DejaVuSansVietnamese";

export type PdfCorporateIdentity = {
  name?: string | null;
  address?: string | null;
  taxCode?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  hideWebsiteOnInternalPdf?: boolean | null;
};

/**
 * jsPDF's PNG decoder can render transparent pixels as black in some browser
 * and PDF viewer combinations. Composite uploaded logos onto white first so
 * their transparent background remains visually transparent on a white PDF.
 */
export async function loadPdfImageData(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Không thể tải logo công ty dùng cho PDF.");
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");
      if (!context) { reject(new Error("Không thể xử lý logo công ty cho PDF.")); return; }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Không thể đọc logo công ty cho PDF."));
    image.src = dataUrl;
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.byteLength; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

export function registerVietnamesePdfFont(doc: jsPDF, fontBuffer: ArrayBuffer) {
  try {
    const filename = "DejaVuSans.ttf";
    doc.addFileToVFS(filename, arrayBufferToBase64(fontBuffer));
    doc.addFont(filename, vietnamesePdfFontFamily, "normal");
    // The same face is registered for bold so headings retain Vietnamese
    // diacritics instead of silently falling back to a missing font.
    doc.addFont(filename, vietnamesePdfFontFamily, "bold");
    doc.setFont(vietnamesePdfFontFamily, "normal");
  } catch (error) {
    // A malformed/cached font must not prevent the document itself from being
    // generated. jsPDF's built-in Helvetica remains a valid last-resort font.
    console.warn("AssetMaster: Vietnamese PDF font unavailable; using fallback font.", error);
    doc.setFont("helvetica", "normal");
  }
}

/** A consistent corporate header for all printable AssetMaster records. */
export function drawPdfCorporateHeader(
  doc: jsPDF,
  company: PdfCorporateIdentity,
  options: { logoDataUrl?: string | null; left?: number; right?: number; top?: number; fallbackName?: string; showWebsite?: boolean } = {},
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
  const showWebsite = options.showWebsite ?? !company.hideWebsiteOnInternalPdf;
  const websiteLine = showWebsite && company.websiteUrl ? `Website: ${company.websiteUrl}` : "";
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
