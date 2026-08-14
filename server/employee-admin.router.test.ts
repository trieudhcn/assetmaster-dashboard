import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearUserDivision: vi.fn(),
  countActiveDivisionsByDepartment: vi.fn(),
  createDepartment: vi.fn(),
  createDivision: vi.fn(),
  createHandover: vi.fn(),
  getAssetById: vi.fn(),
  getActiveDepartmentById: vi.fn(),
  getCompany: vi.fn(),
  getDepartmentById: vi.fn(),
  getDepartmentByCode: vi.fn(),
  getDivisionById: vi.fn(),
  getDivisionByCode: vi.fn(),
  getHandoverById: vi.fn(),
  listDepartments: vi.fn(),
  listAllDepartments: vi.fn(),
  listAllDivisions: vi.fn(),
  listDivisions: vi.fn(),
  recordActivity: vi.fn(),
  transitionHandoverStatus: vi.fn(),
  updateUserActiveStatus: vi.fn(),
  updateUserDepartment: vi.fn(),
  updateUserDivision: vi.fn(),
  updateDepartment: vi.fn(),
  updateDivision: vi.fn(),
}));

vi.mock("./db", () => ({
  clearUserDivision: mocks.clearUserDivision,
  countActiveDivisionsByDepartment: mocks.countActiveDivisionsByDepartment,
  createAsset: vi.fn(),
  createAuditItem: vi.fn(),
  createAuditSession: vi.fn(),
  createDepartment: mocks.createDepartment,
  createDivision: mocks.createDivision,
  createHandover: mocks.createHandover,
  createMaintenanceTicket: vi.fn(),
  getActiveDepartmentById: mocks.getActiveDepartmentById,
  getAssetById: mocks.getAssetById,
  getCompany: mocks.getCompany,
  getDepartmentById: mocks.getDepartmentById,
  getDepartmentByCode: mocks.getDepartmentByCode,
  getDivisionByCode: mocks.getDivisionByCode,
  getDivisionById: mocks.getDivisionById,
  getHandoverById: mocks.getHandoverById,
  getMaintenanceTicket: vi.fn(),
  listAssets: vi.fn(),
  listAuditItems: vi.fn(),
  listAuditSessions: vi.fn(),
  listDepartments: mocks.listDepartments,
  listAllDepartments: mocks.listAllDepartments,
  listAllDivisions: mocks.listAllDivisions,
  listDivisions: mocks.listDivisions,
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
  updateUserDivision: mocks.updateUserDivision,
  updateDepartment: mocks.updateDepartment,
  updateDivision: mocks.updateDivision,
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
    mocks.getDepartmentByCode.mockResolvedValue(undefined);
    mocks.getDivisionByCode.mockResolvedValue(undefined);
    mocks.getDepartmentById.mockResolvedValue({ id: 12, code: "HCNS", name: "Hành chính - Nhân sự", isActive: true });
    mocks.getDivisionById.mockResolvedValue({ id: 30, departmentId: 12, code: "KTTT", name: "Bộ Phận Kế Toán Thanh Toán", isActive: true });
    mocks.countActiveDivisionsByDepartment.mockResolvedValue(0);
    mocks.createDepartment.mockResolvedValue(20);
    mocks.createDivision.mockResolvedValue(30);
    mocks.listDivisions.mockResolvedValue([]);
    mocks.updateUserActiveStatus.mockResolvedValue(undefined);
    mocks.updateUserDepartment.mockResolvedValue(undefined);
    mocks.updateUserDivision.mockResolvedValue(undefined);
    mocks.clearUserDivision.mockResolvedValue(undefined);
    mocks.updateDepartment.mockResolvedValue(undefined);
    mocks.updateDivision.mockResolvedValue(undefined);
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

  it("allows an administrator to create a department and a division under its selected department", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.departments.create({ name: "Ban Kế Toán", code: "BKT" })).resolves.toEqual({ id: 20, code: "BKT" });
    expect(mocks.createDepartment).toHaveBeenCalledWith({ code: "BKT", name: "Ban Kế Toán", isActive: true });

    await expect(caller.departments.createDivision({ departmentId: 12, name: "Bộ Phận Kế Toán Thanh Toán", code: "KTTT" })).resolves.toEqual({ id: 30, code: "KTTT" });
    expect(mocks.createDivision).toHaveBeenCalledWith({ departmentId: 12, code: "KTTT", name: "Bộ Phận Kế Toán Thanh Toán", isActive: true });
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "division", entityId: 30, action: "created" }));
  });

  it("requires an administrator and a valid department when creating a division", async () => {
    const employeeCaller = appRouter.createCaller({ ...adminContext, user: { ...adminContext.user, role: "user" } });
    await expect(employeeCaller.departments.createDivision({ departmentId: 12, name: "Bộ Phận Kế Toán Thanh Toán" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.getActiveDepartmentById.mockResolvedValue(undefined);
    const adminCaller = appRouter.createCaller(adminContext);
    await expect(adminCaller.departments.createDivision({ departmentId: 999, name: "Bộ Phận Kế Toán Thanh Toán" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createDivision).not.toHaveBeenCalled();
  });

  it("assigns an employee to an active division and its owning department", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.updateDivision({ id: 2, divisionId: 30 })).resolves.toEqual({ success: true });
    expect(mocks.updateUserDivision).toHaveBeenCalledWith(2, 12, 30);
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "user", entityId: 2, action: "division_updated" }));
  });

  it("rejects invalid divisions and prevents deactivating a department with divisions", async () => {
    mocks.getDivisionById.mockResolvedValue({ id: 30, departmentId: 12, name: "Bộ Phận Kế Toán Thanh Toán", isActive: false });
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.employees.updateDivision({ id: 2, divisionId: 30 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateUserDivision).not.toHaveBeenCalled();

    mocks.countActiveDivisionsByDepartment.mockResolvedValue(1);
    await expect(caller.departments.update({ id: 12, isActive: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateDepartment).not.toHaveBeenCalled();
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
