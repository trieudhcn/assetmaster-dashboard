import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearUserDivision: vi.fn(),
  countUsersByRole: vi.fn(),
  listActivityLogsByEntity: vi.fn(),
  countActiveDivisionsByDepartment: vi.fn(),
  createDepartment: vi.fn(),
  createDivision: vi.fn(),
  createVendor: vi.fn(),
  createBrand: vi.fn(),
  createVendorDocument: vi.fn(),
  deleteVendorDocument: vi.fn(),
  createHandover: vi.fn(),
  createHandoverSupplyItem: vi.fn(),
  createInventoryMovement: vi.fn(),
  getAssetById: vi.fn(),
  getInventorySupplyById: vi.fn(),
  getVendorById: vi.fn(),
  getVendorByName: vi.fn(),
  getVendorDocumentById: vi.fn(),
  getBrandById: vi.fn(),
  getBrandByName: vi.fn(),
  getActiveDepartmentById: vi.fn(),
  getCompany: vi.fn(),
  getDepartmentById: vi.fn(),
  getDepartmentByCode: vi.fn(),
  getDivisionById: vi.fn(),
  getDivisionByCode: vi.fn(),
  getHandoverById: vi.fn(),
  getNextHandoverSequence: vi.fn(),
  getUserNotificationPreferences: vi.fn(),
  listDepartments: vi.fn(),
  listAllDepartments: vi.fn(),
  listAllDivisions: vi.fn(),
  listDivisions: vi.fn(),
  listVendors: vi.fn(),
  listBrands: vi.fn(),
  listAllVendors: vi.fn(),
  listAllBrands: vi.fn(),
  listVendorDocuments: vi.fn(),
  listHandoversByRecipient: vi.fn(),
  listHandoverSupplyItems: vi.fn(),
  listHandoverReturnDecisionHistory: vi.fn(),
  recordActivity: vi.fn(),
  runInventoryTransaction: vi.fn(),
  saveUserNotificationPreferences: vi.fn(),
  storagePut: vi.fn(),
  transitionHandoverStatus: vi.fn(),
  updateUserActiveStatus: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserDepartment: vi.fn(),
  updateUserDivision: vi.fn(),
  updateDepartment: vi.fn(),
  updateDivision: vi.fn(),
  updateHandover: vi.fn(),
  updateHandoverSupplyItem: vi.fn(),
  updateInventorySupply: vi.fn(),
  updateVendor: vi.fn(),
  updateBrand: vi.fn(),
}));

vi.mock("./db", () => ({
  clearUserDivision: mocks.clearUserDivision,
  countUsersByRole: mocks.countUsersByRole,
  listActivityLogsByEntity: mocks.listActivityLogsByEntity,
  countActiveDivisionsByDepartment: mocks.countActiveDivisionsByDepartment,
  createAsset: vi.fn(),
  createAuditItem: vi.fn(),
  createAuditSession: vi.fn(),
  createDepartment: mocks.createDepartment,
  createDivision: mocks.createDivision,
  createVendor: mocks.createVendor,
  createBrand: mocks.createBrand,
  createVendorDocument: mocks.createVendorDocument,
  deleteVendorDocument: mocks.deleteVendorDocument,
  createHandover: mocks.createHandover,
  createHandoverSupplyItem: mocks.createHandoverSupplyItem,
  createInventoryMovement: mocks.createInventoryMovement,
  createMaintenanceTicket: vi.fn(),
  getActiveDepartmentById: mocks.getActiveDepartmentById,
  getAssetById: mocks.getAssetById,
  getInventorySupplyById: mocks.getInventorySupplyById,
  getVendorById: mocks.getVendorById,
  getVendorByName: mocks.getVendorByName,
  getVendorDocumentById: mocks.getVendorDocumentById,
  getBrandById: mocks.getBrandById,
  getBrandByName: mocks.getBrandByName,
  getCompany: mocks.getCompany,
  getDepartmentById: mocks.getDepartmentById,
  getDepartmentByCode: mocks.getDepartmentByCode,
  getDivisionByCode: mocks.getDivisionByCode,
  getDivisionById: mocks.getDivisionById,
  getHandoverById: mocks.getHandoverById,
  getNextHandoverSequence: mocks.getNextHandoverSequence,
  getNextRetirementCertificateSequence: vi.fn().mockResolvedValue(1),
  getUserNotificationPreferences: mocks.getUserNotificationPreferences,
  getMaintenanceTicket: vi.fn(),
  listAssets: vi.fn(),
  listAuditItems: vi.fn(),
  listAuditSessions: vi.fn(),
  listDepartments: mocks.listDepartments,
  listAllDepartments: mocks.listAllDepartments,
  listAllDivisions: mocks.listAllDivisions,
  listDivisions: mocks.listDivisions,
  listVendors: mocks.listVendors,
  listBrands: mocks.listBrands,
  listAllVendors: mocks.listAllVendors,
  listAllBrands: mocks.listAllBrands,
  listVendorDocuments: mocks.listVendorDocuments,
  listHandovers: vi.fn(),
  listHandoversByRecipient: mocks.listHandoversByRecipient,
  listHandoverSupplyItems: mocks.listHandoverSupplyItems,
  listHandoverReturnDecisionHistory: mocks.listHandoverReturnDecisionHistory,
  listHelpGuides: vi.fn(),
  listMaintenanceTickets: vi.fn(),
  listUsers: vi.fn(),
  recordActivity: mocks.recordActivity,
  runInventoryTransaction: mocks.runInventoryTransaction,
  saveCompany: vi.fn(),
  saveHelpGuide: vi.fn(),
  saveUserNotificationPreferences: mocks.saveUserNotificationPreferences,
  updateAsset: vi.fn(),
  updateAuditItem: vi.fn(),
  updateHandover: mocks.updateHandover,
  updateHandoverSupplyItem: mocks.updateHandoverSupplyItem,
  updateInventorySupply: mocks.updateInventorySupply,
  updateMaintenanceTicket: vi.fn(),
  transitionHandoverStatus: mocks.transitionHandoverStatus,
  updateUserActiveStatus: mocks.updateUserActiveStatus,
  updateUserRole: mocks.updateUserRole,
  updateUserDepartment: mocks.updateUserDepartment,
  updateUserDivision: mocks.updateUserDivision,
  updateDepartment: mocks.updateDepartment,
  updateDivision: mocks.updateDivision,
  updateVendor: mocks.updateVendor,
  updateBrand: mocks.updateBrand,
}));

vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));

import { appRouter } from "./routers";

const adminContext = {
  user: { id: 1, openId: "admin", role: "admin", name: "Quản trị viên", isActive: true },
  req: {},
  res: {},
} as any;

const userContext = {
  user: { id: 8, openId: "employee", role: "user", name: "Nhân viên", isActive: true },
  req: {},
  res: {},
} as any;

describe("employee administration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCompany.mockResolvedValue(null);
    mocks.getAssetById.mockResolvedValue({ id: 50, assetCode: "TS-00050", isArchived: false, status: "available" });
    mocks.getUserNotificationPreferences.mockResolvedValue(null);
    mocks.saveUserNotificationPreferences.mockResolvedValue(undefined);
    mocks.listDepartments.mockResolvedValue([{ id: 12, code: "HCNS", name: "Hành chính - Nhân sự", isActive: true }]);
    mocks.getHandoverById.mockResolvedValue({ id: 99, referenceCode: "BG-2026-001", assetCode: "TS-00050", recipientName: "Nguyễn Văn A", recipientUserId: 7, recipientDepartmentId: 12, recipientSignatureUrl: "https://storage.example/signature.png" });
    mocks.getNextHandoverSequence.mockResolvedValue(1);
    mocks.listHandoverReturnDecisionHistory.mockResolvedValue([]);
    mocks.createHandover.mockResolvedValue(99);
    mocks.runInventoryTransaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({ transaction: true }));
    mocks.getInventorySupplyById.mockResolvedValue({ id: 81, code: "PK-CHUOT", name: "Chuột không dây", unit: "Cái", stockQuantity: "5", isActive: true });
    mocks.listHandoverSupplyItems.mockResolvedValue([]);
    mocks.transitionHandoverStatus.mockResolvedValue({ id: 99, assetId: 50 });
    mocks.getActiveDepartmentById.mockResolvedValue({ id: 12, code: "HCNS", name: "Hành chính - Nhân sự", isActive: true });
    mocks.getDepartmentByCode.mockResolvedValue(undefined);
    mocks.getDivisionByCode.mockResolvedValue(undefined);
    mocks.getDepartmentById.mockResolvedValue({ id: 12, code: "HCNS", name: "Hành chính - Nhân sự", isActive: true });
    mocks.getDivisionById.mockResolvedValue({ id: 30, departmentId: 12, code: "KTTT", name: "Bộ Phận Kế Toán Thanh Toán", isActive: true });
    mocks.countActiveDivisionsByDepartment.mockResolvedValue(0);
    mocks.createDepartment.mockResolvedValue(20);
    mocks.createDivision.mockResolvedValue(30);
    mocks.createVendor.mockResolvedValue(41);
    mocks.createBrand.mockResolvedValue(51);
    mocks.createVendorDocument.mockResolvedValue(71);
    mocks.deleteVendorDocument.mockResolvedValue(undefined);
    mocks.getVendorById.mockResolvedValue({ id: 41, name: "Nhà cung cấp Minh Phát", isActive: true });
    mocks.getBrandById.mockResolvedValue({ id: 51, name: "Dell", isActive: true });
    mocks.getVendorByName.mockResolvedValue(undefined);
    mocks.getBrandByName.mockResolvedValue(undefined);
    mocks.listVendors.mockResolvedValue([{ id: 41, name: "Nhà cung cấp Minh Phát", isActive: true }]);
    mocks.listBrands.mockResolvedValue([{ id: 51, name: "Dell", isActive: true }]);
    mocks.listAllVendors.mockResolvedValue([{ id: 41, name: "Nhà cung cấp Minh Phát", isActive: true }]);
    mocks.listAllBrands.mockResolvedValue([{ id: 51, name: "Dell", isActive: true }]);
    mocks.listVendorDocuments.mockResolvedValue([]);
    mocks.getVendorDocumentById.mockResolvedValue({ id: 71, vendorId: 41, fileName: "bao-gia.pdf" });
    mocks.updateVendor.mockResolvedValue(undefined);
    mocks.updateBrand.mockResolvedValue(undefined);
    mocks.listDivisions.mockResolvedValue([]);
    mocks.updateUserActiveStatus.mockResolvedValue(undefined);
    mocks.updateUserRole.mockResolvedValue(undefined);
    mocks.updateUserDepartment.mockResolvedValue(undefined);
    mocks.updateUserDivision.mockResolvedValue(undefined);
    mocks.clearUserDivision.mockResolvedValue(undefined);
    mocks.countUsersByRole.mockResolvedValue(2);
    mocks.listActivityLogsByEntity.mockResolvedValue([]);
    mocks.updateDepartment.mockResolvedValue(undefined);
    mocks.updateDivision.mockResolvedValue(undefined);
    mocks.updateHandover.mockResolvedValue(undefined);
    mocks.recordActivity.mockResolvedValue(undefined);
    mocks.listHandoversByRecipient.mockResolvedValue([{ id: 91, assetCode: "TS-00091", assetName: "Laptop cá nhân", status: "active" }]);
    mocks.storagePut.mockResolvedValue({ key: "vendors/41/documents/bao-gia.pdf", url: "/manus-storage/vendors/41/documents/bao-gia.pdf" });
  });

  it("allows administrators to list active departments", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.departments.list()).resolves.toEqual([
      { id: 12, code: "HCNS", name: "Hành chính - Nhân sự", isActive: true },
    ]);
  });

  it("returns asset history only for the signed-in employee", async () => {
    const caller = appRouter.createCaller(userContext);

    await expect(caller.employees.myAssetHistory()).resolves.toEqual([
      { id: 91, assetCode: "TS-00091", assetName: "Laptop cá nhân", status: "active" },
    ]);
    expect(mocks.listHandoversByRecipient).toHaveBeenCalledWith(8);
    await expect(caller.employees.assetHistory({ userId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.assets.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.handovers.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets a recipient request return only for their active handover", async () => {
    mocks.getHandoverById.mockResolvedValue({ id: 99, assetCode: "TS-00099", recipientUserId: 8, status: "active", returnRequestStatus: "none" });
    const caller = appRouter.createCaller(userContext);

    await expect(caller.handovers.requestReturn({ id: 99, note: "Tôi có thể bàn giao lại vào thứ Sáu." })).resolves.toEqual({ success: true });
    expect(mocks.updateHandover).toHaveBeenCalledWith(99, expect.objectContaining({ returnRequestStatus: "pending", returnRequestNote: "Tôi có thể bàn giao lại vào thứ Sáu." }));
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "return_requested", actorUserId: 8 }));

    mocks.getHandoverById.mockResolvedValue({ id: 100, assetCode: "TS-00100", recipientUserId: 7, status: "active", returnRequestStatus: "none" });
    await expect(caller.handovers.requestReturn({ id: 100, note: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets an administrator approve a pending return and release the asset", async () => {
    mocks.getHandoverById.mockResolvedValue({ id: 99, assetCode: "TS-00099", recipientUserId: 8, status: "active", returnRequestStatus: "pending" });
    mocks.storagePut.mockResolvedValue({ key: "handovers/99/return-conditions/tinh-trang.png", url: "/manus-storage/handovers/99/return-conditions/tinh-trang.png" });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.resolveReturnRequest({ id: 99, decision: "approved", conditionIn: null, resolution: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.handovers.resolveReturnRequest({ id: 99, decision: "approved", conditionIn: "Tốt", resolution: null, conditionPhoto: { fileName: "tinh-trang.png", contentType: "image/png", dataUrl: "data:image/png;base64,UE5H" } })).resolves.toEqual({ success: true, returnedAccessoryCount: 0, outstandingAccessoryCount: 0 });
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^handovers\/99\/return-conditions\//), expect.any(Buffer), "image/png");
    expect(mocks.transitionHandoverStatus).toHaveBeenCalledWith(99, "returned", expect.objectContaining({ returnRequestStatus: "approved", returnRequestResolvedByUserId: 1, conditionIn: "Tốt", returnConditionPhotoUrl: "/manus-storage/handovers/99/return-conditions/tinh-trang.png" }), expect.anything());
  });

  it("returns handover accessories to stock exactly once when the asset is recovered", async () => {
    mocks.getHandoverById.mockResolvedValue({ id: 99, referenceCode: "BG-2026-001", assetCode: "TS-00099", recipientName: "Nguyễn Văn A", recipientUserId: 8, recipientDepartmentId: 12, status: "active", returnRequestStatus: "pending" });
    mocks.listHandoverSupplyItems.mockResolvedValue([{ id: 501, handoverId: 99, supplyId: 81, supplyCode: "PK-CHUOT", supplyName: "Chuột không dây", unit: "Cái", issuedQuantity: "2", returnedQuantity: "0" }]);
    mocks.getInventorySupplyById.mockResolvedValue({ id: 81, code: "PK-CHUOT", name: "Chuột không dây", unit: "Cái", stockQuantity: "3", isActive: true });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.resolveReturnRequest({ id: 99, decision: "approved", conditionIn: "Tốt", resolution: "Đã thu hồi đủ phụ kiện", conditionPhoto: null })).resolves.toEqual({ success: true, returnedAccessoryCount: 1, outstandingAccessoryCount: 0 });
    expect(mocks.updateInventorySupply).toHaveBeenCalledWith(81, { stockQuantity: "5" }, expect.anything());
    expect(mocks.updateHandoverSupplyItem).toHaveBeenCalledWith(501, { returnedQuantity: "2" }, expect.anything());
    expect(mocks.createInventoryMovement).toHaveBeenCalledWith(expect.objectContaining({ handoverId: 99, movementType: "return", quantity: "2", quantityBefore: "3", quantityAfter: "5" }), expect.anything());
  });

  it("returns only the confirmed accessory quantity and reports items still outstanding", async () => {
    mocks.getHandoverById.mockResolvedValue({ id: 99, referenceCode: "BG-2026-001", assetCode: "TS-00099", recipientName: "Nguyễn Văn A", recipientUserId: 8, recipientDepartmentId: 12, status: "active", returnRequestStatus: "pending" });
    mocks.listHandoverSupplyItems.mockResolvedValue([{ id: 501, handoverId: 99, supplyId: 81, supplyCode: "PK-CHUOT", supplyName: "Chuột không dây", unit: "Cái", issuedQuantity: "3", returnedQuantity: "0" }]);
    mocks.getInventorySupplyById.mockResolvedValue({ id: 81, code: "PK-CHUOT", name: "Chuột không dây", unit: "Cái", stockQuantity: "4", isActive: true });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.resolveReturnRequest({ id: 99, decision: "approved", conditionIn: "Tốt", resolution: null, conditionPhoto: null, returnedSupplyItems: [{ handoverSupplyItemId: 501, quantity: 1 }] })).resolves.toEqual({ success: true, returnedAccessoryCount: 1, outstandingAccessoryCount: 1 });
    expect(mocks.updateInventorySupply).toHaveBeenCalledWith(81, { stockQuantity: "5" }, expect.anything());
    expect(mocks.updateHandoverSupplyItem).toHaveBeenCalledWith(501, { returnedQuantity: "1" }, expect.anything());
    expect(mocks.createInventoryMovement).toHaveBeenCalledWith(expect.objectContaining({ movementType: "return", quantity: "1", quantityBefore: "4", quantityAfter: "5" }), expect.anything());
  });

  it("allows administrators to create suppliers and brands while restricting employees", async () => {
    const adminCaller = appRouter.createCaller(adminContext);

    await expect(adminCaller.vendors.list()).resolves.toHaveLength(1);
    await expect(adminCaller.brands.list()).resolves.toHaveLength(1);
    await expect(adminCaller.vendors.create({ name: "Nhà cung cấp Minh Phát", contactName: null, phone: null, email: null })).resolves.toEqual({ id: 41 });
    await expect(adminCaller.brands.create({ name: "Dell" })).resolves.toEqual({ id: 51 });
    expect(mocks.createVendor).toHaveBeenCalledWith(expect.objectContaining({ name: "Nhà cung cấp Minh Phát", isActive: true }));
    expect(mocks.createBrand).toHaveBeenCalledWith({ name: "Dell", isActive: true });

    const employeeCaller = appRouter.createCaller({ ...adminContext, user: { ...adminContext.user, role: "user" } });
    await expect(employeeCaller.vendors.create({ name: "Công ty khác", contactName: null, phone: null, email: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows administrators to edit or deactivate suppliers and brands", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.vendors.update({ id: 41, name: "Nhà cung cấp Minh Phát mới", contactName: "Lan", phone: null, email: null, isActive: false })).resolves.toEqual({ success: true });
    expect(mocks.updateVendor).toHaveBeenCalledWith(41, expect.objectContaining({ name: "Nhà cung cấp Minh Phát mới", isActive: false }));

    await expect(caller.brands.update({ id: 51, isActive: false })).resolves.toEqual({ success: true });
    expect(mocks.updateBrand).toHaveBeenCalledWith(51, { isActive: false });
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "brand", entityId: 51, action: "deactivated" }));
  });

  it("rejects the department list for a non-administrator", async () => {
    const adminCaller = appRouter.createCaller(adminContext);
    await expect(adminCaller.vendors.documents({ vendorId: 41 })).resolves.toEqual([]);
    await expect(adminCaller.vendors.uploadDocument({ vendorId: 41, documentType: "quotation", fileName: "bao-gia.pdf", contentType: "application/pdf", dataUrl: "data:application/pdf;base64,SGVsbG8=" })).resolves.toMatchObject({ id: 71, fileName: "bao-gia.pdf" });
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringContaining("vendors/41/documents/"), expect.any(Buffer), "application/pdf");
    expect(mocks.createVendorDocument).toHaveBeenCalledWith(expect.objectContaining({ vendorId: 41, documentType: "quotation", fileName: "bao-gia.pdf", fileSize: 5 }));
    await expect(adminCaller.vendors.removeDocument({ id: 71 })).resolves.toEqual({ success: true });
    expect(mocks.deleteVendorDocument).toHaveBeenCalledWith(71);

    const caller = appRouter.createCaller({ ...adminContext, user: { ...adminContext.user, role: "user" } });

    await expect(caller.departments.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.vendors.documents({ vendorId: 41 })).rejects.toMatchObject({ code: "FORBIDDEN" });
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

  it("allows an administrator to change another employee role and records the activity", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.updateRole({ id: 8, role: "admin" })).resolves.toEqual({ success: true });
    expect(mocks.updateUserRole).toHaveBeenCalledWith(8, "admin");
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "user", entityId: 8, action: "role_updated" }));
  });

  it("returns role history for the selected employee", async () => {
    mocks.listActivityLogsByEntity.mockResolvedValue([
      { id: 501, entityType: "user", entityId: 8, action: "role_updated", summary: "Cập nhật vai trò thành admin", actorName: "Quản trị viên", createdAt: new Date("2026-08-17T03:00:00Z") },
      { id: 502, entityType: "user", entityId: 8, action: "updated", summary: "Cập nhật thông tin", actorName: "Quản trị viên", createdAt: new Date("2026-08-16T03:00:00Z") },
    ]);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.roleHistory({ userId: 8 })).resolves.toEqual([
      expect.objectContaining({ id: 501, action: "role_updated" }),
    ]);
    expect(mocks.listActivityLogsByEntity).toHaveBeenCalledWith("user", 8);
  });

  it("prevents an administrator from lowering their own role", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.updateRole({ id: 1, role: "user" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateUserRole).not.toHaveBeenCalled();
  });

  it("prevents lowering the last administrator role", async () => {
    mocks.countUsersByRole.mockResolvedValue(1);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.updateRole({ id: 8, role: "user" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.updateUserRole).not.toHaveBeenCalled();
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

    await expect(caller.handovers.create({ assetId: 50, recipientUserId: 7, recipientName: "Nguyễn Văn A", recipientDepartmentId: 12, recipientDepartmentName: "Hành chính - Nhân sự", handedOverAt: Date.now(), dueBackAt: null, conditionOut: "Tốt", accessories: "Sạc USB-C", note: "Bàn giao mới" })).resolves.toEqual({ id: 99, issuedAccessoryCount: 0 });
    expect(mocks.createHandover).toHaveBeenCalledWith(expect.objectContaining({ assetId: 50, recipientUserId: 7, recipientDepartmentId: 12, recipientName: "Nguyễn Văn A", recipientDepartmentName: "Hành chính - Nhân sự", status: "draft" }), expect.anything());
  });

  it("retries a duplicate handover code and advances the yearly sequence", async () => {
    mocks.getNextHandoverSequence.mockReset();
    mocks.getNextHandoverSequence.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    mocks.createHandover.mockReset();
    mocks.createHandover.mockRejectedValueOnce(Object.assign(new Error("Duplicate entry"), { code: "ER_DUP_ENTRY" })).mockResolvedValueOnce(100);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.create({ assetId: 50, recipientUserId: 7, recipientName: "Nguyễn Văn A", recipientDepartmentId: 12, recipientDepartmentName: "Hành chính - Nhân sự", handedOverAt: Date.now(), dueBackAt: null, conditionOut: "Tốt", accessories: null, note: null })).resolves.toEqual({ id: 100, issuedAccessoryCount: 0 });
    expect(mocks.createHandover).toHaveBeenNthCalledWith(2, expect.objectContaining({ referenceCode: expect.stringMatching(/^BG-\d{4}-002$/) }), expect.anything());
  });

  it("issues selected accessories with the handover and rejects quantities beyond stock", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.handovers.create({ assetId: 50, recipientUserId: 7, recipientName: "Nguyễn Văn A", recipientDepartmentId: 12, recipientDepartmentName: "Hành chính - Nhân sự", handedOverAt: Date.now(), dueBackAt: null, conditionOut: "Tốt", accessories: "Túi chống sốc", supplyItems: [{ supplyId: 81, quantity: 2 }], note: null })).resolves.toEqual({ id: 99, issuedAccessoryCount: 1 });
    expect(mocks.createHandover).toHaveBeenCalledWith(expect.objectContaining({ accessories: expect.stringContaining("Chuột không dây × 2 Cái") }), expect.anything());
    expect(mocks.updateInventorySupply).toHaveBeenCalledWith(81, { stockQuantity: "3" }, expect.anything());
    expect(mocks.createInventoryMovement).toHaveBeenCalledWith(expect.objectContaining({ movementType: "issue", quantity: "2", quantityBefore: "5", quantityAfter: "3" }), expect.anything());

    mocks.getInventorySupplyById.mockResolvedValueOnce({ id: 81, code: "PK-CHUOT", name: "Chuột không dây", unit: "Cái", stockQuantity: "1", isActive: true });
    await expect(caller.handovers.create({ assetId: 50, recipientUserId: 7, recipientName: "Nguyễn Văn A", recipientDepartmentId: 12, recipientDepartmentName: "Hành chính - Nhân sự", handedOverAt: Date.now(), dueBackAt: null, conditionOut: "Tốt", accessories: null, supplyItems: [{ supplyId: 81, quantity: 2 }], note: null })).rejects.toThrow("Tồn kho phụ kiện PK-CHUOT không đủ");
  });

  it("requires a recipient signature before activating a handover", async () => {
    mocks.getHandoverById.mockResolvedValue({ id: 99, recipientSignatureUrl: null });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.updateStatus({ id: 99, status: "active", recipientSignatureUrl: null, handoverSignatureUrl: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.transitionHandoverStatus).not.toHaveBeenCalled();
  });

  it("delegates a returned handover to the database transition helper", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.updateStatus({ id: 99, status: "returned", recipientSignatureUrl: null, handoverSignatureUrl: null })).resolves.toEqual({ success: true, returnedAccessoryCount: 0, outstandingAccessoryCount: 0 });
    expect(mocks.transitionHandoverStatus).toHaveBeenCalledWith(99, "returned", { recipientSignatureUrl: null, handoverSignatureUrl: null }, expect.anything());
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "handover", entityId: 99, action: "returned" }));
  });

  it("returns defaults and saves notification preferences for the signed-in user", async () => {
    const caller = appRouter.createCaller(userContext);

    await expect(caller.notifications.preferences()).resolves.toEqual({ maintenanceEnabled: true, handoverEnabled: true, returnRequestEnabled: true });
    await expect(caller.notifications.savePreferences({ maintenanceEnabled: false, handoverEnabled: true, returnRequestEnabled: false })).resolves.toEqual({ success: true });
    expect(mocks.saveUserNotificationPreferences).toHaveBeenCalledWith(8, { maintenanceEnabled: false, handoverEnabled: true, returnRequestEnabled: false });
  });

  it("allows the recipient to submit a follow-up and mark a rejected return result as seen", async () => {
    mocks.getHandoverById.mockResolvedValue({ id: 99, assetCode: "TS-00099", recipientUserId: 8, returnRequestStatus: "rejected" });
    const caller = appRouter.createCaller(userContext);

    await expect(caller.handovers.submitReturnFollowUp({ id: 99, note: "Tôi đã kiểm tra lại tình trạng thiết bị và xin được bàn giao vào ngày mai." })).resolves.toEqual({ success: true });
    expect(mocks.updateHandover).toHaveBeenCalledWith(99, expect.objectContaining({ returnFollowUpNote: expect.stringContaining("Tôi đã kiểm tra") }));
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "return_follow_up_submitted", actorUserId: 8 }));

    await expect(caller.handovers.markReturnResultSeen({ id: 99 })).resolves.toEqual({ success: true });
    expect(mocks.updateHandover).toHaveBeenCalledWith(99, expect.objectContaining({ returnResultSeenAt: expect.any(Date) }));
  });

  it("returns the decision history for an existing handover to an administrator", async () => {
    mocks.getHandoverById.mockResolvedValue({ id: 99, recipientUserId: 8 });
    mocks.listHandoverReturnDecisionHistory.mockResolvedValue([{ id: 7, action: "return_approved", entityId: 99, actorName: "Quản trị viên", summary: "Duyệt yêu cầu hoàn trả TS-00099", createdAt: new Date("2026-08-15T07:00:00Z") }]);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.returnDecisionHistory({ id: 99 })).resolves.toEqual([expect.objectContaining({ action: "return_approved", entityId: 99 })]);
    expect(mocks.listHandoverReturnDecisionHistory).toHaveBeenCalledWith(99);
  });
});
