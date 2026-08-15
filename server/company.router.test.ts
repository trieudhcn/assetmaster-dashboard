import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCompany: vi.fn(), saveCompany: vi.fn(), recordActivity: vi.fn() }));

vi.mock("./db", () => ({
  createAsset: vi.fn(), createAuditItem: vi.fn(), createAuditSession: vi.fn(), createDepartment: vi.fn(), createDivision: vi.fn(), createHandover: vi.fn(), createMaintenanceTicket: vi.fn(), createVendor: vi.fn(), createBrand: vi.fn(),
  getActiveDepartmentById: vi.fn(), getAssetById: vi.fn(), getCompany: mocks.getCompany, getDepartmentByCode: vi.fn(), getDepartmentById: vi.fn(), getDivisionByCode: vi.fn(), getDivisionById: vi.fn(), getHandoverById: vi.fn(), getMaintenanceTicket: vi.fn(), getVendorById: vi.fn(), getVendorByName: vi.fn(), getBrandById: vi.fn(), getBrandByName: vi.fn(), listAssets: vi.fn(), listAuditItems: vi.fn(), listAuditSessions: vi.fn(), listActivityLogs: vi.fn(), listDepartments: vi.fn(), listAllDepartments: vi.fn(), listDivisions: vi.fn(), listAllDivisions: vi.fn(), listVendors: vi.fn(), listAllVendors: vi.fn(), listBrands: vi.fn(), listAllBrands: vi.fn(), listHandovers: vi.fn(), listHandoversByRecipient: vi.fn(), listMaintenanceTickets: vi.fn(), listUsers: vi.fn(),
  recordActivity: mocks.recordActivity, saveCompany: mocks.saveCompany, updateAsset: vi.fn(), updateAuditItem: vi.fn(), updateHandover: vi.fn(), updateMaintenanceTicket: vi.fn(), updateDepartment: vi.fn(), updateDivision: vi.fn(), updateVendor: vi.fn(), updateBrand: vi.fn(),
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
    await caller.company.save({ name: "Công ty AssetMaster", address: null, taxCode: null, phone: null, email: null, logoUrl: "/manus-storage/company-brand/logo.webp", websiteTitle: "Cổng tài sản nội bộ" });
    expect(mocks.saveCompany).toHaveBeenCalledWith(expect.objectContaining({ logoUrl: "/manus-storage/company-brand/logo.webp", websiteTitle: "Cổng tài sản nội bộ" }));
  });
});
