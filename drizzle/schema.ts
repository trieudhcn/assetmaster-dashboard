import { boolean, decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
  loginBackgroundUrl: text("loginBackgroundUrl"),
  loginGreeting: varchar("loginGreeting", { length: 300 }),
  loginBackgroundOverlay: varchar("loginBackgroundOverlay", { length: 8 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const uiLabels = mysqlTable("uiLabels", {
  id: int("id").autoincrement().primaryKey(),
  labelKey: varchar("labelKey", { length: 96 }).notNull().unique(),
  value: varchar("value", { length: 255 }).notNull(),
  updatedByUserId: int("updatedByUserId"),
  updatedByName: varchar("updatedByName", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("ui_labels_updated_idx").on(table.updatedAt)]);

export const helpGuides = mysqlTable("helpGuides", {
  id: int("id").autoincrement().primaryKey(),
  guideKey: varchar("guideKey", { length: 96 }).notNull().unique(),
  audience: mysqlEnum("audience", ["admin", "user"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  steps: json("steps").notNull(),
  updatedByUserId: int("updatedByUserId"),
  updatedByName: varchar("updatedByName", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("help_guides_audience_idx").on(table.audience)]);

export const helpGuideVersions = mysqlTable("helpGuideVersions", {
  id: int("id").autoincrement().primaryKey(),
  guideKey: varchar("guideKey", { length: 96 }).notNull(),
  audience: mysqlEnum("audience", ["admin", "user"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  steps: json("steps").notNull(),
  changedByUserId: int("changedByUserId"),
  changedByName: varchar("changedByName", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("help_guide_versions_key_idx").on(table.guideKey), index("help_guide_versions_created_idx").on(table.createdAt)]);

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
  retiredAt: timestamp("retiredAt"),
  retirementReason: text("retirementReason"),
  retirementCertificateNumber: varchar("retirementCertificateNumber", { length: 64 }),
  retirementCertificateYear: int("retirementCertificateYear"),
  retirementCertificateSequence: int("retirementCertificateSequence"),
  retirementAttachmentUrl: text("retirementAttachmentUrl"),
  retirementAttachmentName: varchar("retirementAttachmentName", { length: 255 }),
  retirementAttachmentContentType: varchar("retirementAttachmentContentType", { length: 100 }),
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
  uniqueIndex("assets_retirement_certificate_number_unique").on(table.retirementCertificateNumber),
]);

export const inventorySupplies = mysqlTable("inventorySupplies", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: int("categoryId").references(() => assetCategories.id, { onDelete: "set null", onUpdate: "cascade" }),
  vendorId: int("vendorId").references(() => vendors.id, { onDelete: "set null", onUpdate: "cascade" }),
  brandId: int("brandId").references(() => brands.id, { onDelete: "set null", onUpdate: "cascade" }),
  unit: varchar("unit", { length: 32 }).default("Cái").notNull(),
  stockQuantity: decimal("stockQuantity", { precision: 15, scale: 2 }).default("0").notNull(),
  minimumQuantity: decimal("minimumQuantity", { precision: 15, scale: 2 }).default("0").notNull(),
  unitCost: decimal("unitCost", { precision: 15, scale: 2 }),
  location: varchar("location", { length: 255 }),
  note: text("note"),
  isActive: boolean("isActive").default(true).notNull(),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("inventory_supplies_category_idx").on(table.categoryId), index("inventory_supplies_active_idx").on(table.isActive)]);

export const supplyIssueSlips = mysqlTable("supplyIssueSlips", {
  id: int("id").autoincrement().primaryKey(),
  referenceCode: varchar("referenceCode", { length: 64 }).notNull().unique(),
  recipientUserId: int("recipientUserId").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  recipientName: varchar("recipientName", { length: 160 }).notNull(),
  recipientDepartmentId: int("recipientDepartmentId"),
  status: mysqlEnum("status", ["active", "returned"]).default("active").notNull(),
  note: text("note"),
  issuedByUserId: int("issuedByUserId"),
  issuedByName: varchar("issuedByName", { length: 160 }),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  returnedAt: timestamp("returnedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("supply_issue_slips_issued_idx").on(table.issuedAt), index("supply_issue_slips_recipient_idx").on(table.recipientUserId)]);

export const supplyIssueSlipItems = mysqlTable("supplyIssueSlipItems", {
  id: int("id").autoincrement().primaryKey(),
  issueSlipId: int("issueSlipId").notNull().references(() => supplyIssueSlips.id, { onDelete: "restrict", onUpdate: "cascade" }),
  supplyId: int("supplyId").notNull().references(() => inventorySupplies.id, { onDelete: "restrict", onUpdate: "cascade" }),
  supplyCode: varchar("supplyCode", { length: 64 }).notNull(),
  supplyName: varchar("supplyName", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  issuedQuantity: decimal("issuedQuantity", { precision: 15, scale: 2 }).notNull(),
  returnedQuantity: decimal("returnedQuantity", { precision: 15, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("supply_issue_slip_items_slip_idx").on(table.issueSlipId), index("supply_issue_slip_items_supply_idx").on(table.supplyId)]);

export const inventoryMovements = mysqlTable("inventoryMovements", {
  id: int("id").autoincrement().primaryKey(),
  supplyId: int("supplyId").notNull().references(() => inventorySupplies.id, { onDelete: "restrict", onUpdate: "cascade" }),
  movementType: mysqlEnum("movementType", ["receipt", "issue", "adjustment", "return"]).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).notNull(),
  quantityBefore: decimal("quantityBefore", { precision: 15, scale: 2 }).notNull(),
  quantityAfter: decimal("quantityAfter", { precision: 15, scale: 2 }).notNull(),
  issueSlipId: int("issueSlipId").references(() => supplyIssueSlips.id, { onDelete: "set null", onUpdate: "cascade" }),
  issueSlipItemId: int("issueSlipItemId").references(() => supplyIssueSlipItems.id, { onDelete: "set null", onUpdate: "cascade" }),
  recipientUserId: int("recipientUserId").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  recipientName: varchar("recipientName", { length: 160 }),
  recipientDepartmentId: int("recipientDepartmentId"),
  note: text("note"),
  createdByUserId: int("createdByUserId"),
  createdByName: varchar("createdByName", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("inventory_movements_supply_idx").on(table.supplyId), index("inventory_movements_created_idx").on(table.createdAt), index("inventory_movements_slip_idx").on(table.issueSlipId)]);

export const supplyImportSessions = mysqlTable("supplyImportSessions", {
  id: int("id").autoincrement().primaryKey(),
  referenceCode: varchar("referenceCode", { length: 64 }).notNull().unique(),
  createdByUserId: int("createdByUserId"),
  createdByName: varchar("createdByName", { length: 160 }),
  createdCount: int("createdCount").default(0).notNull(),
  updatedCount: int("updatedCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supply_import_sessions_created_idx").on(table.createdAt)]);

export const supplyImportItems = mysqlTable("supplyImportItems", {
  id: int("id").autoincrement().primaryKey(),
  importSessionId: int("importSessionId").notNull().references(() => supplyImportSessions.id, { onDelete: "restrict", onUpdate: "cascade" }),
  supplyId: int("supplyId").notNull().references(() => inventorySupplies.id, { onDelete: "restrict", onUpdate: "cascade" }),
  action: mysqlEnum("action", ["created", "updated"]).notNull(),
  beforeSnapshot: json("beforeSnapshot"),
  afterSnapshot: json("afterSnapshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supply_import_items_session_idx").on(table.importSessionId), index("supply_import_items_supply_idx").on(table.supplyId)]);

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
  ticketYear: int("ticketYear"),
  ticketSequence: int("ticketSequence"),
  assetId: int("assetId").notNull(),
  reporterUserId: int("reporterUserId"),
  reporterName: varchar("reporterName", { length: 160 }),
  assigneeUserId: int("assigneeUserId"),
  issueType: mysqlEnum("issueType", ["maintenance", "incident", "damage"]).notNull(),
  serviceChannel: mysqlEnum("serviceChannel", ["warranty", "repair"]).default("repair").notNull(),
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
}, (table) => [index("maintenance_asset_idx").on(table.assetId), index("maintenance_status_idx").on(table.status), index("maintenance_channel_idx").on(table.serviceChannel), index("maintenance_year_sequence_idx").on(table.ticketYear, table.ticketSequence)]);

export const maintenanceMonthlyBudgets = mysqlTable("maintenanceMonthlyBudgets", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  updatedByUserId: int("updatedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("maintenance_budget_year_month_unique").on(table.year, table.month), index("maintenance_budget_year_idx").on(table.year)]);

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
  undoReason: text("undoReason"),
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
