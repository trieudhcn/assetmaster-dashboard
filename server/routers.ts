import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAsset,
  createAuditSession,
  createAuditItem,
  createHandover,
  createMaintenanceTicket,
  getAssetById,
  getActiveDepartmentById,
  getCompany,
  getHandoverById,
  getMaintenanceTicket,
  listAssets,
  listAuditItems,
  listAuditSessions,
  listActivityLogs,
  listDepartments,
  listHandovers,
  listHandoversByRecipient,
  listMaintenanceTickets,
  listUsers,
  recordActivity,
  saveCompany,
  updateAsset,
  updateHandover,
  updateMaintenanceTicket,
  updateUserRole,
  updateUserActiveStatus,
  updateUserDepartment,
  updateAuditItem,
  transitionHandoverStatus,
} from "./db";
import { storagePut } from "./storage";

const nullableText = z.string().trim().max(1000).optional().nullable();
const dateFromMs = z.number().int().nonnegative().optional().nullable().transform((value) => value ? new Date(value) : null);

const assetInput = z.object({
  assetCode: z.string().trim().min(2).max(64), name: z.string().trim().min(2).max(255), categoryId: z.number().int().positive().optional().nullable(), departmentId: z.number().int().positive().optional().nullable(), holderName: nullableText,
  status: z.enum(["available", "assigned", "maintenance", "retired", "lost"]).default("available"), condition: z.enum(["good", "fair", "needs_inspection", "damaged"]).default("good"),
  purchaseDate: dateFromMs, purchaseValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), vendor: nullableText, serialNumber: nullableText, location: nullableText, warrantyUntil: dateFromMs, note: nullableText,
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  company: router({
    get: protectedProcedure.query(() => getCompany()),
    save: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(255), address: nullableText, taxCode: nullableText, phone: nullableText, email: z.string().email().optional().nullable(), logoUrl: nullableText })).mutation(async ({ input, ctx }) => {
      const id = await saveCompany(input);
      await recordActivity({ entityType: "company", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Cập nhật thông tin công ty" });
      return { id };
    }),
  }),
  employees: router({
    list: adminProcedure.query(() => listUsers()),
    assetHistory: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ input }) => listHandoversByRecipient(input.userId)),
    updateRole: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(["admin", "user"]) })).mutation(async ({ input, ctx }) => {
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
  }),
  departments: router({
    list: adminProcedure.query(() => listDepartments()),
  }),
  assets: router({
    list: protectedProcedure.query(() => listAssets()),
    create: adminProcedure.input(assetInput).mutation(async ({ input, ctx }) => {
      const id = await createAsset({ ...input, qrToken: crypto.randomUUID().replaceAll("-", ""), createdByUserId: ctx.user!.id });
      await recordActivity({ entityType: "asset", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo tài sản ${input.assetCode}` });
      return { id };
    }),
    update: adminProcedure.input(assetInput.partial().extend({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const { id, ...changes } = input;
      await updateAsset(id, changes);
      await recordActivity({ entityType: "asset", entityId: id, action: "updated", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Cập nhật thông tin tài sản" });
      return { success: true };
    }),
    archive: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      await updateAsset(input.id, { isArchived: true });
      await recordActivity({ entityType: "asset", entityId: input.id, action: "archived", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Lưu trữ tài sản" });
      return { success: true };
    }),
  }),
  handovers: router({
    list: protectedProcedure.query(() => listHandovers()),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const handover = await getHandoverById(input.id);
      if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy phiếu bàn giao." });
      return handover;
    }),
    create: adminProcedure.input(z.object({ assetId: z.number().int().positive(), recipientUserId: z.number().int().positive().optional().nullable(), recipientName: z.string().trim().min(2).max(160), recipientDepartmentId: z.number().int().positive().optional().nullable(), recipientDepartmentName: nullableText, handedOverAt: z.number().int().transform((value) => new Date(value)), dueBackAt: dateFromMs, conditionOut: nullableText, accessories: nullableText, note: nullableText })).mutation(async ({ input, ctx }) => {
      const asset = await getAssetById(input.assetId);
      if (!asset || asset.isArchived) throw new TRPCError({ code: "NOT_FOUND", message: "Tài sản được chọn không tồn tại hoặc đã lưu trữ." });
      if (asset.status !== "available") throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ có thể lập phiếu cho tài sản đang sẵn có." });
      const id = await createHandover({ ...input, referenceCode: `BG-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, handoverByUserId: ctx.user!.id, handoverByName: ctx.user!.name ?? "Quản trị viên", status: "draft" });
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
    create: protectedProcedure.input(z.object({ assetId: z.number().int().positive(), issueType: z.enum(["maintenance", "incident", "damage"]), priority: z.enum(["low", "medium", "high", "critical"]).default("medium"), description: z.string().trim().min(5).max(5000), estimatedCost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), dueAt: dateFromMs, recurrenceDays: z.number().int().min(1).max(3650).optional().nullable() })).mutation(async ({ input, ctx }) => {
      const id = await createMaintenanceTicket({ ...input, ticketCode: `BT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, reporterUserId: ctx.user!.id, reporterName: ctx.user!.name ?? "Người dùng", status: "open" });
      await recordActivity({ entityType: "maintenance", entityId: id, action: "reported", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Tạo yêu cầu bảo trì / báo hỏng" });
      return { id };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "in_progress", "resolved", "closed"]), assigneeUserId: z.number().int().positive().optional().nullable(), resolution: nullableText, estimatedCost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), actualCost: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(), dueAt: dateFromMs, recurrenceDays: z.number().int().min(1).max(3650).optional().nullable() })).mutation(async ({ input, ctx }) => {
      await updateMaintenanceTicket(input.id, { status: input.status, assigneeUserId: input.assigneeUserId, resolution: input.resolution, estimatedCost: input.estimatedCost, actualCost: input.actualCost, dueAt: input.dueAt, recurrenceDays: input.recurrenceDays, resolvedAt: input.status === "resolved" || input.status === "closed" ? new Date() : null });
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
      const extension = input.contentType === "application/pdf" ? "pdf" : input.contentType.split("/")[1].replace("jpeg", "jpg");
      const safeBaseName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "chung-tu";
      const { url } = await storagePut(`maintenance/${ticket.id}/${Date.now()}-${safeBaseName}.${extension}`, Buffer.from(input.dataUrl.split(",", 2)[1], "base64"), input.contentType);
      await updateMaintenanceTicket(ticket.id, { attachmentUrl: url, attachmentName: input.fileName, attachmentContentType: input.contentType });
      await recordActivity({ entityType: "maintenance", entityId: ticket.id, action: "attachment_uploaded", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tải chứng từ: ${input.fileName}` });
      return { url, name: input.fileName, contentType: input.contentType };
    }),
  }),
  audits: router({
    list: protectedProcedure.query(() => listAuditSessions()),
    getItems: protectedProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(({ input }) => listAuditItems(input.sessionId)),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(3).max(255), departmentId: z.number().int().positive().optional().nullable(), scheduledAt: dateFromMs, recurrenceDays: z.number().int().min(1).max(3650).optional().nullable() })).mutation(async ({ input, ctx }) => {
      const id = await createAuditSession({ ...input, referenceCode: `KK-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, createdByUserId: ctx.user!.id, status: "draft" });
      await recordActivity({ entityType: "audit", entityId: id, action: "created", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: `Tạo đợt kiểm kê ${input.name}` });
      return { id };
    }),
    addItem: adminProcedure.input(z.object({ sessionId: z.number().int().positive(), assetId: z.number().int().positive(), expectedStatus: z.string().max(64).optional().nullable() })).mutation(async ({ input, ctx }) => {
      const id = await createAuditItem({ auditSessionId: input.sessionId, assetId: input.assetId, expectedStatus: input.expectedStatus, result: "pending" });
      await recordActivity({ entityType: "auditItem", entityId: id, action: "added", actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Thêm tài sản vào kiểm kê" });
      return { id };
    }),
    recordItem: adminProcedure.input(z.object({ id: z.number().int().positive(), actualStatus: z.string().max(64).optional().nullable(), result: z.enum(["pending", "matched", "missing", "mismatch"]), note: nullableText })).mutation(async ({ input, ctx }) => {
      await updateAuditItem(input.id, { actualStatus: input.actualStatus, result: input.result, note: input.note, checkedByUserId: ctx.user!.id, checkedAt: new Date() });
      await recordActivity({ entityType: "auditItem", entityId: input.id, action: input.result, actorUserId: ctx.user!.id, actorName: ctx.user!.name, summary: "Cập nhật kết quả kiểm kê" });
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
});

export type AppRouter = typeof appRouter;
