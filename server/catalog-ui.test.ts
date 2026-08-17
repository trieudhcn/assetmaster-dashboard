import { describe, expect, it } from "vitest";
import { buildFilteredAssetExportRows, buildMaintenanceExportRows, canCreateCatalogOption, filterNamedCatalogOptions, getHandoverActionTooltip, getMaintenanceBadgeCount, getNewMaintenanceRequestBadge, getPaginationWindow, matchesVietnameseSearch, normalizeVietnameseSearch, toggleMaintenanceStatusFilter } from "../client/src/lib/catalogUi";

describe("Catalog UI helpers", () => {
  it("clamps pagination and preserves a non-overlapping final record range", () => {
    expect(getPaginationWindow(11, 4, 10)).toEqual({ currentPage: 2, totalPages: 2, startIndex: 10, startRecord: 11, endRecord: 11 });
  });

  it("returns a neutral empty range when no asset matches the filters", () => {
    expect(getPaginationWindow(0, 1, 20)).toEqual({ currentPage: 1, totalPages: 1, startIndex: 0, startRecord: 0, endRecord: 0 });
  });

  it("finds vendor and brand names case-insensitively with Vietnamese locale matching", () => {
    const options = [{ id: 1, name: "Công ty Công nghệ Sao Mai" }, { id: 2, name: "Dell Technologies" }];
    expect(filterNamedCatalogOptions(options, "cong nghe")).toEqual([options[0]]);
    expect(filterNamedCatalogOptions(options, "DELL")).toEqual([options[1]]);
  });

  it("normalizes Vietnamese diacritics, including the đ character, before matching", () => {
    expect(normalizeVietnameseSearch("  Đặng  Hoàng   Long ")).toBe("dang hoang long");
    expect(matchesVietnameseSearch("Thiết bị văn phòng", "thiet bi")).toBe(true);
  });

  it("offers creating a catalog option only for a meaningful empty search", () => {
    expect(canCreateCatalogOption("Sao Mai", 0)).toBe(true);
    expect(canCreateCatalogOption("Sao Mai", 1)).toBe(false);
    expect(canCreateCatalogOption("S", 0)).toBe(false);
  });

  it("toggles the maintenance-only status filter without resetting other filters", () => {
    expect(toggleMaintenanceStatusFilter("Tất cả trạng thái")).toBe("Bảo trì");
    expect(toggleMaintenanceStatusFilter("Bảo trì")).toBe("Tất cả trạng thái");
  });

  it("counts only actual maintenance assets for the navigation badge", () => {
    expect(getMaintenanceBadgeCount([{ statusType: "available" }, { statusType: "assigned" }])).toBe(0);
    expect(getMaintenanceBadgeCount([{ statusType: "maintenance" }, { statusType: "maintenance" }, { statusType: "available" }])).toBe(2);
  });

  it("counts only new maintenance requests and escalates the badge to the highest priority", () => {
    expect(getNewMaintenanceRequestBadge([{ status: "resolved", priority: "critical" }, { status: "closed", priority: "high" }])).toEqual({ count: 0, priority: null });
    expect(getNewMaintenanceRequestBadge([{ status: "open", priority: "medium" }, { status: "open", priority: "critical" }, { status: "in_progress", priority: "high" }])).toEqual({ count: 2, priority: "critical" });
  });

  it("creates maintenance export rows only for assets in maintenance with their reason", () => {
    const rows = buildMaintenanceExportRows([
      { statusType: "maintenance", code: "TS-001", name: "Máy in", category: "Thiết bị", holder: "Bảo trì", maintenanceReason: "Kẹt giấy liên tục", value: "3200000" },
      { statusType: "active", code: "TS-002", name: "Laptop", category: "CNTT", holder: "Phòng Kế toán", maintenanceReason: "Không được xuất", value: "25000000" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ "Mã tài sản": "TS-001", "Trạng thái": "Bảo trì", "Lý do bảo trì": "Kẹt giấy liên tục" });
  });

  it("keeps every supplied filtered asset and its operational fields in the catalog export", () => {
    const rows = buildFilteredAssetExportRows([
      { code: "LT-001", name: "Laptop Dell", category: "CNTT", holder: "Phòng Kế toán", status: "Đang cấp phát", location: "Tầng 3", serial: "SN-01", supplier: "Công ty Sao Mai", brand: "Dell", purchaseDate: "2026-08-15", warrantyUntil: "2028-08-15", value: "25.000.000", note: "Đang sử dụng" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ "Mã tài sản": "LT-001", "Trạng thái": "Đang cấp phát", "Giá trị (VNĐ)": 25000000, "Nhà cung cấp": "Công ty Sao Mai" });
  });

  it("uses clear action labels for the handover icon controls", () => {
    expect(getHandoverActionTooltip("document")).toBe("Xem biên bản bàn giao");
    expect(getHandoverActionTooltip("print")).toBe("In phiếu bàn giao");
    expect(getHandoverActionTooltip("history")).toBe("Xem lịch sử bàn giao");
  });
});
