import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCompany: vi.fn(), saveCompany: vi.fn(), listHelpGuides: vi.fn(), saveHelpGuide: vi.fn(), createHelpGuideVersion: vi.fn(), listHelpGuideVersions: vi.fn(), listUiLabels: vi.fn(), saveUiLabel: vi.fn(), recordActivity: vi.fn(), getAssetCategoryByCode: vi.fn(), getAssetCategoryById: vi.fn(), getNextAssetCodeForPrefix: vi.fn(), createAssetCategory: vi.fn(), countAssetsByCategoryId: vi.fn(), deleteAssetCategory: vi.fn(), updateAssetCategory: vi.fn() }));

vi.mock("./db", () => ({
  createAsset: vi.fn(), createAssetCategory: mocks.createAssetCategory, createAuditItem: vi.fn(), createAuditSession: vi.fn(), createDepartment: vi.fn(), createDivision: vi.fn(), createHandover: vi.fn(), createMaintenanceTicket: vi.fn(), createVendor: vi.fn(), createBrand: vi.fn(), countAssetsByCategoryId: mocks.countAssetsByCategoryId, deleteAssetCategory: mocks.deleteAssetCategory,
  getActiveDepartmentById: vi.fn(), getAssetById: vi.fn(), getAssetCategoryByCode: mocks.getAssetCategoryByCode, getAssetCategoryById: mocks.getAssetCategoryById, getCompany: mocks.getCompany, getDepartmentByCode: vi.fn(), getDepartmentById: vi.fn(), getDivisionByCode: vi.fn(), getDivisionById: vi.fn(), getHandoverById: vi.fn(), getMaintenanceTicket: vi.fn(), getNextAssetCodeForPrefix: mocks.getNextAssetCodeForPrefix, getVendorById: vi.fn(), getVendorByName: vi.fn(), getBrandById: vi.fn(), getBrandByName: vi.fn(), listAssets: vi.fn(), listAssetCategories: vi.fn(), listAllAssetCategories: vi.fn(), listAuditItems: vi.fn(), listAuditSessions: vi.fn(), listActivityLogs: vi.fn(), listDepartments: vi.fn(), listAllDepartments: vi.fn(), listDivisions: vi.fn(), listAllDivisions: vi.fn(), listVendors: vi.fn(), listAllVendors: vi.fn(), listBrands: vi.fn(), listAllBrands: vi.fn(), listHandovers: vi.fn(), listHandoversByRecipient: vi.fn(), listMaintenanceTickets: vi.fn(), listUsers: vi.fn(),
  recordActivity: mocks.recordActivity, saveCompany: mocks.saveCompany, listHelpGuides: mocks.listHelpGuides, saveHelpGuide: mocks.saveHelpGuide, createHelpGuideVersion: mocks.createHelpGuideVersion, listHelpGuideVersions: mocks.listHelpGuideVersions, listUiLabels: mocks.listUiLabels, saveUiLabel: mocks.saveUiLabel, updateAsset: vi.fn(), updateAssetCategory: mocks.updateAssetCategory, updateAuditItem: vi.fn(), updateHandover: vi.fn(), updateMaintenanceTicket: vi.fn(), updateDepartment: vi.fn(), updateDivision: vi.fn(), updateVendor: vi.fn(), updateBrand: vi.fn(),
  updateUserActiveStatus: vi.fn(), updateUserDepartment: vi.fn(), updateUserRole: vi.fn(), transitionHandoverStatus: vi.fn(),
}));

import { appRouter } from "./routers";

describe("company.get", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCompany.mockResolvedValue(null); mocks.saveCompany.mockResolvedValue(1); });

it("returns null rather than undefined when no company record exists", async () => {
const caller = appRouter.createCaller({ user: { id: 1, openId: "admin", role: "admin", name: "Admin", isActive: true }, req: {}, res: {} } as any);
await expect(caller.company.get()).resolves.toBeNull();
});

  it("cho phép tài khoản nhân viên đọc cấu hình nhận diện cho Cổng nhân viên", async () => {
    const caller = appRouter.createCaller({ user: { id: 2, openId: "user", role: "user", name: "Nhân viên", isActive: true }, req: {}, res: {} } as any);
    await expect(caller.company.get()).resolves.toBeNull();
  });

  it("persists the configured website title and logo URL", async () => {
    const caller = appRouter.createCaller({ user: { id: 1, openId: "admin", role: "admin", name: "Admin", isActive: true }, req: {}, res: {} } as any);
    await caller.company.save({ name: "Công ty AssetMaster", address: null, taxCode: null, phone: null, email: null, logoUrl: "/manus-storage/company-brand/logo.webp", websiteTitle: "Cổng tài sản nội bộ", brandColor: "#175A9E", faviconUrl: "/manus-storage/company-brand/favicon.png" });
    expect(mocks.saveCompany).toHaveBeenCalledWith(expect.objectContaining({ logoUrl: "/manus-storage/company-brand/logo.webp", websiteTitle: "Cổng tài sản nội bộ", brandColor: "#175A9E", faviconUrl: "/manus-storage/company-brand/favicon.png" }));
  });
});

describe("help guides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listHelpGuides.mockResolvedValue([
      { guideKey: "user-return", audience: "user", title: "Hoàn trả", description: "Gửi yêu cầu hoàn trả", steps: ["Chọn tài sản"] },
      { guideKey: "admin-assets", audience: "admin", title: "Quản lý tài sản", description: "Cập nhật danh mục", steps: ["Mở danh mục"] },
    ]);
mocks.saveHelpGuide.mockResolvedValue(undefined);
mocks.createHelpGuideVersion.mockResolvedValue(16);
mocks.listHelpGuideVersions.mockResolvedValue([{ id: 16, guideKey: "user-return", audience: "user", title: "Hoàn trả tài sản", description: "Gửi yêu cầu hoàn trả cho quản trị viên.", steps: ["Chọn tài sản", "Gửi yêu cầu"], changedByName: "Admin", createdAt: new Date("2026-08-17T00:00:00Z") }]);
mocks.recordActivity.mockResolvedValue(undefined);
  });

  it("cho User chỉ đọc hướng dẫn dành cho nhân viên và cho Admin cập nhật nội dung", async () => {
    const userCaller = appRouter.createCaller({ user: { id: 2, openId: "user", role: "user", name: "Nhân viên", isActive: true }, req: {}, res: {} } as any);
    await expect(userCaller.help.guides()).resolves.toHaveLength(1);
    const adminCaller = appRouter.createCaller({ user: { id: 1, openId: "admin", role: "admin", name: "Admin", isActive: true }, req: {}, res: {} } as any);
await adminCaller.help.saveGuide({ guideKey: "user-return", audience: "user", title: "Hoàn trả tài sản", description: "Gửi yêu cầu hoàn trả cho quản trị viên.", steps: ["Chọn tài sản", "Gửi yêu cầu"] });
expect(mocks.saveHelpGuide).toHaveBeenCalledWith(expect.objectContaining({ guideKey: "user-return", audience: "user", updatedByUserId: 1 }));
expect(mocks.createHelpGuideVersion).toHaveBeenCalledWith(expect.objectContaining({ guideKey: "user-return", changedByUserId: 1, changedByName: "Admin" }));
expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "helpGuide", action: "updated" }));
});

  it("chỉ cho Admin xem lịch sử phiên bản hướng dẫn", async () => {
    const adminCaller = appRouter.createCaller({ user: { id: 1, openId: "admin", role: "admin", name: "Admin", isActive: true }, req: {}, res: {} } as any);
    const userCaller = appRouter.createCaller({ user: { id: 2, openId: "user", role: "user", name: "Nhân viên", isActive: true }, req: {}, res: {} } as any);
    await expect(adminCaller.help.versions({ guideKey: "user-return" })).resolves.toHaveLength(1);
    expect(mocks.listHelpGuideVersions).toHaveBeenCalledWith("user-return");
    await expect(userCaller.help.versions({ guideKey: "user-return" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("từ chối User cập nhật nội dung hướng dẫn", async () => {
    const userCaller = appRouter.createCaller({ user: { id: 2, openId: "user", role: "user", name: "Nhân viên", isActive: true }, req: {}, res: {} } as any);
    await expect(userCaller.help.saveGuide({ guideKey: "user-return", audience: "user", title: "Hoàn trả tài sản", description: "Gửi yêu cầu hoàn trả cho quản trị viên.", steps: ["Chọn tài sản"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("uiLabels", () => {
  const adminCaller = () => appRouter.createCaller({ user: { id: 1, openId: "admin", role: "admin", name: "Admin", isActive: true }, req: {}, res: {} } as any);
  const userCaller = () => appRouter.createCaller({ user: { id: 2, openId: "user", role: "user", name: "Nhân viên", isActive: true }, req: {}, res: {} } as any);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listUiLabels.mockResolvedValue([{ id: 7, labelKey: "dashboard-operations", value: "Asset Operations", updatedAt: new Date() }]);
    mocks.saveUiLabel.mockResolvedValue(7);
    mocks.recordActivity.mockResolvedValue(undefined);
  });

  it("cho mọi tài khoản đăng nhập đọc nhãn và chỉ Admin lưu nhãn trực tiếp", async () => {
    await expect(userCaller().uiLabels.list()).resolves.toHaveLength(1);
    await expect(adminCaller().uiLabels.save({ labelKey: "dashboard-operations", value: "Vận hành tài sản" })).resolves.toEqual({ id: 7 });
    expect(mocks.saveUiLabel).toHaveBeenCalledWith(expect.objectContaining({ labelKey: "dashboard-operations", value: "Vận hành tài sản", updatedByUserId: 1 }));
    await expect(userCaller().uiLabels.save({ labelKey: "dashboard-operations", value: "Không được phép" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("assetCategories", () => {
  const adminCaller = () => appRouter.createCaller({ user: { id: 1, openId: "admin", role: "admin", name: "Admin", isActive: true }, req: {}, res: {} } as any);
  const userCaller = () => appRouter.createCaller({ user: { id: 2, openId: "user", role: "user", name: "Nhân viên", isActive: true }, req: {}, res: {} } as any);
  beforeEach(() => { vi.clearAllMocks(); mocks.getAssetCategoryByCode.mockResolvedValue(undefined); mocks.getAssetCategoryById.mockResolvedValue({ id: 8, name: "Laptop", code: "LT", isActive: true }); mocks.getNextAssetCodeForPrefix.mockResolvedValue("LT00007"); mocks.createAssetCategory.mockResolvedValue(8); mocks.countAssetsByCategoryId.mockResolvedValue(0); });

  it("allows only administrators to create a category with an uppercase prefix", async () => {
    await expect(adminCaller().assetCategories.create({ name: "Laptop", code: "lt", description: null })).resolves.toEqual({ id: 8 });
    expect(mocks.createAssetCategory).toHaveBeenCalledWith(expect.objectContaining({ name: "Laptop", code: "LT", isActive: true }));
    await expect(userCaller().assetCategories.create({ name: "Laptop", code: "LT", description: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns the next sequential code for an active category", async () => {
    await expect(adminCaller().assetCategories.nextCode({ categoryId: 8 })).resolves.toEqual({ assetCode: "LT00007" });
    expect(mocks.getNextAssetCodeForPrefix).toHaveBeenCalledWith("LT");
  });
});
