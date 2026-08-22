import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatVnd, isInvalidVndInput, normalizeVndIntegerInput, numberToVietnameseWords, parseVndAmount } from "../client/src/lib/formatters";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("modal presentation contract", () => {
  it("parses database decimals and Vietnamese separators as the same VND integer amount", () => {
    expect(parseVndAmount("160000.00")).toBe(160000);
    expect(parseVndAmount("160.000")).toBe(160000);
    expect(parseVndAmount("160000")).toBe(160000);
    expect(formatVnd("160000.00")).toBe("160.000");
    expect(numberToVietnameseWords(160000)).toBe("Một trăm sáu mươi nghìn đồng");
    expect(isInvalidVndInput("42.500.000 VNĐ")).toBe(false);
    expect(isInvalidVndInput("42,500,000 ₫")).toBe(false);
    expect(isInvalidVndInput("160000.00")).toBe(false);
    expect(isInvalidVndInput("42 nghìn")).toBe(true);
    expect(normalizeVndIntegerInput("55.345.435")).toBe("55345435");
    expect(normalizeVndIntegerInput("999đVNĐ")).toBe("999");
  });

  it("shows a shared inline warning and blocks accessory saving for invalid currency input", () => {
    const currencyInput = readProjectFile("client/src/components/CurrencyInput.tsx");
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");

    expect(currencyInput).toContain("normalizeVndIntegerInput");
    expect(currencyInput).toContain("Đơn giá chỉ nhận chữ số nguyên từ 0–9.");
    expect(currencyInput).toContain("border-[#B44545]");
    expect(supplies).toContain("isInvalidVndInput(form.unitCost)");
    expect(supplies).toContain("Đơn giá không đúng định dạng");
  });

  it("provides a quick-clear action for unit-price inputs", () => {
    const currencyInput = readProjectFile("client/src/components/CurrencyInput.tsx");
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");

    expect(currencyInput).toContain('aria-label="Xóa số tiền"');
    expect(supplies).toContain('aria-label", "Xóa đơn giá"');
    expect(supplies).toContain('aria-label", "Xóa đơn giá dòng xem trước"');
    expect(supplies).toContain("const handleClear = () => { input.value = \"\"");
  });

  it("summarizes maintenance costs by month and filters non-numeric unit-price input", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const currencyInput = readProjectFile("client/src/components/CurrencyInput.tsx");
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");

    expect(home).toContain("monthlyMaintenanceCosts");
    expect(home).toContain("Chi phí Bảo hành/Sửa chữa theo tháng");
    expect(home).toContain("data-maintenance-monthly-cost-chart");
    expect(currencyInput).toContain("normalizeVndIntegerInput");
    expect(currencyInput).toContain("Đơn giá chỉ nhận chữ số nguyên từ 0–9.");
    expect(supplies).toContain("normalizeVndIntegerInput");
    expect(supplies).not.toContain("input.value.replace(/[^0-9.,]/g, \"\")");
  });

  it("supports maintenance chart year filtering, ticket drilldown and monthly budgets", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const database = readProjectFile("server/db.ts");
    const routers = readProjectFile("server/routers.ts");

    expect(home).toContain("maintenanceChartYear");
    expect(home).toContain("maintenance.monthlyBudgets.useQuery");
    expect(home).toContain("maintenance.saveMonthlyBudget.useMutation");
    expect(home).toContain("Xem phiếu Bảo hành/Sửa chữa tháng");
    expect(home).toContain("Ngân sách tháng (VNĐ)");
    expect(home).toContain("Vượt ngân sách");
    expect(database).toContain("listMaintenanceMonthlyBudgets");
    expect(database).toContain("saveMaintenanceMonthlyBudget");
    expect(routers).toContain("monthlyBudgets: adminProcedure");
    expect(routers).toContain("saveMonthlyBudget: adminProcedure");
  });

  it("handles Khấu hao/Thanh lý like assets returned to vendors", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const routers = readProjectFile("server/routers.ts");

    expect(home).toContain('"retired"');
    expect(home).toContain('Khấu hao/Thanh lý');
    expect(home).toContain('"Khấu hao - Thanh lý"');
    expect(home).toContain('statusType !== "retired"');
    expect(operations).toContain('asset.status !== "returned_to_vendor" && asset.status !== "retired"');
    expect(routers).toContain('asset.status === "returned_to_vendor" || asset.status === "retired"');
    expect(routers).toContain('asset?.status !== "returned_to_vendor" && asset?.status !== "retired"');
  });

  it("keeps new-maintenance request controls aligned when the estimated cost shows words", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");

    expect(operations).toContain('grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-4');
    expect(operations).toContain('CurrencyInput value={estimatedCost}');
    expect(operations).toContain('className="flex min-h-11 self-start items-center justify-center');
  });

  it("prevents helper text below fields from stretching sibling controls across forms", () => {
    const stylesheet = readProjectFile("client/src/index.css");
    const currencyInput = readProjectFile("client/src/components/CurrencyInput.tsx");
    const catalogDropdowns = readProjectFile("client/src/components/AssetCatalogDropdowns.tsx");
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");

    expect(currencyInput).toContain('className="currency-input-with-helper w-full"');
    expect(stylesheet).toContain('.grid:has(.currency-input-with-helper) { align-items: start; }');
    expect(stylesheet).toContain('.form-helper-grid > * { align-self: start; }');
    expect(catalogDropdowns).toContain('return (\n    <>');
    expect(catalogDropdowns).toContain('className="min-w-0"');
    expect(supplies).toContain('formGrid?.classList.add("form-helper-grid")');
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
    const importRecovery = readProjectFile("client/src/components/AssetImportRecovery.tsx");
    const importHistory = readProjectFile("client/src/components/ImportHistoryDrawer.tsx");
    const home = readProjectFile("client/src/pages/Home.tsx");
    const employees = readProjectFile("client/src/pages/EmployeeManagementView.tsx");

    expect(importModal).toContain("Tự động cập nhật tài sản trùng Serial/IMEI");
    expect(importModal).toContain("Trường sẽ thay đổi khi cập nhật");
    expect(importModal).toContain("Đang kiểm tra sheet, header, ngày tháng và số tiền");
    expect(importModal).toContain("Đang ghi ${rowsForImport.length} dòng trong một transaction an toàn");
    expect(importModal).toContain("Xung đột Serial");
    expect(importRecovery).toContain("AUTO_COLLAPSE_MS = 12_000");
    expect(importRecovery).toContain('aria-label="Thu nhỏ thẻ hoàn tác import"');
    expect(importRecovery).toContain('aria-label="Mở thẻ hoàn tác import"');
    expect(importHistory).toContain("Lịch sử import tài sản");
    expect(importHistory).toContain("undoImportSession.useMutation");
    expect(importHistory).toContain("Có thể hoàn tác");
    expect(importHistory).toContain("importSessionDetails.useQuery");
    expect(importHistory).toContain("Xem tài sản");
    expect(importHistory).toContain("assetmaster:open-import-history");
    expect(home).toContain('className="relative z-[120]"');
    expect(home).toContain("z-[130]");
    expect(home).toContain('aria-label="Mở lịch sử import"');
    expect(home).toContain('title="Lịch sử import thành công"');
    expect(home).toContain("onOpenImportHistory");
    expect(employees).toContain("EMPLOYEE_PAGE_SIZE = 10");
    expect(employees).toContain('aria-label="Trang nhân sự sau"');
    expect(employees).toContain('data-search-clear-managed="true"');
    expect(employees).toContain('aria-label="Xóa từ khóa tìm kiếm nhân sự"');
    expect(employees).toContain('className="relative min-w-0"');
  });

  it("guides completed imports to the history drawer without rendering a floating undo card", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const importModal = readProjectFile("client/src/components/AssetImportModal.tsx");
    expect(home).not.toContain("LatestImportUndo");
    expect(importModal).toContain("Bạn có thể hoàn tác trong Lịch sử import ở hàng bộ lọc Danh mục tài sản.");
    expect(importModal).toContain('label: "Mở Lịch sử"');
    expect(importModal).toContain('assetmaster:open-import-history');
  });

  it("shows the import undo countdown and alerts users before its deadline", () => {
    const importHistory = readProjectFile("client/src/components/ImportHistoryDrawer.tsx");
    expect(importHistory).toContain("Hoàn tác:");
    expect(importHistory).toContain("assetmaster-import-undo-warning-");
    expect(importHistory).toContain("Phiên import sắp hết hạn hoàn tác");
    expect(importHistory).toContain('label: "Mở Lịch sử"');
    expect(importHistory).toContain("animate-pulse");
    expect(importHistory).toContain("Lý do hoàn tác");
    expect(importHistory).toContain("undoReason.trim().length < 10");
  });

  it("exposes a quantity-based supply inventory workflow with movements and low-stock warnings", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");
    const routers = readProjectFile("server/routers.ts");
    expect(home).toContain('label: "Phụ kiện"');
    expect(home).toContain('<SuppliesInventoryView canEditSectionLabels={isAdmin} />');
    expect(supplies).toContain("Phụ kiện");
    expect(supplies).toContain("Nhập danh sách từ Excel");
    expect(supplies).toContain("Tải mẫu");
    expect(supplies).toContain("bulkCreate");
    expect(supplies).toContain("Phụ kiện");
    expect(supplies).toContain("Đang kiểm tra dữ liệu từng dòng");
    expect(supplies).toContain("Đang ghi transaction an toàn");
    expect(supplies).toContain("Lịch sử import");
    expect(supplies).toContain("Chọn một phiên import");
    expect(routers).toContain("importHistory:");
    expect(routers).toContain("importHistoryItems:");
    expect(supplies).toContain("text-center shadow-sm");
    expect(supplies).toContain("Sắp hết hàng");
    expect(supplies).toContain('aria-label="Ghi nhận nhập, xuất hoặc cấp phát"');
    expect(supplies).toContain("Lịch sử biến động");
    expect(supplies).toContain("groupFilter");
    expect(supplies).toContain("Lọc theo nhóm");
    expect(supplies).not.toContain("nextAccessoryCodeQuery");
    expect(supplies).toContain("setForm(emptyForm)");
    expect(supplies).toContain("Xem trước và chỉnh sửa dữ liệu");
    expect(supplies).toContain("các ô có cảnh báo trước khi xác nhận lưu");
    expect(supplies).toContain("bg-[#FFF5EE]");
    expect(supplies).toContain("Xác nhận lưu ${rows.length} dòng");
    expect(supplies).toContain("formatVndInput");
    expect(supplies).toContain("parseVndAmount");
    expect(supplies).toContain("numberToVietnameseWords");
    expect(supplies).toContain("Ví dụ: 42.500.000");
    expect(supplies).toContain("window.requestAnimationFrame");
    expect(supplies).toContain("Tổng giá trị dự kiến");
    expect(supplies).toContain("data-accessory-value-summary");
    expect(supplies).toContain("form.openingQuantity, form.unitCost");
    expect(supplies).toContain("data-accessory-value-amount");
    expect(supplies).toContain("editCurrencyReady");
    expect(supplies).toContain("header.style.paddingBottom = \"1.35rem\"");
    expect(supplies).toContain("const renderCurrency");
    expect(supplies).toContain("}, [form]);");
    expect(supplies).toContain("Đơn giá (VNĐ)");
    expect(supplies).toContain("previewCurrencyReady");
    expect(supplies).toContain("AccessoryGroupSummary");
    expect(supplies).toContain("Tồn kho phụ kiện theo nhóm");
    expect(supplies).toContain("Tạo nhóm phụ kiện");
    expect(supplies).toContain("Mã phụ kiện được hệ thống khóa sau khi tạo mới.");
    expect(supplies).toContain("supply-create-title");
    expect(supplies).toContain("Phụ kiện");
    expect(supplies).toContain("/Vật tư/g, \"Phụ kiện\"");
    expect(supplies).toContain("buildSupplyImportTemplate");
    expect(supplies).toContain("standardSupplyUnits");
    expect(supplies).toContain("resolveActiveSupplyImportCatalog");
    expect(supplies).toContain("template-nhap-phu-kien.xlsx");
    expect(supplies).toContain("Tải mẫu phụ kiện");
    expect(routers).toContain("supplies: router");
    expect(routers).not.toContain("supplies: router({\n    nextCode:");
    expect(routers).toContain("createAccessoryGroup:");
    expect(routers).toContain("Tồn kho không đủ");
  });

  it("keeps supply search readable and supports staff or manual recipients for issues", () => {
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");
    const stylesheet = readProjectFile("client/src/index.css");
    const routers = readProjectFile("server/routers.ts");
    expect(supplies).toContain('className="field-input !pl-11"');
    expect(supplies).toContain("Sửa mã và tên phụ kiện");
    expect(supplies).toContain("Nhân sự hệ thống");
    expect(supplies).toContain("Người khác");
    expect(supplies).toContain("recipient?.departmentId");
    expect(supplies).toContain('recipientMode !== "staff" || !recipientUserId');
    expect(supplies).toContain("setRecipientDepartmentId((current)");
    expect(stylesheet).toContain(".recipient-mode-active");
    expect(stylesheet).toContain(".primary-action");
    expect(stylesheet).toContain("align-items: center");
    expect(routers).toContain("Mã phụ kiện này đã tồn tại.");
    expect(routers).toContain("recipientUserId");
    expect(routers).toContain("Không tìm thấy nhân sự đang hoạt động được chọn.");
  });

  it("adds supply issue slips, stock returns, and an Excel history report", () => {
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");
    const issueSlips = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");
    const routers = readProjectFile("server/routers.ts");
    expect(supplies).toContain("Tạo phiếu cấp phát");
    expect(issueSlips).toContain("PK-NĂM-001");
    expect(issueSlips).toContain("Hoàn trả về kho");
    expect(issueSlips).toContain("Xuất Excel lịch sử");
    expect(routers).toContain("PK-${issueYear}-${String(sequence).padStart(3, \"0\")}");
    expect(routers).toContain("returnIssueItem");
    expect(routers).toContain("historyReport");
  });

  it("allows one recipient to receive multiple supply types in one issue slip", () => {
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");
    const routers = readProjectFile("server/routers.ts");

    expect(supplies).toContain("Danh sách phụ kiện cấp phát");
    expect(supplies).toContain("Thêm phụ kiện vào phiếu");
    expect(supplies).toContain("Tạo phiếu cấp phát nhiều loại?");
    expect(supplies).toContain("issuePreviewItems.map((item) => ({ supplyId: item.supplyId, quantity: item.quantity }))");
    expect(supplies).toContain("Một phụ kiện chỉ được chọn một lần trong cùng phiếu.");
    expect(routers).toContain("items: z.array(z.object({ supplyId");
    expect(routers).toContain("Một phụ kiện chỉ được xuất một lần trong cùng phiếu.");
  });

  it("uses shared status tones and standard ten-row pagination for supply issue slips", () => {
    const issueSlips = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");

    expect(issueSlips).toContain("const slipsPageSize = 10");
    expect(issueSlips).toContain("const activeSlipPage");
    expect(issueSlips).toContain("Trang {activeSlipPage}/{slipsPageCount}");
    expect(issueSlips).toContain('aria-label="Trang phiếu cấp phát trước"');
    expect(issueSlips).toContain('aria-label="Trang phiếu cấp phát sau"');
    expect(issueSlips).toContain('border-[#CDE5E5] bg-[#ECF8F7] text-[#087A6A]');
    expect(issueSlips).toContain('border-[#C7DDF8] bg-[#EAF3FF] text-[#2666A8]');
  });

  it("keeps supply filters and action icons aligned while exposing their names on hover", () => {
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");
    const stylesheet = readProjectFile("client/src/index.css");

    expect(supplies).toContain("sm:max-w-[420px]");
    expect(supplies).toContain("supply-filter-action");
    expect(supplies).toContain("supply-row-action");
    expect(supplies).toContain('title="Ghi nhận nhập, xuất hoặc cấp phát"');
    expect(supplies).toContain('title="Sửa mã và tên phụ kiện"');
    expect(supplies).toContain('title="Xem lịch sử biến động"');
    expect(stylesheet).toContain(".supply-filter-action");
    expect(stylesheet).toContain(".supply-row-action:hover");
  });

  it("shows real issue analytics by department or recipient and previews printable issue-slip PDFs", () => {
    const issueSlips = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");
    const pdf = readProjectFile("client/src/lib/supplyIssueSlipPdf.ts");
    const routers = readProjectFile("server/routers.ts");
    const db = readProjectFile("server/db.ts");

    expect(issueSlips).toContain("issueAnalytics.useQuery");
    expect(issueSlips).toContain("Phòng ban");
    expect(issueSlips).toContain("Nhân sự");
    expect(issueSlips).toContain("Xem & in PDF");
    expect(issueSlips).toContain("openSupplyIssueSlipPdf");
    expect(routers).toContain("issueAnalytics");
    expect(db).toContain("listSupplyIssueAnalytics");
    expect(pdf).toContain("PHIẾU CẤP PHÁT PHỤ KIỆN");
    expect(pdf).toContain("NGƯỜI NHẬN");
    expect(pdf).toContain("openPdfPreview");
  });

  it("opens the multi-item issue-slip PDF from the newly created slip and preserves every issued item", () => {
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");
    const pdf = readProjectFile("client/src/lib/supplyIssueSlipPdf.ts");

    expect(supplies).toContain("previewIssueSlipPdf");
    expect(supplies).toContain('label: "Xem & in PDF"');
    expect(supplies).toContain("const createdSlip: CreatedIssueSlipPdf");
    expect(supplies).toContain("issuePreviewItems.map((item) => ({ supplyCode:");
    expect(pdf).toContain("items.forEach((item, index)");
    expect(pdf).toContain('"Tên phụ kiện"');
    expect(pdf).toContain("drawPdfCorporateFooter");
  });

  it("shows detailed accessory receipt and return history inside the employee profile", () => {
    const employees = readProjectFile("client/src/pages/EmployeeManagementView.tsx");
    const routers = readProjectFile("server/routers.ts");
    const db = readProjectFile("server/db.ts");

    expect(employees).toContain("trpc.employees.supplyHistory.useQuery");
    expect(employees).toContain("Lịch sử nhận phụ kiện");
    expect(employees).toContain("Đã trả {item.returnedQuantity} · Còn {outstanding}");
    expect(employees).toContain("SUPPLY_HISTORY_PAGE_SIZE");
    expect(employees).toContain("EmployeeSupplyHistorySection");
    expect(employees).toContain("CompactEmployeeSupplyHistorySection");
    expect(employees).toContain("openSlipPdf");
    expect(employees).toContain("Mở lại PDF phiếu cấp phát");
    expect(employees).toContain("Từ ngày");
    expect(employees).toContain("Đến ngày");
    expect(employees).toContain("Còn giữ");
    expect(routers).toContain("supplyHistory: adminProcedure");
    expect(db).toContain("listSupplyIssueHistoryByRecipientUserId");
    expect(db).toContain("recipientUserId: supplyIssueSlips.recipientUserId");
    expect(db).toContain("recipientName: supplyIssueSlips.recipientName");
    expect(db).toContain("issuedByName: supplyIssueSlips.issuedByName");
  });

  it("includes handover accessories in employee holdings without creating a duplicate PK issue slip", () => {
    const employees = readProjectFile("client/src/pages/EmployeeManagementView.tsx");
    const issueSlips = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");
    const db = readProjectFile("server/db.ts");

    expect(db).toContain("handoverSupplyItems.issuedQuantity");
    expect(db).toContain("inArray(handovers.status, [\"active\", \"returned\"])");
    expect(db).toContain('source: "handover" as const');
    expect(db).toContain("recipientUserId: handovers.recipientUserId");
    expect(issueSlips).toContain("row.recipientUserId !== Number(selectedEmployeeId)");
    expect(employees).toContain('const recordKey = `${entry.source || "issue-slip"}-${entry.issueSlipId}`');
    expect(employees).toContain('slip.source === "handover"');
    expect(employees).toContain("không tạo thêm phiếu cấp phát PK");
  });

  it("keeps handover returns whole-numbered and makes BG-linked accessory holdings traceable", () => {
    const employees = readProjectFile("client/src/pages/EmployeeManagementView.tsx");
    const supplies = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");
    const home = readProjectFile("client/src/pages/Home.tsx");
    const db = readProjectFile("server/db.ts");
    const routers = readProjectFile("server/routers.ts");

    expect(home).toContain('inputMode="numeric"');
    expect(home).toContain('step="1"');
    expect(home).toContain('event.target.value.replace(/\\D/g, "")');
    expect(routers).toContain("quantity: z.number().int().min(0)");
    expect(employees).toContain("setPreviewHandoverId(Number(slip.issueSlipId))");
    expect(employees).toContain("InlineHandoverPreviewDialog");
    expect(employees).toContain("Mở biên bản bàn giao gốc");
    expect(employees).toContain("Kèm BG");
    expect(supplies).toContain("Chi tiết phụ kiện đang giữ");
    expect(supplies).toContain("Phân tách theo từng mã phụ kiện");
    expect(db).toContain("supplyCode: handoverSupplyItems.supplyCode");
    expect(db).toContain("supplyCode: supplyIssueSlipItems.supplyCode");
  });

  it("shows only outstanding handover accessories with an actionable BG certificate in employee statistics", () => {
    const supplies = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");
    const db = readProjectFile("server/db.ts");
    const routers = readProjectFile("server/routers.ts");

    expect(routers).toContain("handoverHoldings: adminProcedure");
    expect(db).toContain("listActiveHandoverSupplyHoldingsByRecipientUserId");
    expect(db).toContain("handoverSupplyItems.issuedQuantity} - ${handoverSupplyItems.returnedQuantity} > 0");
    expect(supplies).toContain("trpc.supplies.handoverHoldings.useQuery");
    expect(supplies).toContain("Phụ kiện còn đang giữ kèm biên bản");
    expect(supplies).toContain("Chỉ hiển thị phụ kiện còn số lượng giữ");
    expect(supplies).toContain("openHandover(item.handoverId)");
    expect(supplies).toContain('window.location.assign("/?view=handovers")');
  });

  it("groups held accessories by BG or PK source and previews the selected source without leaving supplies", () => {
    const supplies = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");

    expect(supplies).toContain("trpc.employees.supplyHistory.useQuery");
    expect(supplies).toContain('const key = `${source}-${entry.issueSlipId}`');
    expect(supplies).toContain("Gộp mỗi biên bản BG hoặc phiếu cấp phát PK thành một nhóm");
    expect(supplies).toContain("Phiếu cấp phát phụ kiện riêng");
    expect(supplies).toContain("setPreviewHandoverId(source.sourceId)");
    expect(supplies).toContain("trpc.handovers.get.useQuery");
    expect(supplies).toContain("<Dialog open={previewHandoverId !== null}");
    expect(supplies).toContain("Biên bản bàn giao ${previewHandover.referenceCode}");
    expect(supplies).toContain("openSupplyIssueSlipPdf");
  });

  it("summarizes outstanding quantities and supports collapsing each BG or PK holding card", () => {
    const supplies = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");

    expect(supplies).toContain("const [expandedSources, setExpandedSources]");
    expect(supplies).toContain("const quantityTotal = source.items.reduce");
    expect(supplies).toContain("Tổng đang giữ:");
    expect(supplies).toContain('aria-expanded={expanded}');
    expect(supplies).toContain('expanded ? "Thu gọn"');
    expect(supplies).toContain('`Chi tiết (${source.items.length})`');
    expect(supplies).toContain("expanded && <div");
  });

  it("keeps the inline handover preview header visible while its body scrolls on compact screens", () => {
    const css = readProjectFile("client/src/index.css");

    expect(css).toContain('[data-slot="dialog-content"].max-h-\\[88vh\\]');
    expect(css).toContain('overflow: hidden !important');
    expect(css).toContain('[data-slot="dialog-header"] + div');
    expect(css).toContain('top: 0.5rem !important');
    expect(css).toContain('transform: translateX(-50%) !important');
  });

  it("offers print and PDF export from the inline handover preview using the shared document template", () => {
    const supplies = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");
    const handoverPdf = readProjectFile("client/src/lib/handoverAssetPdf.ts");

    expect(supplies).toContain("openHandoverAssetPdf");
    expect(supplies).toContain("await openHandoverAssetPdf");
    expect(supplies).toContain('createPdf(true)');
    expect(supplies).toContain('createPdf(false)');
    expect(supplies).toContain('preparingPdf === "print" ? "Đang chuẩn bị..." : "In"');
    expect(supplies).toContain('preparingPdf === "export" ? "Đang tạo..." : "Xuất PDF"');
    expect(handoverPdf).toContain("openPdfPreview");
    expect(handoverPdf).toContain("autoPrint: options?.autoPrint");
    expect(handoverPdf).toContain("BIÊN BẢN BÀN GIAO TÀI SẢN");
  });

  it("splits service-ticket company metadata into individual lines and keeps PDF preview available on mobile", () => {
    const servicePdf = readProjectFile("client/src/lib/serviceTicketPdf.ts");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const css = readProjectFile("client/src/index.css");

    expect(servicePdf).toContain("const companyLines =");
    expect(servicePdf).toContain("MST: ${company.taxCode}");
    expect(servicePdf).toContain("ĐT: ${company.phone}");
    expect(servicePdf).toContain("companyLines.forEach");
    expect(operations).toContain('ticket.serviceChannel === "warranty"');
    expect(operations).toContain("data-warranty-mobile-pdf");
    expect(operations).toContain("button.disabled = generating");
    expect(operations).toContain("service-ticket-pdf-loader");
    expect(css).toContain("@keyframes service-ticket-pdf-spin");
  });

  it("centers the inline BG preview and uses a user-defined, safe PDF filename", () => {
    const supplies = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");
    const css = readProjectFile("client/src/index.css");
    const handoverPdf = readProjectFile("client/src/lib/handoverAssetPdf.ts");

    expect(supplies).toContain("handover-inline-preview-dialog");
    expect(supplies).toContain('aria-label="Tên file PDF"');
    expect(supplies).toContain("fileName: fileBaseName");
    expect(css).toContain(".handover-inline-preview-dialog");
    expect(css).toContain("height: fit-content !important");
    expect(css).toContain("margin: auto !important");
    expect(css).toContain("transform: none !important");
    expect(handoverPdf).toContain("options?: { autoPrint?: boolean; fileName?: string }");
    expect(handoverPdf).toContain("sanitizedBaseName");
    expect(handoverPdf).toContain("replace(/[\\\\/:*?\"<>|]+/g, \"-\")");
  });

  it("removes creation dates from PDF footers and remembers a custom BG filename by reference code", () => {
    const footer = readProjectFile("client/src/lib/handoverPdf.ts");
    const servicePdf = readProjectFile("client/src/lib/serviceTicketPdf.ts");
    const supplies = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");

    expect(footer).not.toContain("Lập ngày");
    expect(footer).toContain("Trang ${page}/${pageCount}");
    expect(servicePdf).not.toContain("Tạo ngày");
    expect(supplies).toContain("assetmaster-pdf-filename:bg:");
    expect(supplies).toContain("window.localStorage.getItem");
    expect(supplies).toContain("window.localStorage.setItem");
    expect(supplies).toContain("handoverPdfFileNameStorageKey(handover.referenceCode)");
  });

  it("keeps the BG dialog centered and persists PDF filenames for all document-code families", () => {
    const css = readProjectFile("client/src/index.css");
    const pdfExport = readProjectFile("client/src/lib/pdfExport.ts");

    expect(css).toContain("position: fixed !important");
    expect(css).toContain("top: 0 !important");
    expect(css).toContain("right: 0 !important");
    expect(css).toContain("bottom: 0 !important");
    expect(css).toContain("left: 0 !important");
    expect(css).toContain("animation: none !important");
    expect(pdfExport).toContain("assetmaster-pdf-filename");
    expect(pdfExport).toContain("(?:BG|BH|SC|KK|TL)-\\d{4}-[A-Z0-9-]+");
    expect(pdfExport).toContain("window.localStorage.getItem(memoryKey)");
    expect(pdfExport).toContain("window.localStorage.setItem(memoryKey, resolvedFileName)");
    expect(pdfExport).toContain("options?.skipFilenamePrompt || rememberedFileName");
  });

  it("styles the PDF preview close action with the same control language as print and download", () => {
    const css = readProjectFile("client/src/index.css");

    expect(css).toContain('[role="dialog"][aria-label^="Xem trước"] > div > div:last-child > button:first-child');
    expect(css).toContain('min-height: 2.5rem');
    expect(css).toContain('border: 1px solid #CDE5E5');
    expect(css).toContain('content: "×"');
    expect(css).toContain('background: #E6F6F2');
  });

  it("uses a balanced fixed width and viewport-safe size for the inline BG preview dialog", () => {
    const css = readProjectFile("client/src/index.css");

    expect(css).toContain('width: min(45rem, calc(100vw - 3rem)) !important');
    expect(css).toContain('max-width: min(45rem, calc(100vw - 3rem)) !important');
    expect(css).toContain('max-height: min(46rem, calc(100dvh - 3rem)) !important');
    expect(css).toContain('padding: 1.5rem !important');
    expect(css).toContain('width: calc(100vw - 1rem) !important');
  });

  it("renders the active BG preview through a viewport-centered portal instead of the shared Dialog layout", () => {
    const supplies = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");

    expect(supplies).toContain('import { createPortal } from "react-dom"');
    expect(supplies).toContain('function InlineHandoverPreviewDialog');
    expect(supplies).toContain('bg-handover-preview-overlay fixed inset-0 z-[320] flex min-h-dvh items-center justify-center');
    expect(supplies).toContain('bg-handover-preview-panel flex max-h-[calc(100dvh-2rem)]');
    expect(supplies).toContain('document.body');
    expect(supplies).toContain('if (event.key === "Escape") onClose()');
    expect(supplies).toContain('title="Đóng"');
    expect(supplies).toContain('className="modal-close-action">Đóng</button>');
    expect(supplies).not.toContain('className="modal-close-action"><X size={13} />Đóng</button>');
    expect(supplies).toContain("Cập nhật lần cuối:");
    expect(supplies).toContain("handover.updatedAt");
    expect(supplies).toContain('role="status" aria-live="polite"');
    expect(supplies).toContain("Đang mở biên bản...");
    expect(supplies).toContain("Đang tải thông tin phiếu bàn giao.");
  });

  it("opens handover accessories from the employee profile in the shared viewport overlay", () => {
    const employeeView = readProjectFile("client/src/pages/EmployeeManagementView.tsx");
    const supplies = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");

    expect(supplies).toContain("export function InlineHandoverPreviewDialog");
    expect(employeeView).toContain('import { InlineHandoverPreviewDialog } from "@/components/SupplyIssueSlipManager"');
    expect(employeeView).toContain('const [previewHandoverId, setPreviewHandoverId] = useState<number | null>(null)');
    expect(employeeView).toContain('setPreviewHandoverId(Number(slip.issueSlipId))');
    expect(employeeView).toContain('<InlineHandoverPreviewDialog handoverId={previewHandoverId} onClose={() => setPreviewHandoverId(null)} />');
    expect(employeeView).not.toContain('window.location.assign("/?view=handovers")');
  });

  it("keeps the employee accessory history compact and suppresses unnecessary decimal zeroes", () => {
    const employees = readProjectFile("client/src/pages/EmployeeManagementView.tsx");

    expect(employees).toContain("formatSupplyQuantity");
    expect(employees).toContain("maximumFractionDigits: 2");
    expect(employees).toContain("<CompactEmployeeSupplyHistorySection");
    expect(employees).toContain("Theo dõi từng phiếu, số lượng đã nhận và đã hoàn trả.");
  });

  it("filters accessory distribution statistics by searchable employee and reports active quantities", () => {
    const issueSlips = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");

    expect(issueSlips).toContain("trpc.employees.list.useQuery()");
    expect(issueSlips).toContain('<SearchableSelect value={selectedEmployeeId}');
    expect(issueSlips).toContain("Nhân sự cần kiểm tra");
    expect(issueSlips).toContain("Chọn một nhân sự để xem số lượng phụ kiện đang giữ và đã trả.");
    expect(issueSlips).toContain("đang giữ · ${numberText(item.returned)} đã trả");
    expect(issueSlips).toContain('summaryLabel = mode === "department" ? "Đang cấp"');
    expect(issueSlips).toContain("totalOutstanding");
  });

  it("keeps accessory certificate card actions side by side without wrapping on mobile", () => {
    const css = readProjectFile("client/src/index.css");
    const supplies = readProjectFile("client/src/components/SupplyIssueSlipManager.tsx");

    expect(css).toContain("Explicit classes keep each mobile certificate action");
    expect(css).toContain('@media (max-width: 639px)');
    expect(css).toContain(".holding-source-card__actions");
    expect(supplies).toContain("holding-source-card__actions grid w-full grid-cols-2");
    expect(supplies).toContain("holding-source-card__action inline-flex h-10 min-w-0");
    expect(supplies).toContain("whitespace-nowrap");
  });

  it("gives mobile certificate actions a visible press response while respecting reduced motion", () => {
    const css = readProjectFile("client/src/index.css");

    expect(css).toContain("holding-source-touch-ripple");
    expect(css).toContain(".holding-source-card__action:active");
    expect(css).toContain("transform: scale(0.965)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("touch-action: manipulation");
  });

  it("keeps the handover document code compact on mobile so later table columns remain readable", () => {
    const css = readProjectFile("client/src/index.css");

    expect(css).toContain("The handover list carries a long document code");
    expect(css).toContain(".mobile-table-scroll > table.min-w-\\[940px\\]");
    expect(css).toContain("min-width: 48rem");
    expect(css).toContain("width: 6rem");
    expect(css).toContain("text-overflow: ellipsis");
  });

  it("stacks organization chart controls on mobile so department names and counts remain readable", () => {
    const css = readProjectFile("client/src/index.css");
    const organization = readProjectFile("client/src/pages/OrganizationManagementPage.tsx");

    expect(organization).toContain("organization-management-page min-h-screen");
    expect(css).toContain("Organization cards stack their controls on phones");
    expect(css).toContain(".organization-management-page section.mt-5.overflow-hidden");
    expect(css).toContain("flex-direction: column");
    expect(css).toContain("white-space: nowrap");
  });

  it("adds a normalized quick search for organization names and codes with a clear affordance", () => {
    const organization = readProjectFile("client/src/pages/OrganizationManagementPage.tsx");
    const css = readProjectFile("client/src/index.css");

    expect(organization).toContain("normalizeOrganizationSearch");
    expect(organization).toContain("Tìm tên hoặc mã Phòng Ban, Bộ Phận...");
    expect(organization).toContain('className="organization-search-input field-input h-10 w-full text-xs"');
    expect(organization).toContain('className="organization-search-icon pointer-events-none absolute left-3 top-1/2 z-10');
    expect(css).toContain(".organization-quick-search .organization-search-input");
    expect(css).toContain("padding-left: 2.5rem;");
    expect(organization).toContain("Xóa từ khóa tìm kiếm");
    expect(organization).toContain("Không tìm thấy đơn vị phù hợp");
    expect(organization).toContain("divisionMatches");
    expect(organization).toContain('organization-quick-search w-full min-w-0 lg:max-w-md');
    expect(organization).toContain('flex flex-col gap-3 border-b border-[#E7EEF3] px-5 py-5 lg:flex-row');
    expect(organization).toContain('className="relative w-full"');
    expect(organization).toContain("expandedDepartmentIds");
    expect(organization).toContain("toggleDepartmentCollapse");
    expect(organization).toContain("hasOrganizationSearchQuery");
    expect(organization).toContain("const isCollapsed = !hasOrganizationSearchQuery && !expandedDepartmentIds.has(department.id)");
    expect(organization).toContain("aria-expanded={!isCollapsed}");
    expect(organization).toContain("organization-department-${department.id}");
  });

  it("keeps the activity log clear control hidden when empty and supports the desktop slash shortcut", () => {
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    const searchClear = readProjectFile("client/src/components/SearchClearAffordance.tsx");

    expect(reports).toContain('data-search-clear-managed="true"');
    expect(reports).toContain('event.key !== "/"');
    expect(reports).toContain('window.matchMedia("(min-width: 640px)")');
    expect(reports).toContain("activitySearchInputRef.current?.focus()");
    expect(searchClear).toContain('input.dataset.searchClearManaged !== "true"');
    expect(searchClear).toContain('button.style.display = input.value.length === 0 ? "none" : "grid"');
  });

  it("supports grouped retirement drafts with item-level reasons, signed copies, and a close-only-after-upload flow", () => {
    const schema = readProjectFile("drizzle/schema.ts");
    const router = readProjectFile("server/routers.ts");
    const manager = readProjectFile("client/src/components/RetirementCertificateManager.tsx");

    expect(schema).toContain("retirementCertificates");
    expect(schema).toContain("retirementCertificateAssets");
    expect(schema).toContain('"draft", "awaiting_signed_copy", "closed"');
    expect(router).toContain("retirementCertificates: router");
    expect(router).toContain("createDraft");
    expect(router).toContain("uploadSignedCopy");
    expect(router).toContain("Hãy tải biên bản đã ký tay trước khi xác nhận đóng.");
    expect(manager).toContain("Thanh lý theo thời gian quy định");
    expect(manager).toContain("Tải bản ký tay");
    expect(manager).toContain("Xác nhận đóng");
    expect(manager).toContain("const confirmClose = async () =>");
    expect(manager).toContain("await onClose();");
    expect(manager).toContain("setShowCloseConfirm(false);");
    expect(manager).toContain("onClose={() => closeCertificate.mutateAsync({ id: certificate.id })}");
  });

  it("lets administrators cancel only retirement drafts, print them before signing, and show value totals without forcing salvage input", () => {
    const router = readProjectFile("server/routers.ts");
    const manager = readProjectFile("client/src/components/RetirementCertificateManager.tsx");

    expect(router).toContain("cancelDraft");
    expect(router).toContain("Chỉ có thể hủy biên bản đang ở trạng thái Nháp.");
    expect(manager).toContain("In nháp");
    expect(manager).toContain("openRetirementPdf");
    expect(manager).toContain("Tổng nguyên giá");
    expect(manager).toContain("Giá trị thu hồi");
    expect(manager).toContain("Chưa cập nhật");
    expect(manager).toContain("Giá trị thu hồi chính thức (cập nhật sau)");
  });

  it("updates salvage values only after a signed copy, warns above purchase total, and groups retirement exports by TL code", () => {
    const database = readProjectFile("server/db.ts");
    const router = readProjectFile("server/routers.ts");
    const manager = readProjectFile("client/src/components/RetirementCertificateManager.tsx");
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");

    expect(database).toContain("updateRetirementCertificateAssetSalvageValues");
    expect(router).toContain("updateSalvageValues");
    expect(router).toContain("Chỉ có thể cập nhật giá trị thu hồi sau khi đã tải bản ký tay");
    expect(router).toContain("exceedsPurchaseValue");
    expect(manager).toContain("Cập nhật giá trị thu hồi sau ký tay");
    expect(manager).toContain("Cảnh báo:");
    expect(manager).toContain("Nhập giá trị thu hồi");
    expect(reports).toContain("retiredCertificateGroups");
    expect(reports).toContain("onToggleGroup");
    expect(reports).toContain("Mỗi mã TL được gộp thành một dòng");
    expect(reports).toContain("buildRetirementDetailWorkbook");
  });

  it("filters grouped retirement certificates by lifecycle status and protects the search input plus bulk deselection", () => {
    const manager = readProjectFile("client/src/components/RetirementCertificateManager.tsx");
    const css = readProjectFile("client/src/index.css");

    expect(manager).toContain('type StatusFilter = "all" | "draft" | "signed" | "closed"');
    expect(manager).toContain('label: "Nháp"');
    expect(manager).toContain('label: "Đã ký"');
    expect(manager).toContain('label: "Đã đóng"');
    expect(manager).toContain("Bỏ chọn tất cả");
    expect(manager).toContain('setSelected({})');
    expect(manager).toContain("retirement-certificate-search");
    expect(css).toContain(".retirement-certificate-search { padding-left: 2.7rem !important; }");
  });

  it("keeps retirement certificate lists compact while exposing full details only when expanded", () => {
    const manager = readProjectFile("client/src/components/RetirementCertificateManager.tsx");

    expect(manager).toContain("const [showDetails, setShowDetails] = useState(false)");
    expect(manager).toContain('aria-expanded={showDetails}');
    expect(manager).toContain('retirement-certificate-details-${certificate.id}');
    expect(manager).toContain('showDetails ? "Thu gọn" : "Chi tiết"');
    expect(manager).toContain("{showDetails && <div id={detailId}");
    expect(manager).toContain("certificate.items.map((item) => <span");
  });

  it("prints one landscape grouped-retirement table and supports certificate search plus pagination", () => {
    const retirementPdf = readProjectFile("client/src/lib/retirementPdf.ts");
    const manager = readProjectFile("client/src/components/RetirementCertificateManager.tsx");

    expect(retirementPdf).toContain('orientation: "landscape"');
    expect(retirementPdf).toContain('label: "Mã TS"');
    expect(retirementPdf).toContain('label: "Tên tài sản"');
    expect(retirementPdf).toContain('label: "Seri"');
    expect(retirementPdf).toContain('label: "Ngày mua"');
    expect(retirementPdf).toContain('label: "Giá thanh lý"');
    expect(retirementPdf).toContain('label: "Lý do thanh lý"');
    expect(manager).toContain('const CERTIFICATE_PAGE_SIZE = 5');
    expect(manager).toContain('Tìm mã TL hoặc tên tài sản trong biên bản...');
    expect(manager).toContain('paginatedCertificates');
    expect(manager).toContain('const certificateStartRecord');
    expect(manager).toContain('const certificateEndRecord');
    expect(manager).toContain('Hiển thị <b className="text-[#60758A]">{certificateStartRecord}–{certificateEndRecord}</b>');
    expect(manager).toContain('aria-label="Trang đầu"');
    expect(manager).toContain('aria-label="Trang trước"');
    expect(manager).toContain('aria-label="Trang sau"');
    expect(manager).toContain('aria-label="Trang cuối"');
    expect(manager).toContain('setCertificatePage(certificatePageCount)');
    expect(manager).not.toContain('filteredCertificates.length > CERTIFICATE_PAGE_SIZE && <div className="mt-4 flex flex-col gap-3 border-t');
  });

  it("adds a salvage total, a light-gray centered PDF table, and service-cost context only below the retirement draft", () => {
    const retirementPdf = readProjectFile("client/src/lib/retirementPdf.ts");
    const manager = readProjectFile("client/src/components/RetirementCertificateManager.tsx");

    expect(retirementPdf).toContain("drawSalvageTotal");
    expect(retirementPdf).toContain("TỔNG NGUYÊN GIÁ");
    expect(retirementPdf).toContain("TỔNG CỘNG GIÁ TRỊ THANH LÝ");
    expect(retirementPdf).toContain("doc.setFillColor(235, 239, 242)");
    expect(retirementPdf).toContain('{ align: "center" }');
    expect(manager).toContain("serviceCostByAsset");
    expect(manager).toContain('ticket.serviceChannel === "warranty"');
    expect(manager).toContain("Tham khảo phí Bảo hành/Sửa chữa");
    expect(manager).toContain("Tổng phí đã ghi nhận");
    expect(manager).toContain("ServiceCostIndicator");
    expect(manager).toContain("Đã có phí");
    expect(manager).toContain("không đưa vào biên bản");
  });

  it("opens a warranty or repair ticket from the retirement draft reference without adding it to the PDF", () => {
    const manager = readProjectFile("client/src/components/RetirementCertificateManager.tsx");

    expect(manager).toContain("setPreviewRepairTicketId(ticketId)");
    expect(manager).toContain("warrantyTickets");
    expect(manager).toContain("repairTickets");
    expect(manager).toContain("Xem nhanh phiếu Bảo hành/Sửa chữa");
    expect(manager).toContain("repairStatusLabel");
  });

  it("exports retirement certificates to Excel using the current status and search filters", () => {
    const manager = readProjectFile("client/src/components/RetirementCertificateManager.tsx");

    expect(manager).toContain("exportFilteredCertificates");
    expect(manager).toContain("writeBrandedWorkbook");
    expect(manager).toContain("DANH SÁCH BIÊN BẢN THANH LÝ");
    expect(manager).toContain("filteredCertificates.flatMap");
    expect(manager).toContain("Xuất Excel");
  });

  it("brands issue-slip PDFs and protects automatically sourced recipient departments", () => {
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");
    const pdf = readProjectFile("client/src/lib/supplyIssueSlipPdf.ts");

    expect(pdf).toContain("loadCompanyLogoForPdf");
    expect(pdf).toContain('doc.addImage(headerLogo, "PNG", margin, 10, 19, 19');
    expect(pdf).toContain("companyTextX");
    expect(supplies).toContain("departmentAutoLocked");
    expect(supplies).toContain("disabled={departmentAutoLocked}");
    expect(supplies).toContain("Phòng ban được khóa theo hồ sơ nhân sự đã chọn.");
    expect(supplies).toContain("IssueSlipConfirmationDialog");
    expect(supplies).toContain("Tạo phiếu cấp phát?");
    expect(supplies).not.toContain("window.confirm");
    expect(supplies).toContain("onConfirm={confirmIssueSlip}");
    expect(supplies).toContain("projectedStockAfterIssue");
    expect(supplies).toContain("Tồn kho sau cấp");
    expect(supplies).toContain("Cảnh báo tồn kho thấp");
    expect(supplies).toContain("thấp hơn mức tối thiểu");
    expect(supplies).toContain("SupplyCreateModal");
    expect(supplies).toContain("assetmaster-open-supply-receipt-id");
    expect(supplies).toContain("Danh mục kho");
    expect(supplies).toContain("Hãy dùng nút Thêm phụ kiện");
  });

  it("requires a branded confirmation before recording an asset return", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain("AlertDialogTrigger");
    expect(home).toContain("Xác nhận ghi nhận hoàn trả?");
    expect(home).toContain("Tài sản sẽ được chuyển về trạng thái sẵn có");
    expect(home).toContain("onClick={() => updateStatus(\"returned\")}");
  });

  it("uses only company branding rather than the product name in document headers", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    expect(home).not.toContain('doc.text("AssetMaster", left + 24, y)');
    expect(home).toContain('doc.text(`Biên bản được tạo ngày ${new Date().toLocaleDateString("vi-VN")}`, left, 282)');
    expect(operations).not.toContain('doc.text(company.websiteTitle || "AssetMaster – Hệ thống Quản lý Tài sản"');
    expect(operations).toContain("Biên bản được lập từ dữ liệu đã chốt của đơn vị.");
  });

  it("vertically centers company information alongside the handover document logo", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    expect(home).toContain("doc.text(companyInfo.name, left + 24, y - 4)");
    expect(home).toContain("doc.text(`Địa chỉ: ${companyInfo.address}`, left + 24, y + 2)");
    expect(home).toContain('doc.text(`MST: ${companyInfo.taxCode || "Chưa cập nhật"} · Điện thoại: ${companyInfo.phone || "Chưa cập nhật"} · Email: ${companyInfo.email || "Chưa cập nhật"}${companyInfo.websiteUrl ? ` · Website: ${companyInfo.websiteUrl}` : ""}`, left + 24, y + 8)');
  });

  it("opens asset-assignment PDFs in the shared preview before users print or download", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain("Phiếu cấp phát tài sản ${item.referenceCode}");
    expect(home).toContain("-phieu-cap-phat-tai-san.pdf");
    expect(home).toContain("Xem trước PDF");
    expect(home).toContain("Bạn có thể in hoặc tải PDF từ màn hình này.");
    expect(home).not.toContain('window.open(doc.output("bloburl"), "_blank")');
  });

  it("surfaces maintenance assets with a quick request action and prevents duplicate open tickets", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const routers = readProjectFile("server/routers.ts");
    expect(operations).toContain('const maintenanceAssets = assets.filter((asset) => asset.status === "maintenance" && !assetsWithOpenTickets.has(asset.id) && !queuedMaintenanceAssetIds.has(asset.id))');
    expect(operations).toContain("Tài sản đang cần xử lý");
    expect(operations).toContain("requestQuickWarrantyTicket");
    expect(operations).toContain('serviceChannel: "warranty"');
    expect(operations).toContain("Sửa chữa");
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
    expect(routers).toContain('const safeChanges = { ...persistedChanges, ...supplierReturnChanges, ...retirementChanges, purchaseDate: current.purchaseDate }');
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
    expect(router).toContain("const safeChanges = { ...persistedChanges, ...supplierReturnChanges, ...retirementChanges, purchaseDate: current.purchaseDate }");
  });

  it("shows warranty expiry warnings and provides warranty filters in the asset catalog", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain('type WarrantyState = "none" | "active" | "expiring" | "expired"');
    expect(home).toContain("const warrantyState = getWarrantyState(asset.warrantyUntil);");
    expect(home).toContain('warrantyFilter === "Sắp hết hạn" && warrantyState === "expiring"');
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

  it("captures retirement date and reason and can export a disposal record as PDF", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const router = readProjectFile("server/routers.ts");
    const schema = readProjectFile("drizzle/schema.ts");

    expect(home).toContain("Ngày thanh lý");
    expect(home).toContain("Lý do thanh lý");
    expect(home).toContain("downloadAssetRetirementPdf");
    expect(home).toContain("BIÊN BẢN KHẤU HAO / THANH LÝ TÀI SẢN");
    expect(home).toContain("retirementCertificateNumber");
    expect(home).toContain("Chứng từ thanh lý đính kèm");
    expect(home).toContain("Khấu hao/Thanh lý");
    expect(router).toContain("hasRequiredRetirementReason");
    expect(router).toContain("getNextRetirementCertificateSequence");
    expect(router).toContain("TL-${retirementCertificateChanges.year}");
    expect(router).toContain("uploadRetirementAttachment");
    expect(router).toContain("assets/${asset.id}/retirement/");
    expect(schema).toContain('retiredAt: timestamp("retiredAt")');
    expect(schema).toContain('retirementReason: text("retirementReason")');
    expect(schema).toContain('retirementCertificateNumber: varchar("retirementCertificateNumber", { length: 64 })');
    expect(schema).toContain('retirementAttachmentUrl: text("retirementAttachmentUrl")');
  });

  it("locks returned-vendor and retired assets from manual editing and keeps them outside audit scope", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const router = readProjectFile("server/routers.ts");

    expect(home).toContain('asset.statusType === "retired"');
    expect(home).toContain('asset.statusType === "returned"');
    expect(home).toContain("đã được khóa và không thể chỉnh sửa");
    expect(home).toContain('target.status === "retired" || target.status === "returned_to_vendor"');
    expect(router).toContain('current.status === "retired"');
    expect(router).toContain('current.status === "retired" || current.status === "returned_to_vendor"');
    expect(router).toContain("Tài sản đã Trả nhà cung cấp hoặc Khấu hao/Thanh lý được khóa và không thể chỉnh sửa.");
    expect(router).toContain('asset.status !== "returned_to_vendor" && asset.status !== "retired"');
    expect(router).toContain("không thuộc phạm vi kiểm kê");
  });

  it("preserves retired status in the asset catalog and warns before selecting an asset still under warranty", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const manager = readProjectFile("client/src/components/RetirementCertificateManager.tsx");

    expect(home).toContain('asset.status === "retired" ? "Khấu hao/Thanh lý" : "Sẵn có"');
    expect(home).toContain('asset.status === "retired" ? "retired" : "available"');
    expect(manager).toContain("const activeWarrantyUntil");
    expect(manager).toContain("toast.warning(`Cảnh báo:");
    expect(manager).toContain("còn thời hạn bảo hành đến");
  });

  it("shows warranty and repair cost references for assets in expanded retirement certificates", () => {
    const manager = readProjectFile("client/src/components/RetirementCertificateManager.tsx");

    expect(manager).toContain("Tham khảo phí Bảo hành/Sửa chữa theo tài sản");
    expect(manager).toContain("Thông tin tham khảo, không đưa vào biên bản/PDF.");
    expect(manager).toContain("info.totalWarrantyCost");
    expect(manager).toContain("info.totalRepairCost");
    expect(manager).toContain("[data-retirement-service-cost-reference]");
    expect(manager).toContain('(assetsQuery.data || []).find((asset) => asset.id === previewRepairTicket.assetId)');
  });

  it("summarizes disposed asset values by retirement year", () => {
    const retirement = readProjectFile("client/src/pages/RetirementManagementView.tsx");
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    const recordedMetric = readProjectFile("client/src/components/RecordedSalvageMetric.tsx");
    const overviewStart = retirement.indexOf("Tổng quan thanh lý");
    const reportStart = retirement.indexOf("Báo cáo & xuất dữ liệu thanh lý");
    const overview = retirement.slice(overviewStart, reportStart);
    const reportRetirementStart = reports.indexOf("Giá trị tài sản Khấu hao/Thanh lý theo năm");
    const reportRetirement = reports.slice(reportRetirementStart);

    expect(retirement).toContain('asset.status !== "retired"');
    expect(retirement).toContain("recordedSalvageSummary");
    expect(retirement).not.toContain("yearlySummary");
    expect(retirement).toContain("Tổng quan thanh lý");
    expect(retirement).toContain("Khấu hao/Thanh lý");
    expect(retirement).toContain('import { RecordedSalvageMetric, RetirementServiceCostMetric } from "@/components/RecordedSalvageMetric"');
    expect(retirement).toContain("RecordedSalvageMetric summary={recordedSalvageSummary}");
    expect(retirement).toContain("RetirementServiceCostMetric summary={retirementServiceCostSummary}");
    expect(retirement).toContain("xl:grid-cols-3");
    expect(overview).not.toContain('OverviewMetric label="Biên bản trong phạm vi"');
    expect(overview).not.toContain('OverviewMetric label="Tài sản đã thanh lý"');
    expect(recordedMetric).toContain("data-retirement-recorded-salvage");
    expect(recordedMetric).toContain("data-retirement-service-cost");
    expect(recordedMetric).toContain("Tổng chi phí Bảo hành & Sửa chữa");
    expect(recordedMetric).toContain("Chưa có tài sản trong phạm vi năm đang chọn.");
    expect(recordedMetric).toContain("Không có dữ liệu");
    expect(retirement).not.toContain("const totalSalvageValue");
    expect(retirement).not.toContain('OverviewMetric label="Tổng giá trị thanh lý"');
    expect(retirement).not.toContain('OverviewMetric label="Đã chọn xuất PDF"');
    expect(overview).toContain("onClick={exportExcel}");
    expect(overview).toContain("Năm thanh lý");
    expect(reports).toContain("salvageValueByAssetId");
    expect(reports).toContain("recordedSalvageSummary");
    expect(reports).toContain("retirementServiceCostSummary");
    expect(reports).not.toContain("retirementValueByYear");
    expect(reports).toContain("data-retirement-recorded-values");
    expect(reports).toContain("RecordedSalvageMetric summary={recordedSalvageSummary}");
    expect(reports).toContain("RetirementServiceCostMetric summary={retirementServiceCostSummary}");
    expect(reports).toContain('SearchableSelect value={retirementYear} onChange={setRetirementYear}');
    expect(reports).not.toContain("const retiredTotalValue");
    expect(reports).not.toContain("Xuất Excel thanh lý chi tiết");
    expect(reportRetirement).toContain("onClick={exportRetirementExcel}");
    expect(reportRetirement.indexOf("onClick={exportRetirementExcel}")).toBeLessThan(reportRetirement.indexOf('SearchableSelect value={retirementYear} onChange={setRetirementYear}'));
    expect(recordedMetric).toContain("Giá trị thanh lý đã ghi nhận");
  });

  it("provides year-filtered detailed retirement Excel exports from both retirement areas", () => {
    const retirement = readProjectFile("client/src/pages/RetirementManagementView.tsx");
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");

    expect(retirement).toContain("buildRetirementDetailWorkbook");
    expect(retirement).toContain("serviceCostsByAsset");
    expect(retirement).toContain("Xuất Excel chi tiết");
    expect(reports).toContain("buildRetirementDetailWorkbook");
    expect(reports).toContain("retirementServiceCostByAssetId");
    expect(reports).toContain("onClick={exportRetirementExcel}");
    expect(reports).not.toContain("Xuất Excel thanh lý chi tiết");
    expect(reports).toContain("retirementYearOptions.map");
  });

  it("exports detailed retirement assets while preserving the filtered year and totals", () => {
    const retirement = readProjectFile("client/src/pages/RetirementManagementView.tsx");

    expect(retirement).toContain("const exportExcel");
    expect(retirement).toContain("buildRetirementDetailWorkbook");
    expect(retirement).toContain("serviceCostByAssetId");
    expect(retirement).toContain("assetmaster-danh-sach-thanh-ly-chi-tiet-");
    expect(retirement).toContain("Tổng phí BH/SC");
    expect(retirement).toContain("Báo cáo & xuất dữ liệu thanh lý");
  });

  it("filters retired assets by year and exports selected disposal records as one PDF", () => {
    const retirement = readProjectFile("client/src/pages/RetirementManagementView.tsx");
    const retirementPdf = readProjectFile("client/src/lib/retirementPdf.ts");

    expect(retirement).toContain("yearOptions");
    expect(retirement).toContain("year === \"all\"");
    expect(retirement).toContain("selectedAssetIds");
    expect(retirement).toContain("previewCombinedPdf");
    expect(retirement).toContain("Xem trước PDF gộp");
    expect(retirementPdf).toContain("openRetirementPdf");
    expect(retirementPdf).toContain('doc.addPage("a4", "landscape")');
    expect(retirementPdf).toContain("drawPdfCorporateFooter");
  });

  it("opens the combined disposal PDF in an in-app preview before download", () => {
    const retirement = readProjectFile("client/src/pages/RetirementManagementView.tsx");
    const previewHost = readProjectFile("client/src/components/ExportPreviewHost.tsx");

    expect(retirement).toContain("Xem trước PDF gộp");
    expect(previewHost).toContain("Bản xem trước PDF gộp");
    expect(previewHost).toContain("Kiểm tra nội dung trực tiếp trên web trước khi tải PDF.");
    expect(previewHost).toContain('payload.kind === "pdf" ? "Tải PDF" : "Tải Excel"');
  });

  it("routes Khấu hao & Thanh lý to a dedicated management page", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    const retirement = readProjectFile("client/src/pages/RetirementManagementView.tsx");

    expect(home).toContain('{ label: "Khấu hao & Thanh lý", icon: Landmark }');
    expect(home).toContain('retirement: "Khấu hao & Thanh lý"');
    expect(home).toContain('"Khấu hao & Thanh lý": "retirement"');
    expect(home).toContain('{activeNav === "Khấu hao & Thanh lý" ? <RetirementManagementView canEditSectionLabels={isAdmin} /> : null}');
    expect(reports).not.toContain("<DisposalExportPanel groups=");
    expect(retirement).toContain("<RetirementCertificateManager />");
    expect(retirement).toContain("Báo cáo & xuất dữ liệu thanh lý");
  });

  it("uses the requested business order and display labels in the sidebar", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const navItemsStart = home.indexOf("const navItems = [");
    const navItemsEnd = home.indexOf("];", navItemsStart);
    const navItems = home.slice(navItemsStart, navItemsEnd);
    const labels = ["Tổng quan", "Danh mục tài sản", "Phân loại tài sản", "Nhà cung cấp & Hãng", "Phụ kiện", "Bàn giao & Cấp phát", "Bảo hành & Sửa chữa", "Phòng Ban & Bộ Phận", "Quản lý nhân viên", "Khấu hao & Thanh lý", "Kiểm kê", "Báo Cáo"];

    let previousIndex = -1;
    labels.forEach((label) => {
      const currentIndex = navItems.indexOf(`label: "${label}"`);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    });
    expect(home).toContain('maintenance: "Bảo hành & Sửa chữa"');
    expect(home).toContain('reports: "Báo Cáo"');
    expect(home).toContain('item.label === "Bảo hành & Sửa chữa" ? maintenanceBadgeCount : 0');
  });

  it("keeps the retirement reason textarea mounted while the user types", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain('reasonInput.addEventListener("input", () => { setFormDirty(true); setFormData((current) => ({ ...current, retirementReason: reasonInput.value })); });');
    expect(home).toContain('}, [isDetail, formData.statusType, retirementAttachmentFile, setFormData]);');
    expect(home).not.toContain('}, [isDetail, formData.statusType, formData.retiredAt, formData.retirementReason, retirementAttachmentFile, setFormData]);');
  });

  it("offers common retirement reason templates for quick selection", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain("Chọn mẫu để điền nhanh; bạn vẫn có thể chỉnh sửa nội dung.");
    expect(home).toContain("Hư hỏng nặng, không thể sửa chữa");
    expect(home).toContain("Hết hạn sử dụng hoặc đã khấu hao hết");
    expect(home).toContain("Chi phí sửa chữa vượt giá trị còn lại");
    expect(home).toContain('reasonInput.dispatchEvent(new Event("input", { bubbles: true }));');
  });

  it("separates warranty and repair tickets through a processing channel and tabs", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const routers = readProjectFile("server/routers.ts");

    expect(home).toContain('label: "Bảo hành & Sửa chữa"');
    expect(operations).toContain('const serviceChannelLabels =');
    expect(operations).toContain('const [serviceChannelTab, setServiceChannelTab]');
    expect(operations).toContain('role="tablist" aria-label="Lọc Kênh xử lý"');
    expect(operations).toContain('serviceChannel: "repair"');
    expect(routers).toContain('serviceChannel: z.enum(["warranty", "repair"]).default("repair")');
    expect(routers).toContain("getNextRepairTicketSequence");
    expect(routers).toContain('input.serviceChannel === "warranty" ? "BH" : "SC"');
    expect(routers).not.toContain('serviceChannel: z.enum(["warranty", "repair"]).optional()');
    expect(operations).toContain("Kênh xử lý được xác lập theo mã phiếu và không thể thay đổi sau khi tạo.");
    expect(operations).not.toContain('<SearchableSelect value={draft.serviceChannel}');
  });

  it("captures warranty request details, warns before repair, and splits dashboard costs by channel", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const routers = readProjectFile("server/routers.ts");

    expect(operations).toContain("warrantyBrand");
    expect(operations).toContain("warrantyVendor");
    expect(operations).toContain("warrantyRequestCode");
    expect(operations).toContain("repairWarrantyWarning");
    expect(operations).toContain("Tài sản vẫn còn thời hạn bảo hành");
    expect(operations).toContain("Vẫn tạo phiếu Sửa chữa");
    expect(operations).toContain("nextWarrantyCode");
    expect(operations).toContain("BH-NĂM-001");
    expect(operations).toContain("Lịch sử bảo hành trước đó");
    expect(operations).toContain("selectedWarrantyHistory");
    expect(operations).toContain("Xem tất cả");
    expect(operations).toContain("Lịch sử Bảo hành đầy đủ");
    expect(operations).toContain("warrantyHistoryDialogOpen");
    expect(operations).toContain("Ảnh / chứng từ bảo hành");
    expect(operations).toContain('accept="application/pdf,image/png,image/jpeg,image/webp"');
    expect(operations).toContain("createTicketWithEvidence");
    expect(operations).toContain("uploadAttachmentByTicketId");
    expect(operations).toContain("warrantyUploadProgress");
    expect(operations).toContain("warrantyUploadStatus");
    expect(operations).toContain("data-warranty-upload-progress");
    expect(operations).toContain("Đang tải chứng từ lên hệ thống...");
    expect(operations).toContain("Đã tải chứng từ thành công.");
    expect(operations).toContain("requestQuickWarrantyTicket");
    expect(operations).toContain("Bảo hành");
    expect(operations).not.toContain("prepareWarrantyTicketFromReminder");
    expect(operations).toContain("Lấy từ dữ liệu mua hàng; không thể chỉnh sửa.");
    expect(operations).toContain("LockKeyhole");
    expect(operations).toContain("Bảo hành sắp hết hạn");
    expect(home).toContain("warrantyTotal");
    expect(home).toContain("repairTotal");
    expect(home).toContain("sắp hết hạn bảo hành");
    expect(home).toContain("Chi phí Bảo hành/Sửa chữa theo tháng");
    expect(routers).toContain("warrantyRequestCode: z.string().trim().max(128)");
    expect(routers).toContain("getNextWarrantyRequestSequence");
  });

  it("uses the Bao hanh/Sua chua label for asset status and shows a prominent warranty warning", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");

    expect(home).toContain('holder: "Bảo hành/Sửa chữa"');
    expect(home).toContain('status: "Bảo hành/Sửa chữa"');
    expect(home).toContain('label: "Bảo hành & Sửa chữa"');
    expect(home).toContain('const normalizedStatus = status === "Bảo trì" ? "Bảo hành/Sửa chữa" : status;');
    expect(home).toContain('normalizedStatus === "Bảo hành/Sửa chữa" && asset.statusType === "maintenance"');
    expect(home).toContain('const label = optionLabels?.[option] || (option === "Bảo trì" ? "Bảo hành/Sửa chữa" : option);');
    expect(home).toContain('counts?.[option]');
    expect(home).toContain("getAssetStatusFilterCounts");
    expect(home).toContain("assetmaster-open-maintenance-asset-code");
    expect(home).toContain("Mở phiếu Bảo hành/Sửa chữa");
    expect(home).toContain("Lý do Bảo hành/Sửa chữa");
    expect(home).toContain('textarea[aria-label="Nội dung cần bảo trì"]');
    expect(operations).toContain("data-warranty-ticket-details");
    expect(operations).toContain("Thông tin bảo hành");
    expect(operations).toContain("Nhà cung cấp / trung tâm");
    expect(operations).toContain("border-2 border-[#E8743B]");
    expect(operations).toContain("Lưu ý:");
  });

  it("streamlines the asset catalog and supports BH/SC lookup with warranty dates", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");

    expect(home).not.toContain('ticketCodeQuery');
    expect(home).not.toContain('assetmaster:ticket-code-filter');
    expect(home).not.toContain('Tìm mã phiếu BH / SC...');
    expect(operations).toContain('ticketCodeLookup');
    expect(operations).toContain('Tra cứu mã phiếu BH / SC...');
    expect(operations).toContain('ticketStatusFilter');
    expect(home).toContain('BH: ${warrantyUntil.toLocaleDateString("vi-VN")}');
    expect(home).toContain('onExportFilteredAssets');
    expect(home).toContain('onOpenImport');
    expect(home).not.toContain('actionBar.append(filteredExportButton');
  });

  it("shows repair spending by asset and supports handover accessories from inventory or manual entry", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const routers = readProjectFile("server/routers.ts");

    expect(home).toContain("repairCostByAssetId");
    expect(home).toContain('SC: ${formatVnd(asset.repairCost)} VNĐ');
    expect(home).toContain("Phụ kiện lấy từ kho");
    expect(home).toContain("Phụ kiện ghi tay (không trừ kho)");
    expect(routers).toContain("supplyItems: z.array");
    expect(routers).toContain("Cấp phát kèm tài sản");
    expect(routers).toContain('movementType: "issue"');
  });

  it("returns stocked handover accessories and summarizes service costs by year", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    const routers = readProjectFile("server/routers.ts");
    const database = readProjectFile("server/db.ts");

    expect(routers).toContain("restoreHandoverAccessories");
    expect(routers).toContain('movementType: "return"');
    expect(routers).toContain("returnedAccessoryCount");
    expect(database).toContain("listHandoverSupplyItems");
    expect(database).toContain("createHandoverSupplyItem");
    expect(home).toContain("Phụ kiện lấy từ kho");
    expect(home).toContain("phụ kiện kho đang giữ cũng tự động được hoàn về kho");
    expect(reports).toContain("serviceCostReport");
    expect(reports).toContain("Tổng chi phí Bảo hành/Sửa chữa");
    expect(reports).toContain("serviceCostYear");
    expect(reports).toContain("serviceCostChannel");
    expect(reports).toContain("Chỉ Bảo hành");
    expect(reports).toContain("Chỉ Sửa chữa");
    expect(reports).toContain("repairCost");
    expect(reports).toContain("warrantyCost");
    expect(reports).toContain("Tổng cộng");
    expect(reports).toContain("monthlyServiceCostTrend");
    expect(reports).toContain("Biến động chi phí theo tháng");
    expect(reports).toContain("grid grid-cols-3 gap-2 sm:hidden");
    expect(reports).toContain("Chọn tháng để xem phiếu");
    expect(reports).toContain("warrantyTicketCount");
    expect(reports).toContain("repairTicketCount");
    expect(reports).toContain("totalTicketCount");
    expect(reports).toContain("BH {item.warrantyTicketCount}");
    expect(reports).toContain("SC {item.repairTicketCount}");
    expect(reports).toContain("Đang chọn {data[selectedMonth]?.month");
    expect(reports).toContain("onSelectMonth(index)");
    expect(reports).toContain("% tổng cộng");
    expect(reports).toContain("Tổng cộng (năm ${serviceCostYear})");
    expect(reports).toContain("selectedServiceCostMonth");
    expect(reports).toContain("selectedMonthlyServiceTickets");
    expect(reports).toContain("Phiếu chi phí tháng T");
    expect(reports).toContain("Nhấn cột để xem phiếu");
    expect(reports).toContain("openMonthlyServiceTicket");
    expect(reports).toContain("monthlyServiceTicketPageSize = 5");
    expect(reports).toContain("visibleMonthlyServiceTickets");
    expect(reports).toContain("Hiển thị {");
    expect(reports).toContain("QuickServiceTicketPreview");
    expect(reports).toContain("quickPreviewServiceTicketId");
    expect(reports).toContain("setQuickPreviewServiceTicketId(ticketId)");
  });

  it("uses one PDF preview and print flow from the quick service-ticket popup", () => {
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    const quickPreview = readProjectFile("client/src/components/QuickServiceTicketPreview.tsx");
    const ticketPdf = readProjectFile("client/src/lib/serviceTicketPdf.ts");
    const previewHost = readProjectFile("client/src/components/ExportPreviewHost.tsx");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const styles = readProjectFile("client/src/index.css");

    expect(reports).toContain("previewServiceTicketPdf");
    expect(reports).toContain("openQuickPreviewPdf");
    expect(quickPreview).toContain("Xuất PDF");
    expect(quickPreview).toContain("Đang chuẩn bị in...");
    expect(ticketPdf).toContain("PHIẾU BẢO HÀNH TÀI SẢN");
    expect(ticketPdf).toContain("PHIẾU SỬA CHỮA TÀI SẢN");
    expect(ticketPdf).toContain("Người lập phiếu:");
    expect(ticketPdf).toContain("Ngày lập phiếu:");
    expect(ticketPdf).toContain('doc.text("Phòng ban:"');
    expect(ticketPdf).toContain('doc.text("Bộ phận:"');
    expect(ticketPdf).toContain("reporterDepartmentName");
    expect(ticketPdf).toContain("THÔNG TIN TÀI SẢN");
    expect(ticketPdf).toContain("Tình trạng");
    expect(ticketPdf).toContain("Hạn bảo hành");
    expect(ticketPdf).toContain("Serial");
    expect(ticketPdf).toContain("Tình trạng lỗi");
    expect(ticketPdf).toContain("hasActiveWarranty");
    expect(ticketPdf).not.toContain('label: "Tình trạng",');
    expect(ticketPdf).toContain("Đại diện nhà cung cấp");
    expect(ticketPdf).toContain("Người bàn giao");
    expect(ticketPdf).toContain('doc.text("Người bàn giao", left + 22');
    expect(ticketPdf).toContain('doc.text("Xác nhận quản lý", 105');
    expect(ticketPdf).toContain('doc.text("Đại diện nhà cung cấp", right - 22');
    expect(ticketPdf).not.toContain("Nội dung yêu cầu");
    expect(ticketPdf).not.toContain('doc.text("Người xử lý"');
    expect(ticketPdf).toContain("openPdfPreview");
    expect(operations).toContain("const previewRepairTicketPdf");
    expect(operations).toContain("departmentsQuery");
    expect(operations).toContain("divisionsQuery");
    expect(operations).not.toContain('if ((ticket.serviceChannel || "repair") !== "repair") return;');
    expect(operations).toContain("Xem trước PDF phiếu ${serviceChannelLabels");
    expect(reports).toContain("quickPreviewReporterDepartment");
    expect(previewHost).toContain("autoPrint");
    expect(previewHost).toContain("contentWindow?.print()");
    expect(styles).toContain('[role="dialog"] button[aria-label^="Đóng"]');
    expect(styles).toContain('[role="dialog"][aria-label="Biên bản bàn giao"] > div > div:first-child');
    expect(styles).toContain("min-height: 7.6rem");
  });

  it("keeps the PDF preview above quick-ticket overlays and provides mobile ticket cards", () => {
    const quickPreview = readProjectFile("client/src/components/QuickServiceTicketPreview.tsx");
    const previewHost = readProjectFile("client/src/components/ExportPreviewHost.tsx");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");

    expect(previewHost).toContain("z-[1000]");
    expect(quickPreview).toContain("h-[100dvh]");
    expect(quickPreview).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
    expect(operations).toContain("md:hidden");
    expect(operations).toContain("mobile-${ticket.id}");
    expect(operations).toContain("hidden md:block mobile-table-scroll");
  });

  it("supports partial handover accessory returns and previews service costs in Excel", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const reports = readProjectFile("client/src/pages/ReportsManagementView.tsx");
    const routers = readProjectFile("server/routers.ts");

    expect(home).toContain("Số lượng phụ kiện thực tế hoàn về kho");
    expect(home).toContain("Cảnh báo: còn");
    expect(home).toContain("returnedSupplyItems");
    expect(routers).toContain("handoverReturnSupplyItems");
    expect(routers).toContain("outstandingAccessoryCount");
    expect(reports).toContain("exportRepairCostExcel");
    expect(reports).toContain("Xem trước Excel");
    expect(reports).toContain("Chi phí dịch vụ");
    expect(reports).toContain("Kênh: ${channelLabel}");
    expect(reports).toContain("!serviceCostReport.rows.length");
    expect(reports).toContain("nút xem trước Excel đang được khóa");
  });

  it("provides a recovery record PDF with actual accessory quantities and print access", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain("downloadAssetRecoveryPdf");
    expect(home).toContain("BIÊN BẢN THU HỒI TÀI SẢN");
    expect(home).toContain("DANH SÁCH PHỤ KIỆN THỰC TẾ");
    expect(home).toContain("Biên bản thu hồi / In PDF");
    expect(home).toContain("-bien-ban-thu-hoi-tai-san.pdf");
  });

  it("shows the unique month-based recovery certificate on the handover and its PDF", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const router = readProjectFile("server/routers.ts");
    const db = readProjectFile("server/db.ts");

    expect(home).toContain("Số biên bản thu hồi");
    expect(home).toContain("Mã tự sinh theo năm và tháng");
    expect(home).toContain("recoveryCertificateNumber");
    expect(router).toContain("TH-${recoveryYear}${String(recoveryMonth).padStart(2, \"0\")}-${String(recoverySequence).padStart(3, \"0\")}");
    expect(router).toContain("Không thể tạo mã biên bản thu hồi duy nhất");
    expect(db).toContain("getNextRecoveryCertificateSequence");
  });

  it("indexes recovery certificate numbers and gives every search input a quick-clear action", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const app = readProjectFile("client/src/App.tsx");
    const clearAffordance = readProjectFile("client/src/components/SearchClearAffordance.tsx");
    const searchableSelect = readProjectFile("client/src/components/SearchableSelect.tsx");

    expect(home).toContain('${item.recoveryCertificateNumber || ""}');
    expect(clearAffordance).toContain('input[placeholder]');
    expect(clearAffordance).toContain("Xóa nhanh nội dung tìm kiếm");
    expect(clearAffordance).toContain('input.placeholder === "Tìm mã phiếu, tài sản..."');
    expect(clearAffordance).toContain("Tìm mã phiếu, mã thu hồi...");
    expect(app).toContain("<SearchClearAffordance />");
    expect(searchableSelect).toContain('aria-label="Xóa tìm kiếm trong dropdown"');
    expect(home).toContain('matchesVietnameseSearch(`${item.referenceCode} ${item.recoveryCertificateNumber || ""}`, query)');
  });

  it("uses the warranty-repair label in asset forms and shows recovery numbers in returned handover rows", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const searchableSelect = readProjectFile("client/src/components/SearchableSelect.tsx");

    expect(searchableSelect).toContain('label: "Bảo hành/Sửa chữa"');
    expect(home).toContain('status: "Bảo hành/Sửa chữa"');
    expect(home).toContain('"Nội dung Bảo hành/Sửa chữa"');
    expect(home).toContain('"Thông tin này sẽ được lưu cùng tài sản để theo dõi và hiển thị trong thông báo Bảo hành/Sửa chữa."');
    expect(home).toContain('`${item.referenceCode} · ${item.recoveryCertificateNumber}`');
  });

  it("opens the existing recovery PDF preview when a TH certificate is selected from the handover list", () => {
    const app = readProjectFile("client/src/App.tsx");
    const shortcut = readProjectFile("client/src/components/RecoveryCertificatePdfShortcut.tsx");
    const home = readProjectFile("client/src/pages/Home.tsx");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");

    expect(app).toContain("<RecoveryCertificatePdfShortcut />");
    expect(shortcut).toContain("TH-\\d{6}-\\d{3}");
    expect(shortcut).toContain("Mở xem trước biên bản thu hồi");
    expect(shortcut).toContain("assetmaster-open-recovery-certificate");
    expect(home).toContain("recoveryPdfRequest");
    expect(home).toContain("autoOpenRecoveryCertificate");
    expect(home).toContain("downloadAssetRecoveryPdf(item, companyInfo)");
    expect(shortcut).toContain("Đang chuẩn bị PDF...");
    expect(shortcut).toContain('icon.textContent = "PDF"');
    expect(shortcut).toContain("assetmaster-recovery-pdf-preparation-complete");
    expect(home).toContain("notifyPreparationComplete");
    expect(operations).toContain('issueType: serviceChannel === "warranty" ? "maintenance" : "damage"');
    expect(operations).not.toContain('<SearchableSelect value={issueType}');
    expect(home).toContain('statusFilter === "Đã có mã biên bản thu hồi" ? hasRecoveryCertificate');
    expect(home).toContain('"Đã có mã biên bản thu hồi"');
  });

  it("offers preview, download, and print flows for each repair ticket PDF", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const previewHost = readProjectFile("client/src/components/ExportPreviewHost.tsx");
    const ticketPdf = readProjectFile("client/src/lib/serviceTicketPdf.ts");

    expect(operations).toContain("previewRepairTicketPdf");
    expect(operations).toContain("previewServiceTicketPdf");
    expect(ticketPdf).toContain("PHIẾU SỬA CHỮA TÀI SẢN");
    expect(operations).toContain("PDF / In");
    expect(operations).toContain("companySettingsQuery");
    expect(previewHost).toContain("In PDF");
    expect(previewHost).toContain("window.open(fileUrl");
    expect(previewHost).toContain("Printer");
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


  it("excludes returned and disposed assets from company inventory statistics", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const categories = readProjectFile("client/src/pages/AssetCategoryManagementPage.tsx");
    expect(home).toContain('const inventoryAssetRows = useMemo(() => assetRows.filter((asset) => asset.statusType !== "returned" && asset.statusType !== "retired")');
    expect(home).toContain('detail: "Tài sản còn thuộc công ty"');
    expect(categories).toContain('asset.status === "returned_to_vendor" || asset.status === "retired"');
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
    expect(reports).toContain('const inventoryAssets = useMemo(() => selectedAssets.filter((asset) => asset.status !== "returned_to_vendor" && asset.status !== "retired")');
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
    expect(reports).toContain("CompactValueAllocation");
    expect(reports).toContain("InteractiveValueAllocation");
    expect(reports).toContain("AllocationAssetDetails");
    expect(reports).toContain("allocationSelection");
    expect(reports).toContain("selectedAllocationAssets");
    expect(reports).toContain("const topItems = data.slice(0, 5)");
    expect(reports).toContain("nhóm còn lại được gộp trong biểu đồ");
    expect(reports).toContain("Tổng giá trị");
    expect(reports).toContain('value: "million"');
    expect(reports).toContain('value: "billion"');
    expect(reports).toContain("currencyMode");
    const interactiveAllocation = readProjectFile("client/src/components/InteractiveValueAllocation.tsx");
    expect(interactiveAllocation).toContain("Biểu đồ phân bổ có thể chọn nhóm");
    expect(interactiveAllocation).toContain("Xem tài sản nhóm");
    expect(interactiveAllocation).toContain('className="modal-close-action">Đóng</button>');
    const interactiveAssetDetails = readProjectFile("client/src/components/InteractiveAllocationAssetDetails.tsx");
    expect(reports).toContain("InteractiveAllocationAssetDetails");
    expect(interactiveAssetDetails).toContain("Nhấn vào từng dòng để xem đầy đủ thông tin");
    expect(interactiveAssetDetails).toContain("Xem chi tiết tài sản");
    expect(interactiveAssetDetails).toContain("Thông tin tài sản");
    expect(interactiveAssetDetails).toContain("Đóng popup chi tiết tài sản");
    expect(reports).toContain("Yêu cầu Bảo hành/Sửa chữa");
    expect(interactiveAssetDetails).toContain("Bàn giao ({assetHandovers.length})");
    expect(interactiveAssetDetails).toContain("Bảo hành/Sửa chữa ({assetTickets.length})");
    expect(interactiveAssetDetails).toContain("Chưa có lịch sử bàn giao cho tài sản này.");
    expect(interactiveAssetDetails).toContain("Chưa có lịch sử Bảo hành/Sửa chữa cho tài sản này.");
    expect(interactiveAssetDetails).toContain("Mở phiếu bàn giao");
    expect(interactiveAssetDetails).toContain("assetmaster-open-handover-id");
    expect(interactiveAssetDetails).toContain("Mở phiếu {item.serviceChannel === \"warranty\" ? \"Bảo hành\" : \"Sửa chữa\"}");
    expect(interactiveAssetDetails).toContain("assetmaster-open-maintenance-ticket-id");
    expect(interactiveAssetDetails).toContain("assetmaster-return-asset-popup");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    expect(operations).toContain("assetmaster-open-maintenance-ticket-id");
    expect(operations).toContain("setHistoryTicket(directTicket)");
    expect(reports).toContain("returnAssetPopupId");
    expect(reports).toContain("assetmaster-return-asset-popup");
    expect(reports).toContain("Tổng chi phí Bảo hành/Sửa chữa");
    expect(reports).toContain("serviceCostYear");
    expect(reports).toContain("serviceCostYears");
    expect(reports).toContain("Xem trước Excel");
    expect(reports).not.toContain("Theo tài sản</div><div className=\"overflow-x-auto rounded-lg border border-[#E0E3FF]\"");
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
    const stylesheet = readProjectFile("client/src/index.css");
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
    expect(home).toContain('className="relative z-20 flex flex-col gap-4 border-b');
    expect(stylesheet).toContain("The fixed application bar must stay above scrolling data toolbars");
    expect(stylesheet).toContain("header.sticky.top-0.z-20 { z-index: 30; }");
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
    expect(home).toContain("handoverFilterDepartmentsQuery = trpc.departments.listAll.useQuery");
    expect(home).toContain("handoverFilterDepartmentsQuery.data || []");
    expect(home).toContain("handoverDepartmentCounts");
    expect(home).toContain("handoverDepartmentOptionLabels");
    expect(home).toContain("Ngừng hoạt động");
    expect(home).toContain("counts={handoverDepartmentCounts}");
    expect(home).not.toContain("hideDepartmentsWithoutHandovers");
    expect(home).toContain("visibleHandoverDepartments");
    expect(home).toContain("const visibleHandoverDepartments = handoverDepartments");
    expect(home).not.toContain("Ẩn phòng ban 0 phiếu");
    expect(home).not.toContain("Đang ẩn 0 phiếu");
    expect(home).toContain("handoverRecipientFilter");
    expect(home).toContain("const resetHandoverFilters");
    expect(home).toContain("hasActiveHandoverFilters");
    expect(home).toContain("Xóa bộ lọc");
    expect(home).toContain("handoverKpisCollapsed");
    expect(home).toContain('aria-controls="handover-kpis"');
    expect(home).toContain("Hiển thị KPI");
    expect(home).toContain("Thu gọn KPI");
    expect(home).toContain("Tất cả phòng ban");
    expect(home).toContain("Tất cả người nhận");
    expect(home).toContain("Phiếu theo phòng ban");
    expect(home).toContain("handoverDepartmentStats");
    expect(home).not.toContain("Phiếu theo người nhận");
    expect(home).not.toContain("handoverRecipientStats");
    expect(home).toContain("Đã trả NCC");
    expect(home).toContain("Xuất Excel");
    expect(home).toContain("exportFilteredAssetsExcel");
    expect(home).toContain("onExportFilteredAssets");
    expect(home).toContain("DANH SÁCH TÀI SẢN THEO BỘ LỌC");
    expect(home).toContain("assetmaster-danh-sach-tai-san-da-loc-");
    expect(home).toContain("Xuất danh sách");
    expect(home).toContain("data-asset-column-picker");
    expect(home).toContain("assetmaster-asset-catalog-visible-columns");
    expect(home).toContain("onOpenImportHistory");
    expect(home).toContain("whitespace-nowrap");
    expect(home).toContain("danh-sach-phieu-ban-giao-");
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const routers = readProjectFile("server/routers.ts");
    const db = readProjectFile("server/db.ts");
    expect(operations).toContain("Mở phiếu vừa tạo");
    expect(operations).toContain("recentlyCreatedTicketId");
    expect(routers).toContain("getNextHandoverSequence");
    expect(routers).toContain("nextReferenceCode: adminProcedure.query");
    expect(routers).toContain("ER_DUP_ENTRY");
    expect(routers).toContain("duplicate entry|er_dup_entry");
    expect(routers).toContain("Không thể tạo mã phiếu bàn giao duy nhất");
    expect(routers).toContain("BG-${handoverYear}-${String(handoverSequence).padStart(3, \"0\")}");
    expect(db).toContain("export async function getNextHandoverSequence");
    expect(db).toContain("match ? Number(match[1]) : 0");
    expect(home).toContain("handoverCreateErrorMessage");
    expect(home).toContain("mã phiếu đang được đồng bộ");
    expect(home).toContain("Mã BG dự kiến");
    expect(home).toContain("nextReferenceQuery");
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

  it("summarizes and exports maintenance costs by year and service channel", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    expect(operations).toContain("exportMaintenanceCosts");
    expect(operations).toContain("buildServiceCostWorkbook");
    expect(operations).toContain("data-maintenance-cost-summary");
    expect(operations).toContain("costSummaryYear");
    expect(operations).toContain("costSummaryChannel");
    expect(operations).toContain("costSummaryTickets");
    expect(operations).toContain("ticket.ticketYear || new Date(ticket.openedAt).getFullYear()");
    expect(operations).toContain("Tổng chi phí Bảo hành & Sửa chữa");
    expect(operations).toContain("assetmaster-chi-phi-bh-sc-");
    expect(operations).toContain("isExportingCosts");
    expect(operations).toContain("toast.loading");
    expect(operations).toContain("Xuất Excel (");
    expect(operations).not.toContain("Xuất Excel theo tab");
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
    expect(operations).toContain("drawPdfCorporateFooter");
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

  it("excludes supplier-returned and disposed assets from editable audit choices and exports", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");
    const router = readProjectFile("server/routers.ts");
    expect(operations).toContain('const auditableAssets = assets.filter((asset) => asset.status !== "returned_to_vendor" && asset.status !== "retired")');
    expect(operations).toContain("auditItemsForCurrentSession");
    expect(operations).toContain("tài sản Trả nhà cung cấp đã được loại trừ khỏi phạm vi kiểm kê.");
    expect(operations).toContain("không thuộc phạm vi kiểm kê");
    expect(router).toContain('asset.status === "returned_to_vendor" || asset.status === "retired"');
    expect(router).toContain("Tài sản đã trả nhà cung cấp hoặc Khấu hao/Thanh lý không thuộc phạm vi kiểm kê.");
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
    expect(assetImport).toContain("toast.success(`Đã tạo ${result.created} và cập nhật ${result.updated} tài sản.`, { description: \"Bạn có thể hoàn tác trong Lịch sử import ở hàng bộ lọc Danh mục tài sản.\", action: { label: \"Mở Lịch sử\"");
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

it("hiển thị danh sách phụ kiện chạm mức tồn tối thiểu trên trang Tổng quan", () => {
  const home = readProjectFile("client/src/pages/Home.tsx");

  expect(home).toContain("trpc.supplies.list.useQuery");
  expect(home).toContain("lowStockSupplies");
  expect(home).toContain("Phụ kiện chạm mức tồn tối thiểu");
  expect(home).toContain("Tồn / tối thiểu");
  expect(home).toContain("Mở phụ kiện");
  expect(home).toContain("Tồn kho phụ kiện đang an toàn");
  expect(home).toContain("Tạo phiếu nhập kho");
  expect(home).toContain("assetmaster-open-supply-receipt-id");
});
