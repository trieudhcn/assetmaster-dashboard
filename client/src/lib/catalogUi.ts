export type NamedCatalogOption = { id: number; name: string };

export function normalizeVietnameseSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesVietnameseSearch(value: string, query: string) {
  const normalizedValue = normalizeVietnameseSearch(value);
  const normalizedQuery = normalizeVietnameseSearch(query);
  if (!normalizedQuery) return true;
  if (normalizedValue.includes(normalizedQuery)) return true;

  // Asset and certificate codes are routinely read or copied without their
  // separators. Keep the normal text match, then retry a compact code match.
  const compactValue = normalizedValue.replace(/[^a-z0-9]/g, "");
  const compactQuery = normalizedQuery.replace(/[^a-z0-9]/g, "");
  return compactQuery.length > 0 && compactValue.includes(compactQuery);
}

export function canCreateCatalogOption(keyword: string, matchedCount: number) {
  return matchedCount === 0 && keyword.trim().length >= 2;
}

export function getPaginationWindow(totalItems: number, requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize;
  const startRecord = totalItems === 0 ? 0 : startIndex + 1;
  const endRecord = Math.min(startIndex + pageSize, totalItems);
  return { currentPage, totalPages, startIndex, startRecord, endRecord };
}

export function filterNamedCatalogOptions<T extends NamedCatalogOption>(items: T[], keyword: string) {
  return items.filter((item) => matchesVietnameseSearch(item.name, keyword));
}

export function toggleMaintenanceStatusFilter(currentStatus: string) {
  return currentStatus === "Bảo hành/Sửa chữa" ? "Tất cả trạng thái" : "Bảo hành/Sửa chữa";
}

export function getMaintenanceBadgeCount<T extends { statusType: string }>(assets: T[]) {
  return assets.reduce((count, asset) => count + (asset.statusType === "maintenance" ? 1 : 0), 0);
}

export function getAssetStatusFilterCounts<T extends { statusType: string }>(assets: T[]) {
  return {
    "Tất cả trạng thái": assets.length,
    "Sẵn có": assets.filter((asset) => asset.statusType === "available").length,
    "Đang cấp phát": assets.filter((asset) => asset.statusType === "active").length,
    "Bảo trì": assets.filter((asset) => asset.statusType === "maintenance").length,
    "Trả nhà cung cấp": assets.filter((asset) => asset.statusType === "returned").length,
    "Khấu hao/Thanh lý": assets.filter((asset) => asset.statusType === "retired").length,
  };
}

export type MaintenancePriority = "low" | "medium" | "high" | "critical";

export function getNewMaintenanceRequestBadge<T extends { status: string; priority: MaintenancePriority }>(tickets: T[]) {
  const priorityOrder: Record<MaintenancePriority, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  const openTickets = tickets.filter((ticket) => ticket.status === "open");
  const priority = openTickets.reduce<MaintenancePriority | null>((highest, ticket) => !highest || priorityOrder[ticket.priority] > priorityOrder[highest] ? ticket.priority : highest, null);
  return { count: openTickets.length, priority };
}

export type MaintenanceExportAsset = {
  statusType: string;
  code: string;
  name: string;
  category: string;
  holder: string;
  location?: string;
  serial?: string;
  supplier?: string;
  brand?: string;
  maintenanceReason?: string;
  date?: string;
  value?: string;
  note?: string;
};

export function buildMaintenanceExportRows<T extends MaintenanceExportAsset>(assets: T[]) {
  return assets.filter((asset) => asset.statusType === "maintenance").map((asset) => ({
    "Mã tài sản": asset.code,
    "Tên tài sản": asset.name,
    "Phân loại": asset.category || "Chưa phân loại",
    "Trạng thái": "Bảo hành/Sửa chữa",
    "Nội dung Bảo hành/Sửa chữa": asset.maintenanceReason?.trim() || "Chưa ghi nhận nội dung",
    "Người / Phòng giữ": asset.holder || "Bảo hành/Sửa chữa",
    "Vị trí": asset.location || "Chưa cập nhật",
    "Serial / IMEI": asset.serial || "Chưa cập nhật",
    "Nhà cung cấp": asset.supplier || "Chưa cập nhật",
    "Hãng": asset.brand || "Chưa cập nhật",
    "Ngày mua": asset.date || "",
    "Giá trị (VNĐ)": asset.value || "0",
    "Ghi chú": asset.note || "",
  }));
}

export type FilteredAssetExportAsset = {
  code: string;
  name: string;
  category: string;
  holder: string;
  status: string;
  location?: string;
  serial?: string;
  supplier?: string;
  brand?: string;
  purchaseDate?: string;
  date?: string;
  warrantyUntil?: string | number | Date | null;
  value?: string;
  note?: string;
};

export function buildFilteredAssetExportRows<T extends FilteredAssetExportAsset>(assets: T[]) {
  return assets.map((asset) => ({
    "Mã tài sản": asset.code,
    "Tên tài sản": asset.name,
    "Phân loại": asset.category || "Chưa phân loại",
    "Người / Phòng giữ": asset.holder || "Chưa bàn giao",
    "Trạng thái": asset.status,
    "Vị trí": asset.location || "Chưa cập nhật",
    "Serial / IMEI": asset.serial || "Chưa cập nhật",
    "Nhà cung cấp": asset.supplier || "Chưa cập nhật",
    "Hãng": asset.brand || "Chưa cập nhật",
    "Ngày mua": asset.purchaseDate || asset.date || "",
    "Hạn bảo hành": asset.warrantyUntil ? new Date(asset.warrantyUntil).toLocaleDateString("vi-VN") : "Chưa cập nhật",
    "Giá trị (VNĐ)": Number(String(asset.value || "0").replace(/[^\d-]/g, "")) || 0,
    "Ghi chú": asset.note || "",
  }));
}

export function getHandoverActionTooltip(action: "document" | "print" | "history") {
  const labels = {
    document: "Xem biên bản bàn giao",
    print: "In phiếu bàn giao",
    history: "Xem lịch sử bàn giao",
  } as const;
  return labels[action];
}
