import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("modal presentation contract", () => {
  it("renders action tooltip from a body-level portal rather than a clipping pseudo-element", () => {
    const tooltipComponent = readProjectFile("client/src/components/FloatingActionTooltip.tsx");
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(tooltipComponent).toContain("createPortal");
    expect(tooltipComponent).toContain("document.body");
    expect(tooltipComponent).toContain("}, 280)");
    expect(home).toContain("<FloatingActionTooltip />");
  });

  it("keeps the modal shell clipped while assigning vertical scrolling to its content", () => {
    const stylesheet = readProjectFile("client/src/index.css");

    expect(stylesheet).toContain(".floating-action-tooltip {\n  position: fixed;");
    expect(stylesheet).toContain("overflow: hidden");
    expect(stylesheet).toContain("overflow-y: auto");
    expect(stylesheet).toContain("overscroll-behavior: contain");
    expect(stylesheet).toContain("scrollbar-gutter: stable");
    expect(stylesheet).toContain("@media (hover: none), (pointer: coarse)");
    expect(stylesheet).toContain("min-width: 2.5rem");
  });

  it("keeps category creator inputs stable and only confirms close after a real form change", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain("const [formDirty, setFormDirty] = useState(false)");
    expect(home).toContain("if (!isDetail && formDirty)");
    expect(home).toContain("const categoryDraftRef = useRef");
    expect(home).toContain("categoryDraftRef.current = { ...categoryDraftRef.current, name: nameInput.value }");
    expect(home).not.toContain("data-purchase-date-icon");
  });

  it("gives division action icons accessible labels for the shared hover tooltip", () => {
    const organization = readProjectFile("client/src/pages/OrganizationManagementPage.tsx");

    expect(organization).toContain('aria-label="Chỉnh sửa Bộ phận"');
    expect(organization).toContain('"Vô hiệu hóa Bộ phận"');
    expect(organization).toContain('"Kích hoạt Bộ phận"');
    expect(organization).toContain('aria-label="Hủy chỉnh sửa Bộ phận"');
  });

  it("standardizes cancel labels and employee management icon tooltips", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const employees = readProjectFile("client/src/pages/EmployeeManagementView.tsx");

    expect(home).toContain('"Hủy thao tác"');
    expect(employees).not.toContain("<Search size");
    expect(employees).toContain('aria-label="Đóng phân bổ nhân sự"');
  });

  it("keeps category pagination compact and drawer close actions consistent", () => {
    const categories = readProjectFile("client/src/pages/AssetCategoryManagementPage.tsx");
    const employees = readProjectFile("client/src/pages/EmployeeManagementView.tsx");
    const historyDrawer = readProjectFile("client/src/components/AssetImportRecovery.tsx");
    const stylesheet = readProjectFile("client/src/index.css");

    expect(categories).toContain("const PAGE_SIZE = 5");
    expect(categories).toContain("filteredCategories.slice(pageStart, pageStart + PAGE_SIZE)");
    expect(categories).toContain("min-h-[35rem]");
    expect(employees).toContain("drawer-close-action");
    expect(historyDrawer).toContain("drawer-close-action");
    expect(stylesheet).toContain(".drawer-close-action");
  });

  it("keeps sidebar navigation scrollable without pushing the profile area off-screen", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain("flex-col overflow-hidden");
    expect(home).toContain('aria-label="Điều hướng chính"');
    expect(home).toContain("min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain");
    expect(home).toContain("mt-3 shrink-0 space-y-1 border-t");
  });

  it("supports category search in both the asset form and category management list", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const categories = readProjectFile("client/src/pages/AssetCategoryManagementPage.tsx");

    expect(home).toContain("data-category-search-picker");
    expect(home).toContain("Tìm tên hoặc tiền tố Phân loại...");
    expect(categories).toContain("matchesVietnameseSearch");
    expect(categories).toContain('aria-label="Tìm kiếm Phân loại"');
    expect(categories).toContain("filteredCategories.slice(pageStart, pageStart + PAGE_SIZE)");
  });

  it("shows an interactive calendar affordance and live asset totals for categories", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const categories = readProjectFile("client/src/pages/AssetCategoryManagementPage.tsx");
    const stylesheet = readProjectFile("client/src/index.css");

    expect(home).toContain("data-purchase-date-picker");
    expect(home).toContain("Mở lịch chọn ngày mua");
    expect(home).toContain('input.showPicker');
    expect(categories).toContain("trpc.assets.list.useQuery");
    expect(categories).toContain("assetStatsByCategory");
    expect(categories).toContain("{stats.total} tài sản</button>");
    expect(stylesheet).toContain(".asset-date-input::-webkit-calendar-picker-indicator");
  });

  it("exposes warranty date input and preserves purchase date after maintenance", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const routers = readProjectFile("server/routers.ts");

    expect(home).toContain('const preservePurchaseDate = mode === "edit" && Boolean(asset?.code)');
    expect(home).toContain('Hạn bảo hành');
    expect(home).toContain('DatePickerField value={dateInputValue(formData.warrantyUntil)}');
    expect(home).toContain('disabled={preservePurchaseDate}');
    expect(routers).toContain('const safeChanges = { ...persistedChanges, ...supplierReturnChanges, purchaseDate: current.purchaseDate }');
    expect(routers).toContain('purchaseDate: current.purchaseDate');
  });

  it("shows readable date and status values in asset history", () => {
    const history = readProjectFile("client/src/components/AssetImportRecovery.tsx");
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(history).toContain('fieldName === "status" || fieldName === "condition"');
    expect(history).toContain('fieldName === "purchaseDate" || fieldName === "warrantyUntil"');
    expect(history).toContain("Lịch sử thay đổi chi tiết");
    expect(home).toContain("purchaseDate: normalizePurchaseDate(formData.date)");
    expect(home).toContain("warrantyUntil: normalizePurchaseDate(formData.warrantyUntil)");
    expect(home).toContain("dueBackAt: normalizePurchaseDate(form.dueBackAt)");
  });

  it("normalizes invalid purchase dates before updating asset status", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain("function normalizePurchaseDate(value: unknown): number | null");
    expect(home).toContain("return Number.isFinite(timestamp) ? timestamp : null");
    expect(home).toContain("purchaseDate: normalizePurchaseDate(formData.date)");
  });

  it("provides loading feedback and completion messaging for category Excel export", () => {
    const categories = readProjectFile("client/src/pages/AssetCategoryManagementPage.tsx");

    expect(categories).toContain("const [isExporting, setIsExporting] = useState(false)");
    expect(categories).toContain('toast.loading("Đang tạo file Excel...")');
    expect(categories).toContain('toast.success(`Đã xuất ${rows.length} Phân loại ra Excel.`, { id: loadingToast })');
    expect(categories).toContain('toast.error("Không thể xuất file Excel. Vui lòng thử lại.", { id: loadingToast })');
    expect(categories).toContain("disabled={isExporting}");
    expect(categories).toContain('className="animate-spin"');
  });

  it("keeps category search clearing contained and safeguards categories with linked assets", () => {
    const categories = readProjectFile("client/src/pages/AssetCategoryManagementPage.tsx");

    expect(categories).toContain('<div className="relative mt-3"><input value={query}');
    expect(categories).toContain("Vô hiệu hóa Phân loại đang có tài sản?");
    expect(categories).toContain("Chuyển tài sản trước khi xóa");
    expect(categories).toContain("Đang sử dụng:");
    expect(categories).toContain("Hỏng:");
    expect(categories).toContain("Bảo trì:");
    expect(categories).toContain("bulkMoveAssets");
    expect(categories).toContain("Xuất Excel");
  });

  it("supports supplier return status and immutable purchase date after asset creation", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const router = readProjectFile("server/routers.ts");

    expect(home).toContain("Trả nhà cung cấp");
    expect(home).toContain('const preservePurchaseDate = mode === "edit" && Boolean(asset?.code)');
    expect(router).toContain('"returned_to_vendor"');
    expect(router).toContain("const safeChanges = { ...persistedChanges, ...supplierReturnChanges, purchaseDate: current.purchaseDate }");
  });

  it("shows warranty expiry warnings and provides warranty filters in the asset catalog", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain('type WarrantyState = "none" | "active" | "expiring" | "expired"');
    expect(home).toContain('getWarrantyState(asset.warrantyUntil) === "expired"');
    expect(home).toContain('getWarrantyState(asset.warrantyUntil) === "expiring"');
    expect(home).toContain('"Sắp hết hạn"');
    expect(home).toContain('"Đã hết hạn"');
  });
});


  it("exposes supplier return date and reason in asset form and detail", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    expect(home).toContain("Ngày trả nhà cung cấp");
    expect(home).toContain("Lý do trả nhà cung cấp");
    expect(home).toContain("supplierReturnedAt: normalizePurchaseDate");
    expect(home).toContain("supplierReturnReason");
  });

  it("provides a dedicated supplier return report export", () => {
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    expect(reports).toContain('const supplierReturnedAssets = useMemo(() => selectedAssets.filter((asset) => asset.status === "returned_to_vendor")');
    expect(reports).toContain("exportSupplierReturnExcel");
    expect(reports).toContain("assetmaster-tai-san-tra-nha-cung-cap.xlsx");
    expect(reports).toContain("Xuất báo cáo trả NCC");
  });


  it("opens the native purchase date picker from the branded calendar action", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const datePicker = readProjectFile("client/src/components/DatePickerField.tsx");
    const stylesheet = readProjectFile("client/src/index.css");
    expect(home).toContain('type="date" value={dateInputValue(formData.date)}');
    expect(home).toContain('data-purchase-date-picker');
    expect(home).toContain('CalendarDays size={16}');
    expect(datePicker).toContain('text-[#087A6A]');
    expect(datePicker).toContain('input.showPicker');
    expect(stylesheet).toContain('input[type="date"]::-webkit-calendar-picker-indicator');
    expect(stylesheet).toContain('display: none;');
  });

  it("requires detailed confirmation and supports supplier return evidence", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const routers = readProjectFile("server/routers.ts");
    const schema = readProjectFile("drizzle/schema.ts");
    expect(home).toContain("supplierReturnConfirmOpen");
    expect(home).toContain("Xác nhận trả nhà cung cấp");
    expect(home).toContain('accept="application/pdf,image/png,image/jpeg,image/webp"');
    expect(home).toContain("Tệp không được vượt quá 5 MB.");
    expect(routers).toContain("uploadSupplierReturnAttachment");
    expect(routers).toContain("storagePut(`assets/${asset.id}/supplier-return/");
    expect(schema).toContain("supplierReturnAttachmentUrl");
    expect(schema).toContain("supplierReturnAttachmentName");
    expect(schema).toContain("supplierReturnAttachmentContentType");
  });


  it("excludes returned vendor assets from company inventory statistics", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const categories = readProjectFile("client/src/pages/AssetCategoryManagementPage.tsx");
    expect(home).toContain('const inventoryAssetRows = useMemo(() => assetRows.filter((asset) => asset.statusType !== "returned")');
    expect(home).toContain('detail: "Tài sản còn thuộc công ty"');
    expect(categories).toContain('asset.status === "returned_to_vendor"');
  });

  it("shows supplier return decision history and evidence preview in asset detail", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    expect(home).toContain("Lịch sử quyết định trả nhà cung cấp");
    expect(home).toContain("assetFieldHistoryQuery.data");
    expect(home).toContain("Tệp xác nhận đã tải lên");
    expect(home).toContain("Xem trước tệp");
    expect(home).toContain('title="Xem trước biên bản trả nhà cung cấp"');
    expect(home).toContain('alt="Xem trước hình ảnh xác nhận trả nhà cung cấp"');
  });

  it("keeps a dedicated supplier-return Excel export", () => {
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    expect(reports).toContain('const supplierReturnedAssets = useMemo(() => selectedAssets.filter((asset) => asset.status === "returned_to_vendor")');
    expect(reports).toContain("exportSupplierReturnExcel");
    expect(reports).toContain("assetmaster-tai-san-tra-nha-cung-cap.xlsx");
    expect(reports).toContain("Xuất báo cáo trả NCC");
  });

  it("keeps supplier-return report separate from company inventory report", () => {
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    expect(reports).toContain('const inventoryAssets = useMemo(() => selectedAssets.filter((asset) => asset.status !== "returned_to_vendor")');
    expect(reports).toContain('const supplierReturnedAssets = useMemo(() => selectedAssets.filter((asset) => asset.status === "returned_to_vendor")');
    expect(reports).toContain('const selectedValue = inventoryAssets.reduce');
    expect(reports).toContain('const rows = inventoryAssets.map');
  });


  it("uses searchable dropdowns for core asset and organization filters", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    const employees = readProjectFile("client/src/pages/EmployeeManagementView.tsx");
    const organization = readProjectFile("client/src/pages/OrganizationManagementPage.tsx");
    const searchableSelect = readProjectFile("client/src/components/SearchableSelect.tsx");
    expect(home).toContain("return <SearchableSelect");
    expect(reports).toContain("<SearchableSelect value={departmentId}");
    expect(employees).toContain("<SearchableSelect value={departmentFilter}");
    expect(organization).toContain("<SearchableSelect value={divisionDraft.departmentId}");
    expect(searchableSelect).toContain("matchesVietnameseSearch");
    expect(searchableSelect).toContain("Xóa tìm kiếm trong dropdown");
    expect(searchableSelect).toContain("Không tìm thấy kết quả");
  });


  it("highlights searchable dropdown matches across maintenance, import, and handover flows", () => {
    const searchableSelect = readProjectFile("client/src/components/SearchableSelect.tsx");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const importModal = readProjectFile("client/src/components/AssetImportModal.tsx");
    const home = readProjectFile("client/src/pages/Home.tsx");
    expect(searchableSelect).toContain("<mark className=\"rounded bg-[#F8D978]");
    expect(searchableSelect).toContain("HighlightedLabel");
    expect(operations).toContain("Tìm mã hoặc tên tài sản...");
    expect(operations).toContain("Tìm người xử lý...");
    expect(importModal).toContain("Tìm trạng thái...");
    expect(home).toContain("Tìm tên hoặc email nhân viên...");
  });


  it("supports vendor and brand directory pagination and searchable-select keyboard affordances", () => {
    const vendorPage = readProjectFile("client/src/pages/VendorBrandManagementPage.tsx");
    const searchableSelect = readProjectFile("client/src/components/SearchableSelect.tsx");
    expect(vendorPage).toContain("5 dòng/trang");
    expect(vendorPage).toContain("Tìm Nhà cung cấp...");
    expect(vendorPage).toContain("Tìm Hãng...");
    expect(vendorPage).toContain("scrollIntoView");
    expect(searchableSelect).toContain("ArrowDown");
    expect(searchableSelect).toContain("ArrowUp");
    expect(searchableSelect).toContain("event.key === \"Enter\"");
    expect(searchableSelect).toContain("Xóa tìm kiếm trong dropdown");
    expect(searchableSelect).toContain("Không tìm thấy kết quả");
  });


  it("formats Vietnamese currency without decimal zeros and keeps vendor-brand panels balanced", () => {
    const formatter = readProjectFile("client/src/lib/formatters.ts");
    const vendorPage = readProjectFile("client/src/pages/VendorBrandManagementPage.tsx");
    const home = readProjectFile("client/src/pages/Home.tsx");
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    expect(formatter).toContain("maximumFractionDigits: 0");
    expect(formatter).toContain("Intl.NumberFormat(\"vi-VN\"");
    expect(home).toContain("formatVnd(asset.value)");
    expect(reports).toContain("formatVnd(value)");
    expect(vendorPage).toContain("min-h-[540px]");
    expect(vendorPage).toContain("5 dòng/trang");
  });
