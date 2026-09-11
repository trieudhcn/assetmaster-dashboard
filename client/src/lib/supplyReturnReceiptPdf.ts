import { jsPDF } from "jspdf";
import {
  applyPdfLogoWatermark,
  createPdfLogoWatermark,
  openPdfPreview,
} from "@/lib/pdfExport";
import {
  drawPdfCorporateFooter,
  drawPdfCorporateHeader,
  handoverPdfFontUrl,
  registerVietnamesePdfFont,
} from "@/lib/handoverPdf";
import { formatQuantity } from "@shared/quantity";

type CompanyInfo = {
  name?: string | null;
  address?: string | null;
  taxCode?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  hideWebsiteOnInternalPdf?: boolean | null;
  logoUrl?: string | null;
};

type SupplyReturnReceipt = {
  requestCode: string;
  returnReceiptCode: string | null;
  sourceReferenceCode: string;
  deliveredByName: string | null;
  receivedByName: string | null;
  receiptCreatedAt: Date | string | null;
  note: string | null;
  reviewNote: string | null;
};

type SupplyReturnReceiptItem = {
  supplyCode: string;
  supplyName: string;
  unit: string;
  requestedQuantity: string;
  goodQuantity: string;
  damagedQuantity: string;
  missingQuantity: string;
  repairQuantity: string;
  conditionNote: string | null;
};

function readCompanyInfo(): CompanyInfo {
  try {
    return JSON.parse(
      localStorage.getItem("assetmaster-company-info") || "{}"
    );
  } catch {
    return {};
  }
}

async function loadCompanyLogoForPdf(logoUrl?: string | null) {
  if (!logoUrl) return null;
  const response = await fetch(logoUrl);
  if (!response.ok) return null;
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    return await new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 160;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Không thể tạo logo cho PDF."));
          return;
        }
        const ratio = Math.min(132 / image.width, 132 / image.height);
        const width = image.width * ratio;
        const height = image.height * ratio;
        context.drawImage(
          image,
          (160 - width) / 2,
          (160 - height) / 2,
          width,
          height
        );
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () =>
        reject(new Error("Không thể đọc logo doanh nghiệp."));
      image.src = objectUrl;
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function openSupplyReturnReceiptPdf(
  receipt: SupplyReturnReceipt,
  items: SupplyReturnReceiptItem[]
) {
  if (!receipt.returnReceiptCode)
    throw new Error("Yêu cầu chưa có biên bản hoàn trả.");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let hasVietnameseFont = false;
  try {
    const response = await fetch(handoverPdfFontUrl);
    if (response.ok) {
      registerVietnamesePdfFont(doc, await response.arrayBuffer());
      hasVietnameseFont = true;
    }
  } catch {
    // Fallback font is used when the custom font is unavailable.
  }

  const company = readCompanyInfo();
  const headerLogo = await loadCompanyLogoForPdf(company.logoUrl);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const header = drawPdfCorporateHeader(doc, company, {
    logoDataUrl: headerLogo,
    left: margin,
    right: pageWidth - margin,
    fallbackName: "THÔNG TIN DOANH NGHIỆP",
  });
  const titleY = header.contentY + 3;
  const informationY = titleY + 18;

  doc.setFontSize(16);
  doc.setTextColor(16, 42, 67);
  doc.text("BIÊN BẢN HOÀN TRẢ PHỤ KIỆN", pageWidth / 2, titleY, {
    align: "center",
  });
  doc.setFontSize(9.5);
  doc.text(
    `Mã biên bản: ${receipt.returnReceiptCode}`,
    pageWidth / 2,
    titleY + 7,
    { align: "center" }
  );
  doc.text(`Yêu cầu: ${receipt.requestCode}`, margin, informationY);
  doc.text(
    `Phiếu nguồn: ${receipt.sourceReferenceCode}`,
    margin,
    informationY + 6
  );
  doc.text(
    `Người giao: ${receipt.deliveredByName || "Chưa xác định"}`,
    margin,
    informationY + 12
  );
  doc.text(
    `Người nhận/kiểm đếm: ${receipt.receivedByName || "Chưa xác định"}`,
    margin,
    informationY + 18
  );
  doc.text(
    `Thời gian: ${receipt.receiptCreatedAt ? new Date(receipt.receiptCreatedAt).toLocaleString("vi-VN") : "Chưa xác định"}`,
    margin,
    informationY + 24
  );

  const widths = [10, 22, 41, 18, 18, 18, 18, 25];
  const headers = [
    "STT",
    "Mã",
    "Tên phụ kiện",
    "Yêu cầu",
    "Tốt",
    "Hỏng",
    "Thiếu",
    "Cần sửa",
  ];
  let y = informationY + 32;
  const setFont = (bold = false) => {
    if (hasVietnameseFont)
      doc.setFont("DejaVuSansVietnamese", bold ? "bold" : "normal");
  };
  const drawRow = (cells: string[], height = 9, bold = false) => {
    let x = margin;
    setFont(bold);
    cells.forEach((cell, index) => {
      doc.rect(x, y, widths[index], height);
      doc.setFontSize(7.5);
      doc.text(cell, x + 1.5, y + 5.6, {
        maxWidth: widths[index] - 3,
      });
      x += widths[index];
    });
    y += height;
  };

  drawRow(headers, 9, true);
  items.forEach((item, index) => {
    if (y > 248) {
      doc.addPage();
      y = 20;
      drawRow(headers, 9, true);
    }
    drawRow([
      String(index + 1),
      item.supplyCode,
      item.supplyName,
      `${formatQuantity(item.requestedQuantity)} ${item.unit}`,
      formatQuantity(item.goodQuantity),
      formatQuantity(item.damagedQuantity),
      formatQuantity(item.missingQuantity),
      formatQuantity(item.repairQuantity),
    ]);
    if (item.conditionNote) {
      setFont(false);
      doc.setFontSize(7.5);
      doc.text(`Tình trạng: ${item.conditionNote}`, margin + 2, y + 4, {
        maxWidth: pageWidth - margin * 2 - 4,
      });
      y += 7;
    }
  });

  const notes = [
    receipt.note ? `Ghi chú người giao: ${receipt.note}` : "",
    receipt.reviewNote ? `Kết luận kiểm đếm: ${receipt.reviewNote}` : "",
  ].filter(Boolean);
  notes.forEach(note => {
    setFont(false);
    doc.setFontSize(8);
    doc.text(note, margin, y + 5, { maxWidth: pageWidth - margin * 2 });
    y += 8;
  });

  if (y > 242) {
    doc.addPage();
    y = 28;
  }
  const signatureY = y + 16;
  setFont(true);
  doc.setFontSize(9.5);
  doc.text("NGƯỜI GIAO", margin + 32, signatureY, { align: "center" });
  doc.text("NGƯỜI NHẬN / KIỂM ĐẾM", pageWidth - margin - 38, signatureY, {
    align: "center",
  });
  setFont(false);
  doc.setFontSize(8);
  doc.text("(Ký, ghi rõ họ tên)", margin + 32, signatureY + 5, {
    align: "center",
  });
  doc.text(
    "(Ký, ghi rõ họ tên)",
    pageWidth - margin - 38,
    signatureY + 5,
    { align: "center" }
  );
  doc.text(
    receipt.deliveredByName || "",
    margin + 32,
    signatureY + 28,
    { align: "center" }
  );
  doc.text(
    receipt.receivedByName || "",
    pageWidth - margin - 38,
    signatureY + 28,
    { align: "center" }
  );

  const watermark = await createPdfLogoWatermark(company.logoUrl);
  applyPdfLogoWatermark(doc, watermark);
  drawPdfCorporateFooter(doc, company, "Biên bản hoàn trả phụ kiện");
  openPdfPreview(
    doc,
    `${receipt.returnReceiptCode}.pdf`,
    `Biên bản hoàn trả ${receipt.returnReceiptCode}`
  );
}
