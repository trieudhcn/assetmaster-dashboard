import type { jsPDF } from "jspdf";

export const handoverPdfFontUrl = "/manus-storage/DejaVuSans-Vietnamese-full_d828ad5d.ttf";
export const vietnamesePdfFontFamily = "DejaVuSansVietnamese";

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
