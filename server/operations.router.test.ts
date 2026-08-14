import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMaintenanceTicket: vi.fn(),
  updateMaintenanceTicket: vi.fn(),
  createAuditSession: vi.fn(),
  createAuditItem: vi.fn(),
  updateAuditItem: vi.fn(),
  recordActivity: vi.fn(),
  getMaintenanceTicket: vi.fn(),
  listMaintenanceTickets: vi.fn(),
  listAuditSessions: vi.fn(),
  listActivityLogs: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./db", () => ({
  createAsset: vi.fn(),
  createAuditItem: mocks.createAuditItem,
  createAuditSession: mocks.createAuditSession,
  createHandover: vi.fn(),
  createMaintenanceTicket: mocks.createMaintenanceTicket,
  getActiveDepartmentById: vi.fn(),
  getAssetById: vi.fn(),
  getCompany: vi.fn(),
  getHandoverById: vi.fn(),
  getMaintenanceTicket: mocks.getMaintenanceTicket,
  listAssets: vi.fn(),
  listAuditItems: vi.fn(),
  listAuditSessions: mocks.listAuditSessions,
  listDepartments: vi.fn(),
  listHandovers: vi.fn(),
  listHandoversByRecipient: vi.fn(),
  listMaintenanceTickets: mocks.listMaintenanceTickets,
  listActivityLogs: mocks.listActivityLogs,
  listUsers: vi.fn(),
  recordActivity: mocks.recordActivity,
  saveCompany: vi.fn(),
  transitionHandoverStatus: vi.fn(),
  updateAsset: vi.fn(),
  updateAuditItem: mocks.updateAuditItem,
  updateHandover: vi.fn(),
  updateMaintenanceTicket: mocks.updateMaintenanceTicket,
  updateUserActiveStatus: vi.fn(),
  updateUserDepartment: vi.fn(),
  updateUserRole: vi.fn(),
}));

vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));

import { appRouter } from "./routers";

const adminContext = {
  user: { id: 1, openId: "admin", role: "admin", name: "Quản trị viên", isActive: true },
  req: {},
  res: {},
} as any;

const employeeContext = {
  ...adminContext,
  user: { id: 2, openId: "employee", role: "user", name: "Nhân viên", isActive: true },
} as any;

describe("operations management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMaintenanceTicket.mockResolvedValue(30);
    mocks.createAuditSession.mockResolvedValue(40);
    mocks.createAuditItem.mockResolvedValue(50);
    mocks.updateMaintenanceTicket.mockResolvedValue(undefined);
    mocks.updateAuditItem.mockResolvedValue(undefined);
    mocks.recordActivity.mockResolvedValue(undefined);
    mocks.getMaintenanceTicket.mockResolvedValue({ id: 30, ticketCode: "BT-2026-ABC12345" });
    mocks.listMaintenanceTickets.mockResolvedValue([]);
    mocks.listAuditSessions.mockResolvedValue([]);
    mocks.listActivityLogs.mockResolvedValue([]);
    mocks.storagePut.mockResolvedValue({ key: "maintenance/30/chung-tu.pdf", url: "/manus-storage/maintenance/30/chung-tu.pdf" });
  });

  it("creates a maintenance ticket with the reporting user and initial open state", async () => {
    const caller = appRouter.createCaller(employeeContext);

    await expect(caller.maintenance.create({
      assetId: 8,
      issueType: "damage",
      priority: "high",
      description: "Màn hình thiết bị bị nứt sau va chạm.",
      estimatedCost: "1250000.00",
    })).resolves.toEqual({ id: 30 });

    expect(mocks.createMaintenanceTicket).toHaveBeenCalledWith(expect.objectContaining({
      assetId: 8,
      reporterUserId: 2,
      reporterName: "Nhân viên",
      issueType: "damage",
      priority: "high",
      status: "open",
      estimatedCost: "1250000.00",
      ticketCode: expect.stringMatching(/^BT-\d{4}-[A-Z0-9]{8}$/),
    }));
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "maintenance", entityId: 30, action: "reported" }));
  });

  it("only allows administrators to assign a technician and record actual cost", async () => {
    const employeeCaller = appRouter.createCaller(employeeContext);
    await expect(employeeCaller.maintenance.update({
      id: 30,
      status: "in_progress",
      assigneeUserId: 9,
      resolution: "Đang thay màn hình.",
      estimatedCost: "1250000.00",
      actualCost: "0",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const adminCaller = appRouter.createCaller(adminContext);
    await expect(adminCaller.maintenance.update({
      id: 30,
      status: "resolved",
      assigneeUserId: 9,
      resolution: "Đã thay màn hình và nghiệm thu.",
      estimatedCost: "1250000.00",
      actualCost: "1175000.00",
    })).resolves.toEqual({ success: true });

    expect(mocks.updateMaintenanceTicket).toHaveBeenCalledWith(30, expect.objectContaining({
      status: "resolved",
      assigneeUserId: 9,
      resolution: "Đã thay màn hình và nghiệm thu.",
      estimatedCost: "1250000.00",
      actualCost: "1175000.00",
      resolvedAt: expect.any(Date),
    }));
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "maintenance", entityId: 30, action: "resolved" }));
  });

  it("requires an administrator to record an audit discrepancy", async () => {
    const employeeCaller = appRouter.createCaller(employeeContext);
    await expect(employeeCaller.audits.recordItem({
      id: 50,
      actualStatus: "damaged",
      result: "mismatch",
      note: "Tài sản có hư hỏng khác với hiện trạng kỳ vọng.",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const adminCaller = appRouter.createCaller(adminContext);
    await expect(adminCaller.audits.recordItem({
      id: 50,
      actualStatus: "damaged",
      result: "mismatch",
      note: "Tài sản có hư hỏng khác với hiện trạng kỳ vọng.",
    })).resolves.toEqual({ success: true });

    expect(mocks.updateAuditItem).toHaveBeenCalledWith(50, expect.objectContaining({
      actualStatus: "damaged",
      result: "mismatch",
      checkedByUserId: 1,
      checkedAt: expect.any(Date),
    }));
  });

  it("creates an audit session and adds an asset with its expected status", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.audits.create({ name: "Kiểm kê QA Quý I", departmentId: null })).resolves.toEqual({ id: 40 });
    expect(mocks.createAuditSession).toHaveBeenCalledWith(expect.objectContaining({
      name: "Kiểm kê QA Quý I",
      departmentId: null,
      createdByUserId: 1,
      status: "draft",
      referenceCode: expect.stringMatching(/^KK-\d{4}-[A-Z0-9]{8}$/),
    }));

    await expect(caller.audits.addItem({ sessionId: 40, assetId: 8, expectedStatus: "available" })).resolves.toEqual({ id: 50 });
    expect(mocks.createAuditItem).toHaveBeenCalledWith({ auditSessionId: 40, assetId: 8, expectedStatus: "available", result: "pending" });
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "auditItem", entityId: 50, action: "added" }));
  });

  it("only lets administrators upload a supported maintenance attachment and stores its metadata", async () => {
    const employeeCaller = appRouter.createCaller(employeeContext);
    const input = { id: 30, fileName: "Bao gia sua chua.pdf", contentType: "application/pdf" as const, dataUrl: "data:application/pdf;base64,UEZERg==" };

    await expect(employeeCaller.maintenance.uploadAttachment(input)).rejects.toMatchObject({ code: "FORBIDDEN" });

    const adminCaller = appRouter.createCaller(adminContext);
    await expect(adminCaller.maintenance.uploadAttachment(input)).resolves.toEqual({
      url: "/manus-storage/maintenance/30/chung-tu.pdf",
      name: "Bao gia sua chua.pdf",
      contentType: "application/pdf",
    });

    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^maintenance\/30\//), expect.any(Buffer), "application/pdf");
    expect(mocks.updateMaintenanceTicket).toHaveBeenCalledWith(30, expect.objectContaining({
      attachmentUrl: "/manus-storage/maintenance/30/chung-tu.pdf",
      attachmentName: "Bao gia sua chua.pdf",
      attachmentContentType: "application/pdf",
    }));
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "maintenance", entityId: 30, action: "attachment_uploaded" }));
  });

  it("returns upcoming reminder items to protected users and restricts activity logs to administrators", async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mocks.listMaintenanceTickets.mockResolvedValue([{ id: 30, ticketCode: "BT-2026-ABC12345", status: "open", dueAt: tomorrow, description: "Bảo trì định kỳ", recurrenceDays: 30 }]);
    mocks.listAuditSessions.mockResolvedValue([{ id: 40, referenceCode: "KK-2026-ABC12345", name: "Kiểm kê quý", status: "draft", scheduledAt: tomorrow, recurrenceDays: 90 }]);
    mocks.listActivityLogs.mockResolvedValue([{ id: 1, entityType: "asset", entityId: 8, action: "updated", createdAt: new Date() }]);

    const employeeCaller = appRouter.createCaller(employeeContext);
    await expect(employeeCaller.reminders.list()).resolves.toHaveLength(2);
    await expect(employeeCaller.activity.list({ limit: 50 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const adminCaller = appRouter.createCaller(adminContext);
    await expect(adminCaller.activity.list({ limit: 50 })).resolves.toHaveLength(1);
  });
});
