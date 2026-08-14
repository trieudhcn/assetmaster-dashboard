import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createHandover: vi.fn(),
  getAssetById: vi.fn(),
  getActiveDepartmentById: vi.fn(),
  getCompany: vi.fn(),
  getHandoverById: vi.fn(),
  listDepartments: vi.fn(),
  recordActivity: vi.fn(),
  transitionHandoverStatus: vi.fn(),
  updateUserActiveStatus: vi.fn(),
  updateUserDepartment: vi.fn(),
}));

vi.mock("./db", () => ({
  createAsset: vi.fn(),
  createAuditItem: vi.fn(),
  createAuditSession: vi.fn(),
  createHandover: mocks.createHandover,
  createMaintenanceTicket: vi.fn(),
  getActiveDepartmentById: mocks.getActiveDepartmentById,
  getAssetById: mocks.getAssetById,
  getCompany: mocks.getCompany,
  getHandoverById: mocks.getHandoverById,
  getMaintenanceTicket: vi.fn(),
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
  transitionHandoverStatus: mocks.transitionHandoverStatus,
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
    mocks.getAssetById.mockResolvedValue({ id: 50, assetCode: "TS-00050", isArchived: false, status: "available" });
    mocks.listDepartments.mockResolvedValue([{ id: 12, code: "HCNS", name: "Hành chính - Nhân sự", isActive: true }]);
    mocks.getHandoverById.mockResolvedValue({ id: 99, recipientSignatureUrl: "https://storage.example/signature.png" });
    mocks.createHandover.mockResolvedValue(99);
    mocks.transitionHandoverStatus.mockResolvedValue({ id: 99, assetId: 50 });
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

  it("rejects a handover draft when the asset is not available", async () => {
    mocks.getAssetById.mockResolvedValue({ id: 50, assetCode: "TS-00050", isArchived: false, status: "assigned" });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.create({ assetId: 50, recipientUserId: null, recipientName: "Nguyễn Văn A", recipientDepartmentId: null, recipientDepartmentName: "Kinh doanh", handedOverAt: Date.now(), dueBackAt: null, conditionOut: "Tốt", accessories: null, note: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createHandover).not.toHaveBeenCalled();
  });

  it("persists the recipient employee and department IDs for asset history", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.create({ assetId: 50, recipientUserId: 7, recipientName: "Nguyễn Văn A", recipientDepartmentId: 12, recipientDepartmentName: "Hành chính - Nhân sự", handedOverAt: Date.now(), dueBackAt: null, conditionOut: "Tốt", accessories: "Sạc USB-C", note: "Bàn giao mới" })).resolves.toEqual({ id: 99 });
    expect(mocks.createHandover).toHaveBeenCalledWith(expect.objectContaining({ assetId: 50, recipientUserId: 7, recipientDepartmentId: 12, recipientName: "Nguyễn Văn A", recipientDepartmentName: "Hành chính - Nhân sự", status: "draft" }));
  });

  it("requires a recipient signature before activating a handover", async () => {
    mocks.getHandoverById.mockResolvedValue({ id: 99, recipientSignatureUrl: null });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.updateStatus({ id: 99, status: "active", recipientSignatureUrl: null, handoverSignatureUrl: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.transitionHandoverStatus).not.toHaveBeenCalled();
  });

  it("delegates a returned handover to the database transition helper", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.updateStatus({ id: 99, status: "returned", recipientSignatureUrl: null, handoverSignatureUrl: null })).resolves.toEqual({ success: true });
    expect(mocks.transitionHandoverStatus).toHaveBeenCalledWith(99, "returned", { recipientSignatureUrl: null, handoverSignatureUrl: null });
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "handover", entityId: 99, action: "returned" }));
  });
});
