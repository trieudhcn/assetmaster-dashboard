import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearUserDivision: vi.fn(),
  countUsersByRole: vi.fn(),
  listActivityLogsByEntity: vi.fn(),
  countActiveDivisionsByDepartment: vi.fn(),
  createDepartment: vi.fn(),
  createDivision: vi.fn(),
  createSoftwareLicense: vi.fn(),
  createLicenseType: vi.fn(),
  createSoftwareLicenseActivationAccount: vi.fn(),
  createSoftwareLicenseCredentialAccessLog: vi.fn(),
  createSoftwareLicenseDocument: vi.fn(),
  createSoftwareLicenseAssignment: vi.fn(),
  createSoftwareLicenseKey: vi.fn(),
  createTechnologyService: vi.fn(),
  createTechnologyVendor: vi.fn(),
  createTechnologyVendorContract: vi.fn(),
  createTechnologyVendorContractDocument: vi.fn(),
  createVendor: vi.fn(),
  createBrand: vi.fn(),
  createVendorDocument: vi.fn(),
  deleteVendorDocument: vi.fn(),
  deleteSoftwareLicenseDocument: vi.fn(),
  deleteLicenseType: vi.fn(),
  deleteTechnologyVendorContractDocument: vi.fn(),
  createHandover: vi.fn(),
  createHandoverSupplyItem: vi.fn(),
  createInventoryMovement: vi.fn(),
  getAssetById: vi.fn(),
  getInventorySupplyById: vi.fn(),
  getSoftwareLicenseById: vi.fn(),
  getSoftwareLicenseActivationAccountById: vi.fn(),
  getSoftwareLicenseAssignmentById: vi.fn(),
  getSoftwareLicenseDocumentById: vi.fn(),
  getSoftwareLicenseKeyById: vi.fn(),
  getLicenseTypeById: vi.fn(),
  getVendorById: vi.fn(),
  getVendorByName: vi.fn(),
  getVendorDocumentById: vi.fn(),
  getTechnologyVendorById: vi.fn(),
  getTechnologyVendorContractById: vi.fn(),
  getTechnologyVendorContractDocumentById: vi.fn(),
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
  getNextRecoveryCertificateSequence: vi.fn(),
  getUserByEmployeeCode: vi.fn(),
  getUserMenuPreference: vi.fn(),
  getUserNotificationPreferences: vi.fn(),
  listUserDashboardAlertHistory: vi.fn(),
  listUserDashboardAlertStateIds: vi.fn(),
  listDepartments: vi.fn(),
  listAllDepartments: vi.fn(),
  listAllDivisions: vi.fn(),
  listDivisions: vi.fn(),
  listVendors: vi.fn(),
  listBrands: vi.fn(),
  listAllVendors: vi.fn(),
  listAllBrands: vi.fn(),
  listVendorDocuments: vi.fn(),
  listActiveSoftwareLicenseAssignmentsForHandover: vi.fn(),
  listSoftwareLicenses: vi.fn(),
  listLicenseTypes: vi.fn(),
  countSoftwareLicensesByTypeId: vi.fn(),
  listSoftwareLicenseActivationAccounts: vi.fn(),
  listSoftwareLicenseAssignments: vi.fn(),
  listSoftwareLicenseCredentialAccessLogs: vi.fn(),
  listSoftwareLicenseDocuments: vi.fn(),
  listSoftwareLicenseKeys: vi.fn(),
  listTechnologyServices: vi.fn(),
  listTechnologyVendors: vi.fn(),
  listTechnologyVendorContracts: vi.fn(),
  listTechnologyVendorContractAlerts: vi.fn(),
  listTechnologyVendorContractDocuments: vi.fn(),
  listTechnologyVendorUsageStats: vi.fn(),
  listHandoversByRecipient: vi.fn(),
  listHandoverSupplyItems: vi.fn(),
  listHandoverReturnDecisionHistory: vi.fn(),
  recordActivity: vi.fn(),
  dismissUserDashboardAlerts: vi.fn(),
  restoreUserDashboardAlerts: vi.fn(),
  revokeSoftwareLicenseAssignment: vi.fn(),
  runInventoryTransaction: vi.fn(),
  runSoftwareLicenseTransaction: vi.fn(),
  saveUserMenuPreference: vi.fn(),
  saveUserNotificationPreferences: vi.fn(),
  storagePut: vi.fn(),
  transitionHandoverStatus: vi.fn(),
  updateUserActiveStatus: vi.fn(),
  updateUserDirectoryProfile: vi.fn(),
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
  updateSoftwareLicense: vi.fn(),
  updateLicenseType: vi.fn(),
  updateSoftwareLicenseActivationAccount: vi.fn(),
  updateSoftwareLicenseActivationAccountLimits: vi.fn(),
  updateSoftwareLicenseKey: vi.fn(),
  updateTechnologyService: vi.fn(),
  updateTechnologyVendor: vi.fn(),
  updateTechnologyVendorContract: vi.fn(),
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
  createSoftwareLicense: mocks.createSoftwareLicense,
  createLicenseType: mocks.createLicenseType,
  createSoftwareLicenseActivationAccount: mocks.createSoftwareLicenseActivationAccount,
  createSoftwareLicenseCredentialAccessLog: mocks.createSoftwareLicenseCredentialAccessLog,
  createSoftwareLicenseDocument: mocks.createSoftwareLicenseDocument,
  createSoftwareLicenseAssignment: mocks.createSoftwareLicenseAssignment,
  createSoftwareLicenseKey: mocks.createSoftwareLicenseKey,
  createTechnologyService: mocks.createTechnologyService,
  createTechnologyVendor: mocks.createTechnologyVendor,
  createTechnologyVendorContract: mocks.createTechnologyVendorContract,
  createTechnologyVendorContractDocument: mocks.createTechnologyVendorContractDocument,
  createVendor: mocks.createVendor,
  createBrand: mocks.createBrand,
  createVendorDocument: mocks.createVendorDocument,
  deleteVendorDocument: mocks.deleteVendorDocument,
  deleteSoftwareLicenseDocument: mocks.deleteSoftwareLicenseDocument,
  deleteLicenseType: mocks.deleteLicenseType,
  deleteTechnologyVendorContractDocument: mocks.deleteTechnologyVendorContractDocument,
  createHandover: mocks.createHandover,
  createHandoverSupplyItem: mocks.createHandoverSupplyItem,
  createInventoryMovement: mocks.createInventoryMovement,
  createMaintenanceTicket: vi.fn(),
  getActiveDepartmentById: mocks.getActiveDepartmentById,
  getAssetById: mocks.getAssetById,
  getInventorySupplyById: mocks.getInventorySupplyById,
  getSoftwareLicenseById: mocks.getSoftwareLicenseById,
  getSoftwareLicenseActivationAccountById: mocks.getSoftwareLicenseActivationAccountById,
  getSoftwareLicenseAssignmentById: mocks.getSoftwareLicenseAssignmentById,
  getSoftwareLicenseDocumentById: mocks.getSoftwareLicenseDocumentById,
  getSoftwareLicenseKeyById: mocks.getSoftwareLicenseKeyById,
  getLicenseTypeById: mocks.getLicenseTypeById,
  getVendorById: mocks.getVendorById,
  getVendorByName: mocks.getVendorByName,
  getVendorDocumentById: mocks.getVendorDocumentById,
  getTechnologyVendorById: mocks.getTechnologyVendorById,
  getTechnologyVendorContractById: mocks.getTechnologyVendorContractById,
  getTechnologyVendorContractDocumentById: mocks.getTechnologyVendorContractDocumentById,
  getBrandById: mocks.getBrandById,
  getBrandByName: mocks.getBrandByName,
  getCompany: mocks.getCompany,
  getDepartmentById: mocks.getDepartmentById,
  getDepartmentByCode: mocks.getDepartmentByCode,
  getDivisionByCode: mocks.getDivisionByCode,
  getDivisionById: mocks.getDivisionById,
  getHandoverById: mocks.getHandoverById,
  getNextHandoverSequence: mocks.getNextHandoverSequence,
  getNextRecoveryCertificateSequence: mocks.getNextRecoveryCertificateSequence,
  getNextRetirementCertificateSequence: vi.fn().mockResolvedValue(1),
  getUserByEmployeeCode: mocks.getUserByEmployeeCode,
  getUserMenuPreference: mocks.getUserMenuPreference,
  getUserNotificationPreferences: mocks.getUserNotificationPreferences,
  listUserDashboardAlertHistory: mocks.listUserDashboardAlertHistory,
  listUserDashboardAlertStateIds: mocks.listUserDashboardAlertStateIds,
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
  listActiveSoftwareLicenseAssignmentsForHandover: mocks.listActiveSoftwareLicenseAssignmentsForHandover,
  listSoftwareLicenses: mocks.listSoftwareLicenses,
  listLicenseTypes: mocks.listLicenseTypes,
  countSoftwareLicensesByTypeId: mocks.countSoftwareLicensesByTypeId,
  listSoftwareLicenseActivationAccounts: mocks.listSoftwareLicenseActivationAccounts,
  listSoftwareLicenseAssignments: mocks.listSoftwareLicenseAssignments,
  listSoftwareLicenseCredentialAccessLogs: mocks.listSoftwareLicenseCredentialAccessLogs,
  listSoftwareLicenseDocuments: mocks.listSoftwareLicenseDocuments,
  listSoftwareLicenseKeys: mocks.listSoftwareLicenseKeys,
  listTechnologyServices: mocks.listTechnologyServices,
  listTechnologyVendors: mocks.listTechnologyVendors,
  listTechnologyVendorContracts: mocks.listTechnologyVendorContracts,
  listTechnologyVendorContractAlerts: mocks.listTechnologyVendorContractAlerts,
  listTechnologyVendorContractDocuments: mocks.listTechnologyVendorContractDocuments,
  listTechnologyVendorUsageStats: mocks.listTechnologyVendorUsageStats,
  listHandovers: vi.fn(),
  listHandoversByRecipient: mocks.listHandoversByRecipient,
  listHandoverSupplyItems: mocks.listHandoverSupplyItems,
  listHandoverReturnDecisionHistory: mocks.listHandoverReturnDecisionHistory,
  listHelpGuides: vi.fn(),
  listMaintenanceTickets: vi.fn(),
  listUsers: vi.fn(),
  recordActivity: mocks.recordActivity,
  dismissUserDashboardAlerts: mocks.dismissUserDashboardAlerts,
  restoreUserDashboardAlerts: mocks.restoreUserDashboardAlerts,
  revokeSoftwareLicenseAssignment: mocks.revokeSoftwareLicenseAssignment,
  runInventoryTransaction: mocks.runInventoryTransaction,
  runSoftwareLicenseTransaction: mocks.runSoftwareLicenseTransaction,
  saveUserMenuPreference: mocks.saveUserMenuPreference,
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
  updateUserDirectoryProfile: mocks.updateUserDirectoryProfile,
  updateUserRole: mocks.updateUserRole,
  updateUserDepartment: mocks.updateUserDepartment,
  updateUserDivision: mocks.updateUserDivision,
  updateDepartment: mocks.updateDepartment,
  updateDivision: mocks.updateDivision,
  updateVendor: mocks.updateVendor,
  updateBrand: mocks.updateBrand,
  updateSoftwareLicense: mocks.updateSoftwareLicense,
  updateLicenseType: mocks.updateLicenseType,
  updateSoftwareLicenseActivationAccount: mocks.updateSoftwareLicenseActivationAccount,
  updateSoftwareLicenseActivationAccountLimits: mocks.updateSoftwareLicenseActivationAccountLimits,
  updateSoftwareLicenseKey: mocks.updateSoftwareLicenseKey,
  updateTechnologyService: mocks.updateTechnologyService,
  updateTechnologyVendor: mocks.updateTechnologyVendor,
  updateTechnologyVendorContract: mocks.updateTechnologyVendorContract,
}));

vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));

import { appRouter } from "./routers";
import { reorderMenuItems } from "../client/src/lib/menuOrder";

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

const currentSidebarMenuOrder = ["Tổng quan", "Danh mục tài sản", "Phân loại tài sản", "Nhà cung cấp & Hãng", "Hợp đồng & Hóa đơn", "Bản quyền & Dịch vụ", "Phụ kiện", "Bàn giao & Cấp phát", "Bảo hành & Sửa chữa", "Phòng Ban & Bộ Phận", "Quản lý nhân viên", "Khấu hao & Thanh lý", "Kiểm kê", "Báo Cáo"];

describe("employee administration", () => {
  it("lưu được thứ tự kéo-thả gồm toàn bộ 14 menu hiện hành", async () => {
    let persistedMenuOrder: string[] | null = null;
    mocks.saveUserMenuPreference.mockImplementation(async (_userId, menuOrder: string[]) => { persistedMenuOrder = [...menuOrder]; });
    mocks.getUserMenuPreference.mockImplementation(async () => persistedMenuOrder ? { menuOrder: persistedMenuOrder } : undefined);
    const caller = appRouter.createCaller(adminContext);
    const reordered = reorderMenuItems(currentSidebarMenuOrder, 13, 5);

    await expect(caller.menuPreferences.save({ menuOrder: reordered })).resolves.toEqual({ menuOrder: reordered });
    expect(mocks.saveUserMenuPreference).toHaveBeenCalledWith(adminContext.user.id, reordered);
    await expect(caller.menuPreferences.get()).resolves.toEqual({ menuOrder: reordered });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCompany.mockResolvedValue(null);
    mocks.getAssetById.mockResolvedValue({ id: 50, assetCode: "TS-00050", isArchived: false, status: "available" });
    mocks.getUserNotificationPreferences.mockResolvedValue(null);
    mocks.saveUserNotificationPreferences.mockResolvedValue(undefined);
    mocks.listDepartments.mockResolvedValue([{ id: 12, code: "HCNS", name: "Hành chính - Nhân sự", isActive: true }]);
    mocks.getHandoverById.mockResolvedValue({ id: 99, referenceCode: "BG-2026-001", assetCode: "TS-00050", recipientName: "Nguyễn Văn A", recipientUserId: 7, recipientDepartmentId: 12, recipientSignatureUrl: "https://storage.example/signature.png" });
    mocks.getNextHandoverSequence.mockResolvedValue(1);
    mocks.getNextRecoveryCertificateSequence.mockResolvedValue(1);
    mocks.listHandoverReturnDecisionHistory.mockResolvedValue([]);
    mocks.listActiveSoftwareLicenseAssignmentsForHandover.mockResolvedValue([]);
    mocks.createHandover.mockResolvedValue(99);
    mocks.runInventoryTransaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({ transaction: true }));
    mocks.runSoftwareLicenseTransaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({ softwareLicenseTransaction: true }));
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
    mocks.updateUserDirectoryProfile.mockResolvedValue(undefined);
    mocks.updateUserRole.mockResolvedValue(undefined);
    mocks.getUserByEmployeeCode.mockResolvedValue(undefined);
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
    mocks.listSoftwareLicenseDocuments.mockResolvedValue([]);
    mocks.listSoftwareLicenses.mockResolvedValue([]);
    mocks.listSoftwareLicenseAssignments.mockResolvedValue([]);
    mocks.createSoftwareLicenseDocument.mockResolvedValue(120);
    mocks.deleteSoftwareLicenseDocument.mockResolvedValue(undefined);
    mocks.getSoftwareLicenseDocumentById.mockResolvedValue({ id: 120, softwareLicenseId: 71, fileName: "gia-han.pdf" });
    mocks.listLicenseTypes.mockResolvedValue([{ id: 9, name: "Đồ họa / Thiết kế", isActive: true }]);
    mocks.getLicenseTypeById.mockResolvedValue({ id: 9, name: "Đồ họa / Thiết kế", isActive: true });
    mocks.createLicenseType.mockResolvedValue(9);
    mocks.updateLicenseType.mockResolvedValue(undefined);
    mocks.deleteLicenseType.mockResolvedValue(undefined);
    mocks.countSoftwareLicensesByTypeId.mockResolvedValue(0);
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
    await expect(caller.handovers.resolveReturnRequest({ id: 99, decision: "approved", conditionIn: "Tốt", resolution: null, conditionPhoto: { fileName: "tinh-trang.png", contentType: "image/png", dataUrl: "data:image/png;base64,UE5H" } })).resolves.toMatchObject({ success: true, returnedAccessoryCount: 0, outstandingAccessoryCount: 0, recoveryCertificateNumber: expect.stringMatching(/^TH-\d{6}-001$/) });
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^handovers\/99\/return-conditions\//), expect.any(Buffer), "image/png");
    expect(mocks.transitionHandoverStatus).toHaveBeenCalledWith(99, "returned", expect.objectContaining({ returnRequestStatus: "approved", returnRequestResolvedByUserId: 1, conditionIn: "Tốt", returnConditionPhotoUrl: "/manus-storage/handovers/99/return-conditions/tinh-trang.png" }), expect.anything());
  });

  it("returns handover accessories to stock exactly once when the asset is recovered", async () => {
    mocks.getHandoverById.mockResolvedValue({ id: 99, referenceCode: "BG-2026-001", assetCode: "TS-00099", recipientName: "Nguyễn Văn A", recipientUserId: 8, recipientDepartmentId: 12, status: "active", returnRequestStatus: "pending" });
    mocks.listHandoverSupplyItems.mockResolvedValue([{ id: 501, handoverId: 99, supplyId: 81, supplyCode: "PK-CHUOT", supplyName: "Chuột không dây", unit: "Cái", issuedQuantity: "2", returnedQuantity: "0" }]);
    mocks.getInventorySupplyById.mockResolvedValue({ id: 81, code: "PK-CHUOT", name: "Chuột không dây", unit: "Cái", stockQuantity: "3", isActive: true });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.resolveReturnRequest({ id: 99, decision: "approved", conditionIn: "Tốt", resolution: "Đã thu hồi đủ phụ kiện", conditionPhoto: null })).resolves.toMatchObject({ success: true, returnedAccessoryCount: 1, outstandingAccessoryCount: 0, recoveryCertificateNumber: expect.stringMatching(/^TH-\d{6}-001$/) });
    expect(mocks.updateInventorySupply).toHaveBeenCalledWith(81, { stockQuantity: "5" }, expect.anything());
    expect(mocks.updateHandoverSupplyItem).toHaveBeenCalledWith(501, { returnedQuantity: "2" }, expect.anything());
    expect(mocks.createInventoryMovement).toHaveBeenCalledWith(expect.objectContaining({ handoverId: 99, movementType: "return", quantity: "2", quantityBefore: "3", quantityAfter: "5" }), expect.anything());
  });

  it("returns only the confirmed accessory quantity and reports items still outstanding", async () => {
    mocks.getHandoverById.mockResolvedValue({ id: 99, referenceCode: "BG-2026-001", assetCode: "TS-00099", recipientName: "Nguyễn Văn A", recipientUserId: 8, recipientDepartmentId: 12, status: "active", returnRequestStatus: "pending" });
    mocks.listHandoverSupplyItems.mockResolvedValue([{ id: 501, handoverId: 99, supplyId: 81, supplyCode: "PK-CHUOT", supplyName: "Chuột không dây", unit: "Cái", issuedQuantity: "3", returnedQuantity: "0" }]);
    mocks.getInventorySupplyById.mockResolvedValue({ id: 81, code: "PK-CHUOT", name: "Chuột không dây", unit: "Cái", stockQuantity: "4", isActive: true });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.resolveReturnRequest({ id: 99, decision: "approved", conditionIn: "Tốt", resolution: null, conditionPhoto: null, returnedSupplyItems: [{ handoverSupplyItemId: 501, quantity: 1 }] })).resolves.toMatchObject({ success: true, returnedAccessoryCount: 1, outstandingAccessoryCount: 1, recoveryCertificateNumber: expect.stringMatching(/^TH-\d{6}-001$/) });
    expect(mocks.updateInventorySupply).toHaveBeenCalledWith(81, { stockQuantity: "5" }, expect.anything());
    expect(mocks.updateHandoverSupplyItem).toHaveBeenCalledWith(501, { returnedQuantity: "1" }, expect.anything());
    expect(mocks.createInventoryMovement).toHaveBeenCalledWith(expect.objectContaining({ movementType: "return", quantity: "1", quantityBefore: "4", quantityAfter: "5" }), expect.anything());
  });

  it("rejects fractional quantities when an administrator records returned handover accessories", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.resolveReturnRequest({ id: 99, decision: "approved", conditionIn: "Tốt", resolution: null, conditionPhoto: null, returnedSupplyItems: [{ handoverSupplyItemId: 501, quantity: 0.99 }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("issues and persists a unique recovery certificate number by year and month", async () => {
    mocks.getHandoverById.mockResolvedValue({ id: 99, referenceCode: "BG-2026-001", assetCode: "TS-00099", recipientName: "Nguyễn Văn A", recipientUserId: 8, recipientDepartmentId: 12, status: "active", returnRequestStatus: "pending", returnedAt: new Date("2026-08-14T03:00:00.000Z") });
    mocks.getNextRecoveryCertificateSequence.mockResolvedValue(7);
    mocks.listHandoverSupplyItems.mockResolvedValue([]);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.resolveReturnRequest({ id: 99, decision: "approved", conditionIn: "Tốt", resolution: null, conditionPhoto: null })).resolves.toMatchObject({ success: true, recoveryCertificateNumber: "TH-202608-007" });
    expect(mocks.getNextRecoveryCertificateSequence).toHaveBeenCalledWith(2026, 8, expect.anything());
    expect(mocks.transitionHandoverStatus).toHaveBeenCalledWith(99, "returned", expect.objectContaining({ recoveryCertificateNumber: "TH-202608-007", recoveryCertificateYear: 2026, recoveryCertificateMonth: 8, recoveryCertificateSequence: 7 }), expect.anything());
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

  it("allows changing only the brand casing without a false duplicate error", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.brands.update({ id: 51, name: "DELL" })).resolves.toEqual({ success: true });
    expect(mocks.getBrandByName).not.toHaveBeenCalled();
    expect(mocks.updateBrand).toHaveBeenCalledWith(51, { name: "DELL" });
  });

  it("rejects a brand name that belongs to another brand", async () => {
    mocks.getBrandByName.mockResolvedValueOnce({ id: 52, name: "Lenovo" });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.brands.update({ id: 51, name: "Lenovo" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Tên Hãng đã tồn tại.",
    });
    expect(mocks.updateBrand).not.toHaveBeenCalled();
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

    await expect(caller.employees.updateActiveStatus({ id: 2, isActive: false })).resolves.toEqual({ success: true, revokedLicenseCount: 0, revokedLicenseNames: [] });
    expect(mocks.runSoftwareLicenseTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateUserActiveStatus).toHaveBeenCalledWith(2, false, expect.objectContaining({ softwareLicenseTransaction: true }));
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "user", entityId: 2, action: "deactivated" }), expect.objectContaining({ softwareLicenseTransaction: true }));
  });

  it("revokes active licenses and returns private keys when an employee leaves", async () => {
    mocks.listSoftwareLicenses.mockResolvedValue([{ id: 71, productName: "Adobe Photoshop" }]);
    mocks.listSoftwareLicenseAssignments.mockResolvedValue([{ id: 91, softwareLicenseId: 71, userId: 2, status: "active", softwareLicenseKeyId: 81 }]);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.activeLicenseAssignments({ userId: 2 })).resolves.toEqual([{ id: 91, softwareLicenseId: 71, productName: "Adobe Photoshop", assignmentMethod: undefined, deviceName: undefined, assetId: undefined }]);
    await expect(caller.employees.updateActiveStatus({ id: 2, isActive: false })).resolves.toEqual({ success: true, revokedLicenseCount: 1, revokedLicenseNames: ["Adobe Photoshop"] });

    expect(mocks.revokeSoftwareLicenseAssignment).toHaveBeenCalledWith(91, expect.objectContaining({ softwareLicenseTransaction: true }));
    expect(mocks.updateSoftwareLicenseKey).toHaveBeenCalledWith(81, { status: "available" }, expect.objectContaining({ softwareLicenseTransaction: true }));
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "softwareLicenseAssignment", entityId: 91, action: "revoked_with_employee_deactivation" }), expect.objectContaining({ softwareLicenseTransaction: true }));
  });

  it("prevents an administrator from locking the active account in use", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.updateActiveStatus({ id: 1, isActive: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateUserActiveStatus).not.toHaveBeenCalled();
  });

  it("updates the directory profile with a normalized employee code and job title", async () => {
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.updateDirectoryProfile({ id: 2, employeeCode: " nv-0002 ", jobTitle: " Chuyên viên CNTT " })).resolves.toEqual({ success: true });
    expect(mocks.getUserByEmployeeCode).toHaveBeenCalledWith("NV-0002");
    expect(mocks.updateUserDirectoryProfile).toHaveBeenCalledWith(2, { employeeCode: "NV-0002", jobTitle: "Chuyên viên CNTT" });
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "user", entityId: 2, action: "directory_profile_updated" }));
  });

  it("rejects an employee code that belongs to another employee", async () => {
    mocks.getUserByEmployeeCode.mockResolvedValue({ id: 7, employeeCode: "NV-0007" });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.employees.updateDirectoryProfile({ id: 2, employeeCode: "nv-0007", jobTitle: "Chuyên viên" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.updateUserDirectoryProfile).not.toHaveBeenCalled();
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

    await expect(caller.handovers.updateStatus({ id: 99, status: "returned", recipientSignatureUrl: null, handoverSignatureUrl: null })).resolves.toMatchObject({ success: true, returnedAccessoryCount: 0, outstandingAccessoryCount: 0, recoveryCertificateNumber: expect.stringMatching(/^TH-\d{6}-001$/) });
    expect(mocks.transitionHandoverStatus).toHaveBeenCalledWith(99, "returned", expect.objectContaining({ recipientSignatureUrl: null, handoverSignatureUrl: null, recoveryCertificateNumber: expect.stringMatching(/^TH-\d{6}-001$/), recoveryCertificateYear: 2026, recoveryCertificateMonth: 8, recoveryCertificateSequence: 1 }), expect.anything());
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "handover", entityId: 99, action: "returned" }));
  });

  it("lists active software allocations and returns linked licenses with the handed-over asset", async () => {
    mocks.listSoftwareLicenses.mockResolvedValue([{ id: 71, productName: "Windows 11 Pro", licenseCode: "WIN-001" }]);
    mocks.listSoftwareLicenseAssignments.mockResolvedValue([
      { id: 301, softwareLicenseId: 71, assetId: 50, userId: 7, assignmentMethod: "product_key", status: "active" },
      { id: 302, softwareLicenseId: 71, assetId: 51, userId: 7, assignmentMethod: "seat", status: "active" },
      { id: 303, softwareLicenseId: 71, assetId: 50, userId: 7, assignmentMethod: "seat", status: "revoked" },
    ]);
    mocks.getHandoverById.mockResolvedValue({ id: 99, referenceCode: "BG-2026-001", assetId: 50, assetCode: "TS-00050", recipientName: "Nguyễn Văn A", recipientUserId: 7, recipientDepartmentId: 12, recipientSignatureUrl: "https://storage.example/signature.png" });
    mocks.listActiveSoftwareLicenseAssignmentsForHandover.mockResolvedValue([{ id: 301, softwareLicenseId: 71, softwareLicenseKeyId: 401, productName: "Windows 11 Pro", licenseCode: "WIN-001" }]);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.handovers.licenseAllocations()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: 301, assetId: 50, userId: 7, productName: "Windows 11 Pro", licenseCode: "WIN-001", returnsWithHandoverAsset: true }), expect.objectContaining({ id: 302, assetId: 51, userId: 7, returnsWithHandoverAsset: true })]));
    await expect(caller.handovers.updateStatus({ id: 99, status: "returned", recipientSignatureUrl: null, handoverSignatureUrl: null })).resolves.toMatchObject({ success: true, returnedLicenseCount: 1, returnedLicenseNames: ["Windows 11 Pro"] });

    expect(mocks.listActiveSoftwareLicenseAssignmentsForHandover).toHaveBeenCalledWith(50, 7, expect.anything());
    expect(mocks.revokeSoftwareLicenseAssignment).toHaveBeenCalledWith(301, expect.anything());
    expect(mocks.updateSoftwareLicenseKey).toHaveBeenCalledWith(401, { status: "available" }, expect.anything());
    expect(mocks.recordActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: "softwareLicenseAssignment", entityId: 301, action: "revoked_with_handover" }), expect.anything());
  });

  it("returns defaults and saves notification preferences for the signed-in user", async () => {
    const caller = appRouter.createCaller(userContext);

    await expect(caller.notifications.preferences()).resolves.toEqual({ maintenanceEnabled: true, handoverEnabled: true, returnRequestEnabled: true });
    await expect(caller.notifications.savePreferences({ maintenanceEnabled: false, handoverEnabled: true, returnRequestEnabled: false })).resolves.toEqual({ success: true });
    expect(mocks.saveUserNotificationPreferences).toHaveBeenCalledWith(8, { maintenanceEnabled: false, handoverEnabled: true, returnRequestEnabled: false });
  });

  it("stores dashboard alert review state per signed-in account", async () => {
    const dismissedAt = new Date("2026-08-25T01:00:00.000Z");
    mocks.listUserDashboardAlertStateIds.mockResolvedValue(["audit-40"]);
    mocks.listUserDashboardAlertHistory.mockResolvedValue([{ alertId: "audit-40", dismissedAt }]);
    const caller = appRouter.createCaller(userContext);

    await expect(caller.notifications.dashboardAlertStates()).resolves.toEqual({ alertIds: ["audit-40"] });
    await expect(caller.notifications.dashboardAlertHistory({ limit: 20 })).resolves.toEqual([{ alertId: "audit-40", dismissedAt }]);
    await expect(caller.notifications.dismissDashboardAlerts({ alertIds: ["audit-40", "supply-12"] })).resolves.toEqual({ success: true });
    await expect(caller.notifications.restoreDashboardAlerts({ alertIds: ["audit-40"] })).resolves.toEqual({ success: true });

    expect(mocks.listUserDashboardAlertStateIds).toHaveBeenCalledWith(8);
    expect(mocks.listUserDashboardAlertHistory).toHaveBeenCalledWith(8, 20);
    expect(mocks.dismissUserDashboardAlerts).toHaveBeenCalledWith(8, ["audit-40", "supply-12"]);
    expect(mocks.restoreUserDashboardAlerts).toHaveBeenCalledWith(8, ["audit-40"]);
  });

  it("manages software licenses, seat assignments and technology services", async () => {
    mocks.createSoftwareLicense.mockResolvedValue(71);
    mocks.getSoftwareLicenseById.mockResolvedValue({ id: 71, productName: "Microsoft 365", purchasedQuantity: 2 });
    mocks.listSoftwareLicenseAssignments.mockResolvedValue([]);
    mocks.createSoftwareLicenseAssignment.mockResolvedValue(91);
    mocks.createTechnologyService.mockResolvedValue(41);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.softwareLicenses.create({ licenseCode: "LIC-001", productName: "Microsoft 365", publisher: "Microsoft", edition: null, licenseModel: "subscription", licenseKey: null, purchasedQuantity: 2, vendorId: null, technologyVendorId: 51, technologyVendorContractId: 61, purchaseContractId: null, purchaseInvoiceId: null, purchasedAt: null, expiresAt: null, autoRenew: true, status: "active", note: null })).resolves.toEqual({ id: 71 });
    await expect(caller.softwareLicenses.assign({ softwareLicenseId: 71, assetId: null, userId: null, assignedToName: "Máy Kế toán", deviceName: "PC-01", assignedAt: new Date("2026-08-25"), note: null })).resolves.toEqual({ id: 91 });
    await expect(caller.technologyServices.create({ serviceCode: "DOM-001", serviceType: "domain", name: "Tên miền công ty", vendorId: null, technologyVendorId: 51, technologyVendorContractId: 61, branchId: null, accountReference: null, billingReference: null, domainName: "example.vn", serviceEndpoint: null, startedAt: null, renewalAt: null, expiresAt: null, autoRenew: true, billingCycle: "annual", costAmount: 300000, status: "active", note: null })).resolves.toEqual({ id: 41 });

    expect(mocks.createSoftwareLicense).toHaveBeenCalledWith(expect.objectContaining({ licenseCode: "LIC-001", createdByUserId: 1 }));
    expect(mocks.createSoftwareLicense).toHaveBeenCalledWith(expect.objectContaining({ technologyVendorId: 51, technologyVendorContractId: 61 }));
    expect(mocks.createSoftwareLicenseAssignment).toHaveBeenCalledWith(expect.objectContaining({ softwareLicenseId: 71, status: "active", assignedToName: "Máy Kế toán" }));
    expect(mocks.createTechnologyService).toHaveBeenCalledWith(expect.objectContaining({ serviceCode: "DOM-001", costAmount: "300000", createdByUserId: 1 }));
    expect(mocks.createTechnologyService).toHaveBeenCalledWith(expect.objectContaining({ technologyVendorId: 51, technologyVendorContractId: 61 }));
  });

  it("manages license types and records an invoice number for each license purchase", async () => {
    mocks.createSoftwareLicense.mockResolvedValue(72);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.licenseTypes.list()).resolves.toEqual([{ id: 9, name: "Đồ họa / Thiết kế", isActive: true }]);
    await expect(caller.licenseTypes.create({ name: "Văn phòng", note: null })).resolves.toEqual({ id: 9 });
    await expect(caller.licenseTypes.update({ id: 9, name: "Đồ họa", isActive: true, note: null })).resolves.toEqual({ success: true });
    await expect(caller.softwareLicenses.create({ productName: "Adobe Photoshop", licenseTypeId: 9, purchaseInvoiceNumber: "HD-2026-004", publisher: "Adobe", edition: null, licenseModel: "subscription", licenseKey: null, purchasedQuantity: 5, vendorId: null, technologyVendorId: null, technologyVendorContractId: null, purchaseContractId: null, purchaseInvoiceId: null, purchasedAt: null, expiresAt: null, autoRenew: false, status: "active", note: null })).resolves.toEqual({ id: 72 });

    expect(mocks.createSoftwareLicense).toHaveBeenCalledWith(expect.objectContaining({ productName: "Adobe Photoshop", licenseTypeId: 9, purchaseInvoiceNumber: "HD-2026-004", licenseCode: expect.stringMatching(/^LIC-/) }));
    expect(mocks.updateLicenseType).toHaveBeenCalledWith(9, expect.objectContaining({ name: "Đồ họa", isActive: true }));
  });

  it("manages encrypted individual keys and binds an available key during assignment", async () => {
    process.env.JWT_SECRET = "router-license-test-secret";
    mocks.getSoftwareLicenseById.mockResolvedValue({ id: 72, productName: "Windows 11 Pro", purchasedQuantity: 2, activationMode: "product_key", sharedAccountMaxUsers: 1 });
    mocks.listSoftwareLicenseKeys.mockResolvedValue([]);
    mocks.createSoftwareLicenseKey.mockResolvedValue(301);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.softwareLicenses.addKey({ softwareLicenseId: 72, key: "AAAA-BBBB-CCCC-1234", note: null })).resolves.toEqual({ id: 301 });
    const createdKey = mocks.createSoftwareLicenseKey.mock.calls[0]?.[0];
    expect(createdKey).toMatchObject({ softwareLicenseId: 72, maskedKey: expect.stringMatching(/1234$/), status: "available" });
    expect(createdKey.encryptedKey).not.toContain("AAAA-BBBB-CCCC-1234");

    mocks.listSoftwareLicenseKeys.mockResolvedValue([{ id: 301, softwareLicenseId: 72, status: "available", maskedKey: createdKey.maskedKey }]);
    mocks.listSoftwareLicenseAssignments.mockResolvedValue([]);
    mocks.createSoftwareLicenseAssignment.mockResolvedValue(901);
    await expect(caller.softwareLicenses.assign({ softwareLicenseId: 72, assignmentMethod: "product_key", softwareLicenseKeyId: 301, assetId: null, userId: null, assignedToName: "Máy Kế toán", deviceName: "PC-01", assignedAt: new Date("2026-08-25"), note: null })).resolves.toEqual({ id: 901 });

    expect(mocks.createSoftwareLicenseAssignment).toHaveBeenCalledWith(expect.objectContaining({ assignmentMethod: "product_key", softwareLicenseKeyId: 301 }));
    expect(mocks.updateSoftwareLicenseKey).toHaveBeenCalledWith(301, { status: "assigned" });
  });

  it("limits shared-account allocation by the Admin-configured maximum", async () => {
    process.env.JWT_SECRET = "router-license-test-secret";
    mocks.getSoftwareLicenseById.mockResolvedValue({ id: 73, productName: "Ứng dụng dùng chung", purchasedQuantity: 1, activationMode: "shared_account", sharedAccountMaxUsers: 3 });
    mocks.listSoftwareLicenseActivationAccounts.mockResolvedValue([]);
    mocks.createSoftwareLicenseActivationAccount.mockResolvedValue(401);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.softwareLicenses.createActivationAccount({ softwareLicenseId: 73, loginEmail: "nhanviena@company.com", password: "Password!2026", note: null })).resolves.toEqual({ id: 401 });
    const createdAccount = mocks.createSoftwareLicenseActivationAccount.mock.calls[0]?.[0];
    expect(createdAccount).toMatchObject({ softwareLicenseId: 73, loginEmail: "nhanviena@company.com", maxUsers: 3, status: "active" });
    expect(createdAccount.encryptedPassword).not.toContain("Password!2026");

    mocks.getSoftwareLicenseActivationAccountById.mockResolvedValue({ id: 401, softwareLicenseId: 73, loginEmail: "nhanviena@company.com", maxUsers: 3, status: "active" });
    mocks.listSoftwareLicenseAssignments.mockResolvedValue([]);
    mocks.createSoftwareLicenseAssignment.mockResolvedValue(902);
    await expect(caller.softwareLicenses.assign({ softwareLicenseId: 73, assignmentMethod: "shared_account", softwareLicenseActivationAccountId: 401, assetId: null, userId: null, assignedToName: "Nhân viên B", deviceName: "PC-02", assignedAt: new Date("2026-08-25"), note: null })).resolves.toEqual({ id: 902 });
    expect(mocks.createSoftwareLicenseAssignment).toHaveBeenCalledWith(expect.objectContaining({ assignmentMethod: "shared_account", softwareLicenseActivationAccountId: 401 }));

    mocks.listSoftwareLicenseAssignments.mockResolvedValue([{ id: 1, status: "active", softwareLicenseActivationAccountId: 401 }, { id: 2, status: "active", softwareLicenseActivationAccountId: 401 }, { id: 3, status: "active", softwareLicenseActivationAccountId: 401 }]);
    await expect(caller.softwareLicenses.assign({ softwareLicenseId: 73, assignmentMethod: "shared_account", softwareLicenseActivationAccountId: 401, assetId: null, userId: null, assignedToName: "Nhân viên E", deviceName: "PC-05", assignedAt: new Date("2026-08-25"), note: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("manages technology vendors and contracts separately from asset vendors", async () => {
    mocks.createTechnologyVendor.mockResolvedValue(51);
    mocks.getTechnologyVendorById.mockResolvedValue({ id: 51, name: "Nhà cung cấp Cloud" });
    mocks.createTechnologyVendorContract.mockResolvedValue(61);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.technologyVendors.create({ name: "Nhà cung cấp Cloud", contactName: "Minh", phone: null, email: "minh@example.com", website: null, address: null, isActive: true, note: null })).resolves.toEqual({ id: 51 });
    await expect(caller.technologyVendorContracts.create({ contractCode: "HDCN-001", title: "Dịch vụ hạ tầng Cloud", technologyVendorId: 51, contractType: "service", signedAt: null, effectiveFrom: null, effectiveTo: null, autoRenew: true, status: "active", note: null })).resolves.toEqual({ id: 61 });

    expect(mocks.createTechnologyVendor).toHaveBeenCalledWith(expect.objectContaining({ name: "Nhà cung cấp Cloud", isActive: true }));
    expect(mocks.createTechnologyVendorContract).toHaveBeenCalledWith(expect.objectContaining({ contractCode: "HDCN-001", technologyVendorId: 51, contractType: "service" }));
  });

  it("returns technology vendor usage statistics and expiring contract alerts", async () => {
    mocks.listTechnologyVendorUsageStats.mockResolvedValue([{ id: 51, name: "Nhà cung cấp Cloud", activeLicenseCount: 2, activeServiceCount: 1, contractCount: 1 }]);
    mocks.listTechnologyVendorContractAlerts.mockResolvedValue([{ id: 61, contractCode: "HDCN-001", title: "Dịch vụ Cloud", technologyVendorId: 51, status: "expired" }]);
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.technologyVendors.usageStats()).resolves.toHaveLength(1);
    await expect(caller.technologyVendorContracts.expiringAlerts({ daysAhead: 30 })).resolves.toHaveLength(1);
    expect(mocks.listTechnologyVendorContractAlerts).toHaveBeenCalledWith(30);
  });

  it("stores contract and renewal documents for an existing software license", async () => {
    mocks.getSoftwareLicenseById.mockResolvedValue({ id: 71, licenseCode: "LIC-001", productName: "Microsoft 365", purchasedQuantity: 2 });
    mocks.storagePut.mockResolvedValue({ key: "software-licenses/71/documents/gia-han.pdf", url: "/manus-storage/software-licenses/71/documents/gia-han.pdf" });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.softwareLicenses.documents({ softwareLicenseId: 71 })).resolves.toEqual([]);
    await expect(caller.softwareLicenses.uploadDocument({ softwareLicenseId: 71, documentType: "renewal", fileName: "gia-han.pdf", contentType: "application/pdf", dataUrl: "data:application/pdf;base64,SGVsbG8=" })).resolves.toMatchObject({ id: 120, fileName: "gia-han.pdf", fileSize: 5 });
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^software-licenses\/71\/documents\//), expect.any(Buffer), "application/pdf");
    expect(mocks.createSoftwareLicenseDocument).toHaveBeenCalledWith(expect.objectContaining({ softwareLicenseId: 71, documentType: "renewal", fileName: "gia-han.pdf", fileSize: 5 }));
    await expect(caller.softwareLicenses.removeDocument({ id: 120 })).resolves.toEqual({ success: true });
    expect(mocks.deleteSoftwareLicenseDocument).toHaveBeenCalledWith(120);
  });

  it("stores PDF and image documents for an existing technology vendor contract", async () => {
    mocks.getTechnologyVendorContractById.mockResolvedValue({ id: 61, contractCode: "HDCN-001", title: "Dịch vụ Cloud" });
    mocks.listTechnologyVendorContractDocuments.mockResolvedValue([]);
    mocks.createTechnologyVendorContractDocument.mockResolvedValue(221);
    mocks.getTechnologyVendorContractDocumentById.mockResolvedValue({ id: 221, technologyVendorContractId: 61, fileName: "hop-dong.pdf" });
    mocks.deleteTechnologyVendorContractDocument.mockResolvedValue(undefined);
    mocks.storagePut.mockResolvedValue({ key: "technology-vendor-contracts/61/documents/hop-dong.pdf", url: "/manus-storage/technology-vendor-contracts/61/documents/hop-dong.pdf" });
    const caller = appRouter.createCaller(adminContext);

    await expect(caller.technologyVendorContracts.documents({ technologyVendorContractId: 61 })).resolves.toEqual([]);
    await expect(caller.technologyVendorContracts.uploadDocument({ technologyVendorContractId: 61, fileName: "hop-dong.pdf", contentType: "application/pdf", dataUrl: "data:application/pdf;base64,SGVsbG8=" })).resolves.toMatchObject({ id: 221, fileName: "hop-dong.pdf", fileSize: 5 });
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^technology-vendor-contracts\/61\/documents\//), expect.any(Buffer), "application/pdf");
    expect(mocks.createTechnologyVendorContractDocument).toHaveBeenCalledWith(expect.objectContaining({ technologyVendorContractId: 61, fileName: "hop-dong.pdf", contentType: "application/pdf" }));
    await expect(caller.technologyVendorContracts.removeDocument({ id: 221 })).resolves.toEqual({ success: true });
    expect(mocks.deleteTechnologyVendorContractDocument).toHaveBeenCalledWith(221);
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
