import { desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  activityLogs,
  assetFieldChanges,
  assetImportItems,
  assetImportSessions,
  assets,
  auditItems,
  auditSessions,
  brands,
  companies,
  departments,
  divisions,
  handovers,
  maintenanceTickets,
  type InsertUser,
  userNotificationPreferences,
  users,
  vendors,
  vendorDocuments,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) database = drizzle(process.env.DATABASE_URL);
  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db || !user.openId) return;
  const values: InsertUser = { ...user, role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"), lastSignedIn: new Date() };
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: new Date() } });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.lastSignedIn));
}

export async function updateUserRole(id: number, role: "admin" | "user") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function updateUserActiveStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ isActive }).where(eq(users.id, id));
}

export async function getUserNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(userNotificationPreferences).where(eq(userNotificationPreferences.userId, userId)).limit(1))[0] || null;
}

export async function saveUserNotificationPreferences(userId: number, preferences: { maintenanceEnabled: boolean; handoverEnabled: boolean; returnRequestEnabled: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(userNotificationPreferences).values({ userId, ...preferences }).onDuplicateKeyUpdate({ set: { ...preferences, updatedAt: new Date() } });
}

export async function updateUserDepartment(id: number, departmentId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ departmentId, divisionId: null }).where(eq(users.id, id));
}

export async function updateUserDivision(id: number, departmentId: number, divisionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ departmentId, divisionId }).where(eq(users.id, id));
}

export async function clearUserDivision(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ divisionId: null }).where(eq(users.id, id));
}

export async function listDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).where(eq(departments.isActive, true)).orderBy(departments.name);
}

export async function listAllDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).orderBy(departments.name);
}

export async function getActiveDepartmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(departments).where(eq(departments.id, id)).limit(1))[0];
}

export async function getDepartmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(departments).where(eq(departments.id, id)).limit(1))[0];
}

export async function getDepartmentByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(departments).where(eq(departments.code, code)).limit(1))[0];
}

export async function createDepartment(data: typeof departments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(departments).values(data);
  return Number(result[0].insertId);
}

export async function updateDepartment(id: number, data: Partial<typeof departments.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(departments).set(data).where(eq(departments.id, id));
}

export async function listVendors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors).where(eq(vendors.isActive, true)).orderBy(vendors.name);
}

export async function listAllVendors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors).orderBy(vendors.name);
}

export async function getVendorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(vendors).where(eq(vendors.id, id)).limit(1))[0];
}

export async function getVendorByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(vendors).where(eq(vendors.name, name)).limit(1))[0];
}

export async function createVendor(data: typeof vendors.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(vendors).values(data);
  return Number(result[0].insertId);
}

export async function updateVendor(id: number, data: Partial<typeof vendors.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(vendors).set(data).where(eq(vendors.id, id));
}

export async function listVendorDocuments(vendorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendorDocuments).where(eq(vendorDocuments.vendorId, vendorId)).orderBy(desc(vendorDocuments.createdAt));
}

export async function getVendorDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(vendorDocuments).where(eq(vendorDocuments.id, id)).limit(1))[0];
}

export async function createVendorDocument(data: typeof vendorDocuments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(vendorDocuments).values(data);
  return Number(result[0].insertId);
}

export async function deleteVendorDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(vendorDocuments).where(eq(vendorDocuments.id, id));
}

export async function listBrands() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brands).where(eq(brands.isActive, true)).orderBy(brands.name);
}

export async function listAllBrands() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brands).orderBy(brands.name);
}

export async function getBrandById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(brands).where(eq(brands.id, id)).limit(1))[0];
}

export async function getBrandByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(brands).where(eq(brands.name, name)).limit(1))[0];
}

export async function createBrand(data: typeof brands.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(brands).values(data);
  return Number(result[0].insertId);
}

export async function updateBrand(id: number, data: Partial<typeof brands.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(brands).set(data).where(eq(brands.id, id));
}

export async function listDivisions() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: divisions.id,
    departmentId: divisions.departmentId,
    departmentName: departments.name,
    departmentCode: departments.code,
    code: divisions.code,
    name: divisions.name,
    managerUserId: divisions.managerUserId,
    isActive: divisions.isActive,
    createdAt: divisions.createdAt,
    updatedAt: divisions.updatedAt,
  }).from(divisions).innerJoin(departments, eq(divisions.departmentId, departments.id)).where(eq(divisions.isActive, true)).orderBy(departments.name, divisions.name);
}

export async function listAllDivisions() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: divisions.id,
    departmentId: divisions.departmentId,
    departmentName: departments.name,
    departmentCode: departments.code,
    code: divisions.code,
    name: divisions.name,
    managerUserId: divisions.managerUserId,
    isActive: divisions.isActive,
    createdAt: divisions.createdAt,
    updatedAt: divisions.updatedAt,
  }).from(divisions).innerJoin(departments, eq(divisions.departmentId, departments.id)).orderBy(departments.name, divisions.name);
}

export async function getDivisionByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(divisions).where(eq(divisions.code, code)).limit(1))[0];
}

export async function getDivisionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(divisions).where(eq(divisions.id, id)).limit(1))[0];
}

export async function createDivision(data: typeof divisions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(divisions).values(data);
  return Number(result[0].insertId);
}

export async function updateDivision(id: number, data: Partial<typeof divisions.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(divisions).set(data).where(eq(divisions.id, id));
}

export async function countActiveDivisionsByDepartment(departmentId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ id: divisions.id, isActive: divisions.isActive }).from(divisions).where(eq(divisions.departmentId, departmentId));
  return result.filter((division) => division.isActive).length;
}

export async function listAssets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assets).where(eq(assets.isArchived, false)).orderBy(desc(assets.updatedAt));
}

export async function getAssetById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(assets).where(eq(assets.id, id)).limit(1))[0];
}

export async function createAsset(data: typeof assets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(assets).values(data);
  return Number(result[0].insertId);
}

export async function listAssetCodesByCodes(assetCodes: string[]) {
  const db = await getDb();
  if (!db || !assetCodes.length) return [];
  return db.select({ assetCode: assets.assetCode }).from(assets).where(inArray(assets.assetCode, assetCodes));
}

export async function listAssetsByCodes(assetCodes: string[]) {
  const db = await getDb();
  if (!db || !assetCodes.length) return [];
  return db.select().from(assets).where(inArray(assets.assetCode, assetCodes));
}

export async function createAssetsBulk(data: Array<typeof assets.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!data.length) return 0;
  await db.insert(assets).values(data);
  return data.length;
}

export async function updateAsset(id: number, data: Partial<typeof assets.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(assets).set(data).where(eq(assets.id, id));
}

export async function createAssetImportSession(data: typeof assetImportSessions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(assetImportSessions).values(data);
  return Number(result[0].insertId);
}

export async function updateAssetImportSession(id: number, data: Partial<typeof assetImportSessions.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(assetImportSessions).set(data).where(eq(assetImportSessions.id, id));
}

export async function getLatestAssetImportSession() {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(assetImportSessions).orderBy(desc(assetImportSessions.createdAt)).limit(1))[0];
}

export async function createAssetImportItem(data: typeof assetImportItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(assetImportItems).values(data);
  return Number(result[0].insertId);
}

export async function listAssetImportItems(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assetImportItems).where(eq(assetImportItems.importSessionId, sessionId));
}

export async function createAssetFieldChanges(data: Array<typeof assetFieldChanges.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!data.length) return;
  await db.insert(assetFieldChanges).values(data);
}

export async function listAssetFieldChanges(assetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assetFieldChanges).where(eq(assetFieldChanges.assetId, assetId)).orderBy(desc(assetFieldChanges.createdAt));
}

export async function getCompany() {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(companies).orderBy(desc(companies.updatedAt)).limit(1))[0] ?? null;
}

export async function saveCompany(data: typeof companies.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await getCompany();
  if (existing) { await db.update(companies).set(data).where(eq(companies.id, existing.id)); return existing.id; }
  const result = await db.insert(companies).values(data);
  return Number(result[0].insertId);
}

export async function listHandovers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(handovers).orderBy(desc(handovers.handedOverAt));
}

export async function getHandoverById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select({
    id: handovers.id,
    referenceCode: handovers.referenceCode,
    assetId: handovers.assetId,
    assetCode: assets.assetCode,
    assetName: assets.name,
    recipientUserId: handovers.recipientUserId,
    recipientName: handovers.recipientName,
    recipientDepartmentId: handovers.recipientDepartmentId,
    recipientDepartmentName: handovers.recipientDepartmentName,
    handoverByUserId: handovers.handoverByUserId,
    handoverByName: handovers.handoverByName,
    handedOverAt: handovers.handedOverAt,
    dueBackAt: handovers.dueBackAt,
    returnedAt: handovers.returnedAt,
    status: handovers.status,
    returnRequestStatus: handovers.returnRequestStatus,
    returnRequestedAt: handovers.returnRequestedAt,
    returnRequestNote: handovers.returnRequestNote,
    returnRequestResolvedAt: handovers.returnRequestResolvedAt,
    returnRequestResolvedByUserId: handovers.returnRequestResolvedByUserId,
    returnRequestResolution: handovers.returnRequestResolution,
    returnFollowUpNote: handovers.returnFollowUpNote,
    returnFollowUpAt: handovers.returnFollowUpAt,
    returnResultSeenAt: handovers.returnResultSeenAt,
    returnConditionPhotoKey: handovers.returnConditionPhotoKey,
    returnConditionPhotoUrl: handovers.returnConditionPhotoUrl,
    returnConditionPhotoName: handovers.returnConditionPhotoName,
    returnConditionPhotoContentType: handovers.returnConditionPhotoContentType,
    conditionOut: handovers.conditionOut,
    conditionIn: handovers.conditionIn,
    accessories: handovers.accessories,
    note: handovers.note,
    recipientSignatureUrl: handovers.recipientSignatureUrl,
    handoverSignatureUrl: handovers.handoverSignatureUrl,
    signedAt: handovers.signedAt,
  }).from(handovers).innerJoin(assets, eq(handovers.assetId, assets.id)).where(eq(handovers.id, id)).limit(1))[0];
}

export async function listHandoversByRecipient(recipientUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: handovers.id, referenceCode: handovers.referenceCode, assetId: handovers.assetId, assetCode: assets.assetCode, assetName: assets.name, status: handovers.status, handedOverAt: handovers.handedOverAt, returnedAt: handovers.returnedAt, dueBackAt: handovers.dueBackAt, returnRequestStatus: handovers.returnRequestStatus, returnRequestedAt: handovers.returnRequestedAt, returnRequestNote: handovers.returnRequestNote, returnRequestResolvedAt: handovers.returnRequestResolvedAt, returnRequestResolution: handovers.returnRequestResolution, returnFollowUpNote: handovers.returnFollowUpNote, returnFollowUpAt: handovers.returnFollowUpAt, returnResultSeenAt: handovers.returnResultSeenAt, returnConditionPhotoUrl: handovers.returnConditionPhotoUrl, returnConditionPhotoName: handovers.returnConditionPhotoName, conditionOut: handovers.conditionOut, conditionIn: handovers.conditionIn }).from(handovers).innerJoin(assets, eq(handovers.assetId, assets.id)).where(eq(handovers.recipientUserId, recipientUserId)).orderBy(desc(handovers.handedOverAt));
}

export async function createHandover(data: typeof handovers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(handovers).values(data);
  return Number(result[0].insertId);
}

export async function updateHandover(id: number, data: Partial<typeof handovers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(handovers).set(data).where(eq(handovers.id, id));
}

export async function transitionHandoverStatus(
  id: number,
  status: "draft" | "pending_signature" | "active" | "returned" | "cancelled",
  changes: Partial<typeof handovers.$inferInsert>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return db.transaction(async (tx) => {
    const existing = (await tx.select().from(handovers).where(eq(handovers.id, id)).limit(1))[0];
    if (!existing) throw new Error("Handover not found");

    const handoverChanges: Partial<typeof handovers.$inferInsert> = { ...changes, status };
    if (status === "active") handoverChanges.signedAt = changes.signedAt ?? new Date();
    if (status === "returned") handoverChanges.returnedAt = changes.returnedAt ?? new Date();
    await tx.update(handovers).set(handoverChanges).where(eq(handovers.id, id));

    if (status === "active") {
      await tx.update(assets).set({
        status: "assigned",
        holderUserId: existing.recipientUserId,
        holderName: existing.recipientName,
        departmentId: existing.recipientDepartmentId,
      }).where(eq(assets.id, existing.assetId));
    }

    if (status === "returned" || status === "cancelled") {
      await tx.update(assets).set({
        status: "available",
        holderUserId: null,
        holderName: null,
        departmentId: null,
      }).where(eq(assets.id, existing.assetId));
    }

    return existing;
  });
}

export async function listMaintenanceTickets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(maintenanceTickets).orderBy(desc(maintenanceTickets.openedAt));
}

export async function listMaintenanceTicketsByAsset(assetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(maintenanceTickets).where(eq(maintenanceTickets.assetId, assetId)).orderBy(desc(maintenanceTickets.openedAt));
}

export async function getMaintenanceTicket(id: number) {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(maintenanceTickets).where(eq(maintenanceTickets.id, id)).limit(1))[0] ?? null;
}

export async function createMaintenanceTicket(data: typeof maintenanceTickets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(maintenanceTickets).values(data);
  return Number(result[0].insertId);
}

export async function updateMaintenanceTicket(id: number, data: Partial<typeof maintenanceTickets.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(maintenanceTickets).set(data).where(eq(maintenanceTickets.id, id));
}

export async function listAuditSessions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditSessions).orderBy(desc(auditSessions.createdAt));
}

export async function createAuditSession(data: typeof auditSessions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(auditSessions).values(data);
  return Number(result[0].insertId);
}

export async function listAuditItems(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditItems).where(eq(auditItems.auditSessionId, sessionId));
}

export async function createAuditItem(data: typeof auditItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(auditItems).values(data);
  return Number(result[0].insertId);
}

export async function updateAuditItem(id: number, data: Partial<typeof auditItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(auditItems).set(data).where(eq(auditItems.id, id));
}

export async function recordActivity(data: typeof activityLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLogs).values(data);
}

export async function listActivityLogs(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
}

export async function listHandoverReturnDecisionHistory(handoverId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(activityLogs).where(eq(activityLogs.entityId, handoverId)).orderBy(desc(activityLogs.createdAt));
  return rows.filter((row) => row.entityType === "handover" && (row.action === "return_approved" || row.action === "return_rejected"));
}
