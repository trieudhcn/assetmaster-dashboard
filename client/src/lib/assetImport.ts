export const assetImportHeaders = [
  "Tên tài sản*",
  "Phân loại*",
  "Trạng thái (Sẵn có/Bảo trì)",
  "Lý do bảo trì",
  "Tình trạng",
  "Ngày mua (dd/mm/yyyy)",
  "Giá trị (VNĐ)",
  "Nhà cung cấp",
  "Hãng",
  "Serial/IMEI",
  "Vị trí",
  "Hạn bảo hành (dd/mm/yyyy)",
  "Ghi chú",
] as const;

export type AssetImportCandidate = {
  rowNumber: number;
  assetCode: string;
  name: string;
  category: string;
  status: "available" | "maintenance";
  maintenanceReason: string | null;
  condition: "good" | "fair" | "needs_inspection" | "damaged";
  purchaseDate: number | null;
  purchaseValue: string | null;
  vendor: string | null;
  brandName: string | null;
  serialNumber: string | null;
  location: string | null;
  warrantyUntil: number | null;
  note: string | null;
};

export type AssetImportIssue = { rowNumber: number; message: string };

const text = (value: unknown) => String(value ?? "").trim();

export function parseVietnameseDate(value: unknown) {
  const source = text(value);
  if (!source) return null;
  const vietnamese = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(source);
  if (vietnamese) {
    const date = new Date(Number(vietnamese[3]), Number(vietnamese[2]) - 1, Number(vietnamese[1]));
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }
  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export function parseAssetImportRows(rows: Array<Record<string, unknown>>) {
  const issues: AssetImportIssue[] = [];
  const candidates: AssetImportCandidate[] = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const assetCode = "";
    const name = text(row["Tên tài sản*"]);
    const category = text(row["Phân loại*"]) || text(row["Phân loại"]);
    const statusText = text(row["Trạng thái (Sẵn có/Bảo trì)"]) || "Sẵn có";
    const conditionText = text(row["Tình trạng"]) || "Tốt";
    const status = statusText.toLocaleLowerCase("vi-VN") === "bảo trì" ? "maintenance" : statusText.toLocaleLowerCase("vi-VN") === "sẵn có" ? "available" : null;
    const conditionMap: Record<string, AssetImportCandidate["condition"]> = { "tốt": "good", "khá": "fair", "cần kiểm tra": "needs_inspection", "hư hỏng": "damaged" };
    const condition = conditionMap[conditionText.toLocaleLowerCase("vi-VN")];
    const maintenanceReason = text(row["Lý do bảo trì"]) || null;
    const purchaseDateSource = text(row["Ngày mua (dd/mm/yyyy)"]);
    const warrantySource = text(row["Hạn bảo hành (dd/mm/yyyy)"]);
    const purchaseDate = parseVietnameseDate(purchaseDateSource);
    const warrantyUntil = parseVietnameseDate(warrantySource);
    const purchaseValueSource = text(row["Giá trị (VNĐ)"]).replace(/[,.\s]/g, "");
    if (!name || !category) issues.push({ rowNumber, message: "Cần nhập Tên tài sản và Phân loại." });
    else if (!status) issues.push({ rowNumber, message: "Trạng thái chỉ nhận Sẵn có hoặc Bảo trì." });
    else if (!condition) issues.push({ rowNumber, message: "Tình trạng chỉ nhận Tốt, Khá, Cần kiểm tra hoặc Hư hỏng." });
    else if (status === "maintenance" && !maintenanceReason) issues.push({ rowNumber, message: "Tài sản Bảo trì cần có Lý do bảo trì." });
    else if (purchaseDateSource && !purchaseDate) issues.push({ rowNumber, message: "Ngày mua phải theo định dạng dd/mm/yyyy." });
    else if (warrantySource && !warrantyUntil) issues.push({ rowNumber, message: "Hạn bảo hành phải theo định dạng dd/mm/yyyy." });
    else if (purchaseValueSource && !/^\d+(\.\d{1,2})?$/.test(purchaseValueSource)) issues.push({ rowNumber, message: "Giá trị phải là số tiền hợp lệ." });
    else {
      candidates.push({ rowNumber, assetCode, name, category, status, maintenanceReason, condition, purchaseDate, purchaseValue: purchaseValueSource || null, vendor: text(row["Nhà cung cấp"]) || null, brandName: text(row["Hãng"]) || null, serialNumber: text(row["Serial/IMEI"]) || null, location: text(row["Vị trí"]) || null, warrantyUntil, note: text(row["Ghi chú"]) || null });
    }
  });
  return { candidates, issues };
}
