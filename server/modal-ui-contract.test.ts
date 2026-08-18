import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatVnd, numberToVietnameseWords, parseVndAmount } from "../client/src/lib/formatters";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("modal presentation contract", () => {
  it("parses database decimals and Vietnamese separators as the same VND integer amount", () => {
    expect(parseVndAmount("160000.00")).toBe(160000);
    expect(parseVndAmount("160.000")).toBe(160000);
    expect(parseVndAmount("160000")).toBe(160000);
    expect(formatVnd("160000.00")).toBe("160.000");
    expect(numberToVietnameseWords(160000)).toBe("Một trăm sáu mươi nghìn đồng");
  });

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
    expect(home).toContain("categoryDraftRef.current = { name: \"\", code: \"\", description: \"\" }");
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

    expect(home).toContain("categoriesQuery");
    expect(home).toContain("assetCategories.list");
    expect(home).toContain("<AssetCategoryPicker value={formData.categoryId");
    const categoryPicker = readProjectFile("client/src/components/AssetCategoryPicker.tsx");
    expect(categoryPicker).toContain("<SearchableSelect");
    expect(categoryPicker).toContain("Tìm tên hoặc tiền tố Phân loại...");
    expect(categoryPicker).toContain("Tạo Phân loại mới");
    expect(categories).toContain("matchesVietnameseSearch");
    expect(categories).toContain('aria-label="Tìm kiếm Phân loại"');
    expect(categories).toContain("filteredCategories.slice(pageStart, pageStart + PAGE_SIZE)");
  });

  it("keeps purchase date sourced from persisted assets and restores the maintenance reason field", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    expect(home).toContain("purchaseDate: asset.purchaseDate ? dateInputValue(asset.purchaseDate)");
    expect(home).toContain("date: dateInputValue(asset.purchaseDate || asset.date)");
    expect(home).toContain("Nội dung cần bảo trì");
    expect(home).toContain("aria-label=\"Nội dung cần bảo trì\"");
    expect(home).toContain("formData.statusType === \"maintenance\"");
  });

  it("shows a guided import preview with update control, field comparison and detailed progress", () => {
    const importModal = readProjectFile("client/src/components/AssetImportModal.tsx");

    expect(importModal).toContain("Tự động cập nhật tài sản trùng Serial/IMEI");
    expect(importModal).toContain("Trường sẽ thay đổi khi cập nhật");
    expect(importModal).toContain("Đang kiểm tra sheet, header, ngày tháng và số tiền");
    expect(importModal).toContain("Đang ghi ${rowsForImport.length} dòng trong một transaction an toàn");
    expect(importModal).toContain("Xung đột Serial");
  });

  it("surfaces maintenance assets with a quick request action and prevents duplicate open tickets", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const routers = readProjectFile("server/routers.ts");
    expect(operations).toContain('const maintenanceAssets = assets.filter((asset) => asset.status === "maintenance" && !assetsWithOpenTickets.has(asset.id) && !queuedMaintenanceAssetIds.has(asset.id))');
    expect(operations).toContain("Tài sản đang cần bảo trì");
    expect(operations).toContain("Tạo yêu cầu nhanh");
    expect(operations).toContain("setQueuedMaintenanceAssetIds");
    expect(operations).toContain("overflow-x-auto overscroll-x-contain");
    expect(operations).toContain('issueType: "maintenance"');
    expect(operations).toContain("asset.maintenanceReason");
    expect(routers).toContain("listMaintenanceTicketsByAsset(input.assetId)");
    expect(routers).toContain('code: "CONFLICT"');
    expect(routers).toContain("Tài sản này đã có yêu cầu bảo trì đang mở.");
  });

  it("shows an interactive calendar affordance and live asset totals for categories", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const categories = readProjectFile("client/src/pages/AssetCategoryManagementPage.tsx");
    const datePicker = readProjectFile("client/src/components/DatePickerField.tsx");

    expect(home).toContain("data-purchase-date-picker");
    expect(home).toContain('<DatePickerField value={dateInputValue(formData.date)}');
    expect(datePicker).toContain('aria-label={`Mở lịch: ${label}`}');
    expect(datePicker).toContain("Lịch AssetMaster");
    expect(categories).toContain("trpc.assets.list.useQuery");
    expect(categories).toContain("assetStatsByCategory");
    expect(categories).toContain("{stats.total} tài sản</button>");
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
    expect(categories).toContain('role="tooltip"');
    expect(categories).toContain('data-suppress-icon-tooltip="true"');
    expect(categories).toContain("max-w-[min(92vw,23rem)]");
    expect(categories).toContain("group-hover/status:opacity-100");
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


  it("uses the AssetMaster calendar for purchase and operational dates", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const datePicker = readProjectFile("client/src/components/DatePickerField.tsx");
    expect(home).toContain('<DatePickerField value={dateInputValue(formData.date)}');
    expect(home).toContain('data-purchase-date-picker');
    expect(datePicker).toContain('<Popover open={open} onOpenChange={setOpen}>');
    expect(datePicker).toContain('<Calendar');
    expect(datePicker).toContain('locale={vi}');
    expect(datePicker).toContain('Lịch AssetMaster');
    expect(datePicker).toContain('toIsoDate(date)');
    expect(datePicker).toContain('text-[#087A6A]');
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
    expect(vendorPage).toContain("min-h-[58px]");
    expect(vendorPage).toContain("ChevronLeft");
    expect(vendorPage).toContain("ChevronRight");
    expect(vendorPage).toContain('aria-label="Trang trước"');
    expect(vendorPage).toContain('aria-label="Trang sau"');
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
    expect(reports).toContain("formatCompactVnd");
    expect(vendorPage).toContain("min-h-[540px]");
    expect(vendorPage).toContain("min-h-[58px]");
    expect(vendorPage).toContain("ChevronLeft");
    expect(vendorPage).toContain("ChevronRight");
    expect(vendorPage).toContain('aria-label="Trang trước"');
    expect(vendorPage).toContain('aria-label="Trang sau"');
  });


  it("supports supplier and brand value reports with compact currency modes", () => {
    const formatter = readProjectFile("client/src/lib/formatters.ts");
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    expect(formatter).toContain('mode === "million"');
    expect(formatter).toContain('mode === "billion"');
    expect(reports).toContain("supplierValueData");
    expect(reports).toContain("Phân bổ giá trị theo Nhà cung cấp");
    expect(reports).toContain('value: "million"');
    expect(reports).toContain('value: "billion"');
    expect(reports).toContain("currencyMode");
  });

describe("currency input and scrollbar contract", () => {
  it("uses the reusable currency input for maintenance costs", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const currencyInput = readProjectFile("client/src/components/CurrencyInput.tsx");
    expect(operations).toContain('import { CurrencyInput }');
    expect(operations).toContain('aria-label="Chi phí dự kiến"');
    expect(operations).toContain('aria-label="Chi phí thực tế"');
    expect((operations.match(/showWords/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(currencyInput).toContain('aria-label="Xóa số tiền"');
    expect(currencyInput).toContain('event.clipboardData.getData("text")');
    expect(currencyInput).toContain('suffix = "VNĐ"');
  });

  it("formats typed and pasted VND values in the asset form", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const currencyInput = readProjectFile("client/src/components/CurrencyInput.tsx");
    const stylesheet = readProjectFile("client/src/index.css");
    expect(parseVndAmount("160.000 ₫")).toBe(160000);
    expect(parseVndAmount("160000 VNĐ")).toBe(160000);
    expect(formatVnd(16000)).toBe("16.000");
    expect(home).toContain('<CurrencyInput value={String(formData.value || "")}');
    expect(home).toContain('showWords />');
    expect(currencyInput).toContain('formatVndInput(value)');
    expect(currencyInput).toContain('className="absolute right-11 top-1/2 z-10');
    expect(currencyInput).toContain('text-[10px] font-medium leading-4 text-[#8AA0B6]');
    expect(stylesheet).toContain("scrollbar-color: #8BC9C5 #EEF5F6");
    expect(currencyInput).toContain('inputMode="numeric"');
    expect(currencyInput).toContain('pattern="[0-9]*"');
    expect(currencyInput).toContain('enterKeyHint="done"');
    expect(currencyInput).toContain('<div className="relative w-full">');
    expect(currencyInput).toContain('leading-none text-[#087A6A]');
  });

  it("keeps handover filters and exports responsive", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const searchableSelect = readProjectFile("client/src/components/SearchableSelect.tsx");
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    const alertDialog = readProjectFile("client/src/components/ui/alert-dialog.tsx");
    const dialog = readProjectFile("client/src/components/ui/dialog.tsx");
    const drawer = readProjectFile("client/src/components/ui/drawer.tsx");
    const sheet = readProjectFile("client/src/components/ui/sheet.tsx");
    expect(alertDialog).toContain("z-[100] bg-black/50 backdrop-blur-[3px]");
    expect(alertDialog).toContain('"min-h-11 w-full justify-center px-5 text-sm active:scale-[0.98] sm:w-auto"');
    expect(dialog).toContain("z-50 bg-black/50 backdrop-blur-[3px]");
    expect(drawer).toContain("z-50 bg-black/50 backdrop-blur-[3px]");
    expect(sheet).toContain("z-50 bg-black/50 backdrop-blur-[3px]");
    expect(alertDialog).toContain("z-[101] grid");
    expect(alertDialog).toContain("fixed left-1/2 top-1/2 z-[101] grid h-fit");
    expect(alertDialog).toContain("max-w-[calc(100%-2rem)]");
    expect(home).toContain("onPointerDownOutside={() => setSupplierReturnConfirmOpen(false)}");
    expect(home).toContain("onEscapeKeyDown={() => setSupplierReturnConfirmOpen(false)}");
    expect(home).toContain("isSaving={createAssetMutation.isPending || updateAssetMutation.isPending}");
    expect(home).toContain("Đang lưu...");
    expect(home).toContain("disabled={isSaving}");
    expect(home).toContain('data-asset-field-history');
    expect(home).toContain("const totalChanges = assetFieldHistoryQuery.data?.total");
    expect(home).toContain("historyButton.innerHTML = `Lịch sử thay đổi");
    expect(home).toContain("Mở lịch sử thay đổi (${totalChanges ?? 0} bản ghi)");
    expect(home).toContain("Lần cập nhật gần nhất:");
    expect(home).toContain("persistedAsset?.updatedAt");
    expect(home).toContain('toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })');
    expect(home).toContain("const latestAssetChange = assetFieldHistoryQuery.data?.items?.[0]");
    expect(home).toContain("Người thực hiện:");
    expect(home).toContain("tooltipTarget.dataset.tooltip = latestUpdateActorTooltip");
    expect(home).toContain('classList.add("icon-action-tooltip", "cursor-help", "outline-none")');
    expect(home).toContain('new CustomEvent("assetmaster:open-asset-history"');
    expect(home).toContain("overflow-visible rounded-xl border border-[#DFE9F0]");
    expect(home).toContain('className="w-full shrink-0 sm:w-[180px]"');
    expect(home).toContain('className="flex flex-wrap items-center gap-2 border-b border-[#E7EEF3] bg-[#FBFCFD] px-5 py-4"');
    expect(reports).toContain('xl:w-[680px] xl:grid-cols-4');
    expect(reports).toContain('whitespace-nowrap rounded-lg border border-[#DDE7F0]');
    expect(reports).toContain("activityEntityLabels");
    expect(reports).toContain('aria-label="Tìm kiếm nhật ký hoạt động"');
    expect(reports).toContain("Tất cả loại hoạt động");
    expect(reports).toContain("const pagedActivities = data.slice");
    expect(reports).toContain("Mỗi trang");
    expect(reports).toContain("Trang nhật ký trước");
    expect(reports).toContain("Trang nhật ký sau");
    expect(home).toContain('className="relative min-w-0 flex-[2_1_420px]"');
    expect(home).toContain("handoverYearFilter");
    expect(home).toContain("handoverYears");
    expect(home).toContain("referenceCode.match(/^BG-(\\\\d{4})-/)");
    expect(home).toContain("Tất cả các năm");
    expect(home).toContain("handoverPageSize = 10");
    expect(home).toContain("handoverDepartmentFilter");
    expect(home).toContain("handoverRecipientFilter");
    expect(home).toContain("Tất cả phòng ban");
    expect(home).toContain("Tất cả người nhận");
    expect(home).toContain("Phiếu theo phòng ban");
    expect(home).toContain("handoverDepartmentStats");
    expect(home).not.toContain("Phiếu theo người nhận");
    expect(home).not.toContain("handoverRecipientStats");
    expect(home).toContain("Đã trả NCC");
    expect(home).toContain("Xuất Excel");
    expect(home).toContain("exportFilteredAssetsExcel");
    expect(home).toContain("filteredAssetExcelExport");
    expect(home).toContain("DANH SÁCH TÀI SẢN THEO BỘ LỌC");
    expect(home).toContain("assetmaster-danh-sach-tai-san-da-loc-");
    expect(home).toContain("Xuất danh sách");
    expect(home).toContain("assetCatalogToolbar");
    expect(home).toContain("min-[1320px]:flex-nowrap");
    expect(home).toContain("whitespace-nowrap");
    expect(home).toContain("danh-sach-phieu-ban-giao-");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const routers = readProjectFile("server/routers.ts");
    const db = readProjectFile("server/db.ts");
    expect(operations).toContain("Mở phiếu vừa tạo");
    expect(operations).toContain("recentlyCreatedTicketId");
    expect(routers).toContain("getNextHandoverSequence");
    expect(routers).toContain("ER_DUP_ENTRY");
    expect(routers).toContain("Không thể tạo mã phiếu bàn giao duy nhất");
    expect(routers).toContain("BG-${handoverYear}-${String(handoverSequence).padStart(3, \"0\")}");
    expect(db).toContain("export async function getNextHandoverSequence");
    const searchableSelectSource = readProjectFile("client/src/components/SearchableSelect.tsx");
    expect(searchableSelectSource).toContain("menuReady");
    expect(searchableSelectSource).toContain("menuMounted && menuReady");
    expect(searchableSelect).toContain('w-[min(280px,calc(100vw-1rem))]');
    expect(searchableSelect).toContain('open ? "z-[96]" : "z-0"');
    expect(searchableSelect).toContain('menuAlign === "right" ? "right-0 left-auto" : "left-0 right-auto"');
    expect(searchableSelect).toContain('const width = Math.min(280, Math.max(240, rect.width))');
    expect(searchableSelect).toContain('setMenuPosition({ top: openUpward ? rect.top - 6 : rect.bottom + 6');
    expect(searchableSelect).toContain('top-[calc(100%+0.35rem)]');
    expect(searchableSelect).not.toContain('menuVertical');
    expect(searchableSelect).toContain('transition-[opacity,transform]');
    expect(searchableSelect).toContain('closeTimerRef');
    expect(home).toContain("Đang tạo danh sách tài sản bảo trì...");
    expect(reports).toContain("Đang tạo báo cáo tài sản...");
    expect(reports).toContain("Đang tạo báo cáo tài sản trả nhà cung cấp...");
    expect(readProjectFile("client/src/index.css")).toContain("Vuốt ngang để xem thêm");
    expect(readProjectFile("client/src/index.css")).toContain("position: sticky");
    expect(readProjectFile("client/src/index.css")).toContain("linear-gradient(90deg");
    expect(readProjectFile("client/src/components/MobileTableControls.tsx")).toContain("mobile-column-controls");
    expect(readProjectFile("client/src/components/MobileTableControls.tsx")).toContain("sessionStorage");
    expect(readProjectFile("client/src/components/MobileTableControls.tsx")).toContain("Khôi phục mặc định");
    const importModal = readProjectFile("client/src/components/AssetImportModal.tsx");
    expect(importModal).toContain("isExportingErrors");
    expect(importModal).toContain("Đang tạo tệp Excel các dòng lỗi...");
    expect(importModal).toContain("Đang xuất...");
  });

  it("keeps vendor and brand searches inside directory headers", () => {
    const vendorBrand = readProjectFile("client/src/pages/VendorBrandManagementPage.tsx");
    expect(vendorBrand).toContain("headerAccessory");
    expect(vendorBrand).toContain('aria-label="Tìm Nhà cung cấp"');
    expect(vendorBrand).toContain('aria-label="Tìm Hãng"');
    expect(vendorBrand).toContain("Danh sách Nhà cung cấp");
    expect(vendorBrand).toContain("Danh sách Hãng");
    expect(vendorBrand).toContain("selectedVendor ? <VendorDocuments");
    expect(vendorBrand).toContain("    </div>\n    {selectedVendor ?");
  });

  it("exports maintenance costs with numeric and Vietnamese words columns", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    expect(operations).toContain("exportMaintenanceCosts");
    expect(operations).toContain('"Chi phí dự kiến bằng chữ"');
    expect(operations).toContain('"Chi phí thực tế bằng chữ"');
    expect(operations).toContain("assetmaster-chi-phi-bao-tri-");
    expect(operations).toContain("isExportingCosts");
    expect(operations).toContain("toast.loading");
    expect(operations).toContain("Đang xuất...");
  });
});


describe("modal and drawer motion contract", () => {
  it("uses the shared AssetMaster motion markers across overlay primitives", () => {
    const stylesheet = readProjectFile("client/src/index.css");
    const dialog = readProjectFile("client/src/components/ui/dialog.tsx");
    const alertDialog = readProjectFile("client/src/components/ui/alert-dialog.tsx");
    const drawer = readProjectFile("client/src/components/ui/drawer.tsx");
    const sheet = readProjectFile("client/src/components/ui/sheet.tsx");

    expect(stylesheet).toContain(".assetmaster-overlay-motion[data-state=\"closed\"]");
    expect(stylesheet).toContain(".assetmaster-modal-motion[data-state=\"closed\"]");
    expect(stylesheet).toContain(".assetmaster-drawer-motion[data-state=\"closed\"]");
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
    expect(dialog).toContain("assetmaster-modal-motion");
    expect(alertDialog).toContain("assetmaster-modal-motion");
    expect(drawer).toContain("assetmaster-drawer-motion");
    expect(sheet).toContain("assetmaster-drawer-motion");
  });
});


describe("modal loading and empty motion contract", () => {
  it("provides shared loading and empty motion markers with reduced-motion support", () => {
    const stylesheet = readProjectFile("client/src/index.css");
    const empty = readProjectFile("client/src/components/ui/empty.tsx");
    const recovery = readProjectFile("client/src/components/AssetImportRecovery.tsx");

    expect(stylesheet).toContain("@keyframes modal-state-pulse");
    expect(stylesheet).toContain("@keyframes modal-empty-in");
    expect(stylesheet).toContain(".modal-loading-state::after");
    expect(stylesheet).toContain("prefers-reduced-motion");
    expect(empty).toContain("modal-empty-state");
    expect(recovery).toContain("modal-loading-state");
    expect(recovery).toContain("modal-empty-state");
  });
});

describe("empty illustration, modal skeleton and motion preference", () => {
  it("uses dedicated illustrations for maintenance, handover and audit empty states", () => {
    const source = readProjectFile("client/src/components/ModuleEmptyState.tsx");
    expect(source).toContain("empty-maintenance_83a5137a.png");
    expect(source).toContain("empty-handover_4fa5a517.png");
    expect(source).toContain("empty-audit_439c511b.png");
  });

  it("provides reusable table skeleton and motion preference toggle", () => {
    expect(readProjectFile("client/src/components/ModalTableSkeleton.tsx")).toContain("modal-skeleton-line");
    const motionSettings = readProjectFile("client/src/components/MotionSettingsRelocator.tsx");
    expect(motionSettings).toContain("assetmaster-motion");
    expect(motionSettings).toContain('role="switch"');
  });
});


describe("maintenance history and filter layout contract", () => {
  it("uses a dedicated audit session detail view with Vietnamese status labels", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");

    expect(operations).toContain('url.searchParams.set("auditSession", String(sessionId))');
    expect(operations).toContain("Danh sách đợt kiểm kê");
    expect(operations).toContain("Trạng thái dự kiến");
    expect(operations).toContain("Trạng thái thực tế");
    expect(operations).toContain("auditAssetStatusLabel(item.expectedStatus)");
    expect(operations).toContain("overflow-x-auto md:overflow-hidden");
  });

  it("keeps audit detail dropdowns above the card and constrains the asset picker", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");

    expect(operations).toContain("relative z-0 mt-5 overflow-hidden");
    expect(operations).toContain("relative z-20 border-b border-[#E7EEF3]");
    expect(operations).toContain("w-full sm:max-w-[520px]");
    const searchableSelect = readProjectFile("client/src/components/SearchableSelect.tsx");
    expect(searchableSelect).toContain("createPortal(menu, document.body)");
    expect(searchableSelect).toContain("menuPortal = true");
    expect(searchableSelect).toContain('fixed z-[9999]');
    expect(searchableSelect).toContain("const estimatedMenuHeight = 340");
    expect(searchableSelect).toContain("const openUpward");
  });

  it("supports filtered audit sessions, continuous QR scanning and discrepancy exports", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const router = readProjectFile("server/routers.ts");

    expect(operations).toContain('const [auditStatusFilter, setAuditStatusFilter] = useState("all")');
    expect(operations).toContain("filteredAuditSessions");
    expect(operations).toContain("Quét QR liên tiếp");
    expect(operations).toContain('replace(/^ASSETMASTER\\|/i, "")');
    expect(operations).toContain("Đã thêm và xác nhận bằng quét QR.");
    expect(operations).toContain("exportDiscrepancyExcel");
    expect(operations).toContain("exportDiscrepancyPdf");
    expect(operations).toContain("BIÊN BẢN CHÊNH LỆCH KIỂM KÊ");
    expect(operations).toContain("exportFieldworkSheet");
    expect(operations).toContain("Danh sách kiểm kê");
    expect(operations).toContain("selectableScopedAssets");
    expect(operations).toContain("addScopedAssets");
    expect(operations).not.toContain(">Xuất tổng tài sản<");
    expect(operations).toContain("Trạng thái thực tế");
    expect(operations).toContain("Kết quả kiểm kê");
    expect(operations).toContain('actualStatuses =');
    expect(operations).toContain('auditResults =');
    expect(operations).toContain('sheetName === "Danh sách kiểm kê"');
    expect(operations).toContain("prepareWorkbook");
    expect(operations).toContain("Chưa đưa vào đợt kiểm kê");
    expect(operations).toContain("auditResultFilter");
    expect(operations).toContain("exportDepartmentId");
    expect(operations).toContain("exportCategoryId");
    expect(operations).toContain("prepareAuditExcelImport");
    expect(operations).toContain("Nhập file đã kiểm kê");
    expect(operations).toContain('className="flex min-h-[2.45rem] items-center gap-2');
    expect(operations).toContain('Toaster position="bottom-right"');
    expect(operations).toContain("Đã nhập file Excel và cập nhật");
    expect(operations).toContain("FFFFF1D6");
    expect(operations).toContain("FFF1F3F5");
    expect(operations).toContain("filteredAuditSummary");
    expect(operations).toContain("Tổng theo bộ lọc");
    expect(operations).toContain("Thất lạc / không tìm thấy");
    expect(operations).toContain("AUDIT_ITEMS_PAGE_SIZE = 10");
    expect(operations).toContain("pagedAuditItems");
    expect(operations).toContain("Trang {activeAuditItemsPage}/{auditItemsPageCount}");
    expect(operations).toContain("Kết quả import gần nhất");
    expect(operations).toContain("auditImportPageCount");
    expect(operations).toContain("Trang preview import sau");
    expect(operations).toContain("Xem lại và xác nhận");
    expect(operations).toContain("finalizeAuditMutation");
    expect(operations).toContain("Chốt biên bản");
    expect(operations).toContain("Đã chốt · Dữ liệu khóa");
    expect(operations).toContain("exportFinalizedAuditMinutes");
    expect(operations).toContain("BIÊN BẢN KIỂM KÊ TÀI SẢN");
    expect(operations).toContain("Biên bản đã chốt (PDF)");
    expect(operations).toContain("NGƯỜI KIỂM KÊ");
    expect(operations).toContain("ĐẠI DIỆN ĐƠN VỊ QUẢN LÝ");
    expect(operations).toContain("NGƯỜI PHÊ DUYỆT");
    expect(operations).toContain("companySettingsQuery");
    expect(operations).toContain("loadAuditPdfImage");
    expect(operations).toContain("Trang ${page}/${pageCount}");
    expect(operations).toContain("Lịch sử nhập Excel");
    expect(operations).toContain("auditImportHistoryQuery");
    expect(operations).toContain("Hiện trạng thực tế");
    expect(operations).toContain("Ghi chú kiểm kê");
    expect(operations).toContain("Mã QR để quét");
    expect(operations).toContain("sm:max-w-[520px]");
    expect(operations).toContain("Thêm tài sản");
    expect(operations).toContain("Danh sách kiểm kê");
    expect(router).toContain("importHistory");
    expect(router).toContain("requireEditableAuditSession");
    expect(router).toContain("finalize:");
    expect(router).toContain("getNextAuditSequence");
    expect(router).toContain("String(sequence).padStart(2, \"0\")");
    expect(readProjectFile("server/db.ts")).toContain("^KK-${auditYear}-(\\\\d+)$");
  });

  it("adds company branding to every exported Excel workbook and to audit PDFs", () => {
    const workbookHelper = readProjectFile("client/src/lib/brandedWorkbook.ts");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    const home = readProjectFile("client/src/pages/Home.tsx");
    const categories = readProjectFile("client/src/pages/AssetCategoryManagementPage.tsx");
    const assetImport = readProjectFile("client/src/components/AssetImportModal.tsx");

    expect(workbookHelper).toContain('const infoSheetName = "Thông tin doanh nghiệp"');
    expect(workbookHelper).toContain('await import("exceljs")');
    expect(workbookHelper).toContain("company.logoUrl");
    expect(workbookHelper).toContain("Logo doanh nghiệp");
    expect(operations).toContain("writeBrandedWorkbook");
    expect(operations).not.toContain("XLSX.writeFile");
    expect(operations).toContain("company.phone");
    expect(reports).toContain("writeBrandedWorkbook");
    expect(home).toContain("writeBrandedWorkbook");
    expect(categories).toContain("writeBrandedWorkbook");
    expect(assetImport).toContain("writeBrandedWorkbook");
  });

  it("previews every export before downloading and applies configurable PDF logo watermarks", () => {
    const previewHost = readProjectFile("client/src/components/ExportPreviewHost.tsx");
    const workbookHelper = readProjectFile("client/src/lib/brandedWorkbook.ts");
    const pdfExport = readProjectFile("client/src/lib/pdfExport.ts");
    const home = readProjectFile("client/src/pages/Home.tsx");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const brandPanel = readProjectFile("client/src/components/BrandEnhancementsPanel.tsx");

    expect(previewHost).toContain('exportPreviewEvent = "assetmaster:preview-export"');
    expect(previewHost).toContain("Xem trước trước khi tải");
    expect(previewHost).toContain("xlsx");
    expect(previewHost).toContain("event.key === \"Escape\"");
    expect(workbookHelper).toContain("openExportPreview");
    expect(pdfExport).toContain("assetmaster-pdf-watermark");
    expect(pdfExport).toContain("applyPdfLogoWatermark");
    expect(pdfExport).toContain("openPdfPreview");
    expect(home).toContain("ExportPreviewHost");
    expect(home).toContain("createPdfLogoWatermark");
    expect(operations).toContain("createPdfLogoWatermark");
    expect(brandPanel).toContain("Watermark PDF");
    expect(brandPanel).toContain("assetmaster-pdf-watermark");
  });

  it("supports preview cleanup, preview export, and safe audit deletion actions", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const router = readProjectFile("server/routers.ts");
    expect(operations).toContain("Xóa chọn");
    expect(operations).toContain("Xuất Excel preview");
    expect(operations).toContain("Xóa khỏi đợt");
    expect(operations).toContain("Xóa đợt nháp");
    expect(router).toContain("removeItem:");
    expect(router).toContain("deleteDraft:");
  });

  it("excludes supplier-returned assets from editable audit choices and exports", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const router = readProjectFile("server/routers.ts");
    expect(operations).toContain('const auditableAssets = assets.filter((asset) => asset.status !== "returned_to_vendor")');
    expect(operations).toContain("auditItemsForCurrentSession");
    expect(operations).toContain("tài sản Trả nhà cung cấp đã được loại trừ khỏi phạm vi kiểm kê.");
    expect(operations).toContain("không thuộc phạm vi kiểm kê");
    expect(router).toContain('asset.status === "returned_to_vendor"');
    expect(router).toContain("Tài sản đã trả nhà cung cấp không thuộc phạm vi kiểm kê.");
  });

  it("lets users select multiple audit import rows and apply a shared note", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    expect(operations).toContain("selectedAuditImportIds");
    expect(operations).toContain("bulkAuditImportNote");
    expect(operations).toContain("Chọn tất cả");
    expect(operations).toContain("Áp dụng ghi chú");
    expect(operations).toContain("Ghi chú xử lý chung cho các tài sản đã chọn");
  });

  it("previews audit import changes before confirmation and supports discrepancy notes", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    expect(operations).toContain("auditImportChangeRows");
    expect(operations).toContain("isAuditImportConfirmOpen");
    expect(operations).toContain("Xác nhận cập nhật từ Excel?");
    expect(operations).toContain("Xem lại và xác nhận");
    expect(operations).toContain("Ghi chú (có thể chỉnh sửa)");
    expect(operations).toContain("Bổ sung ghi chú xử lý");
  });

  it("builds valid Excel workbooks directly and supports audit review after import", () => {
    const workbookHelper = readProjectFile("client/src/lib/brandedWorkbook.ts");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const previewHost = readProjectFile("client/src/components/ExportPreviewHost.tsx");
    expect(workbookHelper).toContain("copySourceSheets");
    expect(workbookHelper).not.toContain("brandedWorkbook.xlsx.load");
    expect(workbookHelper).not.toContain("XLSX.write(workbook");
    expect(operations).toContain("lastAuditImportSummary");
    expect(operations).toContain("auditAssetSearch");
    expect(operations).toContain("auditActualStatusFilter");
    expect(operations).toContain("Không tìm thấy");
    expect(operations).toContain("bg-[#FFF1F3]");
    expect(previewHost).toContain("previewSheetName");
    expect(previewHost).toContain("Danh sách kiểm kê");
    expect(previewHost).toContain("excelPreviewPageCount");
    expect(previewHost).toContain("Trang preview Excel sau");
    const assetImport = readProjectFile("client/src/components/AssetImportModal.tsx");
    expect(assetImport).toContain("previewPageCount");
    expect(assetImport).toContain("Trang preview import tài sản sau");
  });

  it("closes the asset import modal after a successful import notification", () => {
    const assetImport = readProjectFile("client/src/components/AssetImportModal.tsx");
    expect(assetImport).toContain("toast.success(`Đã tạo ${result.created} và cập nhật ${result.updated} tài sản.`)");
    expect(assetImport).toContain("window.setTimeout(onClose, 650)");
  });

  it("exposes a per-maintenance-ticket history drawer and protected history query", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const router = readProjectFile("server/routers.ts");
    const db = readProjectFile("server/db.ts");
    expect(operations).toContain("trpc.maintenance.history.useQuery");
    expect(operations).toContain("Lịch sử thay đổi");
    expect(operations).toContain("Xem lịch sử");
    expect(router).toContain("history: protectedProcedure");
    expect(db).toContain("listActivityLogsByEntity");
  });

  it("keeps searchable dropdowns below the trigger and aligns them horizontally", () => {
    const searchableSelect = readProjectFile("client/src/components/SearchableSelect.tsx");
    expect(searchableSelect).toContain('top-[calc(100%+0.35rem)]');
    expect(searchableSelect).not.toContain('bottom-[calc(100%+0.35rem)]');
    expect(searchableSelect).toContain('menuAlign === "right" ? "right-0 left-auto"');
  });

  it("uses a compact wrapped asset filter row with a wide search field", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    expect(home).toContain('flex flex-wrap items-center gap-2 border-b border-[#E7EEF3] bg-[#FBFCFD] px-5 py-4');
    expect(home).toContain('relative min-w-0 flex-[2_1_420px]');
  });
});


  it("serves the configured AssetMaster title from the UI endpoint", async () => {
    const response = await fetch("http://localhost:3000/");
    expect(response.ok).toBe(true);
    const html = await response.text();
    expect(html).toContain("AssetMaster");
    expect(process.env.VITE_APP_TITLE).toBe("AssetMaster – Hệ thống Quản lý Tài sản");
  });


it("keeps maintenance UI controls on the shared interaction contracts", () => {
  const db = readProjectFile("server/db.ts");
  const routers = readProjectFile("server/routers.ts");
  const historyDrawer = readProjectFile("client/src/components/AssetImportRecovery.tsx");
  const categories = readProjectFile("client/src/pages/AssetCategoryManagementPage.tsx");
  const datePicker = readProjectFile("client/src/components/DatePickerField.tsx");
  const home = readProjectFile("client/src/pages/Home.tsx");
  const assetCatalogDropdowns = readProjectFile("client/src/components/AssetCatalogDropdowns.tsx");

  expect(db).toContain("limit(safePageSize).offset");
  expect(routers).toContain("pageSize: z.number().int().min(1).max(50)");
  expect(historyDrawer).toContain("historyItems.map");
  expect(historyDrawer).toContain('"Tải thêm"');
  expect(historyDrawer).toContain("IntersectionObserver");
  expect(historyDrawer).toContain('"Thu gọn"');
  expect(historyDrawer).toContain("Trang lịch sử trước");
  expect(categories).toContain("<SearchableSelect value={activityFilter}");
  expect(categories).toContain("<SearchableSelect value={assetFilter}");
  expect(datePicker).toContain('captionLayout="dropdown"');
  expect(datePicker).toContain("fromYear={new Date().getFullYear() - 10}");
  expect(home).toContain("relative border-b border-[#E7EEF3]");
  expect(home).toContain('link[rel="icon"]');
  expect(home).toContain("companyInfo.logoUrl");
  expect(home).toContain("doc.addImage(logoDataUrl");
  const brandEnhancements = readProjectFile("client/src/components/BrandEnhancementsPanel.tsx");
  expect(datePicker).toContain("w-[238px]");
  expect(datePicker).toContain("[--cell-size:1.55rem]");
  expect(brandEnhancements).toContain("image/png,image/jpeg,image/webp");
  expect(brandEnhancements).toContain("bg-[#F7FAFC]");
  expect(home).toContain("<AssetCatalogDropdowns");
  expect(assetCatalogDropdowns).toContain("<SearchableSelect");
  expect(assetCatalogDropdowns).toContain("<SearchableSelect");
  expect(assetCatalogDropdowns).toContain('aria-label="Hủy tạo mới"');
  expect(readProjectFile("client/src/components/SearchableSelect.tsx")).toContain('aria-label="Xóa tìm kiếm trong dropdown"');
});

it("cung cấp trung tâm hướng dẫn theo vai trò và nút hướng dẫn riêng cho nhân viên", () => {
const home = readProjectFile("client/src/pages/Home.tsx");
const helpCenter = readProjectFile("client/src/pages/HelpCenter.tsx");
const userDashboard = readProjectFile("client/src/pages/UserDashboard.tsx");

  expect(home).toContain('"Trợ giúp & hướng dẫn": "help"');
  expect(home).toContain('<HelpCenter />');
  expect(helpCenter).toContain("Hướng dẫn Quản trị viên");
  expect(helpCenter).toContain("Hướng dẫn Nhân viên");
  expect(helpCenter).toContain("Quản lý danh mục tài sản");
  expect(helpCenter).toContain("Gửi yêu cầu hoàn trả");
  expect(helpCenter).toContain("UserHelpDialog");
  expect(helpCenter).toContain("SearchHelpInput");
  expect(helpCenter).toContain("saveGuide.mutate");
  expect(helpCenter).toContain("Chỉnh sửa hướng dẫn");
  expect(helpCenter).toContain("Tìm kiếm hướng dẫn");
expect(userDashboard).toContain("Hướng dẫn sử dụng");
expect(userDashboard).toContain('<UserHelpDialog open={helpOpen}');
});

it("đồng bộ nhận diện Cổng nhân viên và hiển thị cập nhật, lịch sử hướng dẫn", () => {
  const helpCenter = readProjectFile("client/src/pages/HelpCenter.tsx");
  const userDashboard = readProjectFile("client/src/pages/UserDashboard.tsx");
  const router = readProjectFile("server/routers.ts");

  expect(userDashboard).toContain("trpc.company.get.useQuery");
  expect(userDashboard).toContain("activeCompanyInfo.websiteTitle");
  expect(userDashboard).toContain("activeCompanyInfo.logoUrl");
  expect(userDashboard).toContain("activeCompanyInfo.name");
  expect(helpCenter).toContain("Mới cập nhật");
  expect(helpCenter).toContain("isRecentlyUpdated");
  expect(helpCenter).toContain("Lịch sử phiên bản");
  expect(helpCenter).toContain("trpc.help.versions.useQuery");
  expect(router).toContain("createHelpGuideVersion");
expect(router).toContain("versions: adminProcedure");
});

it("trình bày visual diff rõ ràng trong lịch sử phiên bản hướng dẫn", () => {
  const helpCenter = readProjectFile("client/src/pages/HelpCenter.tsx");
  const versionDiff = readProjectFile("client/src/components/GuideVersionDiffDialog.tsx");

  expect(helpCenter).toContain("GuideVersionDiffDialog");
  expect(versionDiff).toContain("Lịch sử phiên bản & so sánh");
  expect(versionDiff).toContain("So với phiên bản trước");
  expect(versionDiff).toContain("xanh lá");
  expect(versionDiff).toContain("đỏ gạch ngang");
  expect(versionDiff).toContain("diffTokens");
expect(versionDiff).toContain("Bước thay đổi");
});

it("hiển thị thời điểm đồng bộ dashboard từ dữ liệu truy vấn thay vì mốc thời gian cố định", () => {
  const home = readProjectFile("client/src/pages/Home.tsx");

  expect(home).toContain("const dashboardLastSyncedAt = assetQuery.dataUpdatedAt");
  expect(home).toContain("Đồng bộ lúc {dashboardSyncLabel}");
  expect(home).toContain("refreshDashboardData");
  expect(home).toContain("Đồng bộ lại dữ liệu dashboard");
  expect(home).not.toContain("Dữ liệu cập nhật lúc 09:42, 14/02/2025");
});
