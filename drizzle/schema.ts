import { boolean, decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  departmentId: int("departmentId"),
  divisionId: int("divisionId").references(() => divisions.id, { onDelete: "set null", onUpdate: "cascade" }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => [index("users_division_idx").on(table.divisionId)]);

export const userNotificationPreferences = mysqlTable("userNotificationPreferences", {
  userId: int("userId").primaryKey(),
  maintenanceEnabled: boolean("maintenanceEnabled").default(true).notNull(),
  handoverEnabled: boolean("handoverEnabled").default(true).notNull(),
  returnRequestEnabled: boolean("returnRequestEnabled").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  taxCode: varchar("taxCode", { length: 32 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  logoUrl: text("logoUrl"),
  websiteTitle: varchar("websiteTitle", { length: 120 }),
  brandColor: varchar("brandColor", { length: 9 }),
  faviconUrl: text("faviconUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  managerUserId: int("managerUserId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const divisions = mysqlTable("divisions", {
  id: int("id").autoincrement().primaryKey(),
  departmentId: int("departmentId").notNull().references(() => departments.id, { onDelete: "restrict", onUpdate: "cascade" }),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  managerUserId: int("managerUserId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("divisions_department_idx").on(table.departmentId)]);

export const assetCategories = mysqlTable("assetCategories", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull().unique(),
  contactName: varchar("contactName", { length: 160 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const vendorDocuments = mysqlTable("vendorDocuments", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId").notNull().references(() => vendors.id, { onDelete: "restrict", onUpdate: "cascade" }),
  documentType: mysqlEnum("documentType", ["contract", "quotation", "other"]).default("other").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  contentType: varchar("contentType", { length: 128 }).notNull(),
  fileSize: int("fileSize").notNull(),
  storageKey: text("storageKey").notNull(),
  url: text("url").notNull(),
  uploadedByUserId: int("uploadedByUserId"),
  uploadedByName: varchar("uploadedByName", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("vendor_documents_vendor_idx").on(table.vendorId)]);

export const brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  assetCode: varchar("assetCode", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: int("categoryId"),
  departmentId: int("departmentId"),
  holderUserId: int("holderUserId"),
  holderName: varchar("holderName", { length: 160 }),
  status: mysqlEnum("status", ["available", "assigned", "maintenance", "retired", "lost", "returned_to_vendor"]).default("available").notNull(),
  condition: mysqlEnum("condition", ["good", "fair", "needs_inspection", "damaged"]).default("good").notNull(),
  purchaseDate: timestamp("purchaseDate"),
  purchaseValue: decimal("purchaseValue", { precision: 15, scale: 2 }),
  vendor: varchar("vendor", { length: 255 }),
  vendorId: int("vendorId").references(() => vendors.id, { onDelete: "set null", onUpdate: "cascade" }),
  brandId: int("brandId").references(() => brands.id, { onDelete: "set null", onUpdate: "cascade" }),
  serialNumber: varchar("serialNumber", { length: 160 }),
  location: varchar("location", { length: 255 }),
  warrantyUntil: timestamp("warrantyUntil"),
  supplierReturnedAt: timestamp("supplierReturnedAt"),
  supplierReturnReason: text("supplierReturnReason"),
  supplierReturnAttachmentUrl: text("supplierReturnAttachmentUrl"),
  supplierReturnAttachmentName: varchar("supplierReturnAttachmentName", { length: 255 }),
  supplierReturnAttachmentContentType: varchar("supplierReturnAttachmentContentType", { length: 100 }),
  qrToken: varchar("qrToken", { length: 96 }).notNull().unique(),
  metadata: json("metadata"),
  note: text("note"),
  maintenanceReason: text("maintenanceReason"),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("assets_status_idx").on(table.status),
  index("assets_category_idx").on(table.categoryId),
  index("assets_department_idx").on(table.departmentId),
  index("assets_vendor_idx").on(table.vendorId),
  index("assets_brand_idx").on(table.brandId),
]);

export const handovers = mysqlTable("handovers", {
  id: int("id").autoincrement().primaryKey(),
  referenceCode: varchar("referenceCode", { length: 64 }).notNull().unique(),
  assetId: int("assetId").notNull(),
  recipientUserId: int("recipientUserId"),
  recipientName: varchar("recipientName", { length: 160 }).notNull(),
  recipientDepartmentId: int("recipientDepartmentId"),
  recipientDepartmentName: varchar("recipientDepartmentName", { length: 160 }),
  handoverByUserId: int("handoverByUserId"),
  handoverByName: varchar("handoverByName", { length: 160 }),
  handedOverAt: timestamp("handedOverAt").notNull(),
  dueBackAt: timestamp("dueBackAt"),
  returnedAt: timestamp("returnedAt"),
  status: mysqlEnum("status", ["draft", "pending_signature", "active", "returned", "cancelled"]).default("draft").notNull(),
  returnRequestStatus: mysqlEnum("returnRequestStatus", ["none", "pending", "approved", "rejected"]).default("none").notNull(),
  returnRequestedAt: timestamp("returnRequestedAt"),
  returnRequestNote: text("returnRequestNote"),
  returnRequestResolvedAt: timestamp("returnRequestResolvedAt"),
  returnRequestResolvedByUserId: int("returnRequestResolvedByUserId"),
  returnRequestResolution: text("returnRequestResolution"),
  returnFollowUpNote: text("returnFollowUpNote"),
  returnFollowUpAt: timestamp("returnFollowUpAt"),
  returnResultSeenAt: timestamp("returnResultSeenAt"),
  returnConditionPhotoKey: varchar("returnConditionPhotoKey", { length: 512 }),
  returnConditionPhotoUrl: text("returnConditionPhotoUrl"),
  returnConditionPhotoName: varchar("returnConditionPhotoName", { length: 255 }),
  returnConditionPhotoContentType: varchar("returnConditionPhotoContentType", { length: 128 }),
  conditionOut: varchar("conditionOut", { length: 120 }),
  conditionIn: varchar("conditionIn", { length: 120 }),
  accessories: text("accessories"),
  note: text("note"),
  recipientSignatureUrl: text("recipientSignatureUrl"),
  handoverSignatureUrl: text("handoverSignatureUrl"),
  signedAt: timestamp("signedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("handovers_asset_idx").on(table.assetId),
  index("handovers_recipient_idx").on(table.recipientUserId),
  index("handovers_status_idx").on(table.status),
]);

export const maintenanceTickets = mysqlTable("maintenanceTickets", {
  id: int("id").autoincrement().primaryKey(),
  ticketCode: varchar("ticketCode", { length: 64 }).notNull().unique(),
  assetId: int("assetId").notNull(),
  reporterUserId: int("reporterUserId"),
  reporterName: varchar("reporterName", { length: 160 }),
  assigneeUserId: int("assigneeUserId"),
  issueType: mysqlEnum("issueType", ["maintenance", "incident", "damage"]).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  description: text("description").notNull(),
  resolution: text("resolution"),
  estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 }),
  actualCost: decimal("actualCost", { precision: 15, scale: 2 }),
  attachmentUrl: text("attachmentUrl"),
  attachmentName: varchar("attachmentName", { length: 255 }),
  attachmentContentType: varchar("attachmentContentType", { length: 128 }),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  dueAt: timestamp("dueAt"),
  recurrenceDays: int("recurrenceDays"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("maintenance_asset_idx").on(table.assetId), index("maintenance_status_idx").on(table.status)]);

export const auditSessions = mysqlTable("auditSessions", {
  id: int("id").autoincrement().primaryKey(),
  referenceCode: varchar("referenceCode", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  departmentId: int("departmentId"),
  status: mysqlEnum("status", ["draft", "active", "completed", "cancelled"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  recurrenceDays: int("recurrenceDays"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditItems = mysqlTable("auditItems", {
  id: int("id").autoincrement().primaryKey(),
  auditSessionId: int("auditSessionId").notNull(),
  assetId: int("assetId").notNull(),
  expectedStatus: varchar("expectedStatus", { length: 64 }),
  actualStatus: varchar("actualStatus", { length: 64 }),
  result: mysqlEnum("result", ["pending", "matched", "missing", "mismatch"]).default("pending").notNull(),
  checkedByUserId: int("checkedByUserId"),
  checkedAt: timestamp("checkedAt"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("audit_items_session_idx").on(table.auditSessionId), index("audit_items_asset_idx").on(table.assetId)]);

export const assetImportSessions = mysqlTable("assetImportSessions", {
  id: int("id").autoincrement().primaryKey(),
  referenceCode: varchar("referenceCode", { length: 64 }).notNull().unique(),
  createdByUserId: int("createdByUserId"),
  createdByName: varchar("createdByName", { length: 160 }),
  createdCount: int("createdCount").default(0).notNull(),
  updatedCount: int("updatedCount").default(0).notNull(),
  isUndone: boolean("isUndone").default(false).notNull(),
  undoneAt: timestamp("undoneAt"),
  undoneByUserId: int("undoneByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("asset_import_sessions_created_idx").on(table.createdAt)]);

export const assetImportItems = mysqlTable("assetImportItems", {
  id: int("id").autoincrement().primaryKey(),
  importSessionId: int("importSessionId").notNull(),
  assetId: int("assetId").notNull(),
  action: mysqlEnum("action", ["created", "updated"]).notNull(),
  beforeSnapshot: json("beforeSnapshot"),
  afterSnapshot: json("afterSnapshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("asset_import_items_session_idx").on(table.importSessionId), index("asset_import_items_asset_idx").on(table.assetId)]);

export const assetFieldChanges = mysqlTable("assetFieldChanges", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  importSessionId: int("importSessionId"),
  fieldName: varchar("fieldName", { length: 96 }).notNull(),
  previousValue: text("previousValue"),
  nextValue: text("nextValue"),
  source: mysqlEnum("source", ["import", "manual", "undo"]).notNull(),
  actorUserId: int("actorUserId"),
  actorName: varchar("actorName", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("asset_field_changes_asset_idx").on(table.assetId), index("asset_field_changes_session_idx").on(table.importSessionId)]);

export const activityLogs = mysqlTable("activityLogs", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId").notNull(),
  action: varchar("action", { length: 96 }).notNull(),
  actorUserId: int("actorUserId"),
  actorName: varchar("actorName", { length: 160 }),
  summary: text("summary"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("activity_entity_idx").on(table.entityType, table.entityId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
