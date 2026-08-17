import * as XLSX from "xlsx";

export type ExportCompanyInfo = {
  name?: string | null;
  address?: string | null;
  taxCode?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteTitle?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
};

type BrandedWorkbookOptions = {
  company?: ExportCompanyInfo | null;
  documentTitle: string;
  fileName: string;
  description?: string;
};

const infoSheetName = "Thông tin doanh nghiệp";

const toHexColor = (color?: string | null) => (color || "#0F8C8C").replace("#", "").toUpperCase();

function getStoredCompanyInfo(): ExportCompanyInfo {
  try {
    return JSON.parse(localStorage.getItem("assetmaster-company-info") || "{}") as ExportCompanyInfo;
  } catch {
    return {};
  }
}

async function loadLogoBase64(logoUrl: string) {
  const response = await fetch(logoUrl);
  if (!response.ok) throw new Error("Không thể tải logo doanh nghiệp.");
  let blob = await response.blob();
  let extension: "png" | "jpeg" = blob.type === "image/jpeg" ? "jpeg" : "png";
  if (blob.type === "image/webp") {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể chuyển đổi logo WebP.");
    context.drawImage(bitmap, 0, 0);
    blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Không thể chuyển đổi logo WebP.")), "image/png"));
    extension = "png";
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return { base64: btoa(binary), extension };
}

function addCompanyInfoSheet(workbook: XLSX.WorkBook, options: BrandedWorkbookOptions) {
  const company = options.company || getStoredCompanyInfo();
  const sheet = XLSX.utils.aoa_to_sheet([
    [options.documentTitle],
    [company.name || "Thông tin doanh nghiệp chưa được cập nhật"],
    [company.websiteTitle || "AssetMaster – Hệ thống Quản lý Tài sản"],
    ["Địa chỉ", company.address || "Chưa cập nhật"],
    ["Mã số thuế", company.taxCode || "Chưa cập nhật"],
    ["Điện thoại", company.phone || "Chưa cập nhật"],
    ["Email", company.email || "Chưa cập nhật"],
    ["Thời điểm xuất", new Date().toLocaleString("vi-VN")],
    ...(options.description ? [["Phạm vi / ghi chú", options.description]] : []),
  ]);
  sheet["!cols"] = [{ wch: 24 }, { wch: 100 }];
  workbook.Sheets[infoSheetName] = sheet;
  workbook.SheetNames = [infoSheetName, ...workbook.SheetNames.filter((name) => name !== infoSheetName)];
}

function downloadBlob(bytes: ArrayBuffer, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function writeBrandedWorkbook(workbook: XLSX.WorkBook, options: BrandedWorkbookOptions) {
  addCompanyInfoSheet(workbook, options);
  const { Workbook } = await import("exceljs");
  const brandedWorkbook = new Workbook();
  await brandedWorkbook.xlsx.load(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));
  const infoSheet = brandedWorkbook.getWorksheet(infoSheetName);
  if (!infoSheet) throw new Error("Không thể tạo trang thông tin doanh nghiệp.");

  const company = options.company || getStoredCompanyInfo();
  const brandColor = toHexColor(company.brandColor);
  infoSheet.mergeCells("A1:B1");
  infoSheet.mergeCells("A2:B2");
  infoSheet.mergeCells("A3:B3");
  infoSheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  infoSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${brandColor}` } };
  infoSheet.getCell("A1").alignment = { vertical: "middle" };
  infoSheet.getCell("A2").font = { bold: true, size: 13, color: { argb: "FF102A43" } };
  infoSheet.getCell("A3").font = { italic: true, size: 10, color: { argb: `FF${brandColor}` } };
  infoSheet.getColumn(1).width = 24;
  infoSheet.getColumn(2).width = 82;
  infoSheet.getRow(1).height = 30;
  for (let row = 4; row <= infoSheet.rowCount; row += 1) {
    const label = infoSheet.getCell(row, 1);
    label.font = { bold: true, color: { argb: "FF193B57" } };
    label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F7FB" } };
    label.alignment = { vertical: "top", wrapText: true };
    infoSheet.getCell(row, 2).alignment = { vertical: "top", wrapText: true };
  }

  if (company.logoUrl) {
    try {
      const logo = await loadLogoBase64(company.logoUrl);
      const imageId = brandedWorkbook.addImage({ base64: logo.base64, extension: logo.extension });
      infoSheet.addImage(imageId, { tl: { col: 2.05, row: 0.2 }, ext: { width: 116, height: 58 } });
      infoSheet.getRow(1).height = 46;
      infoSheet.getRow(2).height = 18;
    } catch {
      infoSheet.getCell("B1").value = "Logo doanh nghiệp";
    }
  } else {
    infoSheet.getCell("B1").value = "Logo doanh nghiệp chưa được cập nhật";
  }

  const bytes = await brandedWorkbook.xlsx.writeBuffer();
  downloadBlob(bytes as ArrayBuffer, options.fileName);
}
