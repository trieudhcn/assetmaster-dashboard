import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { isInvalidWholeQuantity } from "@shared/quantity";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  clearUserDivision,
  createBrand,
  createAssetFieldChanges,
  createHelpGuideVersion,
  createAssetImportItem,
  createAssetImportSession,
  countActiveDivisionsByDepartment,
  createAsset,
  createAssetCategory,
  createAssetsBulk,
  createAuditSession,
  deleteAuditItem,
  deleteAuditItemsBySession,
  deleteAuditSession,
  createAuditItem,
  createBranch,
  createDepartment,
  createDivision,
  createHandover,
  createHandoverSupplyItem,
  createInventoryMovement,
  createInventorySupply,
  createSupplyImportItem,
  createSupplyImportSession,
  createSupplyUnit,
  createSupplyIssueSlip,
  createSupplyIssueSlipItem,
  createMaintenanceTicket,
  createPurchaseContract,
  createPurchaseContractDocument,
  createPurchaseContractItem,
  createPurchaseInvoice,
  createPurchaseInvoiceDocument,
  createPurchaseInvoiceLine,
  createPurchaseInvoiceSupplyReceipt,
  createRetirementCertificate,
  createRetirementCertificateAssets,
  createSoftwareLicense,
  createSoftwareLicenseActivationAccount,
  createSoftwareLicenseCredentialAccessLog,
  createSoftwareLicenseDocument,
  createSoftwareLicenseAssignment,
  createSoftwareLicenseKey,
  createTechnologyService,
  createTechnologyVendor,
  createTechnologyVendorContract,
  createVendor,
  createVendorDocument,
  countAssetsByCategoryId,
  deleteBranch,
  deleteRetirementCertificate,
  countUsersByRole,
  deleteAssetCategory,
  deletePurchaseContract,
  deletePurchaseContractDocument,
  deletePurchaseContractItemsByAssetId,
  deletePurchaseContractItemsBySupplyId,
  deletePurchaseInvoiceDocument,
  deletePurchaseInvoiceLine,
  deleteSoftwareLicenseDocument,
  deleteVendorDocument,
  getAssetById,
  getAssetImportSessionById,
  getAuditItemById,
  getAuditSession,
  getAssetCategoryByCode,
  getAssetCategoryById,
  getAssetCategoryByName,
  getNextAccessoryGroupSequence,
  getLatestAssetImportSession,
  getBrandById,
  getBrandByName,
  getBranchByCode,
  getBranchById,
  getBranchByName,
  getBranchUsageCounts,
  getActiveDepartmentById,
  getDepartmentById,
  getDepartmentByCode,
  getDivisionById,
  getDivisionByCode,
  getCompany,
  getHandoverById,
  getInventorySupplyByCode,
  getInventorySupplyById,
  getNextSupplyIssueSequence,
  getSupplyIssueSlipById,
  getSupplyIssueSlipItemById,
  getSupplyUnitById,
  getSupplyUnitByName,
  getSupplyImportSessionById,
  listHelpGuides,
  listUiLabels,
  getNextHandoverSequence,
  getNextRecoveryCertificateSequence,
  getNextAuditSequence,
  getMaintenanceTicket,
  getNextAssetCodeForPrefix,
  getNextRetirementCertificateSequence,
  getPurchaseContractById,
  getPurchaseContractByReferenceCode,
  getPurchaseContractDocumentById,
  getPurchaseInvoiceById,
  getPurchaseInvoiceByKey,
  getPurchaseInvoiceDocumentById,
  getPurchaseInvoiceLineById,
  getRetirementCertificateById,
  getSoftwareLicenseActivationAccountById,
  getSoftwareLicenseAssignmentById,
  getSoftwareLicenseById,
  getSoftwareLicenseDocumentById,
  getSoftwareLicenseKeyById,
  getTechnologyVendorContractDocumentById,
  getUserMenuPreference,
  getUserNotificationPreferences,
  listUserDashboardAlertHistory,
  listUserDashboardAlertStateIds,
  dismissUserDashboardAlerts,
  restoreUserDashboardAlerts,
  saveUiLabel,
  listMaintenanceTickets,
  listMaintenanceMonthlyBudgets,
  listMaintenanceTicketsByAsset,
  listAssetsByPurchaseContractId,
  listInventorySuppliesByPurchaseContractId,
  listPurchaseContractDocuments,
  listPurchaseContractItems,
  listPurchaseContracts,
  listPurchaseInvoiceDocuments,
  listPurchaseInvoiceLines,
  listPurchaseInvoicePage,
  listPurchaseInvoices,
  listAssetsByPurchaseInvoiceId,
  listPurchaseInvoiceSupplyReceipts,
  listRetirementCertificateAssetAssignments,
  listRetirementCertificates,
  listSoftwareLicenseActivationAccounts,
  listSoftwareLicenseAssignments,
  listSoftwareLicenseCredentialAccessLogs,
  listSoftwareLicenseDocuments,
  listSoftwareLicenseKeys,
  listTechnologyVendorContractDocuments,
  listSoftwareLicenses,
  getNextRepairTicketSequence,
  getNextWarrantyRequestSequence,
  listActivityLogsByEntity,
  getVendorById,
  getVendorByName,
  getVendorDocumentById,
  getTechnologyVendorById,
  getTechnologyVendorContractById,
  listAssets,
  listAssetCategories,
  listAllAssetCategories,
  listAssetFieldChanges,
  listActiveAssetsBySerialNumber,
  listAssetsByCodes,
  listAssetCodesByCodes,
  listBrands,
  listBranches,
  listAllBrands,
  listAllVendors,
  listAuditItems,
  listAuditSessions,
  listAssetImportItems,
  listAssetImportSessions,
  listActivityLogs,
  listHandoverReturnDecisionHistory,
  listAllDepartments,
  listAllDivisions,
  listDepartments,
  listDivisions,
  listHandovers,
  listHandoversByRecipient,
  listHandoverSupplyItems,
  listInventoryMovements,
  listInventorySupplies,
  listInventoryMovementReport,
  listActiveHandoverSupplyHoldingsByRecipientUserId,
  listSupplyIssueHistoryByRecipientUserId,
  listSupplyIssueSlipItems,
  listSupplyIssueSlips,
  listSupplyImportItems,
  listSupplyImportSessions,
  listSupplyUnits,
  listSupplyUnitUsageCounts,
  listSupplyIssueAnalytics,
  listTechnologyServices,
  listTechnologyVendorContracts,
  listTechnologyVendorContractAlerts,
  listTechnologyVendorUsageStats,
  listTechnologyVendors,
  listHelpGuideVersions,
  listVendors,
  listVendorDocuments,
  listUsers,
  getUserByEmployeeCode,
  countInventorySuppliesByUnit,
  recordActivity,
  revokeSoftwareLicenseAssignment,
  runAssetImportTransaction,
  runInventoryTransaction,
  runRetirementCertificateTransaction,
  runPurchaseContractTransaction,
  runPurchaseInvoiceTransaction,
  saveCompany,
  saveMaintenanceMonthlyBudget,
  saveHelpGuide,
  saveUserMenuPreference,
  saveUserNotificationPreferences,
  updateAsset,
  updateAssetCategory,
  updateAssetImportSession,
  updateBrand,
  updateBranch,
  updateDepartment,
  updateDivision,
  updateVendor,
  updateHandover,
  updateHandoverSupplyItem,
  updateInventorySupply,
  updateSupplyImportSession,
  updateSupplyIssueSlip,
  updateSupplyIssueSlipItem,
  updateSupplyUnit,
  updateMaintenanceTicket,
  updatePurchaseContract,
  updatePurchaseInvoice,
  updatePurchaseInvoiceLine,
  updatePurchaseInvoiceSupplyReceipt,
  updateAssetPurchaseInvoiceReference,
  updateRetirementCertificate,
  updateRetirementCertificateAssetSalvageValues,
  updateSoftwareLicenseActivationAccount,
  updateSoftwareLicenseActivationAccountLimits,
  updateSoftwareLicense,
  updateSoftwareLicenseKey,
  updateTechnologyService,
  updateTechnologyVendor,
  updateTechnologyVendorContract,
  createTechnologyVendorContractDocument,
  deleteTechnologyVendorContractDocument,
  updateUserRole,
  updateUserDirectoryProfile,
  updateUserActiveStatus,
  updateUserBranch,
  updateUserDepartment,
  updateUserDivision,
  updateAuditItem,
  updateAuditSession,
  transitionHandoverStatus,
  deleteSupplyUnit,
} from "./db";
import { credentialFingerprint, decryptLicenseCredential, encryptLicenseCredential, maskLicenseKey } from "./licenseCredentials";
import { storagePut } from "./storage";

const nullableText = z.string().trim().max(1000).optional().nullable();
const nullableEmail = z.string().trim().email().max(320).optional().nullable();
const nullableWebsiteUrl = z.string().trim().max(320).url("Website công ty phải là URL hợp lệ, ví dụ https://congty.vn").optional().nullable();
const sidebarMenuLabels = ["Tổng quan", "Danh mục tài sản", "Phân loại tài sản", "Nhà cung cấp & Hãng", "Hợp đồng & Hóa đơn", "Bản quyền & Dịch vụ", "Phụ kiện", "Bàn giao & Cấp phát", "Bảo hành & Sửa chữa", "Phòng Ban & Bộ Phận", "Quản lý nhân viên", "Khấu hao & Thanh lý", "Kiểm kê", "Báo Cáo"] as const;
const emailDomain = (email?: string | null) => email?.trim().split("@")[1]?.toLocaleLowerCase("en-US") || null;
async function ensureInternalBranchEmail(email?: string | null) {
  if (!email) return;
  const companyDomain = emailDomain((await getCompany())?.email);
  if (!companyDomain) throw new TRPCError({ code: "BAD_REQUEST", message: "Hãy lưu Email công ty trước khi dùng Email liên hệ Chi nhánh." });
  if (emailDomain(email) !== companyDomain) throw new TRPCError({ code: "BAD_REQUEST", message: `Email Chi nhánh phải dùng tên miền nội bộ @${companyDomain}.` });
}
const handoverReturnSupplyItems = z.array(z.object({ handoverSupplyItemId: z.number().int().positive(), quantity: z.number().int().min(0).max(1_000_000) })).max(20).optional();

async function restoreHandoverAccessories(
  handover: Awaited<ReturnType<typeof getHandoverById>> & {},
  changes: Record<string, unknown>,
  actor: { id: number; name?: string | null },
  returnedSupplyItems?: Array<{ handoverSupplyItemId: number; quantity: number }>,
) {
  if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
  const recoveryDate = handover.returnedAt || new Date();
  const recoveryYear = recoveryDate.getFullYear();
  const recoveryMonth = recoveryDate.getMonth() + 1;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await runInventoryTransaction(async (transaction) => {
        const recoverySequence = handover.recoveryCertificateSequence || await getNextRecoveryCertificateSequence(recoveryYear, recoveryMonth, transaction);
        const recoveryCertificateNumber = handover.recoveryCertificateNumber || `TH-${recoveryYear}${String(recoveryMonth).padStart(2, "0")}-${String(recoverySequence).padStart(3, "0")}`;
        const supplyItems = await listHandoverSupplyItems(handover.id, transaction);
        const returnQuantityByItem = new Map<number, number>();
        for (const returnedItem of returnedSupplyItems || []) {
          if (returnQuantityByItem.has(returnedItem.handoverSupplyItemId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Mỗi phụ kiện chỉ được khai báo hoàn trả một lần." });
          const supplyItem = supplyItems.find((item: { id: number }) => item.id === returnedItem.handoverSupplyItemId);
          if (!supplyItem) throw new TRPCError({ code: "BAD_REQUEST", message: "Phụ kiện hoàn trả không thuộc phiếu bàn giao này." });
          const outstandingQuantity = Number(supplyItem.issuedQuantity) - Number(supplyItem.returnedQuantity || 0);
          if (returnedItem.quantity > outstandingQuantity) throw new TRPCError({ code: "BAD_REQUEST", message: `Số lượng hoàn ${supplyItem.supplyName} vượt quá số đang giữ (${outstandingQuantity} ${supplyItem.unit}).` });
          returnQuantityByItem.set(returnedItem.handoverSupplyItemId, returnedItem.quantity);
        }
        let returnedAccessoryCount = 0;
        let outstandingAccessoryCount = 0;
        for (const item of supplyItems) {
          const outstandingQuantity = Number(item.issuedQuantity) - Number(item.returnedQuantity || 0);
          if (!Number.isFinite(outstandingQuantity) || outstandingQuantity <= 0) continue;
          const returnQuantity = returnedSupplyItems ? returnQuantityByItem.get(item.id) || 0 : outstandingQuantity;
          if (returnQuantity <= 0) { outstandingAccessoryCount += 1; continue; }
          const supply = await getInventorySupplyById(item.supplyId, transaction);
          if (!supply) throw new TRPCError({ code: "CONFLICT", message: `Không tìm thấy phụ kiện ${item.supplyCode} để hoàn kho.` });
          const quantityBefore = Number(supply.stockQuantity);
          if (!Number.isFinite(quantityBefore)) throw new TRPCError({ code: "CONFLICT", message: `Tồn kho phụ kiện ${supply.code} không hợp lệ.` });
          const quantityAfter = quantityBefore + returnQuantity;
          await updateInventorySupply(supply.id, { stockQuantity: String(quantityAfter) }, transaction);
          const returnedQuantityAfter = Number(item.returnedQuantity || 0) + returnQuantity;
          await updateHandoverSupplyItem(item.id, { returnedQuantity: String(returnedQuantityAfter) }, transaction);
          await createInventoryMovement({ supplyId: supply.id, handoverId: handover.id, movementType: "return", quantity: String(returnQuantity), quantityBefore: String(quantityBefore), quantityAfter: String(quantityAfter), recipientUserId: handover.recipientUserId || null, recipientName: handover.recipientName, recipientDepartmentId: handover.recipientDepartmentId || null, note: `Hoàn kho kèm thu hồi tài sản ${handover.assetCode} · Phiếu ${handover.referenceCode} · Biên bản ${recoveryCertificateNumber}`, createdByUserId: actor.id, createdByName: actor.name ?? "Quản trị viên" }, transaction);
          returnedAccessoryCount += 1;
          if (returnedQuantityAfter < Number(item.issuedQuantity)) outstandingAccessoryCount += 1;
        }
        await transitionHandoverStatus(handover.id, "returned", { ...changes, returnedAt: recoveryDate, recoveryCertificateNumber, recoveryCertificateYear: recoveryYear, recoveryCertificateMonth: recoveryMonth, recoveryCertificateSequence: recoverySequence }, transaction);
        return { returnedAccessoryCount, outstandingAccessoryCount, recoveryCertificateNumber };
      });
    } catch (error) {
      const duplicateCertificate = typeof error === "object" && error !== null && (("code" in error && error.code === "ER_DUP_ENTRY") || ("errno" in error && Number(error.errno) === 1062));
      if (!duplicateCertificate || attempt === 4) throw error;
    }
  }
  throw new TRPCError({ code: "CONFLICT", message: "Không thể tạo mã biên bản thu hồi duy nhất. Vui lòng thử lại." });
}
const dateFromMs = z.number().int().nonnegative().optional().nullable().transform((value) => value ? new Date(value) : null);
type InvoiceSupplyReceiptData = { id: number; supplyId: number; receivedQuantity: string; unitCost: string | null; taxRate: string; taxAmount: string; totalAmount: string; status: "received" | "void"; receivedAt: Date; note: string | null };

function requireWholeQuantity(unit: string | null | undefined, value: string | number, label = "Số lượng") {
  if (isInvalidWholeQuantity(unit, value)) throw new TRPCError({ code: "BAD_REQUEST", message: `${label} phải là số nguyên khi đơn vị tính là ${unit}.` });
}

async function requireEditableAuditSession(sessionId: number) {
  const session = await getAuditSession(sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đợt kiểm kê." });
  if (session.status === "completed") throw new TRPCError({ code: "CONFLICT", message: "Biên bản kiểm kê đã chốt, không thể chỉnh sửa kết quả." });
  if (session.status === "cancelled") throw new TRPCError({ code: "CONFLICT", message: "Đợt kiểm kê đã hủy, không thể chỉnh sửa kết quả." });
  return session;
}

export function hasRequiredMaintenanceReason(status: string | undefined, maintenanceReason: string | null | undefined) {
  return status !== "maintenance" || Boolean(maintenanceReason?.trim());
}

export function hasRequiredRetirementReason(status: string | undefined, retirementReason: string | null | undefined) {
  return status !== "retired" || Boolean(retirementReason?.trim());
}

const assetInput = z.object({
  assetCode: z.string().trim().min(2).max(64), name: z.string().trim().min(2).max(255), categoryId: z.number().int().positive().optional().nullable(), branchId: z.number().int().positive().optional().nullable(), departmentId: z.number().int().positive().optional().nullable(), holderName: nullableText,
  status: z.enum(["available", "assigned", "maintenance", "retired", "lost", "returned_to_vendor"]).default("available"), condition: z.enum(["good", "fair", "needs_inspection", "damaged"]).default("good"),
  purchaseDate: dateFromMs, purchaseValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), purchaseContractId: z.number().int().positive().optional().nullable(), purchaseInvoiceId: z.number().int().positive().optional().nullable(), purchaseInvoiceLineId: z.number().int().positive().optional().nullable(), supplierReturnedAt: dateFromMs, supplierReturnReason: nullableText, retiredAt: dateFromMs, retirementReason: nullableText, vendor: nullableText, vendorId: z.number().int().positive().optional().nullable(), brandId: z.number().int().positive().optional().nullable(), serialNumber: nullableText, location: nullableText, warrantyUntil: dateFromMs, note: nullableText, maintenanceReason: nullableText,
});

async function requireUsablePurchaseContract(purchaseContractId: number | null | undefined) {
  if (!purchaseContractId) return null;
  const contract = await getPurchaseContractById(purchaseContractId);
  if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hợp đồng mua bán được chọn." });
  if (contract.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Hợp đồng đã hủy không thể dùng để liên kết Tài sản hoặc Phụ kiện." });
  return contract;
}

async function requireUsablePurchaseInvoice(purchaseInvoiceId: number | null | undefined) {
  if (!purchaseInvoiceId) return null;
  const invoice = await getPurchaseInvoiceById(purchaseInvoiceId);
  if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hóa đơn mua bán được chọn." });
  if (invoice.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Hóa đơn đã hủy không thể dùng để liên kết Tài sản." });
  return invoice;
}

async function requireAssetPurchaseInvoiceLine(purchaseInvoiceId: number | null | undefined, purchaseInvoiceLineId: number | null | undefined) {
  if (!purchaseInvoiceLineId) return null;
  if (!purchaseInvoiceId) throw new TRPCError({ code: "BAD_REQUEST", message: "Vui lòng chọn Hóa đơn trước khi chọn dòng Hóa đơn." });
  const line = await getPurchaseInvoiceLineById(purchaseInvoiceLineId);
  if (!line || line.purchaseInvoiceId !== purchaseInvoiceId || line.itemType !== "asset") throw new TRPCError({ code: "BAD_REQUEST", message: "Dòng Hóa đơn không hợp lệ để liên kết Tài sản." });
  return line;
}

async function syncAssetPurchaseContractItem(asset: { id: number; assetCode: string; name: string; purchaseContractId: number | null; purchaseValue: string | null; warrantyUntil: Date | null }, transaction: any) {
  await deletePurchaseContractItemsByAssetId(asset.id, transaction);
  if (!asset.purchaseContractId) return;
  await createPurchaseContractItem({ purchaseContractId: asset.purchaseContractId, itemType: "asset", assetId: asset.id, supplyId: null, itemCode: asset.assetCode, itemName: asset.name, quantity: "1", unit: "Tài sản", unitPrice: asset.purchaseValue, warrantyUntil: asset.warrantyUntil, note: null }, transaction);
}

async function syncSupplyPurchaseContractItem(supply: { id: number; code: string; name: string; purchaseContractId: number | null; stockQuantity: string; unit: string; unitCost: string | null }, transaction: any) {
  await deletePurchaseContractItemsBySupplyId(supply.id, transaction);
  if (!supply.purchaseContractId) return;
  await createPurchaseContractItem({ purchaseContractId: supply.purchaseContractId, itemType: "supply", assetId: null, supplyId: supply.id, itemCode: supply.code, itemName: supply.name, quantity: supply.stockQuantity, unit: supply.unit, unitPrice: supply.unitCost, warrantyUntil: null, note: null }, transaction);
}

const assetImportRow = z.object({
  rowNumber: z.number().int().min(2),
  assetCode: z.string().trim().max(64).optional().default(""),
  name: z.string().trim().min(2).max(255),
  category: z.string().trim().min(2).max(160),
  status: z.enum(["available", "maintenance"]),
  maintenanceReason: nullableText,
  condition: z.enum(["good", "fair", "needs_inspection", "damaged"]),
  purchaseDate: dateFromMs,
  purchaseValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  invoiceNumber: nullableText,
  vendor: nullableText,
  brandName: z.string().trim().max(160).nullable(),
  serialNumber: nullableText,
  location: nullableText,
  warrantyUntil: dateFromMs,
  note: nullableText,
});

const trackedAssetFields = ["name", "status", "condition", "purchaseDate", "purchaseValue", "purchaseInvoiceId", "purchaseInvoiceLineId", "vendor", "brandId", "serialNumber", "location", "warrantyUntil", "metadata", "note", "maintenanceReason", "isArchived"] as const;
function assetSnapshot(asset: Record<string, unknown>) {
  return Object.fromEntries(trackedAssetFields.map((field) => [field, asset[field] ?? null]));
}
function valueText(value: unknown) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
export function fieldChanges(assetId: number, before: Record<string, unknown>, after: Record<string, unknown>, source: "import" | "manual" | "undo", actorUserId: number, actorName: string | null | undefined, importSessionId?: number) {
  return trackedAssetFields.filter((field) => valueText(before[field]) !== valueText(after[field])).map((field) => ({ assetId, importSessionId: importSessionId ?? null, fieldName: field, previousValue: valueText(before[field]), nextValue: valueText(after[field]), source, actorUserId, actorName: actorName ?? null }));
}
function importAssetValues(row: z.infer<typeof assetImportRow>, brandId: number | null, vendorId: number | null, categoryId: number, purchaseInvoiceId: number | null) {
  return { name: row.name, categoryId, status: row.status, condition: row.condition, purchaseDate: row.purchaseDate, purchaseValue: row.purchaseValue, ...(purchaseInvoiceId ? { purchaseInvoiceId } : {}), vendor: row.vendor, vendorId, brandId, serialNumber: row.serialNumber, location: row.location, warrantyUntil: row.warrantyUntil, metadata: { category: row.category }, note: row.note, maintenanceReason: row.status === "maintenance" ? row.maintenanceReason : null, isArchived: false };
}
export const IMPORT_UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;
export function getImportUndoDeadline(createdAt: Date) {
  return new Date(createdAt.getTime() + IMPORT_UNDO_WINDOW_MS);
}
export function canUndoImport(createdAt: Date, now = new Date()) {
  return now.getTime() <= getImportUndoDeadline(createdAt).getTime();
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  menuPreferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const preference = await getUserMenuPreference(ctx.user.id);
      const menuOrder = Array.isArray(preference?.menuOrder) ? preference.menuOrder.filter((label): label is string => typeof label === "string" && sidebarMenuLabels.includes(label as typeof sidebarMenuLabels[number])) : [];
      return { menuOrder };
    }),
    save: protectedProcedure.input(z.object({ menuOrder: z.array(z.string().trim().min(1).max(80)).max(sidebarMenuLabels.length) })).mutation(async ({ ctx, input }) => {
      const normalized = Array.from(new Set(input.menuOrder));
      if (normalized.length !== sidebarMenuLabels.length || normalized.some((label) => !sidebarMenuLabels.includes(label as typeof sidebarMenuLabels[number]))) throw new TRPCError({ code: "BAD_REQUEST", message: "Thứ tự menu không hợp lệ." });
      await saveUserMenuPreference(ctx.user.id, normalized);
      return { menuOrder: normalized };
    }),
  }),
  notifications: router({
    preferences: protectedProcedure.query(async ({ ctx }) => {
      const stored = await getUserNotificationPreferences(ctx.user.id);
      return stored ? { maintenanceEnabled: stored.maintenanceEnabled, handoverEnabled: stored.handoverEnabled, returnRequestEnabled: stored.returnRequestEnabled } : { maintenanceEnabled: true, handoverEnabled: true, returnRequestEnabled: true };
    }),
    savePreferences: protectedProcedure.input(z.object({ maintenanceEnabled: z.boolean(), handoverEnabled: z.boolean(), returnRequestEnabled: z.boolean() })).mutation(async ({ input, ctx }) => {
      await saveUserNotificationPreferences(ctx.user.id, input);
      return { success: true };
    }),
    dashboardAlertStates: protectedProcedure.query(async ({ ctx }) => ({ alertIds: await listUserDashboardAlertStateIds(ctx.user.id) })),
    dashboardAlertHistory: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) })).query(async ({ input, ctx }) => listUserDashboardAlertHistory(ctx.user.id, input.limit)),
    dismissDashboardAlerts: protectedProcedure.input(z.object({ alertIds: z.array(z.string().trim().min(1).max(160)).min(1).max(100) })).mutation(async ({ input, ctx }) => {
      await dismissUserDashboardAlerts(ctx.user.id, input.alertIds);
      return { success: true };
    }),
    restoreDashboardAlerts: protectedProcedure.input(z.object({ alertIds: z.array(z.string().trim().min(1).max(160)).min(1).max(100) })).mutation(async ({ input, ctx }) => {
      await restoreUserDashboardAlerts(ctx.user.id, input.alertIds);
      return { success: true };
    }),
  }),
  uiLabels: router({
    list: protectedProcedure.query(() => listUiLabels()),
    save: adminProcedure.input(z.object({ labelKey: z.string().regex(/^[a-z][a-z0-9-]{1,95}$/), value: z.string().trim().min(2).max(120) })).mutation(async ({ input, ctx }) => {
      await saveUiLabel({ ...input, updatedByUserId: ctx.user.id, updatedByName: ctx.user.name });
      await recordActivity({ entityType: "ui_label", entityId: 0, action: "updated", actorUserId: ctx.user.id, actorName: ctx.user.name, summary: `Cập nhật nhãn giao diện ${input.labelKey}` });
      return { success: true };
    }),
  }),
  company: router({
    get: protectedProcedure.query(() => getCompany()),
    publicBrand: publicProcedure.query(async () => {
      const company = await getCompany();
      if (!company) return null;
      return {
        name: company.name,
        websiteTitle: company.websiteTitle,
        logoUrl: company.logoUrl,
        brandColor: company.brandColor,
        loginBackgroundUrl: company.loginBackgroundUrl,
        loginGreeting: company.loginGreeting,
        loginBackgroundOverlay: company.loginBackgroundOverlay,
      };
    }),
    save: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(255), address: nullableText, taxCode: nullableText, phone: nullableText, email: nullableEmail, websiteUrl: nullableWebsiteUrl, hideWebsiteOnInternalPdf: z.boolean().optional().default(false), logoUrl: nullableText, websiteTitle: z.string().trim().min(2).max(120).optional().nullable(), brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(), faviconUrl: nullableText, loginBackgroundUrl: nullableText, loginGreeting: z.string().trim().max(300).optional().nullable(), loginBackgroundOverlay: z.enum(["light", "dark"]).optional().nullable() })).mutation(async ({ input, ctx }) => {
      const id = await saveCompany(input);
      await recordActivity({ entityType: "company", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Cập nhật thông tin công ty" });
      return { id };
    }),
    uploadLogo: adminProcedure.input(z.object({ fileName: z.string().trim().min(1).max(255), contentType: z.enum(["image/png", "image/jpeg", "image/webp"]), dataUrl: z.string().max(4_000_000).regex(/^data:image\/(png|jpeg|webp);base64,/) })).mutation(async ({ input, ctx }) => {
      const base64 = input.dataUrl.split(",")[1];
      const bytes = Buffer.from(base64 || "", "base64");
      if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Logo phải là ảnh PNG, JPG hoặc WebP và không vượt quá 2 MB." });
      const extension = input.contentType === "image/png" ? "png" : input.contentType === "image/jpeg" ? "jpg" : "webp";
      const stored = await storagePut(`company-brand/logo-${crypto.randomUUID()}.${extension}`, bytes, input.contentType);
      await recordActivity({ entityType: "company", entityId: 0, action: "logo_uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tải logo công ty ${input.fileName}` });
      return { url: stored.url };
    }),
    uploadFavicon: adminProcedure.input(z.object({ fileName: z.string().trim().min(1).max(255), dataUrl: z.string().max(1_000_000).regex(/^data:image\/png;base64,/) })).mutation(async ({ input, ctx }) => {
      const bytes = Buffer.from(input.dataUrl.split(",")[1] || "", "base64");
      if (!bytes.length || bytes.length > 256 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Favicon PNG không được vượt quá 256 KB." });
      const stored = await storagePut(`company-brand/favicon-${crypto.randomUUID()}.png`, bytes, "image/png");
      await recordActivity({ entityType: "company", entityId: 0, action: "favicon_uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tải favicon ${input.fileName}` });
      return { url: stored.url };
    }),
    uploadLoginBackground: adminProcedure.input(z.object({ fileName: z.string().trim().min(1).max(255), contentType: z.enum(["image/png", "image/jpeg", "image/webp"]), dataUrl: z.string().max(7_000_000).regex(/^data:image\/(png|jpeg|webp);base64,/) })).mutation(async ({ input, ctx }) => {
      const bytes = Buffer.from(input.dataUrl.split(",")[1] || "", "base64");
      if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Ảnh nền phải là PNG, JPG hoặc WebP và không vượt quá 5 MB." });
      const extension = input.contentType === "image/png" ? "png" : input.contentType === "image/jpeg" ? "jpg" : "webp";
      const stored = await storagePut(`company-brand/login-background-${crypto.randomUUID()}.${extension}`, bytes, input.contentType);
      await recordActivity({ entityType: "company", entityId: 0, action: "login_background_uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tải ảnh nền đăng nhập ${input.fileName}` });
      return { url: stored.url };
    }),
  }),
  employees: router({
    list: adminProcedure.query(() => listUsers()),
    roleHistory: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input }) => (await listActivityLogsByEntity("user", input.userId)).filter((entry) => entry.action === "role_updated")),
    assetHistory: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ input }) => listHandoversByRecipient(input.userId)),
    supplyHistory: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ input }) => listSupplyIssueHistoryByRecipientUserId(input.userId)),
    myAssetHistory: protectedProcedure.query(({ ctx }) => listHandoversByRecipient(ctx.user.id)),
    updateRole: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(["admin", "user"]) })).mutation(async ({ input, ctx }) => {
      if (input.id === ctx.user!.id && input.role !== "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Bạn không thể tự hạ quyền tài khoản quản trị đang sử dụng." });
      }
      if (input.role === "user" && (await countUsersByRole("admin")) <= 1) {
        throw new TRPCError({ code: "CONFLICT", message: "Không thể hạ quyền Admin cuối cùng. Hệ thống phải luôn có ít nhất một quản trị viên." });
      }
      await updateUserRole(input.id, input.role);
      await recordActivity({ entityType: "user", entityId: input.id, action: "role_updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật vai trò thành ${input.role}` });
      return { success: true };
    }),
    updateActiveStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ input, ctx }) => {
      if (input.id === ctx.user!.id && !input.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Bạn không thể khóa tài khoản quản trị đang sử dụng." });
      }
      await updateUserActiveStatus(input.id, input.isActive);
      await recordActivity({ entityType: "user", entityId: input.id, action: input.isActive ? "activated" : "deactivated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: input.isActive ? "Mở khóa tài khoản" : "Khóa tài khoản" });
      return { success: true };
    }),
    updateDirectoryProfile: adminProcedure.input(z.object({ id: z.number().int().positive(), employeeCode: z.string().trim().max(64).nullable(), jobTitle: z.string().trim().max(160).nullable() })).mutation(async ({ input, ctx }) => {
      const employeeCode = input.employeeCode?.toUpperCase() || null;
      if (employeeCode) {
        const existing = await getUserByEmployeeCode(employeeCode);
        if (existing && existing.id !== input.id) throw new TRPCError({ code: "CONFLICT", message: "Mã nhân viên đã được sử dụng bởi một nhân sự khác." });
      }
      await updateUserDirectoryProfile(input.id, { employeeCode, jobTitle: input.jobTitle?.trim() || null });
      await recordActivity({ entityType: "user", entityId: input.id, action: "directory_profile_updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Cập nhật Mã nhân viên và Chức vụ" });
      return { success: true };
    }),
    updateDepartment: adminProcedure.input(z.object({ id: z.number().int().positive(), departmentId: z.number().int().positive().nullable() })).mutation(async ({ input, ctx }) => {
      if (input.departmentId) {
        const department = await getActiveDepartmentById(input.departmentId);
        if (!department?.isActive) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Phòng ban được chọn không tồn tại hoặc đã ngừng hoạt động." });
        }
      }
      await updateUserDepartment(input.id, input.departmentId);
      await recordActivity({ entityType: "user", entityId: input.id, action: "department_updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: input.departmentId ? "Cập nhật phòng ban nhân viên" : "Xóa gán phòng ban nhân viên" });
      return { success: true };
    }),
    updateBranch: adminProcedure.input(z.object({ id: z.number().int().positive(), branchId: z.number().int().positive().nullable() })).mutation(async ({ input, ctx }) => {
      if (input.branchId && !(await getBranchById(input.branchId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Chi nhánh được chọn không tồn tại hoặc đã ngừng hoạt động." });
      await updateUserBranch(input.id, input.branchId);
      await recordActivity({ entityType: "user", entityId: input.id, action: "branch_updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: input.branchId ? "Cập nhật Chi nhánh nhân viên" : "Xóa gán Chi nhánh nhân viên" });
      return { success: true };
    }),
    updateDivision: adminProcedure.input(z.object({ id: z.number().int().positive(), divisionId: z.number().int().positive().nullable() })).mutation(async ({ input, ctx }) => {
      if (!input.divisionId) {
        await clearUserDivision(input.id);
        await recordActivity({ entityType: "user", entityId: input.id, action: "division_cleared", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Xóa gán Bộ Phận nhân viên" });
        return { success: true };
      }
      const division = await getDivisionById(input.divisionId);
      const department = division ? await getActiveDepartmentById(division.departmentId) : undefined;
      if (!division?.isActive || !department?.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Bộ Phận được chọn không tồn tại, đã ngừng hoạt động hoặc không thuộc Phòng Ban đang hoạt động." });
      }
      await updateUserDivision(input.id, department.id, division.id);
      await recordActivity({ entityType: "user", entityId: input.id, action: "division_updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Gán Bộ Phận ${division.name} thuộc ${department.name}` });
      return { success: true };
    }),
  }),
  departments: router({
    list: adminProcedure.query(() => listDepartments()),
    listDivisions: adminProcedure.query(() => listDivisions()),
    listAll: adminProcedure.query(() => listAllDepartments()),
    listAllDivisions: adminProcedure.query(() => listAllDivisions()),
    create: adminProcedure.input(z.object({
      name: z.string().trim().min(2).max(160),
      code: z.string().trim().min(2).max(40).optional(),
    })).mutation(async ({ input, ctx }) => {
      const code = (input.code || `PB-${crypto.randomUUID().slice(0, 8)}`).toUpperCase();
      if (await getDepartmentByCode(code)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mã phòng ban đã tồn tại." });
      }
      const id = await createDepartment({ code, name: input.name, isActive: true });
      await recordActivity({ entityType: "department", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo Phòng Ban: ${input.name}` });
      return { id, code };
    }),
    createDivision: adminProcedure.input(z.object({
      departmentId: z.number().int().positive(),
      name: z.string().trim().min(2).max(160),
      code: z.string().trim().min(2).max(40).optional(),
    })).mutation(async ({ input, ctx }) => {
      const department = await getActiveDepartmentById(input.departmentId);
      if (!department?.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Phòng Ban được chọn không tồn tại hoặc đã ngừng hoạt động." });
      }
      const code = (input.code || `BP-${crypto.randomUUID().slice(0, 8)}`).toUpperCase();
      if (await getDivisionByCode(code)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mã Bộ Phận đã tồn tại." });
      }
      const id = await createDivision({ departmentId: department.id, code, name: input.name, isActive: true });
      await recordActivity({ entityType: "division", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo Bộ Phận: ${input.name} thuộc ${department.name}` });
      return { id, code };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(160).optional(), code: z.string().trim().min(2).max(40).optional(), isActive: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
      const existing = await getDepartmentById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Phòng Ban." });
      const code = input.code?.toUpperCase();
      if (code && code !== existing.code && await getDepartmentByCode(code)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mã Phòng Ban đã tồn tại." });
      }
      if (input.isActive === false && await countActiveDivisionsByDepartment(existing.id) > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Hãy vô hiệu hóa hoặc chuyển toàn bộ Bộ Phận trực thuộc trước khi ngừng hoạt động Phòng Ban." });
      }
      await updateDepartment(existing.id, { name: input.name, code, isActive: input.isActive });
      const action = input.isActive === false ? "deactivated" : input.isActive === true ? "activated" : "updated";
      await recordActivity({ entityType: "department", entityId: existing.id, action, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `${input.isActive === false ? "Vô hiệu hóa" : input.isActive === true ? "Kích hoạt" : "Cập nhật"} Phòng Ban: ${input.name || existing.name}` });
      return { success: true };
    }),
    updateDivision: adminProcedure.input(z.object({ id: z.number().int().positive(), departmentId: z.number().int().positive().optional(), name: z.string().trim().min(2).max(160).optional(), code: z.string().trim().min(2).max(40).optional(), isActive: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
      const existing = await getDivisionById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Bộ Phận." });
      const targetDepartmentId = input.departmentId ?? existing.departmentId;
      const department = await getActiveDepartmentById(targetDepartmentId);
      if (!department?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Phòng Ban được chọn không tồn tại hoặc đã ngừng hoạt động." });
      const code = input.code?.toUpperCase();
      if (code && code !== existing.code && await getDivisionByCode(code)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mã Bộ Phận đã tồn tại." });
      }
      await updateDivision(existing.id, { departmentId: targetDepartmentId, name: input.name, code, isActive: input.isActive });
      const action = input.isActive === false ? "deactivated" : input.isActive === true ? "activated" : "updated";
      await recordActivity({ entityType: "division", entityId: existing.id, action, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `${input.isActive === false ? "Vô hiệu hóa" : input.isActive === true ? "Kích hoạt" : "Cập nhật"} Bộ Phận: ${input.name || existing.name}` });
      return { success: true };
    }),
  }),
  vendors: router({
    list: adminProcedure.query(() => listVendors()),
    listAll: adminProcedure.query(() => listAllVendors()),
    documents: adminProcedure.input(z.object({ vendorId: z.number().int().positive() })).query(async ({ input }) => {
      if (!(await getVendorById(input.vendorId))) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Nhà cung cấp." });
      return listVendorDocuments(input.vendorId);
    }),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(160), contactName: nullableText, phone: nullableText, email: z.string().email().optional().nullable() })).mutation(async ({ input, ctx }) => {
      if (await getVendorByName(input.name)) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp này đã tồn tại." });
      const id = await createVendor({ ...input, isActive: true });
      await recordActivity({ entityType: "vendor", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo Nhà cung cấp: ${input.name}` });
      return { id };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(160).optional(), contactName: nullableText, phone: nullableText, email: z.string().email().optional().nullable(), isActive: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
      const existing = await getVendorById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Nhà cung cấp." });
      if (input.name && input.name !== existing.name && await getVendorByName(input.name)) throw new TRPCError({ code: "BAD_REQUEST", message: "Tên Nhà cung cấp đã tồn tại." });
      const { id, ...changes } = input;
      await updateVendor(id, changes);
      const action = input.isActive === false ? "deactivated" : input.isActive === true ? "activated" : "updated";
      await recordActivity({ entityType: "vendor", entityId: id, action, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `${input.isActive === false ? "Vô hiệu hóa" : input.isActive === true ? "Kích hoạt" : "Cập nhật"} Nhà cung cấp: ${input.name || existing.name}` });
      return { success: true };
    }),
    uploadDocument: adminProcedure.input(z.object({
      vendorId: z.number().int().positive(),
      documentType: z.enum(["contract", "quotation", "other"]),
      fileName: z.string().trim().min(1).max(255),
      contentType: z.enum(["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
      dataUrl: z.string().max(7_500_000).regex(/^data:(application\/pdf|image\/(png|jpeg)|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet));base64,/),
    })).mutation(async ({ input, ctx }) => {
      const vendor = await getVendorById(input.vendorId);
      if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Nhà cung cấp." });
      const buffer = Buffer.from(input.dataUrl.split(",", 2)[1], "base64");
      if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Tài liệu phải có dung lượng từ 1 byte đến 5 MB." });
      const extensionByContentType: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx" };
      const safeBaseName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "tai-lieu-nha-cung-cap";
      const storageKey = `vendors/${vendor.id}/documents/${Date.now()}-${safeBaseName}.${extensionByContentType[input.contentType]}`;
      const { url } = await storagePut(storageKey, buffer, input.contentType);
      const id = await createVendorDocument({ vendorId: vendor.id, documentType: input.documentType, fileName: input.fileName, contentType: input.contentType, fileSize: buffer.length, storageKey, url, uploadedByUserId: ctx.user!.id, uploadedByName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "vendorDocument", entityId: id, action: "uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tải ${input.documentType === "contract" ? "hợp đồng" : input.documentType === "quotation" ? "báo giá" : "tài liệu"} cho Nhà cung cấp ${vendor.name}: ${input.fileName}` });
      return { id, url, fileName: input.fileName, contentType: input.contentType, fileSize: buffer.length };
    }),
    removeDocument: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const document = await getVendorDocumentById(input.id);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài liệu Nhà cung cấp." });
      await deleteVendorDocument(document.id);
      await recordActivity({ entityType: "vendorDocument", entityId: document.id, action: "removed", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Gỡ tài liệu ${document.fileName}` });
      return { success: true };
    }),
  }),
  technologyVendors: router({
    list: adminProcedure.query(() => listTechnologyVendors()),
    usageStats: adminProcedure.query(() => listTechnologyVendorUsageStats()),
    create: adminProcedure.input(z.object({
      name: z.string().trim().min(2).max(160),
      contactName: nullableText,
      phone: nullableText,
      email: z.string().trim().email().max(320).nullable().optional(),
      website: z.string().trim().max(320).nullable().optional(),
      address: z.string().trim().max(4000).nullable().optional(),
      isActive: z.boolean().default(true),
      note: z.string().trim().max(4000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await createTechnologyVendor(input);
      await recordActivity({ entityType: "technologyVendor", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo Nhà cung cấp Công nghệ ${input.name}` });
      return { id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(2).max(160).optional(),
      contactName: nullableText,
      phone: nullableText,
      email: z.string().trim().email().max(320).nullable().optional(),
      website: z.string().trim().max(320).nullable().optional(),
      address: z.string().trim().max(4000).nullable().optional(),
      isActive: z.boolean().optional(),
      note: z.string().trim().max(4000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const existing = await getTechnologyVendorById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Nhà cung cấp Công nghệ." });
      const { id, ...changes } = input;
      await updateTechnologyVendor(id, changes);
      await recordActivity({ entityType: "technologyVendor", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật Nhà cung cấp Công nghệ ${changes.name || existing.name}` });
      return { success: true };
    }),
  }),
  technologyVendorContracts: router({
    list: adminProcedure.input(z.object({ technologyVendorId: z.number().int().positive().optional() }).optional()).query(({ input }) => listTechnologyVendorContracts(input?.technologyVendorId)),
    expiringAlerts: adminProcedure.input(z.object({ daysAhead: z.number().int().min(1).max(90).default(30) }).optional()).query(({ input }) => listTechnologyVendorContractAlerts(input?.daysAhead ?? 30)),
    documents: adminProcedure.input(z.object({ technologyVendorContractId: z.number().int().positive() })).query(({ input }) => listTechnologyVendorContractDocuments(input.technologyVendorContractId)),
    create: adminProcedure.input(z.object({
      contractCode: z.string().trim().min(2).max(64),
      title: z.string().trim().min(2).max(255),
      technologyVendorId: z.number().int().positive(),
      contractType: z.enum(["license", "service", "framework", "other"]),
      signedAt: z.coerce.date().nullable().optional(),
      effectiveFrom: z.coerce.date().nullable().optional(),
      effectiveTo: z.coerce.date().nullable().optional(),
      autoRenew: z.boolean(),
      status: z.enum(["draft", "active", "expiring", "expired", "cancelled"]),
      note: z.string().trim().max(4000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const vendor = await getTechnologyVendorById(input.technologyVendorId);
      if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Nhà cung cấp Công nghệ." });
      const id = await createTechnologyVendorContract(input);
      await recordActivity({ entityType: "technologyVendorContract", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo Hợp đồng Công nghệ ${input.contractCode} · ${vendor.name}` });
      return { id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      title: z.string().trim().min(2).max(255).optional(),
      technologyVendorId: z.number().int().positive().optional(),
      contractType: z.enum(["license", "service", "framework", "other"]).optional(),
      signedAt: z.coerce.date().nullable().optional(),
      effectiveFrom: z.coerce.date().nullable().optional(),
      effectiveTo: z.coerce.date().nullable().optional(),
      autoRenew: z.boolean().optional(),
      status: z.enum(["draft", "active", "expiring", "expired", "cancelled"]).optional(),
      note: z.string().trim().max(4000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const existing = await getTechnologyVendorContractById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hợp đồng Công nghệ." });
      const { id, ...changes } = input;
      if (changes.technologyVendorId && !(await getTechnologyVendorById(changes.technologyVendorId))) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Nhà cung cấp Công nghệ." });
      await updateTechnologyVendorContract(id, changes);
      await recordActivity({ entityType: "technologyVendorContract", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật Hợp đồng Công nghệ ${existing.contractCode}` });
      return { success: true };
    }),
    uploadDocument: adminProcedure.input(z.object({
      technologyVendorContractId: z.number().int().positive(),
      fileName: z.string().trim().min(1).max(255),
      contentType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
      dataUrl: z.string().max(7_500_000).regex(/^data:(application\/pdf|image\/(png|jpeg));base64,/),
    })).mutation(async ({ input, ctx }) => {
      const contract = await getTechnologyVendorContractById(input.technologyVendorContractId);
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hợp đồng Công nghệ." });
      const buffer = Buffer.from(input.dataUrl.split(",", 2)[1], "base64");
      if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Tài liệu phải có dung lượng từ 1 byte đến 5 MB." });
      const extensionByContentType: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg" };
      const safeBaseName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "tai-lieu-hop-dong-cong-nghe";
      const storageKey = `technology-vendor-contracts/${contract.id}/documents/${Date.now()}-${safeBaseName}.${extensionByContentType[input.contentType]}`;
      const { url } = await storagePut(storageKey, buffer, input.contentType);
      const id = await createTechnologyVendorContractDocument({ technologyVendorContractId: contract.id, fileName: input.fileName, contentType: input.contentType, fileSize: buffer.length, storageKey, url, uploadedByUserId: ctx.user!.id, uploadedByName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "technologyVendorContractDocument", entityId: id, action: "uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tải tài liệu ${input.fileName} cho Hợp đồng ${contract.contractCode}` });
      return { id, url, fileName: input.fileName, contentType: input.contentType, fileSize: buffer.length };
    }),
    removeDocument: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const document = await getTechnologyVendorContractDocumentById(input.id);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài liệu Hợp đồng Công nghệ." });
      await deleteTechnologyVendorContractDocument(document.id);
      await recordActivity({ entityType: "technologyVendorContractDocument", entityId: document.id, action: "removed", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Gỡ tài liệu ${document.fileName} của Hợp đồng Công nghệ` });
      return { success: true };
    }),
  }),
  softwareLicenses: router({
    list: adminProcedure.query(() => listSoftwareLicenses()),
    assignments: adminProcedure.input(z.object({ softwareLicenseId: z.number().int().positive() }).optional()).query(({ input }) => listSoftwareLicenseAssignments(input?.softwareLicenseId)),
    documents: adminProcedure.input(z.object({ softwareLicenseId: z.number().int().positive() })).query(({ input }) => listSoftwareLicenseDocuments(input.softwareLicenseId)),
    create: adminProcedure.input(z.object({
      licenseCode: z.string().trim().min(2).max(64),
      productName: z.string().trim().min(2).max(255),
      publisher: nullableText,
      edition: nullableText,
      licenseModel: z.enum(["perpetual", "subscription", "volume", "oem", "other"]),
      activationMode: z.enum(["seat", "product_key", "shared_account"]).default("seat"),
      sharedAccountMaxUsers: z.number().int().min(1).max(10_000).default(1),
      licenseKey: z.string().trim().max(4000).nullable().optional(),
      purchasedQuantity: z.number().int().min(1).max(100_000),
      vendorId: z.number().int().positive().nullable().optional(),
      technologyVendorId: z.number().int().positive().nullable().optional(),
      technologyVendorContractId: z.number().int().positive().nullable().optional(),
      purchaseContractId: z.number().int().positive().nullable().optional(),
      purchaseInvoiceId: z.number().int().positive().nullable().optional(),
      purchasedAt: z.coerce.date().nullable().optional(),
      expiresAt: z.coerce.date().nullable().optional(),
      autoRenew: z.boolean(),
      status: z.enum(["active", "expiring", "expired", "suspended", "retired"]),
      note: z.string().trim().max(4000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await createSoftwareLicense({ ...input, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "softwareLicense", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo bản quyền ${input.productName} (${input.licenseCode})` });
      return { id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      productName: z.string().trim().min(2).max(255).optional(),
      publisher: nullableText,
      edition: nullableText,
      licenseModel: z.enum(["perpetual", "subscription", "volume", "oem", "other"]).optional(),
      activationMode: z.enum(["seat", "product_key", "shared_account"]).optional(),
      sharedAccountMaxUsers: z.number().int().min(1).max(10_000).optional(),
      licenseKey: z.string().trim().max(4000).nullable().optional(),
      purchasedQuantity: z.number().int().min(1).max(100_000).optional(),
      vendorId: z.number().int().positive().nullable().optional(),
      technologyVendorId: z.number().int().positive().nullable().optional(),
      technologyVendorContractId: z.number().int().positive().nullable().optional(),
      purchaseContractId: z.number().int().positive().nullable().optional(),
      purchaseInvoiceId: z.number().int().positive().nullable().optional(),
      purchasedAt: z.coerce.date().nullable().optional(),
      expiresAt: z.coerce.date().nullable().optional(),
      autoRenew: z.boolean().optional(),
      status: z.enum(["active", "expiring", "expired", "suspended", "retired"]).optional(),
      note: z.string().trim().max(4000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const existing = await getSoftwareLicenseById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy bản quyền phần mềm." });
      const { id, ...changes } = input;
      const assignments = await listSoftwareLicenseAssignments(id);
      const activeAssignments = assignments.filter((assignment) => assignment.status === "active");
      const keys = await listSoftwareLicenseKeys(id);
      const activationAccounts = await listSoftwareLicenseActivationAccounts(id);
      const existingActivationMode = existing.activationMode ?? "seat";
      const targetActivationMode = changes.activationMode ?? existingActivationMode;
      if (changes.activationMode && changes.activationMode !== existingActivationMode && activeAssignments.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Hãy thu hồi các cấp phát đang hoạt động trước khi đổi mô hình kích hoạt." });
      }
      if (changes.purchasedQuantity !== undefined) {
        const usedQuantity = targetActivationMode === "seat"
          ? activeAssignments.length
          : targetActivationMode === "product_key"
            ? keys.filter((key) => key.status !== "retired").length
            : activationAccounts.filter((account) => account.status !== "retired").length;
        if (changes.purchasedQuantity < usedQuantity) throw new TRPCError({ code: "BAD_REQUEST", message: `Số lượng mua không thể thấp hơn ${usedQuantity} mục đang được quản lý theo mô hình kích hoạt đã chọn.` });
      }
      if (changes.sharedAccountMaxUsers !== undefined) {
        const overLimit = activationAccounts.some((account) => activeAssignments.filter((assignment) => assignment.softwareLicenseActivationAccountId === account.id).length > changes.sharedAccountMaxUsers!);
        if (overLimit) throw new TRPCError({ code: "BAD_REQUEST", message: "Giới hạn mới thấp hơn số người đang dùng một hoặc nhiều tài khoản chủ." });
      }
      await updateSoftwareLicense(id, changes);
      if (changes.sharedAccountMaxUsers !== undefined) await updateSoftwareLicenseActivationAccountLimits(id, changes.sharedAccountMaxUsers);
      await recordActivity({ entityType: "softwareLicense", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật bản quyền ${changes.productName || existing.productName}` });
      return { success: true };
    }),
    uploadDocument: adminProcedure.input(z.object({
      softwareLicenseId: z.number().int().positive(),
      documentType: z.enum(["contract", "renewal", "other"]),
      fileName: z.string().trim().min(1).max(255),
      contentType: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg"]),
      dataUrl: z.string().max(7_500_000).regex(/^data:(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|image\/(png|jpeg));base64,/),
    })).mutation(async ({ input, ctx }) => {
      const license = await getSoftwareLicenseById(input.softwareLicenseId);
      if (!license) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy bản quyền phần mềm." });
      const buffer = Buffer.from(input.dataUrl.split(",", 2)[1], "base64");
      if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Tài liệu phải có dung lượng từ 1 byte đến 5 MB." });
      const extensionByContentType: Record<string, string> = { "application/pdf": "pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "image/png": "png", "image/jpeg": "jpg" };
      const safeBaseName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "tai-lieu-ban-quyen";
      const storageKey = `software-licenses/${license.id}/documents/${Date.now()}-${safeBaseName}.${extensionByContentType[input.contentType]}`;
      const { url } = await storagePut(storageKey, buffer, input.contentType);
      const id = await createSoftwareLicenseDocument({ softwareLicenseId: license.id, documentType: input.documentType, fileName: input.fileName, contentType: input.contentType, fileSize: buffer.length, storageKey, url, uploadedByUserId: ctx.user!.id, uploadedByName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "softwareLicenseDocument", entityId: id, action: "uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tải tài liệu ${input.fileName} cho Bản quyền ${license.licenseCode}` });
      return { id, url, fileName: input.fileName, contentType: input.contentType, fileSize: buffer.length };
    }),
    removeDocument: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const document = await getSoftwareLicenseDocumentById(input.id);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài liệu Bản quyền." });
      await deleteSoftwareLicenseDocument(document.id);
      await recordActivity({ entityType: "softwareLicenseDocument", entityId: document.id, action: "removed", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Gỡ tài liệu ${document.fileName} của Bản quyền` });
      return { success: true };
    }),
    keys: adminProcedure.input(z.object({ softwareLicenseId: z.number().int().positive() })).query(async ({ input }) => {
      const keys = await listSoftwareLicenseKeys(input.softwareLicenseId);
      return keys.map(({ encryptedKey: _encryptedKey, ...key }) => key);
    }),
    activationAccounts: adminProcedure.input(z.object({ softwareLicenseId: z.number().int().positive() })).query(async ({ input }) => {
      const accounts = await listSoftwareLicenseActivationAccounts(input.softwareLicenseId);
      return accounts.map(({ encryptedPassword: _encryptedPassword, ...account }) => account);
    }),
    credentialAccessLogs: adminProcedure.input(z.object({ softwareLicenseId: z.number().int().positive() })).query(({ input }) => listSoftwareLicenseCredentialAccessLogs(input.softwareLicenseId)),
    addKey: adminProcedure.input(z.object({
      softwareLicenseId: z.number().int().positive(),
      key: z.string().trim().min(4).max(4000),
      note: z.string().trim().max(2000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const license = await getSoftwareLicenseById(input.softwareLicenseId);
      if (!license) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy bản quyền phần mềm." });
      if (license.activationMode !== "product_key") throw new TRPCError({ code: "BAD_REQUEST", message: "Bản quyền này không dùng mô hình key riêng." });
      const existingKeys = await listSoftwareLicenseKeys(license.id);
      if (existingKeys.filter((key) => key.status !== "retired").length >= license.purchasedQuantity) throw new TRPCError({ code: "BAD_REQUEST", message: "Số key đang quản lý đã đạt số lượng mua của Bản quyền." });
      try {
        const id = await createSoftwareLicenseKey({ softwareLicenseId: license.id, encryptedKey: encryptLicenseCredential(input.key), keyFingerprint: credentialFingerprint(input.key), maskedKey: maskLicenseKey(input.key), note: input.note ?? null, status: "available", createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" });
        await recordActivity({ entityType: "softwareLicenseKey", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Thêm key riêng cho ${license.productName}` });
        return { id };
      } catch (error) {
        if (String(error).includes("Duplicate")) throw new TRPCError({ code: "CONFLICT", message: "Key này đã tồn tại trong Bản quyền." });
        throw error;
      }
    }),
    updateKeyStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["available", "retired"]), note: z.string().trim().max(2000).nullable().optional() })).mutation(async ({ input, ctx }) => {
      const key = await getSoftwareLicenseKeyById(input.id);
      if (!key) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy key Bản quyền." });
      const activeAssignment = (await listSoftwareLicenseAssignments(key.softwareLicenseId)).find((assignment) => assignment.status === "active" && assignment.softwareLicenseKeyId === key.id);
      if (activeAssignment) throw new TRPCError({ code: "BAD_REQUEST", message: "Hãy thu hồi cấp phát đang dùng key này trước khi thay đổi trạng thái." });
      await updateSoftwareLicenseKey(key.id, { status: input.status, note: input.note ?? key.note });
      await recordActivity({ entityType: "softwareLicenseKey", entityId: key.id, action: input.status === "retired" ? "retired" : "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `${input.status === "retired" ? "Ngừng dùng" : "Cập nhật"} key của Bản quyền #${key.softwareLicenseId}` });
      return { success: true };
    }),
    revealKey: adminProcedure.input(z.object({ id: z.number().int().positive(), action: z.enum(["view", "copy"]) })).mutation(async ({ input, ctx }) => {
      const key = await getSoftwareLicenseKeyById(input.id);
      if (!key) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy key Bản quyền." });
      const value = decryptLicenseCredential(key.encryptedKey);
      await createSoftwareLicenseCredentialAccessLog({ softwareLicenseId: key.softwareLicenseId, softwareLicenseKeyId: key.id, accessType: input.action === "copy" ? "copy_key" : "view_key", actorUserId: ctx.user!.id, actorName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "softwareLicenseKey", entityId: key.id, action: input.action === "copy" ? "copied" : "viewed", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `${input.action === "copy" ? "Sao chép" : "Xem"} key của Bản quyền #${key.softwareLicenseId}` });
      return { value };
    }),
    createActivationAccount: adminProcedure.input(z.object({
      softwareLicenseId: z.number().int().positive(),
      loginEmail: z.string().trim().email().max(320),
      password: z.string().min(1).max(4000),
      note: z.string().trim().max(2000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const license = await getSoftwareLicenseById(input.softwareLicenseId);
      if (!license) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy bản quyền phần mềm." });
      if (license.activationMode !== "shared_account") throw new TRPCError({ code: "BAD_REQUEST", message: "Bản quyền này không dùng mô hình tài khoản dùng chung." });
      const accounts = await listSoftwareLicenseActivationAccounts(license.id);
      if (accounts.filter((account) => account.status !== "retired").length >= license.purchasedQuantity) throw new TRPCError({ code: "BAD_REQUEST", message: "Số tài khoản chủ đã đạt số lượng mua của Bản quyền." });
      try {
        const id = await createSoftwareLicenseActivationAccount({ softwareLicenseId: license.id, loginEmail: input.loginEmail.toLocaleLowerCase("en-US"), encryptedPassword: encryptLicenseCredential(input.password), maxUsers: license.sharedAccountMaxUsers, note: input.note ?? null, status: "active", createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" });
        await recordActivity({ entityType: "softwareLicenseActivationAccount", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Thêm tài khoản kích hoạt ${input.loginEmail} cho ${license.productName}` });
        return { id };
      } catch (error) {
        if (String(error).includes("Duplicate")) throw new TRPCError({ code: "CONFLICT", message: "Email đăng nhập này đã tồn tại trong Bản quyền." });
        throw error;
      }
    }),
    updateActivationAccount: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      loginEmail: z.string().trim().email().max(320).optional(),
      password: z.string().min(1).max(4000).optional(),
      status: z.enum(["active", "suspended", "retired"]).optional(),
      note: z.string().trim().max(2000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const account = await getSoftwareLicenseActivationAccountById(input.id);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài khoản kích hoạt." });
      const { id, password, loginEmail, ...changes } = input;
      if (changes.status === "retired") {
        const activeAssignment = (await listSoftwareLicenseAssignments(account.softwareLicenseId)).find((assignment) => assignment.status === "active" && assignment.softwareLicenseActivationAccountId === account.id);
        if (activeAssignment) throw new TRPCError({ code: "BAD_REQUEST", message: "Hãy thu hồi người dùng đang dùng tài khoản này trước khi ngừng sử dụng." });
      }
      await updateSoftwareLicenseActivationAccount(account.id, { ...changes, loginEmail: loginEmail?.toLocaleLowerCase("en-US"), encryptedPassword: password ? encryptLicenseCredential(password) : undefined });
      await recordActivity({ entityType: "softwareLicenseActivationAccount", entityId: account.id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật tài khoản kích hoạt ${loginEmail || account.loginEmail}` });
      return { success: true };
    }),
    revealActivationPassword: adminProcedure.input(z.object({ id: z.number().int().positive(), action: z.enum(["view", "copy"]) })).mutation(async ({ input, ctx }) => {
      const account = await getSoftwareLicenseActivationAccountById(input.id);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài khoản kích hoạt." });
      const value = decryptLicenseCredential(account.encryptedPassword);
      await createSoftwareLicenseCredentialAccessLog({ softwareLicenseId: account.softwareLicenseId, softwareLicenseActivationAccountId: account.id, accessType: input.action === "copy" ? "copy_password" : "view_password", actorUserId: ctx.user!.id, actorName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "softwareLicenseActivationAccount", entityId: account.id, action: input.action === "copy" ? "copied" : "viewed", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `${input.action === "copy" ? "Sao chép" : "Xem"} mật khẩu tài khoản ${account.loginEmail}` });
      return { value };
    }),
    assign: adminProcedure.input(z.object({
      softwareLicenseId: z.number().int().positive(),
      assignmentMethod: z.enum(["seat", "product_key", "shared_account"]).optional(),
      softwareLicenseKeyId: z.number().int().positive().nullable().optional(),
      softwareLicenseActivationAccountId: z.number().int().positive().nullable().optional(),
      assetId: z.number().int().positive().nullable().optional(),
      userId: z.number().int().positive().nullable().optional(),
      assignedToName: nullableText,
      deviceName: nullableText,
      assignedAt: z.coerce.date().optional(),
      note: z.string().trim().max(2000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const license = await getSoftwareLicenseById(input.softwareLicenseId);
      if (!license) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy bản quyền phần mềm." });
      const activeCount = (await listSoftwareLicenseAssignments(license.id)).filter((assignment) => assignment.status === "active").length;
      const licenseActivationMode = license.activationMode ?? "seat";
      const assignmentMethod = input.assignmentMethod ?? licenseActivationMode;
      if (assignmentMethod !== licenseActivationMode) throw new TRPCError({ code: "BAD_REQUEST", message: "Hình thức cấp phát không khớp với mô hình kích hoạt của Bản quyền." });
      let softwareLicenseKeyId: number | null = null;
      let softwareLicenseActivationAccountId: number | null = null;
      if (assignmentMethod === "seat") {
        if (activeCount >= license.purchasedQuantity) throw new TRPCError({ code: "BAD_REQUEST", message: "Bản quyền này đã sử dụng hết số lượng được cấp." });
      } else if (assignmentMethod === "product_key") {
        const keys = await listSoftwareLicenseKeys(license.id);
        const key = input.softwareLicenseKeyId ? keys.find((item) => item.id === input.softwareLicenseKeyId) : keys.find((item) => item.status === "available");
        if (!key || key.status !== "available") throw new TRPCError({ code: "BAD_REQUEST", message: "Không còn key khả dụng để cấp phát." });
        softwareLicenseKeyId = key.id;
      } else {
        if (!input.softwareLicenseActivationAccountId) throw new TRPCError({ code: "BAD_REQUEST", message: "Hãy chọn tài khoản chủ để cấp phát." });
        const account = await getSoftwareLicenseActivationAccountById(input.softwareLicenseActivationAccountId);
        if (!account || account.softwareLicenseId !== license.id || account.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Tài khoản chủ không khả dụng." });
        const usedSlots = (await listSoftwareLicenseAssignments(license.id)).filter((assignment) => assignment.status === "active" && assignment.softwareLicenseActivationAccountId === account.id).length;
        if (usedSlots >= account.maxUsers) throw new TRPCError({ code: "BAD_REQUEST", message: `Tài khoản ${account.loginEmail} đã sử dụng hết ${account.maxUsers} chỗ.` });
        softwareLicenseActivationAccountId = account.id;
      }
      const { assignmentMethod: _requestedMethod, softwareLicenseKeyId: _requestedKeyId, softwareLicenseActivationAccountId: _requestedAccountId, ...assignment } = input;
      const id = await createSoftwareLicenseAssignment({ ...assignment, assignmentMethod, softwareLicenseKeyId, softwareLicenseActivationAccountId, assignedAt: input.assignedAt ?? new Date(), status: "active" });
      if (softwareLicenseKeyId) await updateSoftwareLicenseKey(softwareLicenseKeyId, { status: "assigned" });
      await recordActivity({ entityType: "softwareLicenseAssignment", entityId: id, action: "assigned", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cấp ${license.productName} cho ${input.assignedToName || input.deviceName || "đối tượng quản lý"}` });
      return { id };
    }),
    revokeAssignment: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const assignment = await getSoftwareLicenseAssignmentById(input.id);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy cấp phát Bản quyền." });
      await revokeSoftwareLicenseAssignment(input.id);
      if (assignment.status === "active" && assignment.softwareLicenseKeyId) await updateSoftwareLicenseKey(assignment.softwareLicenseKeyId, { status: "available" });
      await recordActivity({ entityType: "softwareLicenseAssignment", entityId: input.id, action: "revoked", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Thu hồi cấp phát bản quyền" });
      return { success: true };
    }),
  }),
  technologyServices: router({
    list: adminProcedure.query(() => listTechnologyServices()),
    create: adminProcedure.input(z.object({
      serviceCode: z.string().trim().min(2).max(64),
      serviceType: z.enum(["internet", "domain", "ssl"]),
      name: z.string().trim().min(2).max(255),
      vendorId: z.number().int().positive().nullable().optional(),
      technologyVendorId: z.number().int().positive().nullable().optional(),
      technologyVendorContractId: z.number().int().positive().nullable().optional(),
      branchId: z.number().int().positive().nullable().optional(),
      accountReference: nullableText,
      billingReference: nullableText,
      domainName: z.string().trim().max(255).nullable().optional(),
      serviceEndpoint: z.string().trim().max(255).nullable().optional(),
      startedAt: z.coerce.date().nullable().optional(),
      renewalAt: z.coerce.date().nullable().optional(),
      expiresAt: z.coerce.date().nullable().optional(),
      autoRenew: z.boolean(),
      billingCycle: z.enum(["monthly", "quarterly", "annual", "other"]),
      costAmount: z.number().min(0).max(999_999_999_999).nullable().optional(),
      status: z.enum(["active", "expiring", "expired", "suspended", "cancelled"]),
      note: z.string().trim().max(4000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { costAmount, ...service } = input;
      const id = await createTechnologyService({ ...service, costAmount: costAmount === undefined ? undefined : costAmount === null ? null : String(costAmount), createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "technologyService", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo dịch vụ ${input.name} (${input.serviceCode})` });
      return { id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(2).max(255).optional(),
      vendorId: z.number().int().positive().nullable().optional(),
      technologyVendorId: z.number().int().positive().nullable().optional(),
      technologyVendorContractId: z.number().int().positive().nullable().optional(),
      branchId: z.number().int().positive().nullable().optional(),
      accountReference: nullableText,
      billingReference: nullableText,
      domainName: z.string().trim().max(255).nullable().optional(),
      serviceEndpoint: z.string().trim().max(255).nullable().optional(),
      startedAt: z.coerce.date().nullable().optional(),
      renewalAt: z.coerce.date().nullable().optional(),
      expiresAt: z.coerce.date().nullable().optional(),
      autoRenew: z.boolean().optional(),
      billingCycle: z.enum(["monthly", "quarterly", "annual", "other"]).optional(),
      costAmount: z.number().min(0).max(999_999_999_999).nullable().optional(),
      status: z.enum(["active", "expiring", "expired", "suspended", "cancelled"]).optional(),
      note: z.string().trim().max(4000).nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...changes } = input;
      const { costAmount, ...serviceChanges } = changes;
      await updateTechnologyService(id, { ...serviceChanges, costAmount: costAmount === undefined ? undefined : costAmount === null ? null : String(costAmount) });
      await recordActivity({ entityType: "technologyService", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật dịch vụ ${changes.name || id}` });
      return { success: true };
    }),
  }),
  purchaseContracts: router({
    list: adminProcedure.query(() => listPurchaseContracts()),
    get: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const contract = await getPurchaseContractById(input.id);
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hợp đồng mua bán." });
      const [documents, linkedAssets, linkedSupplies, items] = await Promise.all([
        listPurchaseContractDocuments(contract.id),
        listAssetsByPurchaseContractId(contract.id),
        listInventorySuppliesByPurchaseContractId(contract.id),
        listPurchaseContractItems(contract.id),
      ]);
      return { contract, documents, linkedAssets, linkedSupplies, items };
    }),
    create: adminProcedure.input(z.object({
      referenceCode: z.string().trim().min(2).max(64).transform((value) => value.toUpperCase()),
      title: z.string().trim().min(2).max(255),
      vendorId: z.number().int().positive().nullable().optional(),
      signedAt: dateFromMs,
      effectiveFrom: dateFromMs,
      effectiveTo: dateFromMs,
      totalValue: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
      status: z.enum(["draft", "active", "expired", "cancelled"]).default("draft"),
      note: nullableText,
    }).superRefine((input, issue) => {
      if (input.effectiveFrom && input.effectiveTo && input.effectiveTo.getTime() < input.effectiveFrom.getTime()) issue.addIssue({ code: z.ZodIssueCode.custom, path: ["effectiveTo"], message: "Ngày kết thúc hiệu lực phải sau hoặc bằng ngày bắt đầu." });
    })).mutation(async ({ input, ctx }) => {
      if (await getPurchaseContractByReferenceCode(input.referenceCode)) throw new TRPCError({ code: "BAD_REQUEST", message: "Số hợp đồng này đã tồn tại." });
      if (input.vendorId && !(await getVendorById(input.vendorId))) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Nhà cung cấp được chọn." });
      const id = await createPurchaseContract({ ...input, vendorId: input.vendorId ?? null, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "purchaseContract", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo Hợp đồng mua bán ${input.referenceCode}` });
      return { id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      referenceCode: z.string().trim().min(2).max(64).transform((value) => value.toUpperCase()).optional(),
      title: z.string().trim().min(2).max(255).optional(),
      vendorId: z.number().int().positive().nullable().optional(),
      signedAt: dateFromMs,
      effectiveFrom: dateFromMs,
      effectiveTo: dateFromMs,
      totalValue: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
      status: z.enum(["draft", "active", "expired", "cancelled"]).optional(),
      note: nullableText,
    }).superRefine((input, issue) => {
      if (input.effectiveFrom && input.effectiveTo && input.effectiveTo.getTime() < input.effectiveFrom.getTime()) issue.addIssue({ code: z.ZodIssueCode.custom, path: ["effectiveTo"], message: "Ngày kết thúc hiệu lực phải sau hoặc bằng ngày bắt đầu." });
    })).mutation(async ({ input, ctx }) => {
      const contract = await getPurchaseContractById(input.id);
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hợp đồng mua bán." });
      if (input.referenceCode && input.referenceCode !== contract.referenceCode && await getPurchaseContractByReferenceCode(input.referenceCode)) throw new TRPCError({ code: "BAD_REQUEST", message: "Số hợp đồng này đã tồn tại." });
      if (input.vendorId && !(await getVendorById(input.vendorId))) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Nhà cung cấp được chọn." });
      const { id, ...changes } = input;
      await updatePurchaseContract(id, changes);
      await recordActivity({ entityType: "purchaseContract", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật Hợp đồng mua bán ${changes.referenceCode || contract.referenceCode}` });
      return { success: true };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => runPurchaseContractTransaction(async (transaction) => {
      const contract = await getPurchaseContractById(input.id, transaction);
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hợp đồng mua bán." });
      const [linkedAssets, linkedSupplies] = await Promise.all([listAssetsByPurchaseContractId(contract.id), listInventorySuppliesByPurchaseContractId(contract.id)]);
      if (linkedAssets.length || linkedSupplies.length) throw new TRPCError({ code: "CONFLICT", message: `Không thể xóa vì hợp đồng đang liên kết ${linkedAssets.length} tài sản và ${linkedSupplies.length} phụ kiện.` });
      await deletePurchaseContract(contract.id, transaction);
      await recordActivity({ entityType: "purchaseContract", entityId: contract.id, action: "removed", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Xóa Hợp đồng mua bán ${contract.referenceCode}` }, transaction);
      return { success: true };
    })),
    uploadDocument: adminProcedure.input(z.object({
      purchaseContractId: z.number().int().positive(),
      documentType: z.enum(["signed_contract", "appendix", "quotation", "other"]),
      fileName: z.string().trim().min(1).max(255),
      contentType: z.enum(["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
      dataUrl: z.string().max(7_500_000).regex(/^data:(application\/pdf|image\/(png|jpeg)|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet));base64,/),
    })).mutation(async ({ input, ctx }) => {
      const contract = await getPurchaseContractById(input.purchaseContractId);
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hợp đồng mua bán." });
      const buffer = Buffer.from(input.dataUrl.split(",", 2)[1], "base64");
      if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Tài liệu phải có dung lượng từ 1 byte đến 5 MB." });
      const extensionByContentType: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx" };
      const safeBaseName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "tai-lieu-hop-dong";
      const storageKey = `purchase-contracts/${contract.id}/documents/${Date.now()}-${safeBaseName}.${extensionByContentType[input.contentType]}`;
      const { url } = await storagePut(storageKey, buffer, input.contentType);
      const id = await createPurchaseContractDocument({ purchaseContractId: contract.id, documentType: input.documentType, fileName: input.fileName, contentType: input.contentType, fileSize: buffer.length, storageKey, url, uploadedByUserId: ctx.user!.id, uploadedByName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "purchaseContractDocument", entityId: id, action: "uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tải chứng từ ${input.fileName} cho Hợp đồng ${contract.referenceCode}` });
      return { id, url, fileName: input.fileName, contentType: input.contentType, fileSize: buffer.length };
    }),
    removeDocument: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const document = await getPurchaseContractDocumentById(input.id);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy chứng từ Hợp đồng." });
      await deletePurchaseContractDocument(document.id);
      await recordActivity({ entityType: "purchaseContractDocument", entityId: document.id, action: "removed", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Gỡ chứng từ ${document.fileName}` });
      return { success: true };
    }),
  }),
  purchaseInvoices: router({
    list: adminProcedure.query(() => listPurchaseInvoices()),
    page: adminProcedure.input(z.object({ page: z.number().int().positive().default(1), pageSize: z.number().int().min(5).max(50).default(10), query: z.string().trim().max(160).default(""), vendorId: z.number().int().positive().nullable().default(null), status: z.enum(["draft", "issued", "adjusted", "replaced", "cancelled"]).nullable().default(null) })).query(({ input }) => listPurchaseInvoicePage(input)),
    get: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const invoice = await getPurchaseInvoiceById(input.id);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hóa đơn mua bán." });
      const [documents, lines, linkedAssets, supplies] = await Promise.all([
        listPurchaseInvoiceDocuments(invoice.id),
        listPurchaseInvoiceLines(invoice.id),
        listAssetsByPurchaseInvoiceId(invoice.id),
        listInventorySupplies(),
      ]);
      const receiptGroups = await Promise.all(lines.filter((line) => line.itemType === "supply").map(async (line) => ({ purchaseInvoiceLineId: line.id, receipts: (await listPurchaseInvoiceSupplyReceipts(line.id)) as InvoiceSupplyReceiptData[] })));
      const supplyById = new Map(supplies.map((supply) => [supply.id, supply]));
      const supplyReceipts = receiptGroups.flatMap((group) => group.receipts.map((receipt) => ({ ...receipt, purchaseInvoiceLineId: group.purchaseInvoiceLineId, supply: supplyById.get(receipt.supplyId) || null })));
      return { invoice, documents, lines, linkedAssets, supplyReceipts };
    }),
    reconciliation: adminProcedure.query(async () => {
      const [invoices, vendors] = await Promise.all([listPurchaseInvoices(), listAllVendors()]);
      const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
      const rows = await Promise.all(invoices.map(async (invoice) => {
        const [lines, assets] = await Promise.all([listPurchaseInvoiceLines(invoice.id), listAssetsByPurchaseInvoiceId(invoice.id)]);
        const receiptGroups = await Promise.all(lines.filter((line) => line.itemType === "supply").map(async (line) => ({ lineId: line.id, receipts: (await listPurchaseInvoiceSupplyReceipts(line.id)) as InvoiceSupplyReceiptData[] })));
        const receivedByLine = new Map(receiptGroups.map((group) => [group.lineId, group.receipts.filter((receipt: InvoiceSupplyReceiptData) => receipt.status === "received").reduce((total: number, receipt: InvoiceSupplyReceiptData) => total + Number(receipt.receivedQuantity), 0)]));
        return lines.map((line) => ({
          invoiceId: invoice.id,
          invoiceKey: invoice.invoiceKey,
          invoiceStatus: invoice.status,
          invoiceIssuedAt: invoice.issuedAt,
          vendorName: vendorById.get(invoice.vendorId)?.name || "Nhà cung cấp đã xóa",
          purchaseContractId: invoice.purchaseContractId,
          lineId: line.id,
          lineNumber: line.lineNumber,
          itemType: line.itemType,
          itemCode: line.itemCode,
          itemName: line.itemName,
          invoicedQuantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          linkedAssets: assets.filter((asset) => asset.purchaseInvoiceLineId === line.id).map((asset) => ({ id: asset.id, assetCode: asset.assetCode, name: asset.name, serialNumber: asset.serialNumber, purchaseValue: asset.purchaseValue, status: asset.status })),
          receivedQuantity: receivedByLine.get(line.id) ?? 0,
        }));
      }));
      return rows.flat();
    }),
    create: adminProcedure.input(z.object({
      invoiceNumber: z.string().trim().min(1).max(64),
      invoiceSeries: z.string().trim().max(64).nullable().optional(),
      invoiceTemplate: z.string().trim().max(64).nullable().optional(),
      invoiceType: z.enum(["vat", "electronic", "retail", "adjustment", "replacement", "other"]).default("vat"),
      status: z.enum(["draft", "issued", "adjusted", "replaced", "cancelled"]).default("draft"),
      vendorId: z.number().int().positive(),
      purchaseContractId: z.number().int().positive().nullable().optional(),
      issuedAt: z.number().int().positive().transform((value) => new Date(value)),
      receivedAt: dateFromMs,
      currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("VND"),
      exchangeRate: z.string().regex(/^\d+(\.\d{1,6})?$/).nullable().optional(),
      subtotalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
      taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
      totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      sourceInvoiceId: z.number().int().positive().nullable().optional(),
      note: nullableText,
    })).mutation(async ({ input, ctx }) => {
      const vendor = await getVendorById(input.vendorId);
      if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Nhà cung cấp trên Hóa đơn." });
      const contract = input.purchaseContractId ? await getPurchaseContractById(input.purchaseContractId) : null;
      if (input.purchaseContractId && !contract) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hợp đồng được chọn." });
      if (contract?.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Không thể liên kết Hóa đơn với Hợp đồng đã hủy." });
      if (contract?.vendorId && contract.vendorId !== input.vendorId) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp Hóa đơn phải khớp với Nhà cung cấp của Hợp đồng được chọn." });
      if (input.sourceInvoiceId && !(await getPurchaseInvoiceById(input.sourceInvoiceId))) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hóa đơn gốc để điều chỉnh/thay thế." });
      const invoiceKey = [input.invoiceTemplate, input.invoiceSeries, input.invoiceNumber].filter(Boolean).join(" · ").toUpperCase();
      if (await getPurchaseInvoiceByKey(invoiceKey)) throw new TRPCError({ code: "BAD_REQUEST", message: "Mẫu số, ký hiệu và số Hóa đơn này đã tồn tại." });
      const id = await createPurchaseInvoice({ ...input, invoiceKey, purchaseContractId: input.purchaseContractId ?? null, receivedAt: input.receivedAt ?? null, exchangeRate: input.exchangeRate ?? null, sourceInvoiceId: input.sourceInvoiceId ?? null, note: input.note ?? null, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "purchaseInvoice", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo Hóa đơn mua bán ${invoiceKey}${input.purchaseContractId ? ` thuộc Hợp đồng ${contract?.referenceCode}` : " không gán Hợp đồng"}` });
      return { id, invoiceKey };
    }),
    update: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      invoiceNumber: z.string().trim().min(1).max(64).optional(),
      invoiceSeries: z.string().trim().max(64).nullable().optional(),
      invoiceTemplate: z.string().trim().max(64).nullable().optional(),
      invoiceType: z.enum(["vat", "electronic", "retail", "adjustment", "replacement", "other"]).optional(),
      status: z.enum(["draft", "issued", "adjusted", "replaced", "cancelled"]).optional(),
      vendorId: z.number().int().positive().optional(),
      purchaseContractId: z.number().int().positive().nullable().optional(),
      issuedAt: z.number().int().positive().transform((value) => new Date(value)).optional(),
      receivedAt: dateFromMs.optional(),
      currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
      exchangeRate: z.string().regex(/^\d+(\.\d{1,6})?$/).nullable().optional(),
      subtotalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      sourceInvoiceId: z.number().int().positive().nullable().optional(),
      note: nullableText,
    })).mutation(async ({ input, ctx }) => {
      const current = await getPurchaseInvoiceById(input.id);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hóa đơn mua bán." });
      const vendorId = input.vendorId ?? current.vendorId;
      if (input.vendorId && !(await getVendorById(input.vendorId))) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Nhà cung cấp trên Hóa đơn." });
      const contractId = input.purchaseContractId === undefined ? current.purchaseContractId : input.purchaseContractId;
      const contract = contractId ? await getPurchaseContractById(contractId) : null;
      if (contractId && !contract) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hợp đồng được chọn." });
      if (contract?.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Không thể liên kết Hóa đơn với Hợp đồng đã hủy." });
      if (contract?.vendorId && contract.vendorId !== vendorId) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp Hóa đơn phải khớp với Nhà cung cấp của Hợp đồng được chọn." });
      const invoiceNumber = input.invoiceNumber ?? current.invoiceNumber;
      const invoiceSeries = input.invoiceSeries === undefined ? current.invoiceSeries : input.invoiceSeries;
      const invoiceTemplate = input.invoiceTemplate === undefined ? current.invoiceTemplate : input.invoiceTemplate;
      const invoiceKey = [invoiceTemplate, invoiceSeries, invoiceNumber].filter(Boolean).join(" · ").toUpperCase();
      const duplicate = await getPurchaseInvoiceByKey(invoiceKey);
      if (duplicate && duplicate.id !== current.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Mẫu số, ký hiệu và số Hóa đơn này đã tồn tại." });
      const { id, purchaseContractId: _purchaseContractId, ...changes } = input;
      await updatePurchaseInvoice(id, { ...changes, invoiceKey, vendorId, purchaseContractId: contractId ?? null });
      await recordActivity({ entityType: "purchaseInvoice", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật Hóa đơn mua bán ${invoiceKey}` });
      return { success: true };
    }),
    createLine: adminProcedure.input(z.object({
      purchaseInvoiceId: z.number().int().positive(),
      lineNumber: z.number().int().positive(),
      itemType: z.enum(["asset", "supply", "service", "other"]),
      itemCode: z.string().trim().max(64).nullable().optional(),
      itemName: z.string().trim().min(1).max(255),
      description: nullableText,
      quantity: z.string().regex(/^\d+(\.\d{1,3})?$/, "Số lượng dòng Hóa đơn không hợp lệ."),
      unit: z.string().trim().max(32).nullable().optional(),
      unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
      discountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
      taxRate: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
      taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
      lineTotal: z.string().regex(/^\d+(\.\d{1,2})?$/),
      note: nullableText,
    })).mutation(async ({ input, ctx }) => {
      const invoice = await getPurchaseInvoiceById(input.purchaseInvoiceId);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hóa đơn mua bán." });
      if (invoice.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Hóa đơn đã hủy không thể thêm dòng." });
      requireWholeQuantity(input.unit, input.quantity, "Số lượng dòng Hóa đơn");
      const id = await createPurchaseInvoiceLine({ ...input, itemCode: input.itemCode ?? null, description: input.description ?? null, unit: input.unit ?? null, note: input.note ?? null });
      await recordActivity({ entityType: "purchaseInvoiceLine", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Thêm dòng ${input.lineNumber}: ${input.itemName} vào Hóa đơn ${invoice.invoiceKey}` });
      return { id };
    }),
    receiveSupply: adminProcedure.input(z.object({
      purchaseInvoiceLineId: z.number().int().positive(),
      supplyId: z.number().int().positive(),
      receivedQuantity: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((value) => Number(value) > 0, "Số lượng nhập phải lớn hơn 0."),
      unitCost: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
      taxRate: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
      taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
      totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      receivedAt: dateFromMs,
      note: nullableText,
    })).mutation(async ({ input, ctx }) => runInventoryTransaction(async (transaction) => {
      const line = await getPurchaseInvoiceLineById(input.purchaseInvoiceLineId, transaction);
      if (!line) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy dòng Hóa đơn." });
      if (line.itemType !== "supply") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ dòng loại Phụ kiện mới được nhập kho." });
      const invoice = await getPurchaseInvoiceById(line.purchaseInvoiceId, transaction);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hóa đơn mua bán." });
      if (invoice.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Không thể nhập kho từ Hóa đơn đã hủy." });
      const supply = await getInventorySupplyById(input.supplyId, transaction);
      if (!supply) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Phụ kiện cần nhập kho." });
      requireWholeQuantity(supply.unit, input.receivedQuantity, "Số lượng tiếp nhận");
      const receipts = await listPurchaseInvoiceSupplyReceipts(line.id, transaction);
      const receivedBefore = receipts.reduce((total: number, receipt: { status: string; receivedQuantity: string }) => receipt.status === "received" ? total + Number(receipt.receivedQuantity) : total, 0);
      const receivedQuantity = Number(input.receivedQuantity);
      if (receivedBefore + receivedQuantity > Number(line.quantity)) throw new TRPCError({ code: "BAD_REQUEST", message: `Số lượng nhập vượt số lượng trên dòng Hóa đơn (${line.quantity} ${line.unit || ""}).` });
      const quantityBefore = Number(supply.stockQuantity);
      const quantityAfter = quantityBefore + receivedQuantity;
      const receivedAt = input.receivedAt ?? new Date();
      const movementId = await createInventoryMovement({ supplyId: supply.id, movementType: "receipt", quantity: input.receivedQuantity, quantityBefore: String(quantityBefore), quantityAfter: String(quantityAfter), handoverId: null, issueSlipId: null, issueSlipItemId: null, recipientUserId: null, recipientName: null, recipientDepartmentId: null, note: `Nhập từ Hóa đơn ${invoice.invoiceKey} · Dòng ${line.lineNumber}: ${line.itemName}`, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
      const receiptId = await createPurchaseInvoiceSupplyReceipt({ purchaseInvoiceLineId: line.id, supplyId: supply.id, receivedQuantity: input.receivedQuantity, unitCost: input.unitCost ?? line.unitPrice, taxRate: input.taxRate, taxAmount: input.taxAmount, totalAmount: input.totalAmount, inventoryMovementId: movementId, status: "received", receivedAt, note: input.note ?? null, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
      await updateInventorySupply(supply.id, { stockQuantity: String(quantityAfter) }, transaction);
      await recordActivity({ entityType: "purchaseInvoiceSupplyReceipt", entityId: receiptId, action: "received", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Nhập ${input.receivedQuantity} ${supply.unit} ${supply.name} từ Hóa đơn ${invoice.invoiceKey}` }, transaction);
      return { id: receiptId, inventoryMovementId: movementId, quantityAfter };
    })),
    createSupplyAndReceive: adminProcedure.input(z.object({
      purchaseInvoiceLineId: z.number().int().positive(),
      code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9-]+$/).transform((value) => value.toUpperCase()),
      name: z.string().trim().min(2).max(255),
      unit: z.string().trim().min(1).max(32),
      receivedQuantity: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((value) => Number(value) > 0, "Số lượng nhập phải lớn hơn 0."),
      minimumQuantity: z.number().finite().min(0).default(0),
      categoryId: z.number().int().positive().nullable().optional(),
      brandId: z.number().int().positive().nullable().optional(),
      location: nullableText,
      note: nullableText,
    })).mutation(async ({ input, ctx }) => runInventoryTransaction(async (transaction) => {
      const line = await getPurchaseInvoiceLineById(input.purchaseInvoiceLineId, transaction);
      if (!line) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy dòng Hóa đơn." });
      if (line.itemType !== "supply") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ dòng loại Phụ kiện mới có thể tạo và tiếp nhận Phụ kiện." });
      const invoice = await getPurchaseInvoiceById(line.purchaseInvoiceId, transaction);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hóa đơn mua bán." });
      if (invoice.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Không thể tiếp nhận từ Hóa đơn đã hủy." });
      if (await getInventorySupplyByCode(input.code, transaction)) throw new TRPCError({ code: "BAD_REQUEST", message: "Mã Phụ kiện này đã tồn tại. Hãy chọn Phụ kiện có sẵn để tiếp nhận." });
      requireWholeQuantity(input.unit, input.receivedQuantity, "Số lượng tiếp nhận");
      const receipts = await listPurchaseInvoiceSupplyReceipts(line.id, transaction);
      const receivedBefore = receipts.reduce((total: number, receipt: { status: string; receivedQuantity: string }) => receipt.status === "received" ? total + Number(receipt.receivedQuantity) : total, 0);
      const receivedQuantity = Number(input.receivedQuantity);
      if (receivedBefore + receivedQuantity > Number(line.quantity)) throw new TRPCError({ code: "BAD_REQUEST", message: `Số lượng nhập vượt số lượng trên dòng Hóa đơn (${line.quantity} ${line.unit || ""}).` });
      const taxAmount = Math.round(receivedQuantity * Number(line.unitPrice) * Number(line.taxRate) / 100 * 100) / 100;
      const totalAmount = Math.round(receivedQuantity * Number(line.unitPrice) * (1 + Number(line.taxRate) / 100) * 100) / 100;
      const supplyId = await createInventorySupply({ code: input.code, name: input.name, categoryId: input.categoryId ?? null, vendorId: invoice.vendorId, brandId: input.brandId ?? null, purchaseContractId: null, unit: input.unit, stockQuantity: String(receivedQuantity), minimumQuantity: String(input.minimumQuantity), unitCost: line.unitPrice, location: input.location ?? null, note: input.note ?? null, isActive: true, createdByUserId: ctx.user!.id }, transaction);
      const movementId = await createInventoryMovement({ supplyId, movementType: "receipt", quantity: input.receivedQuantity, quantityBefore: "0", quantityAfter: String(receivedQuantity), handoverId: null, issueSlipId: null, issueSlipItemId: null, recipientUserId: null, recipientName: null, recipientDepartmentId: null, note: `Tạo và nhập từ Hóa đơn ${invoice.invoiceKey} · Dòng ${line.lineNumber}: ${line.itemName}`, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
      const receiptId = await createPurchaseInvoiceSupplyReceipt({ purchaseInvoiceLineId: line.id, supplyId, receivedQuantity: input.receivedQuantity, unitCost: line.unitPrice, taxRate: line.taxRate, taxAmount: String(taxAmount), totalAmount: String(totalAmount), inventoryMovementId: movementId, status: "received", receivedAt: new Date(), note: input.note ?? null, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
      await recordActivity({ entityType: "supply", entityId: supplyId, action: "created_from_purchase_invoice", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo Phụ kiện ${input.name} (${input.code}) và nhập ${input.receivedQuantity} ${input.unit} từ Hóa đơn ${invoice.invoiceKey}` }, transaction);
      await recordActivity({ entityType: "purchaseInvoiceSupplyReceipt", entityId: receiptId, action: "created_and_received", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo mới và tiếp nhận ${input.receivedQuantity} ${input.unit} ${input.name} từ Hóa đơn ${invoice.invoiceKey}` }, transaction);
      return { supplyId, receiptId, inventoryMovementId: movementId, quantityAfter: receivedQuantity };
    })),
    updateLine: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      lineNumber: z.number().int().positive().optional(),
      itemType: z.enum(["asset", "supply", "service", "other"]).optional(),
      itemCode: z.string().trim().max(64).nullable().optional(),
      itemName: z.string().trim().min(1).max(255).optional(),
      description: nullableText,
      quantity: z.string().regex(/^\d+(\.\d{1,3})?$/, "Số lượng dòng Hóa đơn không hợp lệ.").optional(),
      unit: z.string().trim().max(32).nullable().optional(),
      unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      discountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      taxRate: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      lineTotal: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      note: nullableText,
    })).mutation(async ({ input, ctx }) => {
      const line = await getPurchaseInvoiceLineById(input.id);
      if (!line) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy dòng Hóa đơn." });
      requireWholeQuantity(input.unit === undefined ? line.unit : input.unit, input.quantity ?? line.quantity, "Số lượng dòng Hóa đơn");
      const { id, ...changes } = input;
      await updatePurchaseInvoiceLine(id, changes);
      await recordActivity({ entityType: "purchaseInvoiceLine", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật dòng ${changes.lineNumber ?? line.lineNumber} của Hóa đơn` });
      return { success: true };
    }),
    removeLine: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const line = await getPurchaseInvoiceLineById(input.id);
      if (!line) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy dòng Hóa đơn." });
      const linkedAssets = (await listAssetsByPurchaseInvoiceId(line.purchaseInvoiceId)).filter((asset) => asset.purchaseInvoiceLineId === line.id);
      if (linkedAssets.length) throw new TRPCError({ code: "CONFLICT", message: `Không thể xóa dòng đang liên kết ${linkedAssets.length} Tài sản.` });
      await deletePurchaseInvoiceLine(line.id);
      await recordActivity({ entityType: "purchaseInvoiceLine", entityId: line.id, action: "removed", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Xóa dòng ${line.lineNumber} của Hóa đơn` });
      return { success: true };
    }),
    attachAsset: adminProcedure.input(z.object({ purchaseInvoiceId: z.number().int().positive(), purchaseInvoiceLineId: z.number().int().positive().nullable().optional(), assetId: z.number().int().positive() })).mutation(async ({ input, ctx }) => runPurchaseInvoiceTransaction(async (transaction) => {
      const [invoice, asset] = await Promise.all([getPurchaseInvoiceById(input.purchaseInvoiceId, transaction), getAssetById(input.assetId)]);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hóa đơn mua bán." });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Tài sản." });
      if (invoice.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Không thể gán Tài sản vào Hóa đơn đã hủy." });
      let line = null;
      if (input.purchaseInvoiceLineId) {
        line = await getPurchaseInvoiceLineById(input.purchaseInvoiceLineId, transaction);
        if (!line || line.purchaseInvoiceId !== invoice.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Dòng Hóa đơn không thuộc Hóa đơn được chọn." });
        if (line.itemType !== "asset") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ dòng loại Tài sản mới được dùng để gán Tài sản." });
      }
      const vendor = await getVendorById(invoice.vendorId);
      await updateAssetPurchaseInvoiceReference(asset.id, { purchaseInvoiceId: invoice.id, purchaseInvoiceLineId: line?.id ?? null, vendorId: invoice.vendorId, vendor: vendor?.name ?? asset.vendor ?? null }, transaction);
      await recordActivity({ entityType: "asset", entityId: asset.id, action: "purchase_invoice_attached", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Liên kết Tài sản ${asset.assetCode} với Hóa đơn ${invoice.invoiceKey}` }, transaction);
      return { success: true };
    })),
    detachAsset: adminProcedure.input(z.object({ assetId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const asset = await getAssetById(input.assetId);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Tài sản." });
      await updateAssetPurchaseInvoiceReference(asset.id, { purchaseInvoiceId: null, purchaseInvoiceLineId: null });
      await recordActivity({ entityType: "asset", entityId: asset.id, action: "purchase_invoice_detached", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Gỡ liên kết Hóa đơn khỏi Tài sản ${asset.assetCode}` });
      return { success: true };
    }),
    uploadDocument: adminProcedure.input(z.object({
      purchaseInvoiceId: z.number().int().positive(),
      documentType: z.enum(["invoice_pdf", "invoice_xml", "scan", "delivery_note", "adjustment", "other"]),
      fileName: z.string().trim().min(1).max(255),
      contentType: z.enum(["application/pdf", "application/xml", "image/png", "image/jpeg"]),
      dataUrl: z.string().max(7_500_000).regex(/^data:(application\/pdf|application\/xml|image\/(png|jpeg));base64,/),
    })).mutation(async ({ input, ctx }) => {
      const invoice = await getPurchaseInvoiceById(input.purchaseInvoiceId);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hóa đơn mua bán." });
      const buffer = Buffer.from(input.dataUrl.split(",", 2)[1], "base64");
      if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Tài liệu phải có dung lượng từ 1 byte đến 5 MB." });
      const extensionByContentType: Record<string, string> = { "application/pdf": "pdf", "application/xml": "xml", "image/png": "png", "image/jpeg": "jpg" };
      const safeBaseName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "hoa-don-mua-ban";
      const storageKey = `purchase-invoices/${invoice.id}/documents/${Date.now()}-${safeBaseName}.${extensionByContentType[input.contentType]}`;
      const { url } = await storagePut(storageKey, buffer, input.contentType);
      const id = await createPurchaseInvoiceDocument({ purchaseInvoiceId: invoice.id, documentType: input.documentType, fileName: input.fileName, contentType: input.contentType, fileSize: buffer.length, storageKey, url, uploadedByUserId: ctx.user!.id, uploadedByName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "purchaseInvoiceDocument", entityId: id, action: "uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tải chứng từ ${input.fileName} cho Hóa đơn ${invoice.invoiceKey}` });
      return { id, url, fileName: input.fileName, contentType: input.contentType, fileSize: buffer.length };
    }),
    removeDocument: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const document = await getPurchaseInvoiceDocumentById(input.id);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy chứng từ Hóa đơn." });
      await deletePurchaseInvoiceDocument(document.id);
      await recordActivity({ entityType: "purchaseInvoiceDocument", entityId: document.id, action: "removed", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Gỡ chứng từ ${document.fileName}` });
      return { success: true };
    }),
  }),
  brands: router({
    list: adminProcedure.query(() => listBrands()),
    listAll: adminProcedure.query(() => listAllBrands()),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(160) })).mutation(async ({ input, ctx }) => {
      if (await getBrandByName(input.name)) throw new TRPCError({ code: "BAD_REQUEST", message: "Hãng này đã tồn tại." });
      const id = await createBrand({ name: input.name, isActive: true });
      await recordActivity({ entityType: "brand", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo Hãng: ${input.name}` });
      return { id };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(160).optional(), isActive: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
      const existing = await getBrandById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Hãng." });
      if (input.name && input.name !== existing.name && await getBrandByName(input.name)) throw new TRPCError({ code: "BAD_REQUEST", message: "Tên Hãng đã tồn tại." });
      const { id, ...changes } = input;
      await updateBrand(id, changes);
      const action = input.isActive === false ? "deactivated" : input.isActive === true ? "activated" : "updated";
      await recordActivity({ entityType: "brand", entityId: id, action, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `${input.isActive === false ? "Vô hiệu hóa" : input.isActive === true ? "Kích hoạt" : "Cập nhật"} Hãng: ${input.name || existing.name}` });
      return { success: true };
    }),
  }),
  supplyUnits: router({
    list: protectedProcedure.query(async () => {
      const [units, usageRows] = await Promise.all([listSupplyUnits(), listSupplyUnitUsageCounts()]);
      const usageByUnit = new Map(usageRows.map((row) => [row.unit, Number(row.usageCount || 0)]));
      return units.map((unit) => ({ ...unit, usageCount: usageByUnit.get(unit.name) || 0 }));
    }),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(1).max(32) })).mutation(async ({ input, ctx }) => {
      if (await getSupplyUnitByName(input.name)) throw new TRPCError({ code: "BAD_REQUEST", message: "Đơn vị tính này đã tồn tại." });
      const id = await createSupplyUnit({ name: input.name, isActive: true });
      await recordActivity({ entityType: "supplyUnit", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo đơn vị tính chuẩn: ${input.name}` });
      return { id };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(32).optional(), isActive: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
      const existing = await getSupplyUnitById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đơn vị tính." });
      if (input.name && input.name !== existing.name && await getSupplyUnitByName(input.name)) throw new TRPCError({ code: "BAD_REQUEST", message: "Đơn vị tính này đã tồn tại." });
      const { id, ...changes } = input;
      await updateSupplyUnit(id, changes);
      const action = input.isActive === false ? "deactivated" : input.isActive === true ? "activated" : "updated";
      await recordActivity({ entityType: "supplyUnit", entityId: id, action, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `${input.isActive === false ? "Vô hiệu hóa" : input.isActive === true ? "Kích hoạt" : "Cập nhật"} đơn vị tính chuẩn: ${input.name || existing.name}` });
      return { success: true };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive(), confirmUsage: z.boolean().optional().default(false) })).mutation(async ({ input, ctx }) => {
      const existing = await getSupplyUnitById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đơn vị tính." });
      const usageCount = await countInventorySuppliesByUnit(existing.name);
      if (usageCount > 0 && !input.confirmUsage) throw new TRPCError({ code: "BAD_REQUEST", message: `Đơn vị tính “${existing.name}” đang được ${usageCount} phụ kiện sử dụng. Hãy xác nhận trước khi xóa.` });
      await deleteSupplyUnit(input.id);
      await recordActivity({ entityType: "supplyUnit", entityId: input.id, action: "deleted", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Xóa đơn vị tính chuẩn: ${existing.name}${usageCount ? ` (${usageCount} phụ kiện đang sử dụng)` : ""}` });
      return { success: true, usageCount };
    }),
  }),
  branches: router({
    list: adminProcedure.query(async () => {
      const [items, usageRows] = await Promise.all([
        listBranches(),
        listBranches().then((branches) => Promise.all(branches.map(async (branch) => ({ id: branch.id, ...(await getBranchUsageCounts(branch.id)) })))),
      ]);
      const usageById = new Map(usageRows.map((item) => [item.id, item]));
      return items.map((branch) => ({ ...branch, ...(usageById.get(branch.id) || { userCount: 0, assetCount: 0 }) }));
    }),
    create: adminProcedure.input(z.object({ code: z.string().trim().min(1).max(40), name: z.string().trim().min(1).max(160), address: z.string().trim().max(1000).nullable().optional(), phone: z.string().trim().max(32).nullable().optional(), email: nullableEmail })).mutation(async ({ input, ctx }) => {
      await ensureInternalBranchEmail(input.email);
      if (await getBranchByCode(input.code)) throw new TRPCError({ code: "BAD_REQUEST", message: "Mã Chi nhánh đã tồn tại." });
      if (await getBranchByName(input.name)) throw new TRPCError({ code: "BAD_REQUEST", message: "Tên Chi nhánh đã tồn tại." });
      const id = await createBranch({ ...input, isActive: true });
      await recordActivity({ entityType: "branch", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo Chi nhánh: ${input.name} (${input.code})` });
      return { id };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), code: z.string().trim().min(1).max(40).optional(), name: z.string().trim().min(1).max(160).optional(), address: z.string().trim().max(1000).nullable().optional(), phone: z.string().trim().max(32).nullable().optional(), email: nullableEmail, isActive: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
      const existing = await getBranchById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Chi nhánh." });
      if (input.email !== undefined) await ensureInternalBranchEmail(input.email);
      if (input.code && input.code !== existing.code && await getBranchByCode(input.code)) throw new TRPCError({ code: "BAD_REQUEST", message: "Mã Chi nhánh đã tồn tại." });
      if (input.name && input.name !== existing.name && await getBranchByName(input.name)) throw new TRPCError({ code: "BAD_REQUEST", message: "Tên Chi nhánh đã tồn tại." });
      const { id, ...changes } = input;
      await updateBranch(id, changes);
      const action = input.isActive === false ? "deactivated" : input.isActive === true ? "activated" : "updated";
      await recordActivity({ entityType: "branch", entityId: id, action, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `${input.isActive === false ? "Vô hiệu hóa" : input.isActive === true ? "Kích hoạt" : "Cập nhật"} Chi nhánh: ${input.name || existing.name}` });
      return { success: true };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive(), confirmUsage: z.boolean().optional().default(false) })).mutation(async ({ input, ctx }) => {
      const existing = await getBranchById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Chi nhánh." });
      const usage = await getBranchUsageCounts(input.id);
      const totalUsage = usage.userCount + usage.assetCount;
      if (totalUsage > 0 && !input.confirmUsage) throw new TRPCError({ code: "BAD_REQUEST", message: `Chi nhánh “${existing.name}” đang được ${usage.userCount} nhân sự và ${usage.assetCount} tài sản sử dụng. Hãy xác nhận trước khi xóa.` });
      await deleteBranch(input.id);
      await recordActivity({ entityType: "branch", entityId: input.id, action: "deleted", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Xóa Chi nhánh: ${existing.name}` });
      return { success: true, ...usage };
    }),
  }),
  assetCategories: router({
    list: adminProcedure.query(() => listAssetCategories()),
    listAll: adminProcedure.query(() => listAllAssetCategories()),
    nextCode: adminProcedure.input(z.object({ categoryId: z.number().int().positive() })).query(async ({ input }) => {
      const category = await getAssetCategoryById(input.categoryId);
      if (!category || !category.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phân loại đang hoạt động." });
      return { assetCode: await getNextAssetCodeForPrefix(category.code) };
    }),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(160), code: z.string().trim().min(1).max(12).regex(/^[A-Za-z0-9-]+$/).transform((value) => value.toUpperCase()), description: nullableText })).mutation(async ({ input, ctx }) => {
      if (await getAssetCategoryByCode(input.code)) throw new TRPCError({ code: "BAD_REQUEST", message: "Tiền tố mã này đã được sử dụng." });
      const id = await createAssetCategory({ ...input, isActive: true });
      await recordActivity({ entityType: "asset_category", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo phân loại ${input.name} (${input.code})` });
      return { id };
    }),
    createAccessoryGroup: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(160) })).mutation(async ({ input, ctx }) => {
      if (await getAssetCategoryByName(input.name)) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhóm phụ kiện này đã tồn tại." });
      const code = `PKG-${String(await getNextAccessoryGroupSequence()).padStart(3, "0")}`;
      const id = await createAssetCategory({ name: input.name, code, description: "Nhóm phụ kiện", isActive: true });
      await recordActivity({ entityType: "asset_category", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo nhóm phụ kiện ${input.name} (${code})` });
      return { id, code, name: input.name };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(160).optional(), code: z.string().trim().min(1).max(12).regex(/^[A-Za-z0-9-]+$/).transform((value) => value.toUpperCase()).optional(), description: nullableText, isActive: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
      const existing = await getAssetCategoryById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phân loại." });
      if (input.code && input.code !== existing.code) {
        const duplicate = await getAssetCategoryByCode(input.code);
        if (duplicate) throw new TRPCError({ code: "BAD_REQUEST", message: "Tiền tố mã này đã được sử dụng." });
      }
      await updateAssetCategory(input.id, { name: input.name, code: input.code, description: input.description, isActive: input.isActive });
      await recordActivity({ entityType: "asset_category", entityId: input.id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật phân loại ${input.name || existing.name}` });
      return { success: true };
    }),
    bulkMoveAssets: adminProcedure.input(z.object({ sourceCategoryId: z.number().int().positive(), targetCategoryId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      if (input.sourceCategoryId === input.targetCategoryId) throw new TRPCError({ code: "BAD_REQUEST", message: "Phân loại đích phải khác Phân loại nguồn." });
      const source = await getAssetCategoryById(input.sourceCategoryId);
      const target = await getAssetCategoryById(input.targetCategoryId);
      if (!source || !target) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Phân loại nguồn hoặc đích." });
      if (!target.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Phân loại đích đã ngừng hoạt động." });
      const sourceAssets = (await listAssets()).filter((asset) => asset.categoryId === input.sourceCategoryId);
      for (const asset of sourceAssets) await updateAsset(asset.id, { categoryId: input.targetCategoryId });
      await recordActivity({ entityType: "asset_category", entityId: input.sourceCategoryId, action: "assets_moved", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Chuyển ${sourceAssets.length} tài sản từ ${source.name} sang ${target.name}` });
      return { moved: sourceAssets.length };
    }),
    delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const existing = await getAssetCategoryById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phân loại." });
      if (await countAssetsByCategoryId(input.id)) throw new TRPCError({ code: "BAD_REQUEST", message: "Không thể xóa phân loại đang được gán cho tài sản." });
      await deleteAssetCategory(input.id);
      await recordActivity({ entityType: "asset_category", entityId: input.id, action: "deleted", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Xóa phân loại ${existing.name}` });
      return { success: true };
    }),
  }),
  supplies: router({
    list: adminProcedure.query(() => listInventorySupplies()),
    history: adminProcedure.input(z.object({ supplyId: z.number().int().positive(), page: z.number().int().positive().default(1), pageSize: z.number().int().min(1).max(50).default(10) })).query(({ input }) => listInventoryMovements(input.supplyId, input.page, input.pageSize)),
    historyReport: adminProcedure.query(() => listInventoryMovementReport()),
    importHistory: adminProcedure.input(z.object({ page: z.number().int().positive().default(1), pageSize: z.number().int().min(1).max(50).default(10) })).query(({ input }) => listSupplyImportSessions(input.page, input.pageSize)),
    importHistoryItems: adminProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ input }) => {
      const session = await getSupplyImportSessionById(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiên import phụ kiện." });
      return { session, items: await listSupplyImportItems(session.id) };
    }),
    issueAnalytics: adminProcedure.query(() => listSupplyIssueAnalytics()),
    handoverHoldings: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ input }) => listActiveHandoverSupplyHoldingsByRecipientUserId(input.userId)),
    issueSlips: adminProcedure.query(() => listSupplyIssueSlips()),
    issueSlipItems: adminProcedure.input(z.object({ issueSlipId: z.number().int().positive() })).query(({ input }) => listSupplyIssueSlipItems(input.issueSlipId)),
    createIssueSlip: adminProcedure.input(z.object({
      recipientUserId: z.number().int().positive().nullable().optional(),
      recipientName: z.string().trim().max(160).optional(),
      recipientDepartmentId: z.number().int().positive().nullable().optional(),
      note: nullableText,
      items: z.array(z.object({ supplyId: z.number().int().positive(), quantity: z.number().finite().positive() })).min(1).max(50),
    }).superRefine((input, issue) => {
      if (!input.recipientUserId && !input.recipientName) issue.addIssue({ code: z.ZodIssueCode.custom, path: ["recipientName"], message: "Vui lòng chọn nhân sự hoặc nhập người nhận khác." });
      if (new Set(input.items.map((item) => item.supplyId)).size !== input.items.length) issue.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Một phụ kiện chỉ được xuất một lần trong cùng phiếu." });
    })).mutation(async ({ input, ctx }) => {
      const recipientUser = input.recipientUserId ? (await listUsers()).find((user) => user.id === input.recipientUserId && user.isActive) : null;
      if (input.recipientUserId && !recipientUser) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy nhân sự đang hoạt động được chọn." });
      const recipientName = recipientUser?.name || input.recipientName?.trim();
      if (!recipientName) throw new TRPCError({ code: "BAD_REQUEST", message: "Vui lòng cung cấp người nhận phụ kiện." });
      const issueYear = new Date().getFullYear();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          return await runInventoryTransaction(async (transaction) => {
            const sequence = await getNextSupplyIssueSequence(issueYear, transaction);
            const referenceCode = `PK-${issueYear}-${String(sequence).padStart(3, "0")}`;
            const issueSlipId = await createSupplyIssueSlip({ referenceCode, recipientUserId: recipientUser?.id ?? null, recipientName, recipientDepartmentId: recipientUser?.departmentId ?? input.recipientDepartmentId ?? null, status: "active", note: input.note ?? null, issuedByUserId: ctx.user!.id, issuedByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
            for (const requestItem of input.items) {
              const supply = await getInventorySupplyById(requestItem.supplyId, transaction);
              if (!supply || !supply.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phụ kiện đang hoạt động." });
              requireWholeQuantity(supply.unit, requestItem.quantity, "Số lượng cấp phát");
              const before = Number(supply.stockQuantity);
              const after = before - requestItem.quantity;
              if (after < 0) throw new TRPCError({ code: "BAD_REQUEST", message: `Tồn kho ${supply.name} không đủ. Hiện còn ${before} ${supply.unit}.` });
              await updateInventorySupply(supply.id, { stockQuantity: String(after) }, transaction);
              const issueSlipItemId = await createSupplyIssueSlipItem({ issueSlipId, supplyId: supply.id, supplyCode: supply.code, supplyName: supply.name, unit: supply.unit, issuedQuantity: String(requestItem.quantity), returnedQuantity: "0" }, transaction);
              await createInventoryMovement({ supplyId: supply.id, movementType: "issue", quantity: String(-requestItem.quantity), quantityBefore: String(before), quantityAfter: String(after), issueSlipId, issueSlipItemId, recipientUserId: recipientUser?.id ?? null, recipientName, recipientDepartmentId: recipientUser?.departmentId ?? input.recipientDepartmentId ?? null, note: `Cấp phát theo phiếu ${referenceCode}${input.note ? `: ${input.note}` : ""}`, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
            }
            await recordActivity({ entityType: "supply_issue_slip", entityId: issueSlipId, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo phiếu cấp phát phụ kiện ${referenceCode} cho ${recipientName}` }, transaction);
            return { id: issueSlipId, referenceCode };
          });
        } catch (error) {
          const duplicateCode = typeof error === "object" && error !== null && (("code" in error && error.code === "ER_DUP_ENTRY") || ("errno" in error && Number(error.errno) === 1062));
          if (!duplicateCode || attempt === 4) throw error;
        }
      }
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Không thể tạo mã phiếu cấp phát duy nhất." });
    }),
    returnIssueItem: adminProcedure.input(z.object({ issueSlipItemId: z.number().int().positive(), quantity: z.number().finite().positive(), note: z.string().trim().min(2).max(1000) })).mutation(async ({ input, ctx }) => runInventoryTransaction(async (transaction) => {
      const item = await getSupplyIssueSlipItemById(input.issueSlipItemId, transaction);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy dòng phụ kiện đã cấp phát." });
      const issueSlip = await getSupplyIssueSlipById(item.issueSlipId, transaction);
      if (!issueSlip || issueSlip.status === "returned") throw new TRPCError({ code: "BAD_REQUEST", message: "Phiếu cấp phát này đã hoàn trả toàn bộ." });
      const availableToReturn = Number(item.issuedQuantity) - Number(item.returnedQuantity);
      if (input.quantity > availableToReturn) throw new TRPCError({ code: "BAD_REQUEST", message: `Chỉ có thể hoàn trả tối đa ${availableToReturn} ${item.unit}.` });
      const supply = await getInventorySupplyById(item.supplyId, transaction);
      if (!supply) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phụ kiện trong kho." });
      requireWholeQuantity(item.unit, input.quantity, "Số lượng hoàn trả");
      const before = Number(supply.stockQuantity);
      const after = before + input.quantity;
      await updateInventorySupply(supply.id, { stockQuantity: String(after) }, transaction);
      const returnedQuantity = Number(item.returnedQuantity) + input.quantity;
      await updateSupplyIssueSlipItem(item.id, { returnedQuantity: String(returnedQuantity) }, transaction);
      await createInventoryMovement({ supplyId: supply.id, movementType: "return", quantity: String(input.quantity), quantityBefore: String(before), quantityAfter: String(after), issueSlipId: issueSlip.id, issueSlipItemId: item.id, recipientUserId: issueSlip.recipientUserId ?? null, recipientName: issueSlip.recipientName, recipientDepartmentId: issueSlip.recipientDepartmentId ?? null, note: `Hoàn trả theo phiếu ${issueSlip.referenceCode}: ${input.note}`, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
      const items = await listSupplyIssueSlipItems(issueSlip.id, transaction);
      const isFullyReturned = items.every((row: { id: number; issuedQuantity: string; returnedQuantity: string }) => row.id === item.id ? Number(row.issuedQuantity) <= returnedQuantity : Number(row.issuedQuantity) <= Number(row.returnedQuantity));
      if (isFullyReturned) await updateSupplyIssueSlip(issueSlip.id, { status: "returned", returnedAt: new Date() }, transaction);
      await recordActivity({ entityType: "supply_issue_slip", entityId: issueSlip.id, action: "item_returned", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Hoàn trả ${input.quantity} ${item.unit} theo phiếu ${issueSlip.referenceCode}` }, transaction);
      return { success: true, stockQuantity: after, fullyReturned: isFullyReturned };
    })),
    create: adminProcedure.input(z.object({
      code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9-]+$/).transform((value) => value.toUpperCase()),
      name: z.string().trim().min(2).max(255),
      categoryId: z.number().int().positive().nullable().optional(),
      vendorId: z.number().int().positive().nullable().optional(),
      brandId: z.number().int().positive().nullable().optional(),
      purchaseContractId: z.number().int().positive().nullable().optional(),
      unit: z.string().trim().min(1).max(32).default("Cái"),
      openingQuantity: z.number().finite().min(0).default(0),
      minimumQuantity: z.number().finite().min(0).default(0),
      unitCost: z.number().finite().min(0).nullable().optional(),
      location: nullableText,
      note: nullableText,
    })).mutation(async ({ input, ctx }) => {
      if (await getInventorySupplyByCode(input.code)) throw new TRPCError({ code: "BAD_REQUEST", message: "Mã phụ kiện này đã tồn tại." });
      requireWholeQuantity(input.unit, input.openingQuantity, "Tồn đầu kỳ");
      requireWholeQuantity(input.unit, input.minimumQuantity, "Mức tồn tối thiểu");
      const linkedContract = await requireUsablePurchaseContract(input.purchaseContractId);
      const contractVendor = linkedContract?.vendorId ? await getVendorById(linkedContract.vendorId) : null;
      const resolvedVendorId = linkedContract?.vendorId ?? input.vendorId ?? null;
      if (resolvedVendorId && !contractVendor && !(await getVendorById(resolvedVendorId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp được chọn không tồn tại hoặc đã ngừng hoạt động." });
      return runInventoryTransaction(async (transaction) => {
        const unitCost = input.unitCost === null || input.unitCost === undefined ? null : String(input.unitCost);
        const supplyId = await createInventorySupply({ code: input.code, name: input.name, categoryId: input.categoryId ?? null, vendorId: resolvedVendorId, brandId: input.brandId ?? null, purchaseContractId: input.purchaseContractId ?? null, unit: input.unit, stockQuantity: String(input.openingQuantity), minimumQuantity: String(input.minimumQuantity), unitCost, location: input.location ?? null, note: input.note ?? null, isActive: true, createdByUserId: ctx.user!.id }, transaction);
        if (input.purchaseContractId) await syncSupplyPurchaseContractItem({ id: supplyId, code: input.code, name: input.name, purchaseContractId: input.purchaseContractId, stockQuantity: String(input.openingQuantity), unit: input.unit, unitCost }, transaction);
        if (input.openingQuantity > 0) await createInventoryMovement({ supplyId, movementType: "receipt", quantity: String(input.openingQuantity), quantityBefore: "0", quantityAfter: String(input.openingQuantity), note: "Tồn đầu kỳ khi tạo phụ kiện", createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
        await recordActivity({ entityType: "supply", entityId: supplyId, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo phụ kiện ${input.name} (${input.code}), tồn đầu ${input.openingQuantity} ${input.unit}${linkedContract ? ` theo Hợp đồng ${linkedContract.referenceCode}` : ""}` }, transaction);
        return { id: supplyId };
      });
    }),
    bulkCreate: adminProcedure.input(z.object({ updateExisting: z.boolean().default(false), items: z.array(z.object({
      code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9-]+$/).transform((value) => value.toUpperCase()),
      name: z.string().trim().min(2).max(255),
      categoryId: z.number().int().positive().nullable().optional(),
      vendorId: z.number().int().positive().nullable().optional(),
      brandId: z.number().int().positive().nullable().optional(),
      unit: z.string().trim().min(1).max(32).default("Cái"),
      openingQuantity: z.number().finite().min(0).default(0),
      minimumQuantity: z.number().finite().min(0).default(0),
      unitCost: z.number().finite().min(0).nullable().optional(),
      location: nullableText,
      note: nullableText,
    })).min(1).max(200) })).mutation(async ({ input, ctx }) => {
      const fileCodes = new Set<string>();
      for (const item of input.items) {
        if (fileCodes.has(item.code)) throw new TRPCError({ code: "BAD_REQUEST", message: `Mã phụ kiện ${item.code} bị lặp trong file Excel.` });
        requireWholeQuantity(item.unit, item.openingQuantity, "Tồn đầu kỳ");
        requireWholeQuantity(item.unit, item.minimumQuantity, "Mức tồn tối thiểu");
        fileCodes.add(item.code);
      }
      return runInventoryTransaction(async (transaction) => {
        const existingByCode = new Map<string, Awaited<ReturnType<typeof getInventorySupplyByCode>>>();
        for (const item of input.items) {
          const existing = await getInventorySupplyByCode(item.code, transaction);
          if (existing && !input.updateExisting) throw new TRPCError({ code: "BAD_REQUEST", message: `Mã phụ kiện ${item.code} đã tồn tại. Hãy bật tùy chọn cập nhật phụ kiện trùng mã.` });
          existingByCode.set(item.code, existing);
        }
        const sessionId = await createSupplyImportSession({ referenceCode: `VTIMP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
        const ids: number[] = [];
        let created = 0;
        let updated = 0;
        for (const item of input.items) {
          const existing = existingByCode.get(item.code);
          if (existing) {
            const before = Number(existing.stockQuantity);
            const after = before + item.openingQuantity;
            const beforeSnapshot = { code: existing.code, name: existing.name, unit: existing.unit, stockQuantity: existing.stockQuantity, minimumQuantity: existing.minimumQuantity, unitCost: existing.unitCost, location: existing.location, categoryId: existing.categoryId, vendorId: existing.vendorId, brandId: existing.brandId, note: existing.note };
            const afterSnapshot = { code: item.code, name: item.name, unit: item.unit, stockQuantity: String(after), minimumQuantity: String(item.minimumQuantity), unitCost: item.unitCost === null || item.unitCost === undefined ? null : String(item.unitCost), location: item.location ?? null, categoryId: item.categoryId ?? null, vendorId: item.vendorId ?? null, brandId: item.brandId ?? null, note: item.note ?? null };
            await updateInventorySupply(existing.id, { name: item.name, categoryId: item.categoryId ?? null, vendorId: item.vendorId ?? null, brandId: item.brandId ?? null, unit: item.unit, minimumQuantity: String(item.minimumQuantity), unitCost: item.unitCost === null || item.unitCost === undefined ? null : String(item.unitCost), location: item.location ?? null, note: item.note ?? null, stockQuantity: String(after) }, transaction);
            if (item.openingQuantity > 0) await createInventoryMovement({ supplyId: existing.id, movementType: "receipt", quantity: String(item.openingQuantity), quantityBefore: String(before), quantityAfter: String(after), note: "Nhập bổ sung khi cập nhật từ Excel phụ kiện", createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
            await createSupplyImportItem({ importSessionId: sessionId, supplyId: existing.id, action: "updated", beforeSnapshot, afterSnapshot }, transaction);
            await recordActivity({ entityType: "supply", entityId: existing.id, action: "bulk_import_updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật từ Excel phụ kiện ${item.name} (${item.code})${item.openingQuantity > 0 ? `, nhập thêm ${item.openingQuantity} ${item.unit}` : ""}` }, transaction);
            ids.push(existing.id);
            updated += 1;
            continue;
          }
          const supplyId = await createInventorySupply({ code: item.code, name: item.name, categoryId: item.categoryId ?? null, vendorId: item.vendorId ?? null, brandId: item.brandId ?? null, unit: item.unit, stockQuantity: String(item.openingQuantity), minimumQuantity: String(item.minimumQuantity), unitCost: item.unitCost === null || item.unitCost === undefined ? null : String(item.unitCost), location: item.location ?? null, note: item.note ?? null, isActive: true, createdByUserId: ctx.user!.id }, transaction);
          if (item.openingQuantity > 0) await createInventoryMovement({ supplyId, movementType: "receipt", quantity: String(item.openingQuantity), quantityBefore: "0", quantityAfter: String(item.openingQuantity), note: "Tồn đầu kỳ khi nhập Excel phụ kiện", createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
          await createSupplyImportItem({ importSessionId: sessionId, supplyId, action: "created", beforeSnapshot: null, afterSnapshot: { code: item.code, name: item.name, unit: item.unit, stockQuantity: String(item.openingQuantity), minimumQuantity: String(item.minimumQuantity), unitCost: item.unitCost === null || item.unitCost === undefined ? null : String(item.unitCost), location: item.location ?? null, categoryId: item.categoryId ?? null, vendorId: item.vendorId ?? null, brandId: item.brandId ?? null, note: item.note ?? null } }, transaction);
          await recordActivity({ entityType: "supply", entityId: supplyId, action: "bulk_imported", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Nhập Excel phụ kiện ${item.name} (${item.code}), tồn đầu ${item.openingQuantity} ${item.unit}` }, transaction);
          ids.push(supplyId);
          created += 1;
        }
        await updateSupplyImportSession(sessionId, { createdCount: created, updatedCount: updated }, transaction);
        await recordActivity({ entityType: "supplyImport", entityId: sessionId, action: "imported", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Import Excel phụ kiện: tạo ${created}, cập nhật ${updated}` }, transaction);
        return { created, updated, ids, sessionId };
      });
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9-]+$/).transform((value) => value.toUpperCase()).optional(), name: z.string().trim().min(2).max(255).optional(), categoryId: z.number().int().positive().nullable().optional(), vendorId: z.number().int().positive().nullable().optional(), brandId: z.number().int().positive().nullable().optional(), purchaseContractId: z.number().int().positive().nullable().optional(), unit: z.string().trim().min(1).max(32).optional(), minimumQuantity: z.number().finite().min(0).optional(), unitCost: z.number().finite().min(0).nullable().optional(), location: nullableText, note: nullableText, isActive: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
      const supply = await getInventorySupplyById(input.id);
      if (!supply) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phụ kiện." });
      requireWholeQuantity(input.unit ?? supply.unit, input.minimumQuantity ?? supply.minimumQuantity, "Mức tồn tối thiểu");
      if (input.code !== undefined && input.code !== supply.code) throw new TRPCError({ code: "BAD_REQUEST", message: "Mã phụ kiện đã được khóa sau khi tạo mới." });
      const targetPurchaseContractId = input.purchaseContractId === undefined ? supply.purchaseContractId : input.purchaseContractId;
      const linkedContract = await requireUsablePurchaseContract(targetPurchaseContractId);
      const contractVendor = linkedContract?.vendorId ? await getVendorById(linkedContract.vendorId) : null;
      if (linkedContract && input.vendorId !== undefined && input.vendorId !== linkedContract.vendorId) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp của Phụ kiện được lấy theo Hợp đồng đã chọn." });
      const resolvedVendorId = linkedContract?.vendorId ?? input.vendorId;
      if (resolvedVendorId && !contractVendor && !(await getVendorById(resolvedVendorId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp được chọn không tồn tại hoặc đã ngừng hoạt động." });
      const { id, minimumQuantity, unitCost, code: _lockedCode, purchaseContractId: _purchaseContractId, ...changes } = input;
      const updateValues = { ...changes, purchaseContractId: targetPurchaseContractId ?? null, ...(linkedContract ? { vendorId: linkedContract.vendorId } : resolvedVendorId !== undefined ? { vendorId: resolvedVendorId } : {}), minimumQuantity: minimumQuantity === undefined ? undefined : String(minimumQuantity), unitCost: unitCost === undefined ? undefined : unitCost === null ? null : String(unitCost) };
      return runInventoryTransaction(async (transaction) => {
        await updateInventorySupply(id, updateValues, transaction);
        await syncSupplyPurchaseContractItem({ id, code: supply.code, name: changes.name ?? supply.name, purchaseContractId: targetPurchaseContractId ?? null, stockQuantity: supply.stockQuantity, unit: changes.unit ?? supply.unit, unitCost: updateValues.unitCost === undefined ? supply.unitCost : updateValues.unitCost }, transaction);
        await recordActivity({ entityType: "supply", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật phụ kiện ${changes.name || supply.name}${linkedContract ? ` theo Hợp đồng ${linkedContract.referenceCode}` : ""}` }, transaction);
        return { success: true };
      });
    }),
    move: adminProcedure.input(z.object({ supplyId: z.number().int().positive(), movementType: z.enum(["receipt", "issue", "adjustment"]), quantity: z.number().finite(), recipientUserId: z.number().int().positive().nullable().optional(), recipientName: z.string().trim().max(160).optional(), recipientDepartmentId: z.number().int().positive().nullable().optional(), note: z.string().trim().min(2).max(1000) }).superRefine((input, issue) => {
      if (input.movementType !== "adjustment" && input.quantity <= 0) issue.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Số lượng phải lớn hơn 0." });
      if (input.movementType === "adjustment" && input.quantity === 0) issue.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Số lượng điều chỉnh không được bằng 0." });
      if (input.movementType === "issue" && !input.recipientUserId && !input.recipientName) issue.addIssue({ code: z.ZodIssueCode.custom, path: ["recipientName"], message: "Vui lòng chọn nhân sự hoặc nhập người nhận khác." });
    })).mutation(async ({ input, ctx }) => runInventoryTransaction(async (transaction) => {
      const supply = await getInventorySupplyById(input.supplyId, transaction);
      if (!supply || !supply.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phụ kiện đang hoạt động." });
      requireWholeQuantity(supply.unit, input.quantity, "Số lượng giao dịch");
      const recipientUser = input.recipientUserId ? (await listUsers()).find((user) => user.id === input.recipientUserId && user.isActive) : null;
      if (input.recipientUserId && !recipientUser) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy nhân sự đang hoạt động được chọn." });
      const before = Number(supply.stockQuantity);
      const signedQuantity = input.movementType === "issue" ? -input.quantity : input.quantity;
      const after = before + signedQuantity;
      if (after < 0) throw new TRPCError({ code: "BAD_REQUEST", message: `Tồn kho không đủ. Hiện còn ${before} ${supply.unit}.` });
      await updateInventorySupply(supply.id, { stockQuantity: String(after) }, transaction);
      const movementId = await createInventoryMovement({ supplyId: supply.id, movementType: input.movementType, quantity: String(signedQuantity), quantityBefore: String(before), quantityAfter: String(after), recipientUserId: recipientUser?.id ?? null, recipientName: (recipientUser?.name || input.recipientName) ?? null, recipientDepartmentId: recipientUser?.departmentId ?? input.recipientDepartmentId ?? null, note: input.note, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
      const actionLabel = input.movementType === "receipt" ? "Nhập kho" : input.movementType === "issue" ? "Cấp phát/xuất kho" : "Điều chỉnh tồn";
      await recordActivity({ entityType: "supply", entityId: supply.id, action: input.movementType, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `${actionLabel} ${Math.abs(signedQuantity)} ${supply.unit} phụ kiện ${supply.name}. Tồn: ${after} ${supply.unit}.` }, transaction);
      return { movementId, stockQuantity: after, isLowStock: after <= Number(supply.minimumQuantity) };
    })),
  }),
  assets: router({
    list: adminProcedure.query(() => listAssets()),
    get: adminProcedure.input(z.object({ assetId: z.number().int().positive() })).query(async ({ input }) => {
      const asset = await getAssetById(input.assetId);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy Tài sản." });
      return asset;
    }),
    import: adminProcedure.input(z.object({ rows: z.array(assetImportRow).min(1).max(100), updateExisting: z.boolean().default(false) })).mutation(async ({ input, ctx }) => {
      const rowsToImport: Array<{ row: typeof assetImportRow._output; category: NonNullable<Awaited<ReturnType<typeof getAssetCategoryByName>>>; vendorId: number | null; brandId: number | null; purchaseInvoiceId: number | null; existingAsset: Awaited<ReturnType<typeof listActiveAssetsBySerialNumber>>[number] | null }> = [];
      const errors: Array<{ rowNumber: number; message: string }> = [];
      const purchaseInvoices = input.rows.some((row) => Boolean(row.invoiceNumber)) ? await listPurchaseInvoices() : [];
      const invoiceByKey = new Map(purchaseInvoices.map((invoice) => [invoice.invoiceKey.trim().toUpperCase(), invoice]));
      const invoicesByNumber = new Map<string, typeof purchaseInvoices>();
      purchaseInvoices.forEach((invoice) => {
        const key = invoice.invoiceNumber.trim().toUpperCase();
        invoicesByNumber.set(key, [...(invoicesByNumber.get(key) || []), invoice]);
      });
      for (const row of input.rows) {
        if (!hasRequiredMaintenanceReason(row.status, row.maintenanceReason)) { errors.push({ rowNumber: row.rowNumber, message: "Tài sản Bảo trì cần có Lý do bảo trì." }); continue; }
        const category = await getAssetCategoryByName(row.category);
        if (!category?.isActive) { errors.push({ rowNumber: row.rowNumber, message: `Phân loại ${row.category} không tồn tại hoặc đã ngừng hoạt động.` }); continue; }
        const vendor = row.vendor ? await getVendorByName(row.vendor) : null;
        if (row.vendor && !vendor?.isActive) { errors.push({ rowNumber: row.rowNumber, message: `Nhà cung cấp ${row.vendor} không tồn tại hoặc đã ngừng hoạt động.` }); continue; }
        const brand = row.brandName ? await getBrandByName(row.brandName) : null;
        if (row.brandName && !brand?.isActive) { errors.push({ rowNumber: row.rowNumber, message: `Hãng ${row.brandName} không tồn tại hoặc đã ngừng hoạt động.` }); continue; }
        let purchaseInvoiceId: number | null = null;
        if (row.invoiceNumber) {
          const reference = row.invoiceNumber.trim().toUpperCase();
          const matches = invoiceByKey.get(reference) ? [invoiceByKey.get(reference)!] : invoicesByNumber.get(reference) || [];
          if (matches.length === 0) { errors.push({ rowNumber: row.rowNumber, message: `Không tìm thấy Hóa đơn ${row.invoiceNumber}.` }); continue; }
          if (matches.length > 1) { errors.push({ rowNumber: row.rowNumber, message: `Số Hóa đơn ${row.invoiceNumber} trùng nhiều mẫu/ký hiệu. Hãy nhập đầy đủ khóa Hóa đơn.` }); continue; }
          if (matches[0].status === "cancelled") { errors.push({ rowNumber: row.rowNumber, message: `Hóa đơn ${row.invoiceNumber} đã hủy, không thể liên kết Tài sản.` }); continue; }
          purchaseInvoiceId = matches[0].id;
        }
        const existingMatches = input.updateExisting && row.serialNumber ? await listActiveAssetsBySerialNumber(row.serialNumber) : [];
        if (existingMatches.length > 1) { errors.push({ rowNumber: row.rowNumber, message: `Serial/IMEI ${row.serialNumber} đang trùng trên nhiều tài sản, không thể cập nhật tự động.` }); continue; }
        rowsToImport.push({ row, category, vendorId: vendor?.id ?? null, brandId: brand?.id ?? null, purchaseInvoiceId, existingAsset: existingMatches[0] ?? null });
      }
      if (!rowsToImport.length) return { created: 0, updated: 0, errors, sessionId: null };
      return runAssetImportTransaction(async (transaction) => {
        const sessionId = await createAssetImportSession({ referenceCode: `IMP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
        const nextSequenceByPrefix = new Map<string, number>();
        let created = 0;
        let updated = 0;
        for (const { row, category, vendorId, brandId, purchaseInvoiceId, existingAsset } of rowsToImport) {
          const changes = { ...importAssetValues(row, brandId, vendorId, category.id, purchaseInvoiceId), ...(existingAsset && purchaseInvoiceId && existingAsset.purchaseInvoiceId !== purchaseInvoiceId ? { purchaseInvoiceLineId: null } : {}) };
          if (input.updateExisting && existingAsset) {
            const before = assetSnapshot(existingAsset as unknown as Record<string, unknown>);
            await updateAsset(existingAsset.id, changes, transaction);
            const after = assetSnapshot({ ...(existingAsset as unknown as Record<string, unknown>), ...changes });
            await createAssetImportItem({ importSessionId: sessionId, assetId: existingAsset.id, action: "updated", beforeSnapshot: before, afterSnapshot: after }, transaction);
            await createAssetFieldChanges(fieldChanges(existingAsset.id, before, after, "import", ctx.user!.id, ctx.user!.name, sessionId), transaction);
            updated++;
            continue;
          }
          let nextSequence = nextSequenceByPrefix.get(category.code);
          if (nextSequence === undefined) nextSequence = Number((await getNextAssetCodeForPrefix(category.code, transaction)).slice(category.code.length));
          const assetCode = `${category.code}${String(nextSequence).padStart(5, "0")}`;
          nextSequenceByPrefix.set(category.code, nextSequence + 1);
          const id = await createAsset({ assetCode, departmentId: null, holderUserId: null, holderName: null, qrToken: crypto.randomUUID().replaceAll("-", ""), createdByUserId: ctx.user!.id, ...changes }, transaction);
          const after = assetSnapshot(changes);
          await createAssetImportItem({ importSessionId: sessionId, assetId: id, action: "created", beforeSnapshot: null, afterSnapshot: after }, transaction);
          await createAssetFieldChanges(fieldChanges(id, {}, after, "import", ctx.user!.id, ctx.user!.name, sessionId), transaction);
          created++;
        }
        await updateAssetImportSession(sessionId, { createdCount: created, updatedCount: updated }, transaction);
        await recordActivity({ entityType: "assetImport", entityId: sessionId, action: "imported", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Import Excel: tạo ${created}, cập nhật ${updated} tài sản${errors.length ? `; bỏ qua ${errors.length} dòng lỗi` : ""}` }, transaction);
        return { created, updated, errors, sessionId };
      });
    }),
    latestImport: adminProcedure.query(async () => {
      const session = await getLatestAssetImportSession();
      if (!session) return null;
      const undoDeadline = getImportUndoDeadline(session.createdAt);
      return { ...session, undoDeadline, canUndo: !session.isUndone && canUndoImport(session.createdAt) };
    }),
    importHistory: adminProcedure.input(z.object({ page: z.number().int().positive().default(1), pageSize: z.number().int().min(1).max(20).default(5) })).query(async ({ input }) => {
      const history = await listAssetImportSessions(input.page, input.pageSize);
      return { ...history, items: history.items.map((session) => ({ ...session, undoDeadline: getImportUndoDeadline(session.createdAt), canUndo: !session.isUndone && canUndoImport(session.createdAt) })) };
    }),
    importSessionDetails: adminProcedure.input(z.object({ sessionId: z.number().int().positive(), page: z.number().int().positive().default(1), pageSize: z.number().int().min(1).max(25).default(10) })).query(async ({ input }) => {
      const session = await getAssetImportSessionById(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiên import." });
      const allItems = await listAssetImportItems(session.id);
      const safePage = Math.max(1, input.page);
      const safePageSize = Math.min(25, Math.max(1, input.pageSize));
      const total = allItems.length;
      const items = await Promise.all(allItems.slice((safePage - 1) * safePageSize, safePage * safePageSize).map(async (item: { id: number; assetId: number; action: "created" | "updated"; afterSnapshot: unknown }) => {
        const asset = await getAssetById(item.assetId);
        const snapshot = (item.afterSnapshot || {}) as Record<string, unknown>;
        return { id: item.id, assetId: item.assetId, action: item.action, assetCode: asset?.assetCode || null, name: typeof snapshot.name === "string" ? snapshot.name : asset?.name || "Tài sản đã lưu trữ", serialNumber: typeof snapshot.serialNumber === "string" ? snapshot.serialNumber : asset?.serialNumber || null, status: typeof snapshot.status === "string" ? snapshot.status : asset?.status || null, isArchived: asset?.isArchived || false };
      }));
      return { session: { id: session.id, referenceCode: session.referenceCode }, items, total, page: safePage, pageSize: safePageSize, totalPages: Math.ceil(total / safePageSize) };
    }),
    history: adminProcedure.input(z.object({ assetId: z.number().int().positive(), page: z.number().int().positive().default(1), pageSize: z.number().int().min(1).max(50).default(10) })).query(({ input }) => listAssetFieldChanges(input.assetId, input.page, input.pageSize)),
    undoImportSession: adminProcedure.input(z.object({ sessionId: z.number().int().positive(), reason: z.string().trim().min(10, "Vui lòng nhập lý do hoàn tác tối thiểu 10 ký tự.").max(1000) })).mutation(async ({ input, ctx }) => {
      const session = await getAssetImportSessionById(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiên import cần hoàn tác." });
      if (session.isUndone) throw new TRPCError({ code: "BAD_REQUEST", message: "Phiên import này đã được hoàn tác." });
      if (!canUndoImport(session.createdAt)) throw new TRPCError({ code: "BAD_REQUEST", message: "Đã quá thời hạn 24 giờ cho phép hoàn tác phiên import này." });
      return runAssetImportTransaction(async (transaction) => {
        const items = await listAssetImportItems(session.id, transaction);
        for (const item of items) {
          const current = await getAssetById(item.assetId, transaction);
          if (!current) continue;
          const before = assetSnapshot(current as unknown as Record<string, unknown>);
          if (item.action === "created") {
            await updateAsset(item.assetId, { isArchived: true }, transaction);
            await createAssetFieldChanges(fieldChanges(item.assetId, before, { ...before, isArchived: true }, "undo", ctx.user!.id, ctx.user!.name, session.id), transaction);
          } else {
            const restore = (item.beforeSnapshot || {}) as Record<string, unknown>;
            await updateAsset(item.assetId, restore as any, transaction);
            await createAssetFieldChanges(fieldChanges(item.assetId, before, restore, "undo", ctx.user!.id, ctx.user!.name, session.id), transaction);
          }
        }
        await updateAssetImportSession(session.id, { isUndone: true, undoneAt: new Date(), undoneByUserId: ctx.user!.id, undoReason: input.reason }, transaction);
        await recordActivity({ entityType: "assetImport", entityId: session.id, action: "undone", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Hoàn tác phiên import ${session.referenceCode}: ${input.reason}` }, transaction);
        return { success: true, sessionId: session.id };
      });
    }),
    undoLatestImport: adminProcedure.input(z.object({ sessionId: z.number().int().positive(), reason: z.string().trim().min(10, "Vui lòng nhập lý do hoàn tác tối thiểu 10 ký tự.").max(1000) })).mutation(async ({ input, ctx }) => {
      const latest = await getLatestAssetImportSession();
      if (!latest || latest.id !== input.sessionId) throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ có thể hoàn tác phiên import gần nhất." });
      if (latest.isUndone) throw new TRPCError({ code: "BAD_REQUEST", message: "Phiên import này đã được hoàn tác." });
      if (!canUndoImport(latest.createdAt)) throw new TRPCError({ code: "BAD_REQUEST", message: "Đã quá thời hạn 24 giờ cho phép hoàn tác phiên import này." });
      const items = await listAssetImportItems(latest.id);
      for (const item of items) {
        const current = await getAssetById(item.assetId);
        if (!current) continue;
        const before = assetSnapshot(current as unknown as Record<string, unknown>);
        if (item.action === "created") {
          await updateAsset(item.assetId, { isArchived: true });
          await createAssetFieldChanges(fieldChanges(item.assetId, before, { ...before, isArchived: true }, "undo", ctx.user!.id, ctx.user!.name, latest.id));
        } else {
          const restore = (item.beforeSnapshot || {}) as Record<string, unknown>;
          await updateAsset(item.assetId, restore as any);
          await createAssetFieldChanges(fieldChanges(item.assetId, before, restore, "undo", ctx.user!.id, ctx.user!.name, latest.id));
        }
      }
      await updateAssetImportSession(latest.id, { isUndone: true, undoneAt: new Date(), undoneByUserId: ctx.user!.id, undoReason: input.reason });
      await recordActivity({ entityType: "assetImport", entityId: latest.id, action: "undone", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Hoàn tác phiên import ${latest.referenceCode}: ${input.reason}` });
      return { success: true };
    }),
    create: adminProcedure.input(assetInput).mutation(async ({ input, ctx }) => {
      if (!hasRequiredMaintenanceReason(input.status, input.maintenanceReason)) throw new TRPCError({ code: "BAD_REQUEST", message: "Vui lòng nhập lý do Bảo hành/Sửa chữa khi đưa tài sản vào trạng thái này." });
      if (!hasRequiredRetirementReason(input.status, input.retirementReason)) throw new TRPCError({ code: "BAD_REQUEST", message: "Vui lòng nhập lý do thanh lý khi đưa tài sản vào Khấu hao/Thanh lý." });
      const linkedContract = await requireUsablePurchaseContract(input.purchaseContractId);
      const linkedInvoice = await requireUsablePurchaseInvoice(input.purchaseInvoiceId);
      const linkedInvoiceLine = await requireAssetPurchaseInvoiceLine(input.purchaseInvoiceId, input.purchaseInvoiceLineId);
      const contractVendor = linkedContract?.vendorId ? await getVendorById(linkedContract.vendorId) : null;
      const invoiceVendor = linkedInvoice ? await getVendorById(linkedInvoice.vendorId) : null;
      if (linkedInvoice && input.vendorId !== undefined && input.vendorId !== linkedInvoice.vendorId) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp của Tài sản được lấy theo Hóa đơn đã chọn." });
      if (linkedInvoice && linkedContract?.vendorId && linkedContract.vendorId !== linkedInvoice.vendorId) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp trên Hóa đơn phải khớp với Hợp đồng đã chọn." });
      const resolvedVendorId = linkedInvoice?.vendorId ?? linkedContract?.vendorId ?? input.vendorId ?? null;
      if (resolvedVendorId && !contractVendor && !(await getVendorById(resolvedVendorId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp được chọn không tồn tại hoặc đã ngừng hoạt động." });
      if (input.brandId && !(await getBrandById(input.brandId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Hãng được chọn không tồn tại hoặc đã ngừng hoạt động." });
      const branch = input.branchId ? await getBranchById(input.branchId) : (await getBranchByCode("HO")) || (await getBranchByCode("HO-HEAD OFFICE"));
      if (!branch?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Không tìm thấy Chi nhánh HO-Head Office đang hoạt động để gán mặc định cho tài sản mới." });
      const retirementAt = input.status === "retired" ? input.retiredAt ?? new Date() : null;
      const retirementCertificate = retirementAt ? (() => {
        const year = retirementAt.getUTCFullYear();
        return { year };
      })() : null;
      const retirementSequence = retirementCertificate ? await getNextRetirementCertificateSequence(retirementCertificate.year) : null;
      const retirementCertificateNumber = retirementCertificate && retirementSequence ? `TL-${retirementCertificate.year}-${String(retirementSequence).padStart(3, "0")}` : null;
      const createAssetAndRecordActivity = async (transaction?: any) => {
        const assetValues = { ...input, vendorId: resolvedVendorId, vendor: invoiceVendor?.name ?? contractVendor?.name ?? input.vendor, purchaseInvoiceLineId: linkedInvoiceLine?.id ?? null, branchId: branch.id, holderName: input.status === "retired" ? "Khấu hao - Thanh lý" : input.holderName, maintenanceReason: input.status === "maintenance" ? input.maintenanceReason?.trim() || null : null, retiredAt: retirementAt, retirementReason: input.status === "retired" ? input.retirementReason?.trim() || null : null, retirementCertificateNumber, retirementCertificateYear: retirementCertificate?.year ?? null, retirementCertificateSequence: retirementSequence, qrToken: crypto.randomUUID().replaceAll("-", ""), createdByUserId: ctx.user!.id };
        const id = transaction ? await createAsset(assetValues, transaction) : await createAsset(assetValues);
        if (input.purchaseContractId) await syncAssetPurchaseContractItem({ id, assetCode: input.assetCode, name: input.name, purchaseContractId: input.purchaseContractId, purchaseValue: input.purchaseValue ?? null, warrantyUntil: input.warrantyUntil ?? null }, transaction);
        await recordActivity({ entityType: "asset", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo tài sản ${input.assetCode}${linkedInvoice ? ` theo Hóa đơn ${linkedInvoice.invoiceKey}` : linkedContract ? ` theo Hợp đồng ${linkedContract.referenceCode}` : ""}` }, transaction);
        return { id };
      };
      return input.purchaseInvoiceId ? runPurchaseInvoiceTransaction(createAssetAndRecordActivity) : input.purchaseContractId ? runPurchaseContractTransaction(createAssetAndRecordActivity) : createAssetAndRecordActivity();
    }),
    update: adminProcedure.input(assetInput.partial().extend({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const { id, ...changes } = input;
      const current = await getAssetById(id);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài sản cần cập nhật." });
      if (current.status === "retired" || current.status === "returned_to_vendor") throw new TRPCError({ code: "CONFLICT", message: "Tài sản đã Trả nhà cung cấp hoặc Khấu hao/Thanh lý được khóa và không thể chỉnh sửa." });
      if (!hasRequiredMaintenanceReason(changes.status, changes.maintenanceReason)) throw new TRPCError({ code: "BAD_REQUEST", message: "Vui lòng nhập lý do Bảo hành/Sửa chữa khi đưa tài sản vào trạng thái này." });
      if (!hasRequiredRetirementReason(changes.status, changes.retirementReason)) throw new TRPCError({ code: "BAD_REQUEST", message: "Vui lòng nhập lý do thanh lý khi đưa tài sản vào Khấu hao/Thanh lý." });
      const targetPurchaseContractId = changes.purchaseContractId === undefined ? current.purchaseContractId : changes.purchaseContractId;
      const targetPurchaseInvoiceId = changes.purchaseInvoiceId === undefined ? current.purchaseInvoiceId : changes.purchaseInvoiceId;
      const targetPurchaseInvoiceLineId = changes.purchaseInvoiceLineId === undefined ? current.purchaseInvoiceLineId : changes.purchaseInvoiceLineId;
      const linkedContract = await requireUsablePurchaseContract(targetPurchaseContractId);
      const linkedInvoice = await requireUsablePurchaseInvoice(targetPurchaseInvoiceId);
      const linkedInvoiceLine = await requireAssetPurchaseInvoiceLine(targetPurchaseInvoiceId, targetPurchaseInvoiceLineId);
      const contractVendor = linkedContract?.vendorId ? await getVendorById(linkedContract.vendorId) : null;
      const invoiceVendor = linkedInvoice ? await getVendorById(linkedInvoice.vendorId) : null;
      if (linkedInvoice && changes.vendorId !== undefined && changes.vendorId !== linkedInvoice.vendorId) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp của Tài sản được lấy theo Hóa đơn đã chọn." });
      if (linkedInvoice && linkedContract?.vendorId && linkedContract.vendorId !== linkedInvoice.vendorId) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp trên Hóa đơn phải khớp với Hợp đồng đã chọn." });
      if (!linkedInvoice && linkedContract && changes.vendorId !== undefined && changes.vendorId !== linkedContract.vendorId) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp của Tài sản được lấy theo Hợp đồng đã chọn." });
      const resolvedVendorId = linkedInvoice?.vendorId ?? linkedContract?.vendorId ?? changes.vendorId;
      if (resolvedVendorId && !contractVendor && !(await getVendorById(resolvedVendorId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp được chọn không tồn tại hoặc đã ngừng hoạt động." });
      if (changes.brandId && !(await getBrandById(changes.brandId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Hãng được chọn không tồn tại hoặc đã ngừng hoạt động." });
      if (changes.branchId && !(await getBranchById(changes.branchId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Chi nhánh được chọn không tồn tại hoặc đã ngừng hoạt động." });
      const persistedChanges = changes.status && changes.status !== "maintenance" ? { ...changes, maintenanceReason: null } : changes;
      const supplierReturnChanges = changes.status === "returned_to_vendor"
        ? { supplierReturnedAt: changes.supplierReturnedAt ?? current.supplierReturnedAt ?? new Date(), supplierReturnReason: changes.supplierReturnReason?.trim() || current.supplierReturnReason || null }
        : {};
      const retirementAt = changes.status === "retired" ? changes.retiredAt ?? current.retiredAt ?? new Date() : null;
      const retirementCertificateChanges = retirementAt && !current.retirementCertificateNumber
        ? (() => {
          const year = retirementAt.getUTCFullYear();
          return { year };
        })()
        : null;
      const retirementSequence = retirementCertificateChanges ? await getNextRetirementCertificateSequence(retirementCertificateChanges.year) : null;
      const retirementChanges = changes.status === "retired"
        ? { holderName: "Khấu hao - Thanh lý", retiredAt: retirementAt, retirementReason: changes.retirementReason?.trim() || current.retirementReason || null, ...(retirementCertificateChanges && retirementSequence ? { retirementCertificateNumber: `TL-${retirementCertificateChanges.year}-${String(retirementSequence).padStart(3, "0")}`, retirementCertificateYear: retirementCertificateChanges.year, retirementCertificateSequence: retirementSequence } : {}) }
        : {};
      // Ngày mua là dữ liệu gốc từ lúc nhập kho; không được thay đổi sau khi tài sản đã tạo/import.
      const safeChanges = { ...persistedChanges, ...supplierReturnChanges, ...retirementChanges, purchaseDate: current.purchaseDate };
      const invoiceAwareChanges = { ...safeChanges, purchaseInvoiceId: targetPurchaseInvoiceId ?? null, purchaseInvoiceLineId: linkedInvoiceLine?.id ?? null, ...(linkedInvoice ? { vendorId: linkedInvoice.vendorId, vendor: invoiceVendor?.name ?? current.vendor } : linkedContract ? { vendorId: linkedContract.vendorId, vendor: contractVendor?.name ?? current.vendor } : resolvedVendorId !== undefined ? { vendorId: resolvedVendorId } : {}) };
      const persist = async (transaction: any) => {
        await updateAsset(id, invoiceAwareChanges, transaction);
        await syncAssetPurchaseContractItem({ id, assetCode: invoiceAwareChanges.assetCode ?? current.assetCode, name: invoiceAwareChanges.name ?? current.name, purchaseContractId: targetPurchaseContractId ?? null, purchaseValue: invoiceAwareChanges.purchaseValue === undefined ? current.purchaseValue : invoiceAwareChanges.purchaseValue ?? null, warrantyUntil: invoiceAwareChanges.warrantyUntil === undefined ? current.warrantyUntil : invoiceAwareChanges.warrantyUntil ?? null }, transaction);
        await createAssetFieldChanges(fieldChanges(id, assetSnapshot(current as unknown as Record<string, unknown>), assetSnapshot({ ...(current as unknown as Record<string, unknown>), ...invoiceAwareChanges }), "manual", ctx.user!.id, ctx.user!.name), transaction);
        await recordActivity({ entityType: "asset", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật thông tin tài sản${linkedInvoice ? ` theo Hóa đơn ${linkedInvoice.invoiceKey}` : linkedContract ? ` theo Hợp đồng ${linkedContract.referenceCode}` : ""}` }, transaction);
        return { success: true };
      };
      return targetPurchaseInvoiceId ? runPurchaseInvoiceTransaction(persist) : runPurchaseContractTransaction(persist);
    }),
    uploadSupplierReturnAttachment: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      fileName: z.string().trim().min(1).max(255),
      contentType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
      dataUrl: z.string().max(7_000_000).regex(/^data:(application\/pdf|image\/(png|jpeg|webp));base64,/),
    })).mutation(async ({ input, ctx }) => {
      const asset = await getAssetById(input.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài sản." });
      if (asset.status !== "returned_to_vendor") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ tài sản đang ở trạng thái Trả nhà cung cấp mới được đính kèm biên bản trả." });
      const extension = input.contentType === "application/pdf" ? "pdf" : input.contentType.split("/")[1].replace("jpeg", "jpg");
      const safeBaseName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "xac-nhan-tra-ncc";
      const { url } = await storagePut(`assets/${asset.id}/supplier-return/${Date.now()}-${safeBaseName}.${extension}`, Buffer.from(input.dataUrl.split(",", 2)[1], "base64"), input.contentType);
      await updateAsset(asset.id, { supplierReturnAttachmentUrl: url, supplierReturnAttachmentName: input.fileName, supplierReturnAttachmentContentType: input.contentType });
      await recordActivity({ entityType: "asset", entityId: asset.id, action: "supplier_return_attachment_uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Đính kèm xác nhận trả NCC: ${input.fileName}` });
      return { url, name: input.fileName, contentType: input.contentType };
    }),
    uploadRetirementAttachment: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      fileName: z.string().trim().min(1).max(255),
      contentType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
      dataUrl: z.string().max(7_000_000).regex(/^data:(application\/pdf|image\/(png|jpeg|webp));base64,/),
    })).mutation(async ({ input, ctx }) => {
      const asset = await getAssetById(input.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài sản." });
      if (asset.status !== "retired") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ tài sản đang ở trạng thái Khấu hao/Thanh lý mới được đính kèm chứng từ." });
      const bytes = Buffer.from(input.dataUrl.split(",", 2)[1], "base64");
      if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Tệp chứng từ phải có dung lượng từ 1 byte đến tối đa 5 MB." });
      const extension = input.contentType === "application/pdf" ? "pdf" : input.contentType.split("/")[1].replace("jpeg", "jpg");
      const safeBaseName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "chung-tu-thanh-ly";
      const { url } = await storagePut(`assets/${asset.id}/retirement/${Date.now()}-${safeBaseName}.${extension}`, bytes, input.contentType);
      await updateAsset(asset.id, { retirementAttachmentUrl: url, retirementAttachmentName: input.fileName, retirementAttachmentContentType: input.contentType });
      await recordActivity({ entityType: "asset", entityId: asset.id, action: "retirement_attachment_uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Đính kèm chứng từ thanh lý: ${input.fileName}` });
      return { url, name: input.fileName, contentType: input.contentType };
    }),
    archive: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      await updateAsset(input.id, { isArchived: true });
      await recordActivity({ entityType: "asset", entityId: input.id, action: "archived", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Lưu trữ tài sản" });
      return { success: true };
    }),
  }),
  retirementCertificates: router({
    list: adminProcedure.query(() => listRetirementCertificates()),
    get: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const certificate = await getRetirementCertificateById(input.id);
      if (!certificate) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy biên bản thanh lý." });
      return certificate;
    }),
    createDraft: adminProcedure.input(z.object({
      retiredAt: z.number().int().positive().transform((value) => new Date(value)),
      note: nullableText,
      items: z.array(z.object({ assetId: z.number().int().positive(), retirementReason: z.string().trim().min(3).max(1000).default("Thanh lý theo thời gian quy định"), salvageValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), note: nullableText })).min(1).max(50),
    })).mutation(async ({ input, ctx }) => {
      const uniqueIds = [...new Set(input.items.map((item) => item.assetId))];
      if (uniqueIds.length !== input.items.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Một tài sản chỉ được chọn một lần trong cùng biên bản." });
      return runRetirementCertificateTransaction(async (transaction) => {
        const selectedAssets = await Promise.all(uniqueIds.map((assetId) => getAssetById(assetId, transaction)));
        if (selectedAssets.some((asset) => !asset || asset.isArchived || (asset.status !== "available" && asset.status !== "maintenance"))) throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ có thể đưa tài sản đang Sẵn có hoặc Bảo hành/Sửa chữa vào biên bản thanh lý nháp." });
        const assignments = await listRetirementCertificateAssetAssignments(uniqueIds, transaction);
        if (assignments.length) throw new TRPCError({ code: "CONFLICT", message: "Có tài sản đã thuộc một biên bản thanh lý khác." });
        const year = input.retiredAt.getFullYear();
        const sequence = await getNextRetirementCertificateSequence(year, transaction);
        const referenceCode = `TL-${year}-${String(sequence).padStart(3, "0")}`;
        const id = await createRetirementCertificate({ referenceCode, retirementYear: year, sequence, status: "draft", retiredAt: input.retiredAt, note: input.note?.trim() || null, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name || null }, transaction);
        await createRetirementCertificateAssets(input.items.map((item) => ({ retirementCertificateId: id, assetId: item.assetId, retirementReason: item.retirementReason.trim() || "Thanh lý theo thời gian quy định", salvageValue: item.salvageValue || null, note: item.note?.trim() || null })), transaction);
        await recordActivity({ entityType: "retirementCertificate", entityId: id, action: "draft_created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo nháp biên bản thanh lý ${referenceCode} gồm ${input.items.length} tài sản.` }, transaction);
        return { id, referenceCode };
      });
    }),
    uploadSignedCopy: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      fileName: z.string().trim().min(1).max(255),
      contentType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
      dataUrl: z.string().max(7_000_000).regex(/^data:(application\/pdf|image\/(png|jpeg|webp));base64,/),
    })).mutation(async ({ input, ctx }) => {
      const certificate = await getRetirementCertificateById(input.id);
      if (!certificate) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy biên bản thanh lý." });
      if (certificate.status === "closed") throw new TRPCError({ code: "BAD_REQUEST", message: "Biên bản đã đóng, không thể thay đổi tệp ký tay." });
      const bytes = Buffer.from(input.dataUrl.split(",", 2)[1], "base64");
      if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Tệp biên bản đã ký phải có dung lượng từ 1 byte đến tối đa 5 MB." });
      const extension = input.contentType === "application/pdf" ? "pdf" : input.contentType.split("/")[1].replace("jpeg", "jpg");
      const safeBaseName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "bien-ban-thanh-ly-da-ky";
      const uploaded = await storagePut(`retirement-certificates/${certificate.id}/signed/${Date.now()}-${safeBaseName}.${extension}`, bytes, input.contentType);
      await updateRetirementCertificate(certificate.id, { status: "awaiting_signed_copy", signedDocumentKey: uploaded.key, signedDocumentUrl: uploaded.url, signedDocumentName: input.fileName, signedDocumentContentType: input.contentType, signedDocumentUploadedAt: new Date(), signedDocumentUploadedByUserId: ctx.user!.id });
      await recordActivity({ entityType: "retirementCertificate", entityId: certificate.id, action: "signed_copy_uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Đã tải biên bản ký tay cho ${certificate.referenceCode}: ${input.fileName}` });
      return { url: uploaded.url, name: input.fileName, contentType: input.contentType };
    }),
    updateSalvageValues: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      items: z.array(z.object({ id: z.number().int().positive(), salvageValue: z.string().regex(/^\d+$/).nullable() })).min(1).max(50),
    })).mutation(async ({ input, ctx }) => runRetirementCertificateTransaction(async (transaction) => {
      const certificate = await getRetirementCertificateById(input.id, transaction);
      if (!certificate) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy biên bản thanh lý." });
      if (certificate.status !== "awaiting_signed_copy" || !certificate.signedDocumentUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ có thể cập nhật giá trị thu hồi sau khi đã tải bản ký tay và trước khi đóng biên bản." });
      const certificateItemIds = new Set(certificate.items.map((item: { id: number }) => item.id));
      const submittedItemIds = new Set(input.items.map((item) => item.id));
      if (submittedItemIds.size !== input.items.length || submittedItemIds.size !== certificateItemIds.size || [...submittedItemIds].some((itemId) => !certificateItemIds.has(itemId))) throw new TRPCError({ code: "BAD_REQUEST", message: "Dữ liệu giá trị thu hồi không khớp với các tài sản trong biên bản." });
      await updateRetirementCertificateAssetSalvageValues(certificate.id, input.items, transaction);
      const purchaseTotal = certificate.items.reduce((total: number, item: { purchaseValue: string | null }) => total + Number(item.purchaseValue || 0), 0);
      const salvageTotal = input.items.reduce((total, item) => total + Number(item.salvageValue || 0), 0);
      const exceedsPurchaseValue = salvageTotal > purchaseTotal;
      await recordActivity({ entityType: "retirementCertificate", entityId: certificate.id, action: "salvage_values_updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật giá trị thu hồi cho ${certificate.referenceCode}: ${salvageTotal.toLocaleString("vi-VN")} VNĐ${exceedsPurchaseValue ? ", cao hơn tổng nguyên giá; cần rà soát." : ""}` }, transaction);
      return { success: true, salvageTotal, purchaseTotal, exceedsPurchaseValue };
    })),
    cancelDraft: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => runRetirementCertificateTransaction(async (transaction) => {
      const certificate = await getRetirementCertificateById(input.id, transaction);
      if (!certificate) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy biên bản thanh lý." });
      if (certificate.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ có thể hủy biên bản đang ở trạng thái Nháp." });
      await deleteRetirementCertificate(certificate.id, transaction);
      await recordActivity({ entityType: "retirementCertificate", entityId: certificate.id, action: "draft_cancelled", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Đã hủy nháp biên bản thanh lý ${certificate.referenceCode}; các tài sản đã được giải phóng.` }, transaction);
      return { success: true, referenceCode: certificate.referenceCode };
    })),
    close: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => runRetirementCertificateTransaction(async (transaction) => {
      const certificate = await getRetirementCertificateById(input.id, transaction);
      if (!certificate) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy biên bản thanh lý." });
      if (certificate.status === "closed") throw new TRPCError({ code: "BAD_REQUEST", message: "Biên bản này đã được đóng." });
      if (!certificate.signedDocumentUrl || !certificate.signedDocumentName || certificate.status !== "awaiting_signed_copy") throw new TRPCError({ code: "BAD_REQUEST", message: "Hãy tải biên bản đã ký tay trước khi xác nhận đóng." });
      if (!certificate.items.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Biên bản thanh lý phải có ít nhất một tài sản." });
      for (const item of certificate.items) {
        const asset = await getAssetById(item.assetId, transaction);
        if (!asset || asset.isArchived || (asset.status !== "available" && asset.status !== "maintenance")) throw new TRPCError({ code: "CONFLICT", message: `Tài sản ${item.assetCode} không còn đủ điều kiện để đóng biên bản.` });
        await updateAsset(asset.id, { status: "retired", holderName: "Khấu hao - Thanh lý", retiredAt: certificate.retiredAt, retirementReason: item.retirementReason, retirementCertificateId: certificate.id, retirementCertificateNumber: certificate.referenceCode, retirementCertificateYear: certificate.retirementYear, retirementCertificateSequence: certificate.sequence, retirementAttachmentUrl: certificate.signedDocumentUrl, retirementAttachmentName: certificate.signedDocumentName, retirementAttachmentContentType: certificate.signedDocumentContentType }, transaction);
        await recordActivity({ entityType: "asset", entityId: asset.id, action: "retired_in_certificate", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Thanh lý theo biên bản ${certificate.referenceCode}: ${item.retirementReason}` }, transaction);
      }
      await updateRetirementCertificate(certificate.id, { status: "closed", closedAt: new Date(), closedByUserId: ctx.user!.id }, transaction);
      await recordActivity({ entityType: "retirementCertificate", entityId: certificate.id, action: "closed", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Đã đóng biên bản thanh lý ${certificate.referenceCode}.` }, transaction);
      return { success: true, referenceCode: certificate.referenceCode, assetCount: certificate.items.length };
    })),
  }),
  handovers: router({
    returnDecisionHistory: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const handover = await getHandoverById(input.id);
      if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      return listHandoverReturnDecisionHistory(input.id);
    }),
    list: adminProcedure.query(() => listHandovers()),
    nextReferenceCode: adminProcedure.query(async () => {
      const handoverYear = new Date().getFullYear();
      const sequence = await getNextHandoverSequence(handoverYear);
      return { referenceCode: `BG-${handoverYear}-${String(sequence).padStart(3, "0")}` };
    }),
    get: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const handover = await getHandoverById(input.id);
      if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      return { ...handover, supplyItems: await listHandoverSupplyItems(input.id) };
    }),
    requestReturn: protectedProcedure.input(z.object({ id: z.number().int().positive(), note: z.string().trim().min(3).max(1000).optional().nullable() })).mutation(async ({ input, ctx }) => {
      const handover = await getHandoverById(input.id);
      if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      if (handover.recipientUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Bạn chỉ có thể yêu cầu hoàn trả tài sản đang được bàn giao cho mình." });
      if (handover.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ có thể yêu cầu hoàn trả tài sản đang được cấp phát." });
      if (handover.returnRequestStatus === "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Yêu cầu hoàn trả cho tài sản này đang chờ xử lý." });
      await updateHandover(input.id, { returnRequestStatus: "pending", returnRequestedAt: new Date(), returnRequestNote: input.note || null, returnRequestResolvedAt: null, returnRequestResolvedByUserId: null, returnRequestResolution: null, returnFollowUpNote: null, returnFollowUpAt: null, returnResultSeenAt: null });
      await recordActivity({ entityType: "handover", entityId: input.id, action: "return_requested", actorUserId: ctx.user.id, actorName: ctx.user.name, summary: `Yêu cầu hoàn trả tài sản ${handover.assetCode}` });
      return { success: true };
    }),
    submitReturnFollowUp: protectedProcedure.input(z.object({ id: z.number().int().positive(), note: z.string().trim().min(3).max(1000) })).mutation(async ({ input, ctx }) => {
      const handover = await getHandoverById(input.id);
      if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      if (handover.recipientUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Bạn chỉ có thể giải trình yêu cầu hoàn trả của mình." });
      if (handover.returnRequestStatus !== "rejected") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ có thể gửi giải trình khi yêu cầu hoàn trả bị từ chối." });
      await updateHandover(input.id, { returnFollowUpNote: input.note, returnFollowUpAt: new Date() });
      await recordActivity({ entityType: "handover", entityId: input.id, action: "return_follow_up_submitted", actorUserId: ctx.user.id, actorName: ctx.user.name, summary: `Nhân viên giải trình yêu cầu hoàn trả ${handover.assetCode}` });
      return { success: true };
    }),
    markReturnResultSeen: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const handover = await getHandoverById(input.id);
      if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      if (handover.recipientUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Bạn chỉ có thể xác nhận kết quả của yêu cầu hoàn trả của mình." });
      if (handover.returnRequestStatus !== "approved" && handover.returnRequestStatus !== "rejected") throw new TRPCError({ code: "BAD_REQUEST", message: "Yêu cầu hoàn trả chưa có kết quả để xác nhận." });
      await updateHandover(input.id, { returnResultSeenAt: new Date() });
      return { success: true };
    }),
    resolveReturnRequest: adminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), conditionIn: z.string().trim().max(120).optional().nullable(), resolution: z.string().trim().max(1000).optional().nullable(), returnedSupplyItems: handoverReturnSupplyItems, conditionPhoto: z.object({ fileName: z.string().trim().min(1).max(255), contentType: z.enum(["image/png", "image/jpeg", "image/webp"]), dataUrl: z.string().max(7_000_000).regex(/^data:image\/(png|jpeg|webp);base64,/) }).optional().nullable() })).mutation(async ({ input, ctx }) => {
      const handover = await getHandoverById(input.id);
      if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      if (handover.returnRequestStatus !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Phiếu này không có yêu cầu hoàn trả đang chờ xử lý." });
      if (input.decision === "approved" && !input.conditionIn) throw new TRPCError({ code: "BAD_REQUEST", message: "Vui lòng ghi nhận tình trạng thực tế của tài sản khi duyệt hoàn trả." });
      let photoChanges = {};
      if (input.conditionPhoto) {
        const photoBytes = Buffer.from(input.conditionPhoto.dataUrl.split(",", 2)[1], "base64");
        if (!photoBytes.length || photoBytes.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Ảnh tình trạng phải có dung lượng từ 1 byte đến 5 MB." });
        const extension = input.conditionPhoto.contentType.split("/")[1].replace("jpeg", "jpg");
        const safeFileName = input.conditionPhoto.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "tinh-trang-hoan-tra";
        const uploaded = await storagePut(`handovers/${handover.id}/return-conditions/${Date.now()}-${safeFileName}.${extension}`, photoBytes, input.conditionPhoto.contentType);
        photoChanges = { returnConditionPhotoKey: uploaded.key, returnConditionPhotoUrl: uploaded.url, returnConditionPhotoName: input.conditionPhoto.fileName, returnConditionPhotoContentType: input.conditionPhoto.contentType };
      }
      const changes = { returnRequestStatus: input.decision, returnRequestResolvedAt: new Date(), returnRequestResolvedByUserId: ctx.user.id, returnRequestResolution: input.resolution || null, returnResultSeenAt: null, ...photoChanges, ...(input.decision === "approved" ? { conditionIn: input.conditionIn } : {}) };
      const returnSummary = input.decision === "approved" ? await restoreHandoverAccessories(handover, changes, ctx.user!, input.returnedSupplyItems) : { returnedAccessoryCount: 0, outstandingAccessoryCount: 0 };
      if (input.decision !== "approved") await updateHandover(input.id, changes);
      await recordActivity({ entityType: "handover", entityId: input.id, action: input.decision === "approved" ? "return_approved" : "return_rejected", actorUserId: ctx.user.id, actorName: ctx.user.name, summary: `${input.decision === "approved" ? "Duyệt" : "Từ chối"} yêu cầu hoàn trả ${handover.assetCode}` });
      return { success: true, ...returnSummary };
    }),
    create: adminProcedure.input(z.object({ assetId: z.number().int().positive(), recipientUserId: z.number().int().positive().optional().nullable(), recipientName: z.string().trim().min(2).max(160), recipientDepartmentId: z.number().int().positive().optional().nullable(), recipientDepartmentName: nullableText, handedOverAt: z.number().int().transform((value) => new Date(value)), dueBackAt: dateFromMs, conditionOut: nullableText, accessories: nullableText, supplyItems: z.array(z.object({ supplyId: z.number().int().positive(), quantity: z.number().finite().positive().max(1_000_000) })).max(20).default([]), note: nullableText })).mutation(async ({ input, ctx }) => {
      const asset = await getAssetById(input.assetId);
      if (!asset || asset.isArchived) throw new TRPCError({ code: "NOT_FOUND", message: "Tài sản được chọn không tồn tại hoặc đã lưu trữ." });
      if (asset.status !== "available") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ có thể lập phiếu cho tài sản đang sẵn có." });
      const handoverYear = input.handedOverAt.getFullYear();
      const normalizedSupplyItems = Array.from(input.supplyItems.reduce((items, item) => {
        items.set(item.supplyId, (items.get(item.supplyId) || 0) + item.quantity);
        return items;
      }, new Map<number, number>()).entries()).map(([supplyId, quantity]) => ({ supplyId, quantity }));
      let id: number | undefined;
      for (let attempt = 0; attempt < 5 && id === undefined; attempt += 1) {
        const handoverSequence = await getNextHandoverSequence(handoverYear);
        const referenceCode = `BG-${handoverYear}-${String(handoverSequence).padStart(3, "0")}`;
        try {
          id = await runInventoryTransaction(async (transaction) => {
            const stockAccessories: string[] = [];
            const movements: Array<{ supplyId: number; quantity: number; quantityBefore: number; quantityAfter: number }> = [];
            for (const item of normalizedSupplyItems) {
              const supply = await getInventorySupplyById(item.supplyId, transaction);
              if (!supply || !supply.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Phụ kiện được chọn không còn khả dụng trong kho." });
              const quantityBefore = Number(supply.stockQuantity);
              if (!Number.isFinite(quantityBefore) || quantityBefore < item.quantity) throw new TRPCError({ code: "BAD_REQUEST", message: `Tồn kho phụ kiện ${supply.code} không đủ (còn ${Number.isFinite(quantityBefore) ? quantityBefore : 0} ${supply.unit}).` });
              const quantityAfter = quantityBefore - item.quantity;
              stockAccessories.push(`${supply.name} × ${item.quantity} ${supply.unit}${supply.code ? ` (${supply.code})` : ""}`);
              movements.push({ supplyId: supply.id, quantity: item.quantity, quantityBefore, quantityAfter });
            }
            const { supplyItems: _supplyItems, accessories: manualAccessories, ...handoverInput } = input;
            const combinedAccessories = [manualAccessories, ...stockAccessories].filter((value): value is string => Boolean(value && value.trim())).join(" · ") || null;
            const handoverId = await createHandover({ ...handoverInput, accessories: combinedAccessories, referenceCode, handoverByUserId: ctx.user!.id, handoverByName: ctx.user!.name ?? "Quản trị viên", status: "draft" }, transaction);
            for (const movement of movements) {
              await updateInventorySupply(movement.supplyId, { stockQuantity: String(movement.quantityAfter) }, transaction);
              const supply = await getInventorySupplyById(movement.supplyId, transaction);
              if (!supply) throw new TRPCError({ code: "CONFLICT", message: "Phụ kiện được chọn không còn tồn tại." });
              await createHandoverSupplyItem({ handoverId, supplyId: supply.id, supplyCode: supply.code, supplyName: supply.name, unit: supply.unit, issuedQuantity: String(movement.quantity), returnedQuantity: "0" }, transaction);
              await createInventoryMovement({ supplyId: movement.supplyId, handoverId, movementType: "issue", quantity: String(movement.quantity), quantityBefore: String(movement.quantityBefore), quantityAfter: String(movement.quantityAfter), recipientUserId: input.recipientUserId || null, recipientName: input.recipientName, recipientDepartmentId: input.recipientDepartmentId || null, note: `Cấp phát kèm tài sản ${asset.assetCode} · Phiếu ${referenceCode}`, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
            }
            return handoverId;
          });
        } catch (error) {
          const errorDetails = error as { code?: unknown; errno?: unknown; message?: unknown; cause?: { code?: unknown; errno?: unknown; message?: unknown } };
          const errorMessage = `${String(errorDetails?.message || "")} ${String(errorDetails?.cause?.message || "")}`;
          const duplicateCode = errorDetails?.code === "ER_DUP_ENTRY" || Number(errorDetails?.errno) === 1062 || errorDetails?.cause?.code === "ER_DUP_ENTRY" || Number(errorDetails?.cause?.errno) === 1062 || /duplicate entry|er_dup_entry/i.test(errorMessage);
          if (!duplicateCode || attempt === 4) throw error;
        }
      }
      if (id === undefined) throw new TRPCError({ code: "CONFLICT", message: "Không thể tạo mã phiếu bàn giao duy nhất. Vui lòng thử lại." });
      await recordActivity({ entityType: "handover", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo phiếu bàn giao cho ${input.recipientName}` });
      return { id, issuedAccessoryCount: normalizedSupplyItems.length };
    }),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["draft", "pending_signature", "active", "returned", "cancelled"]), recipientSignatureUrl: nullableText, handoverSignatureUrl: nullableText, returnedSupplyItems: handoverReturnSupplyItems })).mutation(async ({ input, ctx }) => {
      const existing = await getHandoverById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      if (input.status === "active" && !(input.recipientSignatureUrl ?? existing.recipientSignatureUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cần có chữ ký người nhận trước khi xác nhận bàn giao." });
      }
      const statusChanges = { recipientSignatureUrl: input.recipientSignatureUrl, handoverSignatureUrl: input.handoverSignatureUrl };
      const returnSummary = input.status === "returned" ? await restoreHandoverAccessories(existing, statusChanges, ctx.user!, input.returnedSupplyItems) : { returnedAccessoryCount: 0, outstandingAccessoryCount: 0 };
      if (input.status !== "returned") await transitionHandoverStatus(input.id, input.status, statusChanges);
      await recordActivity({ entityType: "handover", entityId: input.id, action: input.status, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật trạng thái phiếu: ${input.status}` });
      return { success: true, ...returnSummary };
    }),
    saveRecipientSignature: adminProcedure.input(z.object({ id: z.number().int().positive(), dataUrl: z.string().startsWith("data:image/png;base64,") })).mutation(async ({ input, ctx }) => {
      const handover = await getHandoverById(input.id);
      if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      const { url } = await storagePut(`handovers/${input.id}/recipient-${Date.now()}.png`, Buffer.from(input.dataUrl.split(",")[1], "base64"), "image/png");
      await transitionHandoverStatus(input.id, "pending_signature", { recipientSignatureUrl: url });
      await recordActivity({ entityType: "handover", entityId: input.id, action: "signature_saved", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Lưu chữ ký người nhận" });
      return { url };
    }),
  }),
  maintenance: router({
    list: protectedProcedure.query(() => listMaintenanceTickets()),
    nextWarrantyCode: protectedProcedure.query(async () => {
      const warrantyYear = new Date().getFullYear();
      const warrantySequence = await getNextWarrantyRequestSequence(warrantyYear);
      return { code: `BH-${warrantyYear}-${String(warrantySequence).padStart(3, "0")}` };
    }),
    monthlyBudgets: adminProcedure.input(z.object({ year: z.number().int().min(2000).max(2100) })).query(({ input }) => listMaintenanceMonthlyBudgets(input.year)),
    saveMonthlyBudget: adminProcedure.input(z.object({ year: z.number().int().min(2000).max(2100), month: z.number().int().min(1).max(12), amount: z.string().regex(/^\d+(\.\d{1,2})?$/) })).mutation(({ input, ctx }) => saveMaintenanceMonthlyBudget({ ...input, updatedByUserId: ctx.user!.id })),
    byAsset: protectedProcedure.input(z.object({ assetId: z.number().int().positive() })).query(({ input }) => listMaintenanceTicketsByAsset(input.assetId)),
    history: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const ticket = await getMaintenanceTicket(input.id);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy yêu cầu bảo trì." });
      return listActivityLogsByEntity("maintenance", input.id);
    }),
    create: protectedProcedure.input(z.object({ assetId: z.number().int().positive(), issueType: z.enum(["maintenance", "incident", "damage"]), serviceChannel: z.enum(["warranty", "repair"]).default("repair"), priority: z.enum(["low", "medium", "high", "critical"]).default("medium"), description: z.string().trim().min(5).max(5000), warrantyBrand: z.string().trim().max(160).optional().nullable(), warrantyVendor: z.string().trim().max(255).optional().nullable(), warrantyRequestCode: z.string().trim().max(128).optional().nullable(), estimatedCost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), dueAt: dateFromMs, recurrenceDays: z.number().int().min(1).max(3650).optional().nullable() })).mutation(async ({ input, ctx }) => {
      const asset = await getAssetById(input.assetId);
      if (!asset || asset.isArchived) throw new TRPCError({ code: "NOT_FOUND", message: "Tài sản được chọn không tồn tại hoặc đã lưu trữ." });
      const existingTickets = await listMaintenanceTicketsByAsset(input.assetId);
      if (existingTickets.some((ticket) => ticket.status === "open" || ticket.status === "in_progress")) {
        throw new TRPCError({ code: "CONFLICT", message: "Tài sản này đã có yêu cầu bảo trì đang mở." });
      }
      const ticketYear = new Date().getFullYear();
      const ticketSequence = input.serviceChannel === "warranty"
        ? await getNextWarrantyRequestSequence(ticketYear)
        : await getNextRepairTicketSequence(ticketYear);
      const ticketCode = `${input.serviceChannel === "warranty" ? "BH" : "SC"}-${ticketYear}-${String(ticketSequence).padStart(3, "0")}`;
      const warrantyRequestCode = input.serviceChannel === "warranty" ? ticketCode : null;
      const assetBrand = input.serviceChannel === "warranty" && asset.brandId ? await getBrandById(asset.brandId) : null;
      const warrantyDetails = input.serviceChannel === "warranty" ? {
        warrantyBrand: assetBrand?.name || null,
        warrantyVendor: asset.vendor?.trim() || null,
        warrantyRequestCode,
      } : { warrantyBrand: null, warrantyVendor: null, warrantyRequestCode: null };
      const id = await createMaintenanceTicket({ ...input, ...warrantyDetails, ticketYear, ticketSequence, ticketCode, reporterUserId: ctx.user!.id, reporterName: ctx.user!.name ?? "Người dùng", status: "open" });
      await updateAsset(asset.id, { status: "maintenance", holderUserId: null, holderName: null, maintenanceReason: input.description.trim() });
      await recordActivity({ entityType: "maintenance", entityId: id, action: "reported", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo yêu cầu ${input.serviceChannel === "warranty" ? "bảo hành" : "sửa chữa"} · mã ${ticketCode}` });
      await recordActivity({ entityType: "asset", entityId: asset.id, action: "maintenance_reported", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Đưa ${asset.assetCode} vào Bảo trì` });
      return { id, ticketCode, warrantyRequestCode: warrantyDetails.warrantyRequestCode };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "in_progress", "resolved", "closed"]), assigneeUserId: z.number().int().positive().optional().nullable(), resolution: nullableText, estimatedCost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), actualCost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), dueAt: dateFromMs, recurrenceDays: z.number().int().min(1).max(3650).optional().nullable() })).mutation(async ({ input, ctx }) => {
      const ticket = await getMaintenanceTicket(input.id);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy yêu cầu bảo trì." });
      if (ticket.status === "closed") throw new TRPCError({ code: "CONFLICT", message: "Phiếu đã đóng, không thể chỉnh sửa hoặc cập nhật thêm." });
      const serviceChannel = ticket.serviceChannel;
      await updateMaintenanceTicket(input.id, { status: input.status, assigneeUserId: input.assigneeUserId, resolution: input.resolution, estimatedCost: input.estimatedCost, actualCost: input.actualCost, dueAt: input.dueAt, recurrenceDays: input.recurrenceDays, resolvedAt: input.status === "resolved" || input.status === "closed" ? new Date() : null });
      const asset = await getAssetById(ticket.assetId);
      if (asset) {
        if (input.status === "open" || input.status === "in_progress") {
          await updateAsset(asset.id, { status: "maintenance", holderUserId: null, holderName: null, maintenanceReason: ticket.description });
        } else if (input.status === "resolved" || input.status === "closed") {
          await updateAsset(asset.id, { status: "available", holderUserId: null, holderName: null, maintenanceReason: null });
        }
      }
      await recordActivity({ entityType: "maintenance", entityId: input.id, action: input.status, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật phiếu ${serviceChannel === "warranty" ? "bảo hành" : "sửa chữa"}: ${input.status}` });
      return { success: true };
    }),
    uploadAttachment: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      fileName: z.string().trim().min(1).max(255),
      contentType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
      dataUrl: z.string().max(7_000_000).regex(/^data:(application\/pdf|image\/(png|jpeg|webp));base64,/),
    })).mutation(async ({ input, ctx }) => {
      const ticket = await getMaintenanceTicket(input.id);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy yêu cầu bảo trì." });
      if (ticket.status === "closed") throw new TRPCError({ code: "CONFLICT", message: "Phiếu đã đóng, không thể tải thêm chứng từ." });
      const extension = input.contentType === "application/pdf" ? "pdf" : input.contentType.split("/")[1].replace("jpeg", "jpg");
      const safeBaseName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "chung-tu";
      const { url } = await storagePut(`maintenance/${ticket.id}/${Date.now()}-${safeBaseName}.${extension}`, Buffer.from(input.dataUrl.split(",", 2)[1], "base64"), input.contentType);
      await updateMaintenanceTicket(ticket.id, { attachmentUrl: url, attachmentName: input.fileName, attachmentContentType: input.contentType });
      await recordActivity({ entityType: "maintenance", entityId: ticket.id, action: "attachment_uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tải chứng từ: ${input.fileName}` });
      return { url, name: input.fileName, contentType: input.contentType };
    }),
  }),
  audits: router({
    list: adminProcedure.query(() => listAuditSessions()),
    getItems: adminProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(({ input }) => listAuditItems(input.sessionId)),
    importHistory: adminProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ input }) => {
      const session = await getAuditSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đợt kiểm kê." });
      return (await listActivityLogsByEntity("audit", input.sessionId)).filter((entry) => entry.action === "excel_imported");
    }),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(3).max(255), departmentId: z.number().int().positive().optional().nullable(), scheduledAt: dateFromMs, recurrenceDays: z.number().int().min(1).max(3650).optional().nullable() })).mutation(async ({ input, ctx }) => {
      const auditYear = new Date().getFullYear();
      const sequence = await getNextAuditSequence(auditYear);
      const referenceCode = `KK-${auditYear}-${String(sequence).padStart(2, "0")}`;
      const id = await createAuditSession({ ...input, referenceCode, createdByUserId: ctx.user!.id, status: "draft" });
      await recordActivity({ entityType: "audit", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo đợt kiểm kê ${input.name}` });
      return { id };
    }),
    addItem: adminProcedure.input(z.object({ sessionId: z.number().int().positive(), assetId: z.number().int().positive(), expectedStatus: z.string().max(64).optional().nullable() })).mutation(async ({ input, ctx }) => {
      await requireEditableAuditSession(input.sessionId);
      const asset = await getAssetById(input.assetId);
      if (!asset || asset.isArchived) throw new TRPCError({ code: "NOT_FOUND", message: "Tài sản được chọn không tồn tại hoặc đã lưu trữ." });
      if (asset.status === "returned_to_vendor" || asset.status === "retired") throw new TRPCError({ code: "BAD_REQUEST", message: "Tài sản đã trả nhà cung cấp hoặc Khấu hao/Thanh lý không thuộc phạm vi kiểm kê." });
      const id = await createAuditItem({ auditSessionId: input.sessionId, assetId: input.assetId, expectedStatus: input.expectedStatus, result: "pending" });
      await recordActivity({ entityType: "auditItem", entityId: id, action: "added", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Thêm tài sản vào kiểm kê" });
      return { id };
    }),
    removeItem: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const auditItem = await getAuditItemById(input.id);
      if (!auditItem) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài sản trong đợt kiểm kê." });
      await requireEditableAuditSession(auditItem.auditSessionId);
      await deleteAuditItem(input.id);
      await recordActivity({ entityType: "auditItem", entityId: input.id, action: "removed", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Xóa tài sản khỏi đợt kiểm kê" });
      return { success: true };
    }),
    deleteDraft: adminProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const session = await getAuditSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy đợt kiểm kê." });
      if (session.status !== "draft") throw new TRPCError({ code: "CONFLICT", message: "Chỉ có thể xóa đợt kiểm kê ở trạng thái nháp." });
      await deleteAuditItemsBySession(input.sessionId);
      await deleteAuditSession(input.sessionId);
      await recordActivity({ entityType: "audit", entityId: input.sessionId, action: "deleted", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Xóa đợt kiểm kê nháp ` });
      return { success: true };
    }),
    recordItem: adminProcedure.input(z.object({ id: z.number().int().positive(), actualStatus: z.string().max(64).optional().nullable(), result: z.enum(["pending", "matched", "missing", "mismatch"]), note: nullableText })).mutation(async ({ input, ctx }) => {
      const auditItem = await getAuditItemById(input.id);
      if (!auditItem) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài sản trong đợt kiểm kê." });
      await requireEditableAuditSession(auditItem.auditSessionId);
      const asset = await getAssetById(auditItem.assetId);
      if (asset?.status === "returned_to_vendor" || asset?.status === "retired") throw new TRPCError({ code: "BAD_REQUEST", message: "Tài sản đã trả nhà cung cấp hoặc Khấu hao/Thanh lý không thuộc phạm vi kiểm kê." });
      await updateAuditItem(input.id, { actualStatus: input.actualStatus, result: input.result, note: input.note, checkedByUserId: ctx.user!.id, checkedAt: new Date() });
      await recordActivity({ entityType: "auditItem", entityId: input.id, action: input.result, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Cập nhật kết quả kiểm kê" });
      return { success: true };
    }),
    importItems: adminProcedure.input(z.object({
      sessionId: z.number().int().positive(),
      items: z.array(z.object({
        id: z.number().int().positive(),
        actualStatus: z.enum(["available", "assigned", "maintenance", "returned_to_vendor", "retired", "lost", "damaged"]).nullable(),
        result: z.enum(["pending", "matched", "missing", "mismatch"]),
        note: nullableText,
      })).min(1).max(500),
    })).mutation(async ({ input, ctx }) => {
      await requireEditableAuditSession(input.sessionId);
      const sessionItems = await listAuditItems(input.sessionId);
      const sessionItemIds = new Set(sessionItems.map((item) => item.id));
      const importItemIds = new Set(input.items.map((item) => item.id));
      if (importItemIds.size !== input.items.length) throw new TRPCError({ code: "BAD_REQUEST", message: "File Excel có dòng kiểm kê trùng lặp." });
      if (input.items.some((item) => !sessionItemIds.has(item.id))) throw new TRPCError({ code: "BAD_REQUEST", message: "File Excel chứa tài sản không thuộc đợt kiểm kê đang mở." });
      const sessionItemById = new Map(sessionItems.map((item) => [item.id, item]));
      const importedAssets = await Promise.all(input.items.map(async (item) => ({ item, asset: await getAssetById(sessionItemById.get(item.id)!.assetId) })));
      if (importedAssets.some(({ asset }) => asset?.status === "returned_to_vendor" || asset?.status === "retired")) throw new TRPCError({ code: "BAD_REQUEST", message: "File Excel chứa tài sản đã trả nhà cung cấp hoặc Khấu hao/Thanh lý, không thuộc phạm vi kiểm kê." });
      const checkedAt = new Date();
      await Promise.all(input.items.map((item) => updateAuditItem(item.id, { actualStatus: item.actualStatus, result: item.result, note: item.note, checkedByUserId: ctx.user!.id, checkedAt })));
      await recordActivity({ entityType: "audit", entityId: input.sessionId, action: "excel_imported", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Nhập Excel và cập nhật ${input.items.length} kết quả kiểm kê` });
      return { updated: input.items.length };
    }),
    finalize: adminProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const session = await requireEditableAuditSession(input.sessionId);
      const sessionItems = await listAuditItems(input.sessionId);
      const auditableItems = (await Promise.all(sessionItems.map(async (item) => ({ item, asset: await getAssetById(item.assetId) })))).filter(({ asset }) => asset?.status !== "returned_to_vendor" && asset?.status !== "retired").map(({ item }) => item);
      if (!auditableItems.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Cần có ít nhất một tài sản đủ điều kiện trước khi chốt biên bản kiểm kê." });
      if (auditableItems.some((item) => item.result === "pending")) throw new TRPCError({ code: "BAD_REQUEST", message: "Cần hoàn tất kết quả cho toàn bộ tài sản đủ điều kiện trước khi chốt biên bản." });
      await updateAuditSession(session.id, { status: "completed", completedAt: new Date() });
      await recordActivity({ entityType: "audit", entityId: input.sessionId, action: "finalized", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Chốt biên bản kiểm kê ${session.referenceCode}` });
      return { success: true };
    }),
  }),
  reminders: router({
    list: protectedProcedure.query(async () => {
      const now = new Date();
      const operationalHorizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const warrantyHorizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const [tickets, audits, assets] = await Promise.all([listMaintenanceTickets(), listAuditSessions(), listAssets()]);
      const reminders = [
        ...tickets.filter((ticket) => (ticket.status === "open" || ticket.status === "in_progress") && ticket.dueAt && ticket.dueAt <= operationalHorizon).map((ticket) => ({ id: `maintenance-${ticket.id}`, kind: "maintenance" as const, title: `Bảo hành/Sửa chữa ${ticket.ticketCode}`, dueAt: ticket.dueAt!, isOverdue: ticket.dueAt! < now, detail: ticket.description, recurrenceDays: ticket.recurrenceDays })),
        ...audits.filter((audit) => (audit.status === "draft" || audit.status === "active") && audit.scheduledAt && audit.scheduledAt <= operationalHorizon).map((audit) => ({ id: `audit-${audit.id}`, kind: "audit" as const, auditSessionId: audit.id, title: audit.name, dueAt: audit.scheduledAt!, isOverdue: audit.scheduledAt! < now, detail: audit.referenceCode, recurrenceDays: audit.recurrenceDays })),
        ...assets.filter((asset) => !asset.isArchived && asset.status !== "returned_to_vendor" && asset.status !== "retired" && asset.warrantyUntil && asset.warrantyUntil >= now && asset.warrantyUntil <= warrantyHorizon).map((asset) => {
          const remainingDays = Math.max(0, Math.ceil((asset.warrantyUntil!.getTime() - now.getTime()) / 86_400_000));
          return { id: `warranty-expiry-${asset.id}`, kind: "warranty" as const, assetId: asset.id, title: `Sắp hết hạn bảo hành · ${asset.assetCode}`, dueAt: asset.warrantyUntil!, isOverdue: false, detail: `${asset.name} · còn ${remainingDays} ngày`, recurrenceDays: null };
        }),
      ];
      return reminders.sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime());
    }),
  }),
  activity: router({
    list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(300).default(100) })).query(({ input }) => listActivityLogs(input.limit)),
  }),
  help: router({
    guides: protectedProcedure.query(async ({ ctx }) => {
      const guides = await listHelpGuides();
      return ctx.user!.role === "admin" ? guides : guides.filter((guide) => guide.audience === "user");
    }),
    saveGuide: adminProcedure.input(z.object({
      guideKey: z.string().trim().min(3).max(96).regex(/^[a-z0-9-]+$/),
      audience: z.enum(["admin", "user"]),
      title: z.string().trim().min(3).max(255),
      description: z.string().trim().min(10).max(2000),
      steps: z.array(z.string().trim().min(3).max(800)).min(1).max(6),
    })).mutation(async ({ input, ctx }) => {
      await saveHelpGuide({ ...input, steps: input.steps, updatedByUserId: ctx.user!.id, updatedByName: ctx.user!.name ?? "Quản trị viên" });
      const versionId = await createHelpGuideVersion({ ...input, steps: input.steps, changedByUserId: ctx.user!.id, changedByName: ctx.user!.name ?? "Quản trị viên" });
      await recordActivity({ entityType: "helpGuide", entityId: versionId, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật hướng dẫn: ${input.title}` });
      return { success: true, versionId };
    }),
    versions: adminProcedure.input(z.object({ guideKey: z.string().trim().min(3).max(96).regex(/^[a-z0-9-]+$/) })).query(({ input }) => listHelpGuideVersions(input.guideKey)),
  }),
});

export type AppRouter = typeof appRouter;
