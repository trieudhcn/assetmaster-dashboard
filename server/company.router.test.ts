import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCompany: vi.fn(), saveCompany: vi.fn(), listHelpGuides: vi.fn(), saveHelpGuide: vi.fn(), createHelpGuideVersion: vi.fn(), listHelpGuideVersions: vi.fn(), recordActivity: vi.fn(), getAssetCategoryByCode: vi.fn(), getAssetCategoryById: vi.fn(), getAssetCategoryByName: vi.fn(), getNextAssetCodeForPrefix: vi.fn(), createAssetCategory: vi.fn(), countAssetsByCategoryId: vi.fn(), deleteAssetCategory: vi.fn(), updateAssetCategory: vi.fn(), getVendorByName: vi.fn(), getBrandByName: vi.fn(), listActiveAssetsBySerialNumber: vi.fn(), runAssetImportTransaction: vi.fn(), createAsset: vi.fn(), updateAsset: vi.fn(), createAssetImportSession: vi.fn(), updateAssetImportSession: vi.fn(), createAssetImportItem: vi.fn(), createAssetFieldChanges: vi.fn(), getAssetImportSessionById: vi.fn(), listAssetImportSessions: vi.fn(), listAssetImportItems: vi.fn(), getAssetById: vi.fn() }));

vi.mock("./db", () => ({
  createAsset: mocks.createAsset, createAssetCategory: mocks.createAssetCategory, createAssetImportItem: mocks.createAssetImportItem, createAssetImportSession: mocks.createAssetImportSession, createAssetFieldChanges: mocks.createAssetFieldChanges, createAuditItem: vi.fn(), createAuditSession: vi.fn(), createDepartment: vi.fn(), createDivision: vi.fn(), createHandover: vi.fn(), createMaintenanceTicket: vi.fn(), createVendor: vi.fn(), createBrand: vi.fn(), countAssetsByCategoryId: mocks.countAssetsByCategoryId, deleteAssetCategory: mocks.deleteAssetCategory,
  getActiveDepartmentById: vi.fn(), getAssetById: vi.fn(), getAssetCategoryByCode: mocks.getAssetCategoryByCode, getAssetCategoryById: mocks.getAssetCategoryById, getAssetCategoryByName: mocks.getAssetCategoryByName, getCompany: mocks.getCompany, getDepartmentByCode: vi.fn(), getDepartmentById: vi.fn(), getDivisionByCode: vi.fn(), getDivisionById: vi.fn(), getHandoverById: vi.fn(), getMaintenanceTicket: vi.fn(), getNextAssetCodeForPrefix: mocks.getNextAssetCodeForPrefix, getVendorById: vi.fn(), getVendorByName: mocks.getVendorByName, getBrandById: vi.fn(), getBrandByName: mocks.getBrandByName, listActiveAssetsBySerialNumber: mocks.listActiveAssetsBySerialNumber, listAssets: vi.fn(), listAssetCategories: vi.fn(), listAllAssetCategories: vi.fn(), listAuditItems: vi.fn(), listAuditSessions: vi.fn(), listActivityLogs: vi.fn(), listDepartments: vi.fn(), listAllDepartments: vi.fn(), listDivisions: vi.fn(), listAllDivisions: vi.fn(), listVendors: vi.fn(), listAllVendors: vi.fn(), listBrands: vi.fn(), listAllBrands: vi.fn(), listHandovers: vi.fn(), listHandoversByRecipient: vi.fn(), listMaintenanceTickets: vi.fn(), listUsers: vi.fn(),
  recordActivity: mocks.recordActivity, runAssetImportTransaction: mocks.runAssetImportTransaction, saveCompany: mocks.saveCompany, listHelpGuides: mocks.listHelpGuides, saveHelpGuide: mocks.saveHelpGuide, createHelpGuideVersion: mocks.createHelpGuideVersion, listHelpGuideVersions: mocks.listHelpGuideVersions, updateAsset: mocks.updateAsset, updateAssetCategory: mocks.updateAssetCategory, updateAssetImportSession: mocks.updateAssetImportSession, updateAuditItem: vi.fn(), updateHandover: vi.fn(), updateMaintenanceTicket: vi.fn(), updateDepartment: vi.fn(), updateDivision: vi.fn(), updateVendor: vi.fn(), updateBrand: vi.fn(),
  updateUserActiveStatus: vi.fn(), updateUserDepartment: vi.fn(), updateUserRole: vi.fn(), transitionHandoverStatus: vi.fn(), getAssetImportSessionById: mocks.getAssetImportSessionById, listAssetImportSessions: mocks.listAssetImportSessions, listAssetImportItems: mocks.listAssetImportItems,
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

  it("chỉ công bố trường nhận diện cần thiết cho màn hình đăng nhập", async () => {
    mocks.getCompany.mockResolvedValue({ name: "Công ty Kiểm thử", websiteTitle: "Cổng tài sản", logoUrl: "/manus-storage/company-brand/logo.png", brandColor: "#0F8C8C", loginBackgroundUrl: "/manus-storage/company-brand/login-bg.png", loginGreeting: "Chào mừng đội ngũ", loginBackgroundOverlay: "dark", address: "Thông tin nội bộ", taxCode: "0101010101", phone: "0900000000" });
    const caller = appRouter.createCaller({ user: null, req: {}, res: {} } as any);

    await expect(caller.company.publicBrand()).resolves.toEqual({ name: "Công ty Kiểm thử", websiteTitle: "Cổng tài sản", logoUrl: "/manus-storage/company-brand/logo.png", brandColor: "#0F8C8C", loginBackgroundUrl: "/manus-storage/company-brand/login-bg.png", loginGreeting: "Chào mừng đội ngũ", loginBackgroundOverlay: "dark" });
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

describe("asset Excel import safeguards", () => {
  const adminCaller = () => appRouter.createCaller({ user: { id: 1, openId: "admin", role: "admin", name: "Admin", isActive: true }, req: {}, res: {} } as any);
  const row = { rowNumber: 2, assetCode: "", name: "Laptop cập nhật", category: "Laptop", status: "available" as const, maintenanceReason: null, condition: "good" as const, purchaseDate: new Date("2026-08-15").getTime(), purchaseValue: "25000000", vendor: "Nhà cung cấp A", brandName: "Hãng A", serialNumber: "SN-001", location: "Kho CNTT", warrantyUntil: null, note: null };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAssetCategoryByName.mockResolvedValue({ id: 8, name: "Laptop", code: "LT", isActive: true });
    mocks.getVendorByName.mockResolvedValue({ id: 11, name: "Nhà cung cấp A", isActive: true });
    mocks.getBrandByName.mockResolvedValue({ id: 12, name: "Hãng A", isActive: true });
    mocks.listActiveAssetsBySerialNumber.mockResolvedValue([{ id: 77, name: "Laptop cũ", serialNumber: "SN-001", isArchived: false }]);
    mocks.runAssetImportTransaction.mockImplementation(async (callback: any) => callback({ transaction: true }));
    mocks.createAssetImportSession.mockResolvedValue(31);
    mocks.updateAsset.mockResolvedValue(undefined);
    mocks.createAssetImportItem.mockResolvedValue(41);
    mocks.createAssetFieldChanges.mockResolvedValue(undefined);
    mocks.updateAssetImportSession.mockResolvedValue(undefined);
    mocks.recordActivity.mockResolvedValue(undefined);
    mocks.getAssetImportSessionById.mockResolvedValue(undefined);
    mocks.listAssetImportSessions.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5, totalPages: 0 });
    mocks.listAssetImportItems.mockResolvedValue([]);
    mocks.getAssetById.mockResolvedValue(undefined);
  });

  it("updates exactly one matching Serial/IMEI in a transaction and preserves the vendor relation", async () => {
    const result = await adminCaller().assets.import({ rows: [row], updateExisting: true });
    expect(result).toMatchObject({ created: 0, updated: 1, errors: [], sessionId: 31 });
    expect(mocks.runAssetImportTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateAsset).toHaveBeenCalledWith(77, expect.objectContaining({ vendor: "Nhà cung cấp A", vendorId: 11, brandId: 12 }), expect.anything());
    expect(mocks.createAssetImportItem).toHaveBeenCalledWith(expect.objectContaining({ action: "updated", assetId: 77 }), expect.anything());
  });

  it("rejects an inactive or missing vendor before opening a transaction", async () => {
    mocks.getVendorByName.mockResolvedValue(undefined);
    const result = await adminCaller().assets.import({ rows: [row], updateExisting: true });
    expect(result).toMatchObject({ created: 0, updated: 0, sessionId: null });
    expect(result.errors[0]?.message).toContain("Nhà cung cấp A không tồn tại hoặc đã ngừng hoạt động");
    expect(mocks.runAssetImportTransaction).not.toHaveBeenCalled();
  });

  it("lists import sessions with an independent undo state for each row", async () => {
    mocks.listAssetImportSessions.mockResolvedValue({ items: [{ id: 41, referenceCode: "IMP-2026-ABC", createdByName: "Admin", createdCount: 2, updatedCount: 1, isUndone: false, createdAt: new Date() }], total: 1, page: 1, pageSize: 5, totalPages: 1 });
    const result = await adminCaller().assets.importHistory({ page: 1, pageSize: 5 });
    expect(result.items[0]).toMatchObject({ id: 41, canUndo: true, referenceCode: "IMP-2026-ABC" });
    expect(mocks.listAssetImportSessions).toHaveBeenCalledWith(1, 5);
  });

  it("undoes a selected active import session in one transaction", async () => {
    const session = { id: 41, referenceCode: "IMP-2026-ABC", isUndone: false, createdAt: new Date(), createdCount: 1, updatedCount: 0 };
    mocks.getAssetImportSessionById.mockResolvedValue(session);
    mocks.listAssetImportItems.mockResolvedValue([]);
    await expect(adminCaller().assets.undoImportSession({ sessionId: 41 })).resolves.toMatchObject({ success: true, sessionId: 41 });
    expect(mocks.runAssetImportTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateAssetImportSession).toHaveBeenCalledWith(41, expect.objectContaining({ isUndone: true }), expect.anything());
  });
});
