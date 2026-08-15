import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCompany: vi.fn(), saveCompany: vi.fn(), recordActivity: vi.fn(), getAssetCategoryByCode: vi.fn(), getAssetCategoryById: vi.fn(), getNextAssetCodeForPrefix: vi.fn(), createAssetCategory: vi.fn(), countAssetsByCategoryId: vi.fn(), deleteAssetCategory: vi.fn(), updateAssetCategory: vi.fn() }));

vi.mock("./db", () => ({
  createAsset: vi.fn(), createAssetCategory: mocks.createAssetCategory, createAuditItem: vi.fn(), createAuditSession: vi.fn(), createDepartment: vi.fn(), createDivision: vi.fn(), createHandover: vi.fn(), createMaintenanceTicket: vi.fn(), createVendor: vi.fn(), createBrand: vi.fn(), countAssetsByCategoryId: mocks.countAssetsByCategoryId, deleteAssetCategory: mocks.deleteAssetCategory,
  getActiveDepartmentById: vi.fn(), getAssetById: vi.fn(), getAssetCategoryByCode: mocks.getAssetCategoryByCode, getAssetCategoryById: mocks.getAssetCategoryById, getCompany: mocks.getCompany, getDepartmentByCode: vi.fn(), getDepartmentById: vi.fn(), getDivisionByCode: vi.fn(), getDivisionById: vi.fn(), getHandoverById: vi.fn(), getMaintenanceTicket: vi.fn(), getNextAssetCodeForPrefix: mocks.getNextAssetCodeForPrefix, getVendorById: vi.fn(), getVendorByName: vi.fn(), getBrandById: vi.fn(), getBrandByName: vi.fn(), listAssets: vi.fn(), listAssetCategories: vi.fn(), listAllAssetCategories: vi.fn(), listAuditItems: vi.fn(), listAuditSessions: vi.fn(), listActivityLogs: vi.fn(), listDepartments: vi.fn(), listAllDepartments: vi.fn(), listDivisions: vi.fn(), listAllDivisions: vi.fn(), listVendors: vi.fn(), listAllVendors: vi.fn(), listBrands: vi.fn(), listAllBrands: vi.fn(), listHandovers: vi.fn(), listHandoversByRecipient: vi.fn(), listMaintenanceTickets: vi.fn(), listUsers: vi.fn(),
  recordActivity: mocks.recordActivity, saveCompany: mocks.saveCompany, updateAsset: vi.fn(), updateAssetCategory: mocks.updateAssetCategory, updateAuditItem: vi.fn(), updateHandover: vi.fn(), updateMaintenanceTicket: vi.fn(), updateDepartment: vi.fn(), updateDivision: vi.fn(), updateVendor: vi.fn(), updateBrand: vi.fn(),
  updateUserActiveStatus: vi.fn(), updateUserDepartment: vi.fn(), updateUserRole: vi.fn(), transitionHandoverStatus: vi.fn(),
}));

import { appRouter } from "./routers";

describe("company.get", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCompany.mockResolvedValue(null); mocks.saveCompany.mockResolvedValue(1); });

  it("returns null rather than undefined when no company record exists", async () => {
    const caller = appRouter.createCaller({ user: { id: 1, openId: "admin", role: "admin", name: "Admin", isActive: true }, req: {}, res: {} } as any);
    await expect(caller.company.get()).resolves.toBeNull();
  });

  it("persists the configured website title and logo URL", async () => {
    const caller = appRouter.createCaller({ user: { id: 1, openId: "admin", role: "admin", name: "Admin", isActive: true }, req: {}, res: {} } as any);
    await caller.company.save({ name: "Công ty AssetMaster", address: null, taxCode: null, phone: null, email: null, logoUrl: "/manus-storage/company-brand/logo.webp", websiteTitle: "Cổng tài sản nội bộ", brandColor: "#175A9E", faviconUrl: "/manus-storage/company-brand/favicon.png" });
    expect(mocks.saveCompany).toHaveBeenCalledWith(expect.objectContaining({ logoUrl: "/manus-storage/company-brand/logo.webp", websiteTitle: "Cổng tài sản nội bộ", brandColor: "#175A9E", faviconUrl: "/manus-storage/company-brand/favicon.png" }));
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
