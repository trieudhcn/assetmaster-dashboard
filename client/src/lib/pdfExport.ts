import { openExportPreview } from "@/components/ExportPreviewHost";

type PdfDocument = {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  getNumberOfPages: () => number;
  setPage: (page: number) => void;
  addImage: (imageData: string, format: "PNG", x: number, y: number, width: number, height: number, alias?: string, compression?: "FAST") => void;
  output: (type: "blob") => Blob;
};

const watermarkPreferenceKey = "assetmaster-pdf-watermark";

export function isPdfWatermarkEnabled() {
  return typeof window === "undefined" || window.localStorage.getItem(watermarkPreferenceKey) !== "off";
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
}

export async function createPdfLogoWatermark(logoUrl?: string | null) {
  if (!isPdfWatermarkEnabled() || !logoUrl) return null;
  const response = await fetch(logoUrl);
  if (!response.ok) throw new Error("Không thể tải logo watermark.");
  const dataUrl = await blobToDataUrl(await response.blob());
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 520;
      canvas.height = 520;
      const context = canvas.getContext("2d");
      if (!context) { reject(new Error("Không thể tạo watermark PDF.")); return; }
      const ratio = Math.min(400 / image.width, 400 / image.height);
      const width = image.width * ratio;
      const height = image.height * ratio;
      context.globalAlpha = 0.08;
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Không thể đọc logo watermark."));
    image.src = dataUrl;
  });
}

export function applyPdfLogoWatermark(doc: PdfDocument, watermarkDataUrl: string | null) {
  if (!watermarkDataUrl) return;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const size = Math.min(pageWidth, pageHeight) * 0.68;
  for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
    doc.setPage(page);
    doc.addImage(watermarkDataUrl, "PNG", (pageWidth - size) / 2, (pageHeight - size) / 2, size, size, undefined, "FAST");
  }
}

export function openPdfPreview(doc: PdfDocument, fileName: string, title: string) {
  openExportPreview({ blob: doc.output("blob"), fileName, title, kind: "pdf" });
}
