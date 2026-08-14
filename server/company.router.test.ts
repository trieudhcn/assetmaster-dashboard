import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCompany: vi.fn() }));

vi.mock("./db", () => ({
  createAsset: vi.fn(), createAuditItem: vi.fn(), createAuditSession: vi.fn(), createDepartment: vi.fn(), createDivision: vi.fn(), createHandover: vi.fn(), createMaintenanceTicket: vi.fn(),
  getActiveDepartmentById: vi.fn(), getAssetById: vi.fn(), getCompany: mocks.getCompany, getDepartmentByCode: vi.fn(), getDivisionByCode: vi.fn(), getHandoverById: vi.fn(), getMaintenanceTicket: vi.fn(), listAssets: vi.fn(), listAuditItems: vi.fn(), listAuditSessions: vi.fn(), listActivityLogs: vi.fn(), listDepartments: vi.fn(), listDivisions: vi.fn(), listHandovers: vi.fn(), listHandoversByRecipient: vi.fn(), listMaintenanceTickets: vi.fn(), listUsers: vi.fn(),
  recordActivity: vi.fn(), saveCompany: vi.fn(), updateAsset: vi.fn(), updateAuditItem: vi.fn(), updateHandover: vi.fn(), updateMaintenanceTicket: vi.fn(),
  updateUserActiveStatus: vi.fn(), updateUserDepartment: vi.fn(), updateUserRole: vi.fn(), transitionHandoverStatus: vi.fn(),
}));

import { appRouter } from "./routers";

describe("company.get", () => {
  beforeEach(() => mocks.getCompany.mockResolvedValue(null));

  it("returns null rather than undefined when no company record exists", async () => {
    const caller = appRouter.createCaller({ user: { id: 1, openId: "admin", role: "admin", name: "Admin", isActive: true }, req: {}, res: {} } as any);
    await expect(caller.company.get()).resolves.toBeNull();
  });
});
