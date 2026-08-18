import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
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
  createDepartment,
  createDivision,
  createHandover,
  createInventoryMovement,
  createInventorySupply,
  createSupplyIssueSlip,
  createSupplyIssueSlipItem,
  createMaintenanceTicket,
  createVendor,
  createVendorDocument,
  countAssetsByCategoryId,
  countUsersByRole,
  deleteAssetCategory,
  deleteVendorDocument,
  getAssetById,
  getAssetImportSessionById,
  getAuditItemById,
  getAuditSession,
  getAssetCategoryByCode,
  getAssetCategoryById,
  getAssetCategoryByName,
  getLatestAssetImportSession,
  getBrandById,
  getBrandByName,
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
  listHelpGuides,
  listUiLabels,
  getNextHandoverSequence,
  getNextAuditSequence,
  getMaintenanceTicket,
  getNextAssetCodeForPrefix,
  getUserNotificationPreferences,
  saveUiLabel,
  listMaintenanceTickets,
  listMaintenanceTicketsByAsset,
  getNextMaintenanceTicketSequence,
  listActivityLogsByEntity,
  getVendorById,
  getVendorByName,
  getVendorDocumentById,
  listAssets,
  listAssetCategories,
  listAllAssetCategories,
  listAssetFieldChanges,
  listActiveAssetsBySerialNumber,
  listAssetsByCodes,
  listAssetCodesByCodes,
  listBrands,
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
  listInventoryMovements,
  listInventorySupplies,
  listInventoryMovementReport,
  listSupplyIssueSlipItems,
  listSupplyIssueSlips,
  listSupplyIssueAnalytics,
  listHelpGuideVersions,
  listVendors,
  listVendorDocuments,
  listUsers,
  recordActivity,
  runAssetImportTransaction,
  runInventoryTransaction,
  saveCompany,
  saveHelpGuide,
  saveUserNotificationPreferences,
  updateAsset,
  updateAssetCategory,
  updateAssetImportSession,
  updateBrand,
  updateDepartment,
  updateDivision,
  updateVendor,
  updateHandover,
  updateInventorySupply,
  updateSupplyIssueSlip,
  updateSupplyIssueSlipItem,
  updateMaintenanceTicket,
  updateUserRole,
  updateUserActiveStatus,
  updateUserDepartment,
  updateUserDivision,
  updateAuditItem,
  updateAuditSession,
  transitionHandoverStatus,
} from "./db";
import { storagePut } from "./storage";

const nullableText = z.string().trim().max(1000).optional().nullable();
const dateFromMs = z.number().int().nonnegative().optional().nullable().transform((value) => value ? new Date(value) : null);

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

const assetInput = z.object({
  assetCode: z.string().trim().min(2).max(64), name: z.string().trim().min(2).max(255), categoryId: z.number().int().positive().optional().nullable(), departmentId: z.number().int().positive().optional().nullable(), holderName: nullableText,
  status: z.enum(["available", "assigned", "maintenance", "retired", "lost", "returned_to_vendor"]).default("available"), condition: z.enum(["good", "fair", "needs_inspection", "damaged"]).default("good"),
  purchaseDate: dateFromMs, purchaseValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), supplierReturnedAt: dateFromMs, supplierReturnReason: nullableText, vendor: nullableText, vendorId: z.number().int().positive().optional().nullable(), brandId: z.number().int().positive().optional().nullable(), serialNumber: nullableText, location: nullableText, warrantyUntil: dateFromMs, note: nullableText, maintenanceReason: nullableText,
});

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
  vendor: nullableText,
  brandName: z.string().trim().max(160).nullable(),
  serialNumber: nullableText,
  location: nullableText,
  warrantyUntil: dateFromMs,
  note: nullableText,
});

const trackedAssetFields = ["name", "status", "condition", "purchaseDate", "purchaseValue", "vendor", "brandId", "serialNumber", "location", "warrantyUntil", "metadata", "note", "maintenanceReason", "isArchived"] as const;
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
function importAssetValues(row: z.infer<typeof assetImportRow>, brandId: number | null, vendorId: number | null, categoryId: number) {
  return { name: row.name, categoryId, status: row.status, condition: row.condition, purchaseDate: row.purchaseDate, purchaseValue: row.purchaseValue, vendor: row.vendor, vendorId, brandId, serialNumber: row.serialNumber, location: row.location, warrantyUntil: row.warrantyUntil, metadata: { category: row.category }, note: row.note, maintenanceReason: row.status === "maintenance" ? row.maintenanceReason : null, isArchived: false };
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
  notifications: router({
    preferences: protectedProcedure.query(async ({ ctx }) => {
      const stored = await getUserNotificationPreferences(ctx.user.id);
      return stored ? { maintenanceEnabled: stored.maintenanceEnabled, handoverEnabled: stored.handoverEnabled, returnRequestEnabled: stored.returnRequestEnabled } : { maintenanceEnabled: true, handoverEnabled: true, returnRequestEnabled: true };
    }),
    savePreferences: protectedProcedure.input(z.object({ maintenanceEnabled: z.boolean(), handoverEnabled: z.boolean(), returnRequestEnabled: z.boolean() })).mutation(async ({ input, ctx }) => {
      await saveUserNotificationPreferences(ctx.user.id, input);
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
    save: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(255), address: nullableText, taxCode: nullableText, phone: nullableText, email: z.string().email().optional().nullable(), logoUrl: nullableText, websiteTitle: z.string().trim().min(2).max(120).optional().nullable(), brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(), faviconUrl: nullableText, loginBackgroundUrl: nullableText, loginGreeting: z.string().trim().max(300).optional().nullable(), loginBackgroundOverlay: z.enum(["light", "dark"]).optional().nullable() })).mutation(async ({ input, ctx }) => {
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
    issueAnalytics: adminProcedure.query(() => listSupplyIssueAnalytics()),
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
      if (new Set(input.items.map((item) => item.supplyId)).size !== input.items.length) issue.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Một vật tư chỉ được xuất một lần trong cùng phiếu." });
    })).mutation(async ({ input, ctx }) => {
      const recipientUser = input.recipientUserId ? (await listUsers()).find((user) => user.id === input.recipientUserId && user.isActive) : null;
      if (input.recipientUserId && !recipientUser) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy nhân sự đang hoạt động được chọn." });
      const recipientName = recipientUser?.name || input.recipientName?.trim();
      if (!recipientName) throw new TRPCError({ code: "BAD_REQUEST", message: "Vui lòng cung cấp người nhận vật tư." });
      const issueYear = new Date().getFullYear();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          return await runInventoryTransaction(async (transaction) => {
            const sequence = await getNextSupplyIssueSequence(issueYear, transaction);
            const referenceCode = `VT-${issueYear}-${String(sequence).padStart(3, "0")}`;
            const issueSlipId = await createSupplyIssueSlip({ referenceCode, recipientUserId: recipientUser?.id ?? null, recipientName, recipientDepartmentId: recipientUser?.departmentId ?? input.recipientDepartmentId ?? null, status: "active", note: input.note ?? null, issuedByUserId: ctx.user!.id, issuedByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
            for (const requestItem of input.items) {
              const supply = await getInventorySupplyById(requestItem.supplyId, transaction);
              if (!supply || !supply.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy vật tư đang hoạt động." });
              const before = Number(supply.stockQuantity);
              const after = before - requestItem.quantity;
              if (after < 0) throw new TRPCError({ code: "BAD_REQUEST", message: `Tồn kho ${supply.name} không đủ. Hiện còn ${before} ${supply.unit}.` });
              await updateInventorySupply(supply.id, { stockQuantity: String(after) }, transaction);
              const issueSlipItemId = await createSupplyIssueSlipItem({ issueSlipId, supplyId: supply.id, supplyCode: supply.code, supplyName: supply.name, unit: supply.unit, issuedQuantity: String(requestItem.quantity), returnedQuantity: "0" }, transaction);
              await createInventoryMovement({ supplyId: supply.id, movementType: "issue", quantity: String(-requestItem.quantity), quantityBefore: String(before), quantityAfter: String(after), issueSlipId, issueSlipItemId, recipientUserId: recipientUser?.id ?? null, recipientName, recipientDepartmentId: recipientUser?.departmentId ?? input.recipientDepartmentId ?? null, note: `Cấp phát theo phiếu ${referenceCode}${input.note ? `: ${input.note}` : ""}`, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
            }
            await recordActivity({ entityType: "supply_issue_slip", entityId: issueSlipId, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo phiếu cấp phát vật tư ${referenceCode} cho ${recipientName}` }, transaction);
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
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy dòng vật tư đã cấp phát." });
      const issueSlip = await getSupplyIssueSlipById(item.issueSlipId, transaction);
      if (!issueSlip || issueSlip.status === "returned") throw new TRPCError({ code: "BAD_REQUEST", message: "Phiếu cấp phát này đã hoàn trả toàn bộ." });
      const availableToReturn = Number(item.issuedQuantity) - Number(item.returnedQuantity);
      if (input.quantity > availableToReturn) throw new TRPCError({ code: "BAD_REQUEST", message: `Chỉ có thể hoàn trả tối đa ${availableToReturn} ${item.unit}.` });
      const supply = await getInventorySupplyById(item.supplyId, transaction);
      if (!supply) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy vật tư trong kho." });
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
      unit: z.string().trim().min(1).max(32).default("Cái"),
      openingQuantity: z.number().finite().min(0).default(0),
      minimumQuantity: z.number().finite().min(0).default(0),
      unitCost: z.number().finite().min(0).nullable().optional(),
      location: nullableText,
      note: nullableText,
    })).mutation(async ({ input, ctx }) => {
      if (await getInventorySupplyByCode(input.code)) throw new TRPCError({ code: "BAD_REQUEST", message: "Mã vật tư này đã tồn tại." });
      return runInventoryTransaction(async (transaction) => {
        const supplyId = await createInventorySupply({ code: input.code, name: input.name, categoryId: input.categoryId ?? null, vendorId: input.vendorId ?? null, brandId: input.brandId ?? null, unit: input.unit, stockQuantity: String(input.openingQuantity), minimumQuantity: String(input.minimumQuantity), unitCost: input.unitCost === null || input.unitCost === undefined ? null : String(input.unitCost), location: input.location ?? null, note: input.note ?? null, isActive: true, createdByUserId: ctx.user!.id }, transaction);
        if (input.openingQuantity > 0) await createInventoryMovement({ supplyId, movementType: "receipt", quantity: String(input.openingQuantity), quantityBefore: "0", quantityAfter: String(input.openingQuantity), note: "Tồn đầu kỳ khi tạo vật tư", createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
        await recordActivity({ entityType: "supply", entityId: supplyId, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo vật tư ${input.name} (${input.code}), tồn đầu ${input.openingQuantity} ${input.unit}` }, transaction);
        return { id: supplyId };
      });
    }),
    bulkCreate: adminProcedure.input(z.object({ items: z.array(z.object({
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
        if (fileCodes.has(item.code)) throw new TRPCError({ code: "BAD_REQUEST", message: `Mã vật tư ${item.code} bị lặp trong file Excel.` });
        fileCodes.add(item.code);
      }
      return runInventoryTransaction(async (transaction) => {
        for (const item of input.items) if (await getInventorySupplyByCode(item.code, transaction)) throw new TRPCError({ code: "BAD_REQUEST", message: `Mã vật tư ${item.code} đã tồn tại.` });
        const ids: number[] = [];
        for (const item of input.items) {
          const supplyId = await createInventorySupply({ code: item.code, name: item.name, categoryId: item.categoryId ?? null, vendorId: item.vendorId ?? null, brandId: item.brandId ?? null, unit: item.unit, stockQuantity: String(item.openingQuantity), minimumQuantity: String(item.minimumQuantity), unitCost: item.unitCost === null || item.unitCost === undefined ? null : String(item.unitCost), location: item.location ?? null, note: item.note ?? null, isActive: true, createdByUserId: ctx.user!.id }, transaction);
          if (item.openingQuantity > 0) await createInventoryMovement({ supplyId, movementType: "receipt", quantity: String(item.openingQuantity), quantityBefore: "0", quantityAfter: String(item.openingQuantity), note: "Tồn đầu kỳ khi nhập Excel vật tư", createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
          await recordActivity({ entityType: "supply", entityId: supplyId, action: "bulk_imported", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Nhập Excel vật tư ${item.name} (${item.code}), tồn đầu ${item.openingQuantity} ${item.unit}` }, transaction);
          ids.push(supplyId);
        }
        return { created: ids.length, ids };
      });
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9-]+$/).transform((value) => value.toUpperCase()).optional(), name: z.string().trim().min(2).max(255).optional(), categoryId: z.number().int().positive().nullable().optional(), vendorId: z.number().int().positive().nullable().optional(), brandId: z.number().int().positive().nullable().optional(), unit: z.string().trim().min(1).max(32).optional(), minimumQuantity: z.number().finite().min(0).optional(), unitCost: z.number().finite().min(0).nullable().optional(), location: nullableText, note: nullableText, isActive: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
      const supply = await getInventorySupplyById(input.id);
      if (!supply) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy vật tư." });
      if (input.code && input.code !== supply.code && await getInventorySupplyByCode(input.code)) throw new TRPCError({ code: "BAD_REQUEST", message: "Mã vật tư này đã tồn tại." });
      const { id, minimumQuantity, unitCost, ...changes } = input;
      await updateInventorySupply(id, { ...changes, minimumQuantity: minimumQuantity === undefined ? undefined : String(minimumQuantity), unitCost: unitCost === undefined ? undefined : unitCost === null ? null : String(unitCost) });
      await recordActivity({ entityType: "supply", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật vật tư ${changes.name || supply.name}${changes.code && changes.code !== supply.code ? `, mã ${supply.code} → ${changes.code}` : ""}` });
      return { success: true };
    }),
    move: adminProcedure.input(z.object({ supplyId: z.number().int().positive(), movementType: z.enum(["receipt", "issue", "adjustment"]), quantity: z.number().finite(), recipientUserId: z.number().int().positive().nullable().optional(), recipientName: z.string().trim().max(160).optional(), recipientDepartmentId: z.number().int().positive().nullable().optional(), note: z.string().trim().min(2).max(1000) }).superRefine((input, issue) => {
      if (input.movementType !== "adjustment" && input.quantity <= 0) issue.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Số lượng phải lớn hơn 0." });
      if (input.movementType === "adjustment" && input.quantity === 0) issue.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Số lượng điều chỉnh không được bằng 0." });
      if (input.movementType === "issue" && !input.recipientUserId && !input.recipientName) issue.addIssue({ code: z.ZodIssueCode.custom, path: ["recipientName"], message: "Vui lòng chọn nhân sự hoặc nhập người nhận khác." });
    })).mutation(async ({ input, ctx }) => runInventoryTransaction(async (transaction) => {
      const supply = await getInventorySupplyById(input.supplyId, transaction);
      if (!supply || !supply.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy vật tư đang hoạt động." });
      const recipientUser = input.recipientUserId ? (await listUsers()).find((user) => user.id === input.recipientUserId && user.isActive) : null;
      if (input.recipientUserId && !recipientUser) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy nhân sự đang hoạt động được chọn." });
      const before = Number(supply.stockQuantity);
      const signedQuantity = input.movementType === "issue" ? -input.quantity : input.quantity;
      const after = before + signedQuantity;
      if (after < 0) throw new TRPCError({ code: "BAD_REQUEST", message: `Tồn kho không đủ. Hiện còn ${before} ${supply.unit}.` });
      await updateInventorySupply(supply.id, { stockQuantity: String(after) }, transaction);
      const movementId = await createInventoryMovement({ supplyId: supply.id, movementType: input.movementType, quantity: String(signedQuantity), quantityBefore: String(before), quantityAfter: String(after), recipientUserId: recipientUser?.id ?? null, recipientName: (recipientUser?.name || input.recipientName) ?? null, recipientDepartmentId: recipientUser?.departmentId ?? input.recipientDepartmentId ?? null, note: input.note, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
      const actionLabel = input.movementType === "receipt" ? "Nhập kho" : input.movementType === "issue" ? "Cấp phát/xuất kho" : "Điều chỉnh tồn";
      await recordActivity({ entityType: "supply", entityId: supply.id, action: input.movementType, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `${actionLabel} ${Math.abs(signedQuantity)} ${supply.unit} vật tư ${supply.name}. Tồn: ${after} ${supply.unit}.` }, transaction);
      return { movementId, stockQuantity: after, isLowStock: after <= Number(supply.minimumQuantity) };
    })),
  }),
  assets: router({
    list: adminProcedure.query(() => listAssets()),
    import: adminProcedure.input(z.object({ rows: z.array(assetImportRow).min(1).max(100), updateExisting: z.boolean().default(false) })).mutation(async ({ input, ctx }) => {
      const rowsToImport: Array<{ row: typeof assetImportRow._output; category: NonNullable<Awaited<ReturnType<typeof getAssetCategoryByName>>>; vendorId: number | null; brandId: number | null; existingAsset: Awaited<ReturnType<typeof listActiveAssetsBySerialNumber>>[number] | null }> = [];
      const errors: Array<{ rowNumber: number; message: string }> = [];
      for (const row of input.rows) {
        if (!hasRequiredMaintenanceReason(row.status, row.maintenanceReason)) { errors.push({ rowNumber: row.rowNumber, message: "Tài sản Bảo trì cần có Lý do bảo trì." }); continue; }
        const category = await getAssetCategoryByName(row.category);
        if (!category?.isActive) { errors.push({ rowNumber: row.rowNumber, message: `Phân loại ${row.category} không tồn tại hoặc đã ngừng hoạt động.` }); continue; }
        const vendor = row.vendor ? await getVendorByName(row.vendor) : null;
        if (row.vendor && !vendor?.isActive) { errors.push({ rowNumber: row.rowNumber, message: `Nhà cung cấp ${row.vendor} không tồn tại hoặc đã ngừng hoạt động.` }); continue; }
        const brand = row.brandName ? await getBrandByName(row.brandName) : null;
        if (row.brandName && !brand?.isActive) { errors.push({ rowNumber: row.rowNumber, message: `Hãng ${row.brandName} không tồn tại hoặc đã ngừng hoạt động.` }); continue; }
        const existingMatches = input.updateExisting && row.serialNumber ? await listActiveAssetsBySerialNumber(row.serialNumber) : [];
        if (existingMatches.length > 1) { errors.push({ rowNumber: row.rowNumber, message: `Serial/IMEI ${row.serialNumber} đang trùng trên nhiều tài sản, không thể cập nhật tự động.` }); continue; }
        rowsToImport.push({ row, category, vendorId: vendor?.id ?? null, brandId: brand?.id ?? null, existingAsset: existingMatches[0] ?? null });
      }
      if (!rowsToImport.length) return { created: 0, updated: 0, errors, sessionId: null };
      return runAssetImportTransaction(async (transaction) => {
        const sessionId = await createAssetImportSession({ referenceCode: `IMP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, createdByUserId: ctx.user!.id, createdByName: ctx.user!.name ?? "Quản trị viên" }, transaction);
        const nextSequenceByPrefix = new Map<string, number>();
        let created = 0;
        let updated = 0;
        for (const { row, category, vendorId, brandId, existingAsset } of rowsToImport) {
          const changes = importAssetValues(row, brandId, vendorId, category.id);
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
      if (!hasRequiredMaintenanceReason(input.status, input.maintenanceReason)) throw new TRPCError({ code: "BAD_REQUEST", message: "Vui lòng nhập lý do bảo trì khi đưa tài sản vào Bảo trì." });
      if (input.vendorId && !(await getVendorById(input.vendorId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp được chọn không tồn tại hoặc đã ngừng hoạt động." });
      if (input.brandId && !(await getBrandById(input.brandId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Hãng được chọn không tồn tại hoặc đã ngừng hoạt động." });
      const id = await createAsset({ ...input, maintenanceReason: input.status === "maintenance" ? input.maintenanceReason : null, qrToken: crypto.randomUUID().replaceAll("-", ""), createdByUserId: ctx.user!.id });
      await recordActivity({ entityType: "asset", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo tài sản ${input.assetCode}` });
      return { id };
    }),
    update: adminProcedure.input(assetInput.partial().extend({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const { id, ...changes } = input;
      const current = await getAssetById(id);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tài sản cần cập nhật." });
      if (!hasRequiredMaintenanceReason(changes.status, changes.maintenanceReason)) throw new TRPCError({ code: "BAD_REQUEST", message: "Vui lòng nhập lý do bảo trì khi đưa tài sản vào Bảo trì." });
      if (changes.vendorId && !(await getVendorById(changes.vendorId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Nhà cung cấp được chọn không tồn tại hoặc đã ngừng hoạt động." });
      if (changes.brandId && !(await getBrandById(changes.brandId))?.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Hãng được chọn không tồn tại hoặc đã ngừng hoạt động." });
      const persistedChanges = changes.status && changes.status !== "maintenance" ? { ...changes, maintenanceReason: null } : changes;
      const supplierReturnChanges = changes.status === "returned_to_vendor"
        ? { supplierReturnedAt: changes.supplierReturnedAt ?? current.supplierReturnedAt ?? new Date(), supplierReturnReason: changes.supplierReturnReason?.trim() || current.supplierReturnReason || null }
        : {};
      // Ngày mua là dữ liệu gốc từ lúc nhập kho; không được thay đổi sau khi tài sản đã tạo/import.
      const safeChanges = { ...persistedChanges, ...supplierReturnChanges, purchaseDate: current.purchaseDate };
      await updateAsset(id, safeChanges);
      await createAssetFieldChanges(fieldChanges(id, assetSnapshot(current as unknown as Record<string, unknown>), assetSnapshot({ ...(current as unknown as Record<string, unknown>), ...safeChanges }), "manual", ctx.user!.id, ctx.user!.name));
      await recordActivity({ entityType: "asset", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Cập nhật thông tin tài sản" });
      return { success: true };
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
    archive: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      await updateAsset(input.id, { isArchived: true });
      await recordActivity({ entityType: "asset", entityId: input.id, action: "archived", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Lưu trữ tài sản" });
      return { success: true };
    }),
  }),
  handovers: router({
    returnDecisionHistory: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const handover = await getHandoverById(input.id);
      if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      return listHandoverReturnDecisionHistory(input.id);
    }),
    list: adminProcedure.query(() => listHandovers()),
    get: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const handover = await getHandoverById(input.id);
      if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      return handover;
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
    resolveReturnRequest: adminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), conditionIn: z.string().trim().max(120).optional().nullable(), resolution: z.string().trim().max(1000).optional().nullable(), conditionPhoto: z.object({ fileName: z.string().trim().min(1).max(255), contentType: z.enum(["image/png", "image/jpeg", "image/webp"]), dataUrl: z.string().max(7_000_000).regex(/^data:image\/(png|jpeg|webp);base64,/) }).optional().nullable() })).mutation(async ({ input, ctx }) => {
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
      if (input.decision === "approved") await transitionHandoverStatus(input.id, "returned", changes);
      else await updateHandover(input.id, changes);
      await recordActivity({ entityType: "handover", entityId: input.id, action: input.decision === "approved" ? "return_approved" : "return_rejected", actorUserId: ctx.user.id, actorName: ctx.user.name, summary: `${input.decision === "approved" ? "Duyệt" : "Từ chối"} yêu cầu hoàn trả ${handover.assetCode}` });
      return { success: true };
    }),
    create: adminProcedure.input(z.object({ assetId: z.number().int().positive(), recipientUserId: z.number().int().positive().optional().nullable(), recipientName: z.string().trim().min(2).max(160), recipientDepartmentId: z.number().int().positive().optional().nullable(), recipientDepartmentName: nullableText, handedOverAt: z.number().int().transform((value) => new Date(value)), dueBackAt: dateFromMs, conditionOut: nullableText, accessories: nullableText, note: nullableText })).mutation(async ({ input, ctx }) => {
      const asset = await getAssetById(input.assetId);
      if (!asset || asset.isArchived) throw new TRPCError({ code: "NOT_FOUND", message: "Tài sản được chọn không tồn tại hoặc đã lưu trữ." });
      if (asset.status !== "available") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ có thể lập phiếu cho tài sản đang sẵn có." });
      const handoverYear = input.handedOverAt.getFullYear();
      let id: number | undefined;
      for (let attempt = 0; attempt < 5 && id === undefined; attempt += 1) {
        const handoverSequence = await getNextHandoverSequence(handoverYear);
        const referenceCode = `BG-${handoverYear}-${String(handoverSequence).padStart(3, "0")}`;
        try {
          id = await createHandover({ ...input, referenceCode, handoverByUserId: ctx.user!.id, handoverByName: ctx.user!.name ?? "Quản trị viên", status: "draft" });
        } catch (error) {
          const duplicateCode = typeof error === "object" && error !== null && (("code" in error && error.code === "ER_DUP_ENTRY") || ("errno" in error && Number(error.errno) === 1062));
          if (!duplicateCode || attempt === 4) throw error;
        }
      }
      if (id === undefined) throw new TRPCError({ code: "CONFLICT", message: "Không thể tạo mã phiếu bàn giao duy nhất. Vui lòng thử lại." });
      await recordActivity({ entityType: "handover", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo phiếu bàn giao cho ${input.recipientName}` });
      return { id };
    }),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["draft", "pending_signature", "active", "returned", "cancelled"]), recipientSignatureUrl: nullableText, handoverSignatureUrl: nullableText })).mutation(async ({ input, ctx }) => {
      const existing = await getHandoverById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      if (input.status === "active" && !(input.recipientSignatureUrl ?? existing.recipientSignatureUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cần có chữ ký người nhận trước khi xác nhận bàn giao." });
      }
      await transitionHandoverStatus(input.id, input.status, { recipientSignatureUrl: input.recipientSignatureUrl, handoverSignatureUrl: input.handoverSignatureUrl });
      await recordActivity({ entityType: "handover", entityId: input.id, action: input.status, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật trạng thái phiếu: ${input.status}` });
      return { success: true };
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
    byAsset: protectedProcedure.input(z.object({ assetId: z.number().int().positive() })).query(({ input }) => listMaintenanceTicketsByAsset(input.assetId)),
    history: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const ticket = await getMaintenanceTicket(input.id);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy yêu cầu bảo trì." });
      return listActivityLogsByEntity("maintenance", input.id);
    }),
    create: protectedProcedure.input(z.object({ assetId: z.number().int().positive(), issueType: z.enum(["maintenance", "incident", "damage"]), priority: z.enum(["low", "medium", "high", "critical"]).default("medium"), description: z.string().trim().min(5).max(5000), estimatedCost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), dueAt: dateFromMs, recurrenceDays: z.number().int().min(1).max(3650).optional().nullable() })).mutation(async ({ input, ctx }) => {
      const asset = await getAssetById(input.assetId);
      if (!asset || asset.isArchived) throw new TRPCError({ code: "NOT_FOUND", message: "Tài sản được chọn không tồn tại hoặc đã lưu trữ." });
      const existingTickets = await listMaintenanceTicketsByAsset(input.assetId);
      if (existingTickets.some((ticket) => ticket.status === "open" || ticket.status === "in_progress")) {
        throw new TRPCError({ code: "CONFLICT", message: "Tài sản này đã có yêu cầu bảo trì đang mở." });
      }
      const ticketYear = new Date().getFullYear();
      const ticketSequence = await getNextMaintenanceTicketSequence(ticketYear);
      const ticketCode = `BT-${ticketYear}-${String(ticketSequence).padStart(3, "0")}`;
      const id = await createMaintenanceTicket({ ...input, ticketYear, ticketSequence, ticketCode, reporterUserId: ctx.user!.id, reporterName: ctx.user!.name ?? "Người dùng", status: "open" });
      await updateAsset(asset.id, { status: "maintenance", holderUserId: null, holderName: null, maintenanceReason: input.description.trim() });
      await recordActivity({ entityType: "maintenance", entityId: id, action: "reported", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Tạo yêu cầu bảo trì / báo hỏng" });
      await recordActivity({ entityType: "asset", entityId: asset.id, action: "maintenance_reported", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Đưa ${asset.assetCode} vào Bảo trì` });
      return { id };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "in_progress", "resolved", "closed"]), assigneeUserId: z.number().int().positive().optional().nullable(), resolution: nullableText, estimatedCost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), actualCost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), dueAt: dateFromMs, recurrenceDays: z.number().int().min(1).max(3650).optional().nullable() })).mutation(async ({ input, ctx }) => {
      const ticket = await getMaintenanceTicket(input.id);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy yêu cầu bảo trì." });
      if (ticket.status === "closed") throw new TRPCError({ code: "CONFLICT", message: "Phiếu đã đóng, không thể chỉnh sửa hoặc cập nhật thêm." });
      await updateMaintenanceTicket(input.id, { status: input.status, assigneeUserId: input.assigneeUserId, resolution: input.resolution, estimatedCost: input.estimatedCost, actualCost: input.actualCost, dueAt: input.dueAt, recurrenceDays: input.recurrenceDays, resolvedAt: input.status === "resolved" || input.status === "closed" ? new Date() : null });
      const asset = await getAssetById(ticket.assetId);
      if (asset) {
        if (input.status === "open" || input.status === "in_progress") {
          await updateAsset(asset.id, { status: "maintenance", holderUserId: null, holderName: null, maintenanceReason: ticket.description });
        } else if (input.status === "resolved" || input.status === "closed") {
          await updateAsset(asset.id, { status: "available", holderUserId: null, holderName: null, maintenanceReason: null });
        }
      }
      await recordActivity({ entityType: "maintenance", entityId: input.id, action: input.status, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Cập nhật yêu cầu bảo trì: ${input.status}` });
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
      if (asset.status === "returned_to_vendor") throw new TRPCError({ code: "BAD_REQUEST", message: "Tài sản đã trả nhà cung cấp không thuộc phạm vi kiểm kê." });
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
      if (asset?.status === "returned_to_vendor") throw new TRPCError({ code: "BAD_REQUEST", message: "Tài sản đã trả nhà cung cấp không thuộc phạm vi kiểm kê." });
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
      if (importedAssets.some(({ asset }) => asset?.status === "returned_to_vendor")) throw new TRPCError({ code: "BAD_REQUEST", message: "File Excel chứa tài sản đã trả nhà cung cấp, không thuộc phạm vi kiểm kê." });
      const checkedAt = new Date();
      await Promise.all(input.items.map((item) => updateAuditItem(item.id, { actualStatus: item.actualStatus, result: item.result, note: item.note, checkedByUserId: ctx.user!.id, checkedAt })));
      await recordActivity({ entityType: "audit", entityId: input.sessionId, action: "excel_imported", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Nhập Excel và cập nhật ${input.items.length} kết quả kiểm kê` });
      return { updated: input.items.length };
    }),
    finalize: adminProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const session = await requireEditableAuditSession(input.sessionId);
      const sessionItems = await listAuditItems(input.sessionId);
      const auditableItems = (await Promise.all(sessionItems.map(async (item) => ({ item, asset: await getAssetById(item.assetId) })))).filter(({ asset }) => asset?.status !== "returned_to_vendor").map(({ item }) => item);
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
      const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const [tickets, audits] = await Promise.all([listMaintenanceTickets(), listAuditSessions()]);
      const reminders = [
        ...tickets.filter((ticket) => (ticket.status === "open" || ticket.status === "in_progress") && ticket.dueAt && ticket.dueAt <= horizon).map((ticket) => ({ id: `maintenance-${ticket.id}`, kind: "maintenance" as const, title: `Bảo trì ${ticket.ticketCode}`, dueAt: ticket.dueAt!, isOverdue: ticket.dueAt! < now, detail: ticket.description, recurrenceDays: ticket.recurrenceDays })),
        ...audits.filter((audit) => (audit.status === "draft" || audit.status === "active") && audit.scheduledAt && audit.scheduledAt <= horizon).map((audit) => ({ id: `audit-${audit.id}`, kind: "audit" as const, title: audit.name, dueAt: audit.scheduledAt!, isOverdue: audit.scheduledAt! < now, detail: audit.referenceCode, recurrenceDays: audit.recurrenceDays })),
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
