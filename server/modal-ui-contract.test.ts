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
    expect(home).toContain("dateInput.showPicker");
    expect(categories).toContain("trpc.assets.list.useQuery");
    expect(categories).toContain("assetStatsByCategory");
    expect(categories).toContain("{stats.total} tài sản</button>");
    expect(stylesheet).toContain(".asset-date-input::-webkit-calendar-picker-indicator");
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
});
