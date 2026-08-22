import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("safe inline UI labels", () => {
  it("chỉ cho Admin lưu nhãn hợp lệ và hỗ trợ Enter/Escape cho thao tác trực tiếp", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const editor = readFileSync(new URL("../client/src/components/EditableSectionLabel.tsx", import.meta.url), "utf8");
    const enhancer = readFileSync(new URL("../client/src/components/LegacySectionLabelEnhancer.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    const operations = readFileSync(new URL("../client/src/pages/OperationsModules.tsx", import.meta.url), "utf8");
    const supplies = readFileSync(new URL("../client/src/pages/SuppliesInventoryView.tsx", import.meta.url), "utf8");
    const retirement = readFileSync(new URL("../client/src/pages/RetirementManagementView.tsx", import.meta.url), "utf8");

    expect(router).toContain("uiLabels: router");
    expect(router).toContain("list: protectedProcedure");
    expect(router).toContain("save: adminProcedure");
    expect(router).toContain("value: z.string().trim().min(2).max(120)");
    expect(editor).toContain('if (event.key === "Enter")');
    expect(editor).toContain('if (event.key === "Escape")');
    expect(editor).toContain("Nhãn cần có từ 2 đến 120 ký tự.");
    expect(editor).toContain("Nhấp đúp để chỉnh sửa");
    expect(home).not.toContain("assetmaster-dashboard-pattern_109e8935.png");
    expect(home).toContain('labelKey="dashboard-operations"');
    expect(operations).toContain('labelKey="audit-reconciliation"');
    expect(operations).toContain('fallback="Đối chiếu kiểm kê"');
    expect(supplies).toContain('labelKey="supplies-operations" fallback="Kho vận hành" canEdit={canEditSectionLabels}');
    expect(retirement).toContain('labelKey="retirement-end-of-life" fallback="Vòng đời kết thúc" canEdit={canEditSectionLabels}');
    expect(home).toContain('<SuppliesInventoryView canEditSectionLabels={isAdmin} />');
    expect(home).toContain('<RetirementManagementView canEditSectionLabels={isAdmin} />');
    expect(enhancer).toContain('fallback: "Danh mục tài sản"');
    expect(enhancer).toContain('fallback: "Quản lý bàn giao"');
    expect(enhancer).toContain('fallback: "Vận hành bảo trì"');
    expect(enhancer).toContain('fallback: "Dữ liệu quản trị trực tiếp"');
    expect(enhancer).toContain('fallback: "Phân bổ nhân sự"');
    expect(enhancer).toContain('fallback: "Danh mục nhà cung cấp"');
    expect(enhancer).toContain('fallback: "Thiết lập thương hiệu"');
    expect(enhancer).toContain('fallback: "Xem trước trang web"');
    expect(enhancer).toContain("MutationObserver");
  });

  it("đặt Hiệu ứng chuyển động trong Nhận diện mở rộng mà vẫn giữ cấu hình người dùng", () => {
    const relocator = readFileSync(new URL("../client/src/components/MotionSettingsRelocator.tsx", import.meta.url), "utf8");
    const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");

    expect(relocator).toContain("Nhận diện mở rộng");
    expect(relocator).toContain("Watermark PDF");
    expect(relocator).toContain("assetmaster-motion");
    expect(relocator).toContain("document.documentElement.dataset.motion");
    expect(relocator).toContain("Bật hoặc tắt hiệu ứng cho menu");
    expect(app).toContain("<MotionSettingsRelocator />");
  });
});
