import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMaintenanceTicket: vi.fn(),
  updateMaintenanceTicket: vi.fn(),
  createAuditSession: vi.fn(),
  deleteAuditItem: vi.fn(),
  deleteAuditItemsBySession: vi.fn(),
  deleteAuditSession: vi.fn(),
  createAuditItem: vi.fn(),
  updateAuditItem: vi.fn(),
  updateAuditSession: vi.fn(),
  recordActivity: vi.fn(),
  getAuditItemById: vi.fn(),
  getAuditSession: vi.fn(),
  getMaintenanceTicket: vi.fn(),
  getNextMaintenanceTicketSequence: vi.fn(),
  getNextAuditSequence: vi.fn(),
  getAssetById: vi.fn(),
  getAssetCategoryById: vi.fn(),
  updateAsset: vi.fn(),
  listAssets: vi.fn(),
  listMaintenanceTickets: vi.fn(),
  listMaintenanceTicketsByAsset: vi.fn(),
  listAuditSessions: vi.fn(),
  listAuditItems: vi.fn(),
  listActivityLogs: vi.fn(),
  listActivityLogsByEntity: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./db", () => ({
  createAsset: vi.fn(),
  createAuditItem: mocks.createAuditItem,
  createAuditSession: mocks.createAuditSession,
  deleteAuditItem: mocks.deleteAuditItem,
  deleteAuditItemsBySession: mocks.deleteAuditItemsBySession,
  deleteAuditSession: mocks.deleteAuditSession,
  createDepartment: vi.fn(),
  createDivision: vi.fn(),
  createVendor: vi.fn(),
  createBrand: vi.fn(),
  createHandover: vi.fn(),
  createMaintenanceTicket: mocks.createMaintenanceTicket,
  getActiveDepartmentById: vi.fn(),
  getAssetById: mocks.getAssetById,
  getAuditItemById: mocks.getAuditItemById,
  getAuditSession: mocks.getAuditSession,
  getAssetCategoryById: mocks.getAssetCategoryById,
  getCompany: vi.fn(),
  getDepartmentByCode: vi.fn(),
  getDepartmentById: vi.fn(),
  getDivisionByCode: vi.fn(),
  getDivisionById: vi.fn(),
  getVendorById: vi.fn(),
  getVendorByName: vi.fn(),
  getBrandById: vi.fn(),
  getBrandByName: vi.fn(),
  getHandoverById: vi.fn(),
  getMaintenanceTicket: mocks.getMaintenanceTicket,
  getNextMaintenanceTicketSequence: mocks.getNextMaintenanceTicketSequence,
  getNextAuditSequence: mocks.getNextAuditSequence,
  listAssets: vi.fn(),
  listAuditItems: mocks.listAuditItems,
  listAuditSessions: mocks.listAuditSessions,
  listDepartments: vi.fn(),
  listAllDepartments: vi.fn(),
  listDivisions: vi.fn(),
  listAllDivisions: vi.fn(),
  listVendors: vi.fn(),
  listAllVendors: vi.fn(),
  listBrands: vi.fn(),
  listAllBrands: vi.fn(),
  listHandovers: vi.fn(),
  listHandoversByRecipient: vi.fn(),
  listMaintenanceTickets: mocks.listMaintenanceTickets,
  listMaintenanceTicketsByAsset: mocks.listMaintenanceTicketsByAsset,
  listActivityLogs: mocks.listActivityLogs,
  listActivityLogsByEntity: mocks.listActivityLogsByEntity,
  listUsers: vi.fn(),
  recordActivity: mocks.recordActivity,
  saveCompany: vi.fn(),
  transitionHandoverStatus: vi.fn(),
  updateAsset: mocks.updateAsset,
  updateAuditItem: mocks.updateAuditItem,
  updateAuditSession: mocks.updateAuditSession,
  updateHandover: vi.fn(),
  updateMaintenanceTicket: mocks.updateMaintenanceTicket,
  updateDepartment: vi.fn(),
  updateDivision: vi.fn(),
  updateVendor: vi.fn(),
  updateBrand: vi.fn(),
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
    mocks.deleteAuditItem.mockResolvedValue(undefined);
    mocks.deleteAuditItemsBySession.mockResolvedValue(undefined);
    mocks.deleteAuditSession.mockResolvedValue(undefined);
    mocks.updateMaintenanceTicket.mockResolvedValue(undefined);
    mocks.updateAuditItem.mockResolvedValue(undefined);
    mocks.updateAuditSession.mockResolvedValue(undefined);
    mocks.recordActivity.mockResolvedValue(undefined);
    mocks.getMaintenanceTicket.mockResolvedValue({ id: 30, assetId: 8, ticketCode: "BT-2026-002", ticketYear: 2026, ticketSequence: 2, status: "open", description: "Màn hình thiết bị bị nứt sau va chạm." });
    mocks.getNextMaintenanceTicketSequence.mockResolvedValue(1);
    mocks.listMaintenanceTickets.mockResolvedValue([]);
    mocks.listMaintenanceTicketsByAsset.mockResolvedValue([]);
    mocks.listAuditSessions.mockResolvedValue([]);
    mocks.listAuditItems.mockResolvedValue([{ id: 50, auditSessionId: 40, assetId: 8, result: "matched" }]);
    mocks.listActivityLogs.mockResolvedValue([]);
    mocks.listActivityLogsByEntity.mockResolvedValue([]);
    mocks.storagePut.mockResolvedValue({ key: "maintenance/30/chung-tu.pdf", url: "/manus-storage/maintenance/30/chung-tu.pdf" });
    const asset = { id: 8, assetCode: "LT00008", name: "Laptop QA", isArchived: false, status: "available" };
    mocks.getAssetById.mockResolvedValue(asset as any);
    mocks.getAuditItemById.mockResolvedValue({ id: 50, auditSessionId: 40, assetId: 8 });
    mocks.getAuditSession.mockResolvedValue({ id: 40, referenceCode: "KK-2026-LOCK", status: "draft" });
    mocks.getAssetCategoryById.mockImplementation(async (id: number) => id === 1 ? { id: 1, name: "Laptop", code: "LT", isActive: true } : { id, name: "Thiết bị", code: "TB", isActive: true });
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
      ticketCode: expect.stringMatching(/^BT-\d{4}-\d{3}$/),
      ticketYear: expect.any(Number),
      ticketSequence: 1,
    }));
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "maintenance", entityId: 30, action: "reported" }));
    expect(mocks.updateAsset).toHaveBeenCalledWith(8, expect.objectContaining({ status: "maintenance", holderUserId: null, holderName: null, maintenanceReason: "Màn hình thiết bị bị nứt sau va chạm." }));
  });

  it("moves all source-category assets to an active target category and requires admin", async () => {
    const dbModule = vi.mocked(await import("./db"));
    dbModule.listAssets.mockResolvedValue([{ id: 8, categoryId: 1, assetCode: "LT00008" }, { id: 9, categoryId: 1, assetCode: "LT00009" }] as any);
    const employeeCaller = appRouter.createCaller(employeeContext);
    await expect(employeeCaller.assetCategories.bulkMoveAssets({ sourceCategoryId: 1, targetCategoryId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const adminCaller = appRouter.createCaller(adminContext);
    await expect(adminCaller.assetCategories.bulkMoveAssets({ sourceCategoryId: 1, targetCategoryId: 2 })).resolves.toEqual({ moved: 2 });
    expect(dbModule.updateAsset).toHaveBeenCalledWith(8, { categoryId: 2 });
    expect(dbModule.updateAsset).toHaveBeenCalledWith(9, { categoryId: 2 });
  });

  it("returns maintenance history scoped to the selected asset for protected users", async () => {
    const ticket = { id: 31, assetId: 8, ticketCode: "BT-2026-HISTORY", status: "resolved", openedAt: new Date() };
    mocks.listMaintenanceTicketsByAsset.mockResolvedValue([ticket]);

    const caller = appRouter.createCaller(employeeContext);
    await expect(caller.maintenance.byAsset({ assetId: 8 })).resolves.toEqual([ticket]);
    expect(mocks.listMaintenanceTicketsByAsset).toHaveBeenCalledWith(8);
  });

  it("rejects every update for a ticket that is already closed", async () => {
    mocks.getMaintenanceTicket.mockResolvedValue({ id: 30, assetId: 8, status: "closed", description: "Đã hoàn tất." });
    const adminCaller = appRouter.createCaller(adminContext);
    await expect(adminCaller.maintenance.update({ id: 30, status: "open", assigneeUserId: null, resolution: "", estimatedCost: "0", actualCost: "0" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(adminCaller.maintenance.uploadAttachment({ id: 30, fileName: "chung-tu.pdf", contentType: "application/pdf", dataUrl: "data:application/pdf;base64,UEZERg==" })).rejects.toMatchObject({ code: "CONFLICT" });
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
    expect(mocks.updateAsset).toHaveBeenCalledWith(8, expect.objectContaining({ status: "available", holderUserId: null, holderName: null, maintenanceReason: null }));
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

  it("imports multiple Excel audit results only when every item belongs to the selected session", async () => {
    const dbModule = vi.mocked(await import("./db"));
    dbModule.listAuditItems.mockResolvedValue([{ id: 50, auditSessionId: 40, assetId: 8 }, { id: 51, auditSessionId: 40, assetId: 9 }] as any);
    const employeeCaller = appRouter.createCaller(employeeContext);
    const input = {
      sessionId: 40,
      items: [
        { id: 50, actualStatus: "available" as const, result: "matched" as const, note: "Khớp sổ sách" },
        { id: 51, actualStatus: "damaged" as const, result: "mismatch" as const, note: "Trầy xước vỏ máy" },
      ],
    };

    await expect(employeeCaller.audits.importItems(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const adminCaller = appRouter.createCaller(adminContext);
    await expect(adminCaller.audits.importItems(input)).resolves.toEqual({ updated: 2 });
    expect(mocks.updateAuditItem).toHaveBeenCalledWith(50, expect.objectContaining({ actualStatus: "available", result: "matched", checkedByUserId: 1 }));
    expect(mocks.updateAuditItem).toHaveBeenCalledWith(51, expect.objectContaining({ actualStatus: "damaged", result: "mismatch", checkedByUserId: 1 }));
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "audit", entityId: 40, action: "excel_imported" }));

    await expect(adminCaller.audits.importItems({ sessionId: 40, items: [{ id: 999, actualStatus: null, result: "pending", note: null }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("finalizes an audited session, locks later updates, and exposes Excel import history", async () => {
    mocks.listAuditItems.mockResolvedValue([{ id: 50, auditSessionId: 40, assetId: 8, result: "matched" }] as any);
    mocks.listActivityLogsByEntity.mockResolvedValue([{ id: 301, action: "excel_imported", actorName: "Quản trị viên", summary: "Nhập Excel và cập nhật 1 kết quả kiểm kê", createdAt: new Date("2026-08-17T03:00:00Z") }, { id: 302, action: "finalized", actorName: "Quản trị viên", summary: "Chốt biên bản", createdAt: new Date() }] as any);
    const adminCaller = appRouter.createCaller(adminContext);

    await expect(adminCaller.audits.finalize({ sessionId: 40 })).resolves.toEqual({ success: true });
    expect(mocks.updateAuditSession).toHaveBeenCalledWith(40, expect.objectContaining({ status: "completed", completedAt: expect.any(Date) }));
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "audit", entityId: 40, action: "finalized" }));
    await expect(adminCaller.audits.importHistory({ sessionId: 40 })).resolves.toEqual([expect.objectContaining({ id: 301, action: "excel_imported" })]);

    mocks.getAuditSession.mockResolvedValue({ id: 40, referenceCode: "KK-2026-LOCK", status: "completed" });
    await expect(adminCaller.audits.recordItem({ id: 50, actualStatus: "available", result: "matched", note: null })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(adminCaller.audits.addItem({ sessionId: 40, assetId: 8, expectedStatus: "available" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("creates an audit session and adds an asset with its expected status", async () => {
    const caller = appRouter.createCaller(adminContext);
    mocks.getNextAuditSequence.mockResolvedValue(1);

    await expect(caller.audits.create({ name: "Kiểm kê QA Quý I", departmentId: null })).resolves.toEqual({ id: 40 });
    expect(mocks.createAuditSession).toHaveBeenCalledWith(expect.objectContaining({
      name: "Kiểm kê QA Quý I",
      departmentId: null,
      createdByUserId: 1,
      status: "draft",
      referenceCode: expect.stringMatching(/^KK-\d{4}-\d{2}$/),
    }));

    await expect(caller.audits.addItem({ sessionId: 40, assetId: 8, expectedStatus: "available" })).resolves.toEqual({ id: 50 });
    expect(mocks.createAuditItem).toHaveBeenCalledWith({ auditSessionId: 40, assetId: 8, expectedStatus: "available", result: "pending" });
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "auditItem", entityId: 50, action: "added" }));
  });

  it("removes assets from editable audits and deletes draft audits only", async () => {
    const adminCaller = appRouter.createCaller(adminContext);
    await expect(adminCaller.audits.removeItem({ id: 50 })).resolves.toEqual({ success: true });
    expect(mocks.deleteAuditItem).toHaveBeenCalledWith(50);
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "auditItem", action: "removed" }));

    await expect(adminCaller.audits.deleteDraft({ sessionId: 40 })).resolves.toEqual({ success: true });
    expect(mocks.deleteAuditItemsBySession).toHaveBeenCalledWith(40);
    expect(mocks.deleteAuditSession).toHaveBeenCalledWith(40);

    mocks.getAuditSession.mockResolvedValue({ id: 40, referenceCode: "KK-2026-LOCK", status: "completed" });
    await expect(adminCaller.audits.deleteDraft({ sessionId: 40 })).rejects.toMatchObject({ code: "CONFLICT" });
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
