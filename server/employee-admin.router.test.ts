import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveDepartmentById: vi.fn(),
  getCompany: vi.fn(),
  listDepartments: vi.fn(),
  recordActivity: vi.fn(),
  updateUserActiveStatus: vi.fn(),
  updateUserDepartment: vi.fn(),
}));

vi.mock("./db", () => ({
  createAsset: vi.fn(),
  createAuditItem: vi.fn(),
  createAuditSession: vi.fn(),
  createHandover: vi.fn(),
  createMaintenanceTicket: vi.fn(),
  getActiveDepartmentById: mocks.getActiveDepartmentById,
  getCompany: mocks.getCompany,
  listAssets: vi.fn(),
  listAuditItems: vi.fn(),
  listAuditSessions: vi.fn(),
  listDepartments: mocks.listDepartments,
  listHandovers: vi.fn(),
  listHandoversByRecipient: vi.fn(),
  listMaintenanceTickets: vi.fn(),
  listUsers: vi.fn(),
  recordActivity: mocks.recordActivity,
  saveCompany: vi.fn(),
  updateAsset: vi.fn(),
  updateAuditItem: vi.fn(),
  updateHandover: vi.fn(),
  updateMaintenanceTicket: vi.fn(),
  updateUserActiveStatus: mocks.updateUserActiveStatus,
  updateUserDepartment: mocks.updateUserDepartment,
  updateUserRole: vi.fn(),
}));

import { appRouter } from "./routers";

const adminContext = {
  user: { id: 1, openId: "admin", role: "admin", name: "Quản trị viên", isActive: true },
  req: {},
  res: {},
} as any;

describe("employee administration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCompany.mockResolvedValue(null);
    mocks.listDepartments.mockResolvedValue([{ id: 12, code: "HCNS", name: "Hành chính - Nhân sự", isActive: true }]);
    mocks.getActiveDepartmentById.mockResolvedValue({ id: 12, code: "HCNS", name: "Hành chính - Nhân sự", isActive: true });
    mocks.updateUserActiveStatus.mockResolvedValue(undefined);
    mocks.updateUserDepartment.mockResolvedValue(undefined);
    mocks.recordActivity.mockResolvedValue(undefined);
  });

  it("allows administrators to list active departments", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.departments.list()).resolves.toEqual([
      { id: 12, code: "HCNS", name: "Hành chính - Nhân sự", isActive: true },
    ]);
  });

  it("rejects the department list for a non-administrator", async () => {
    const caller = appRouter.createCaller({ ...adminContext, user: { ...adminContext.user, role: "user" } });

    await expect(caller.departments.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects protected API access for a locked account", async () => {
    const caller = appRouter.createCaller({ ...adminContext, user: { ...adminContext.user, id: 2, role: "user", isActive: false } });

    await expect(caller.company.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.getCompany).not.toHaveBeenCalled();
  });

  it("rejects administration API access for a locked administrator", async () => {
    const caller = appRouter.createCaller({ ...adminContext, user: { ...adminContext.user, isActive: false } });

    await expect(caller.departments.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.listDepartments).not.toHaveBeenCalled();
  });

  it("records a lock operation for another employee", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.updateActiveStatus({ id: 2, isActive: false })).resolves.toEqual({ success: true });
    expect(mocks.updateUserActiveStatus).toHaveBeenCalledWith(2, false);
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "user", entityId: 2, action: "deactivated" }));
  });

  it("prevents an administrator from locking the active account in use", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.updateActiveStatus({ id: 1, isActive: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateUserActiveStatus).not.toHaveBeenCalled();
  });

  it("validates the department before assigning it to an employee", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.updateDepartment({ id: 2, departmentId: 12 })).resolves.toEqual({ success: true });
    expect(mocks.getActiveDepartmentById).toHaveBeenCalledWith(12);
    expect(mocks.updateUserDepartment).toHaveBeenCalledWith(2, 12);
  });
});
