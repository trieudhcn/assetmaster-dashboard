import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  activityLogs,
  assetFieldChanges,
  assetImportItems,
  assetImportSessions,
  assetCategories,
  assets,
  auditItems,
  auditSessions,
  brands,
  companies,
  departments,
  divisions,
  handovers,
  handoverSupplyItems,
  helpGuides,
  helpGuideVersions,
  inventoryMovements,
  inventorySupplies,
  maintenanceMonthlyBudgets,
  maintenanceTickets,
  retirementCertificateAssets,
  retirementCertificates,
  supplyImportItems,
  supplyImportSessions,
  supplyIssueSlipItems,
  supplyIssueSlips,
  uiLabels,
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

export async function listUiLabels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(uiLabels).orderBy(desc(uiLabels.updatedAt));
}

export async function saveUiLabel(input: { labelKey: string; value: string; updatedByUserId: number; updatedByName: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(uiLabels).values(input).onDuplicateKeyUpdate({ set: { value: input.value, updatedByUserId: input.updatedByUserId, updatedByName: input.updatedByName } });
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

export async function countUsersByRole(role: "admin" | "user") {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, role));
  return rows.length;
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

export async function listAssetCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assetCategories).where(eq(assetCategories.isActive, true)).orderBy(assetCategories.name);
}

export async function listAllAssetCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assetCategories).orderBy(assetCategories.name);
}

export async function getAssetCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(assetCategories).where(eq(assetCategories.id, id)).limit(1))[0];
}

export async function getAssetCategoryByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(assetCategories).where(eq(assetCategories.code, code)).limit(1))[0];
}

export async function getAssetCategoryByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(assetCategories).where(eq(assetCategories.name, name)).limit(1))[0];
}

export async function getNextAccessoryGroupSequence() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows: Array<{ code: string }> = await db.select({ code: assetCategories.code }).from(assetCategories).where(like(assetCategories.code, "PKG-%"));
  const maxSequence = rows.reduce((maximum: number, row) => {
    const match = row.code.match(/^PKG-(\d+)$/);
    return Math.max(maximum, match ? Number(match[1]) : 0);
  }, 0);
  return maxSequence + 1;
}

export async function createAssetCategory(data: typeof assetCategories.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(assetCategories).values(data);
  return Number(result[0].insertId);
}

export async function updateAssetCategory(id: number, data: Partial<typeof assetCategories.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(assetCategories).set(data).where(eq(assetCategories.id, id));
}

export async function deleteAssetCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(assetCategories).where(eq(assetCategories.id, id));
}

export async function countAssetsByCategoryId(categoryId: number) {
  const db = await getDb();
  if (!db) return 0;
  const results = await db.select({ id: assets.id }).from(assets).where(eq(assets.categoryId, categoryId));
  return results.length;
}

export async function getNextAssetCodeForPrefix(prefix: string, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return `${prefix}00001`;
  const codes: Array<{ assetCode: string }> = await db.select({ assetCode: assets.assetCode }).from(assets).where(like(assets.assetCode, `${prefix}%`));
  const exactSuffix = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d{5})$`);
  const largestSequence = codes.reduce((largest, row) => Math.max(largest, Number(row.assetCode.match(exactSuffix)?.[1] || 0)), 0);
  return `${prefix}${String(largestSequence + 1).padStart(5, "0")}`;
}

export async function getNextRetirementCertificateSequence(retirementYear: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const legacyRows: Array<{ sequence: number | null }> = await db.select({ sequence: assets.retirementCertificateSequence }).from(assets).where(eq(assets.retirementCertificateYear, retirementYear));
  const certificateRows: Array<{ sequence: number | null }> = await db.select({ sequence: retirementCertificates.sequence }).from(retirementCertificates).where(eq(retirementCertificates.retirementYear, retirementYear));
  const maxSequence = [...legacyRows, ...certificateRows].reduce((maximum, row) => Math.max(maximum, Number(row.sequence || 0)), 0);
  return maxSequence + 1;
}

export async function listRetirementCertificates() {
  const db = await getDb();
  if (!db) return [];
  const certificates = await db.select().from(retirementCertificates).orderBy(desc(retirementCertificates.updatedAt));
  const items = await db.select({
    id: retirementCertificateAssets.id,
    retirementCertificateId: retirementCertificateAssets.retirementCertificateId,
    assetId: retirementCertificateAssets.assetId,
    retirementReason: retirementCertificateAssets.retirementReason,
    salvageValue: retirementCertificateAssets.salvageValue,
    note: retirementCertificateAssets.note,
    assetCode: assets.assetCode,
    assetName: assets.name,
    serialNumber: assets.serialNumber,
    purchaseDate: assets.purchaseDate,
    purchaseValue: assets.purchaseValue,
    assetStatus: assets.status,
  }).from(retirementCertificateAssets).innerJoin(assets, eq(retirementCertificateAssets.assetId, assets.id));
  return certificates.map((certificate) => ({ ...certificate, items: items.filter((item) => item.retirementCertificateId === certificate.id) }));
}

export async function getRetirementCertificateById(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return null;
  const certificate = (await db.select().from(retirementCertificates).where(eq(retirementCertificates.id, id)).limit(1))[0];
  if (!certificate) return null;
  const items = await db.select({
    id: retirementCertificateAssets.id,
    retirementCertificateId: retirementCertificateAssets.retirementCertificateId,
    assetId: retirementCertificateAssets.assetId,
    retirementReason: retirementCertificateAssets.retirementReason,
    salvageValue: retirementCertificateAssets.salvageValue,
    note: retirementCertificateAssets.note,
    assetCode: assets.assetCode,
    assetName: assets.name,
    serialNumber: assets.serialNumber,
    purchaseDate: assets.purchaseDate,
    purchaseValue: assets.purchaseValue,
    assetStatus: assets.status,
  }).from(retirementCertificateAssets).innerJoin(assets, eq(retirementCertificateAssets.assetId, assets.id)).where(eq(retirementCertificateAssets.retirementCertificateId, id));
  return { ...certificate, items };
}

export async function createRetirementCertificate(data: typeof retirementCertificates.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(retirementCertificates).values(data);
  return Number(result[0].insertId);
}

export async function createRetirementCertificateAssets(data: Array<typeof retirementCertificateAssets.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  if (data.length) await db.insert(retirementCertificateAssets).values(data);
}

export async function listRetirementCertificateAssetAssignments(assetIds: number[], executor?: any) {
  const db = executor ?? await getDb();
  if (!db || !assetIds.length) return [];
  return db.select({ assetId: retirementCertificateAssets.assetId, retirementCertificateId: retirementCertificateAssets.retirementCertificateId }).from(retirementCertificateAssets).where(inArray(retirementCertificateAssets.assetId, assetIds));
}

export async function updateRetirementCertificate(id: number, data: Partial<typeof retirementCertificates.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(retirementCertificates).set(data).where(eq(retirementCertificates.id, id));
}

export async function updateRetirementCertificateAssetSalvageValues(certificateId: number, items: Array<{ id: number; salvageValue: string | null }>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await Promise.all(items.map((item) => db.update(retirementCertificateAssets).set({ salvageValue: item.salvageValue }).where(and(eq(retirementCertificateAssets.id, item.id), eq(retirementCertificateAssets.retirementCertificateId, certificateId)))));
}

export async function deleteRetirementCertificate(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(retirementCertificates).where(eq(retirementCertificates.id, id));
}

export async function listAssets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assets).where(eq(assets.isArchived, false)).orderBy(desc(assets.updatedAt));
}

export async function getAssetById(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return undefined;
  return (await db.select().from(assets).where(eq(assets.id, id)).limit(1))[0];
}

export async function listActiveAssetsBySerialNumber(serialNumber: string, executor?: any) {
  const db = executor ?? await getDb();
  if (!db || !serialNumber.trim()) return [];
  return db.select().from(assets).where(and(eq(assets.serialNumber, serialNumber.trim()), eq(assets.isArchived, false)));
}

export async function createAsset(data: typeof assets.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
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

export async function listInventorySupplies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventorySupplies).orderBy(desc(inventorySupplies.updatedAt));
}

export async function getInventorySupplyById(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return undefined;
  return (await db.select().from(inventorySupplies).where(eq(inventorySupplies.id, id)).limit(1))[0];
}

export async function getInventorySupplyByCode(code: string, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return undefined;
  return (await db.select().from(inventorySupplies).where(eq(inventorySupplies.code, code)).limit(1))[0];
}

export async function getNextInventorySupplySequence(executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows: Array<{ code: string }> = await db.select({ code: inventorySupplies.code }).from(inventorySupplies).where(like(inventorySupplies.code, "PK-%"));
  const maxSequence = rows.reduce((maximum: number, row) => {
    const match = row.code.match(/^PK-(\d+)$/);
    return Math.max(maximum, match ? Number(match[1]) : 0);
  }, 0);
  return maxSequence + 1;
}

export async function createInventorySupply(data: typeof inventorySupplies.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(inventorySupplies).values(data);
  return Number(result[0].insertId);
}

export async function updateInventorySupply(id: number, data: Partial<typeof inventorySupplies.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(inventorySupplies).set(data).where(eq(inventorySupplies.id, id));
}

export async function createInventoryMovement(data: typeof inventoryMovements.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(inventoryMovements).values(data);
  return Number(result[0].insertId);
}

export async function listInventoryMovements(supplyId: number, page = 1, pageSize = 10) {
  const db = await getDb();
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize)));
  if (!db) return { items: [], total: 0, page: safePage, pageSize: safePageSize, totalPages: 0 };
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(inventoryMovements).where(eq(inventoryMovements.supplyId, supplyId));
  const items = await db.select().from(inventoryMovements).where(eq(inventoryMovements.supplyId, supplyId)).orderBy(desc(inventoryMovements.createdAt)).limit(safePageSize).offset((safePage - 1) * safePageSize);
  const totalNumber = Number(total || 0);
  return { items, total: totalNumber, page: safePage, pageSize: safePageSize, totalPages: Math.ceil(totalNumber / safePageSize) };
}

export async function getNextSupplyIssueSequence(issueYear: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows: Array<{ referenceCode: string }> = await db.select({ referenceCode: supplyIssueSlips.referenceCode }).from(supplyIssueSlips).where(like(supplyIssueSlips.referenceCode, `PK-${issueYear}-%`));
  const maxSequence = rows.reduce((maximum: number, row) => {
    const match = row.referenceCode.match(new RegExp(`^PK-${issueYear}-(\\d+)$`));
    return Math.max(maximum, match ? Number(match[1]) : 0);
  }, 0);
  return maxSequence + 1;
}

export async function createSupplyIssueSlip(data: typeof supplyIssueSlips.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(supplyIssueSlips).values(data);
  return Number(result[0].insertId);
}

export async function createSupplyIssueSlipItem(data: typeof supplyIssueSlipItems.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(supplyIssueSlipItems).values(data);
  return Number(result[0].insertId);
}

export async function getSupplyIssueSlipById(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return undefined;
  return (await db.select().from(supplyIssueSlips).where(eq(supplyIssueSlips.id, id)).limit(1))[0];
}

export async function listSupplyIssueSlips() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplyIssueSlips).orderBy(desc(supplyIssueSlips.issuedAt));
}

export async function listSupplyIssueSlipItems(issueSlipId: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return [];
  return db.select().from(supplyIssueSlipItems).where(eq(supplyIssueSlipItems.issueSlipId, issueSlipId));
}

export async function listSupplyIssueHistoryByRecipientUserId(recipientUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const issueSlipRows = await db.select({
    issueSlipId: supplyIssueSlips.id,
    recipientUserId: supplyIssueSlips.recipientUserId,
    referenceCode: supplyIssueSlips.referenceCode,
    recipientName: supplyIssueSlips.recipientName,
    issuedByName: supplyIssueSlips.issuedByName,
    status: supplyIssueSlips.status,
    issuedAt: supplyIssueSlips.issuedAt,
    returnedAt: supplyIssueSlips.returnedAt,
    note: supplyIssueSlips.note,
    supplyCode: supplyIssueSlipItems.supplyCode,
    supplyName: supplyIssueSlipItems.supplyName,
    unit: supplyIssueSlipItems.unit,
    issuedQuantity: supplyIssueSlipItems.issuedQuantity,
    returnedQuantity: supplyIssueSlipItems.returnedQuantity,
  }).from(supplyIssueSlipItems).innerJoin(supplyIssueSlips, eq(supplyIssueSlipItems.issueSlipId, supplyIssueSlips.id)).where(eq(supplyIssueSlips.recipientUserId, recipientUserId)).orderBy(desc(supplyIssueSlips.issuedAt), desc(supplyIssueSlipItems.id));
  const handoverRows = await db.select({
    issueSlipId: handovers.id,
    recipientUserId: handovers.recipientUserId,
    referenceCode: handovers.referenceCode,
    recipientName: handovers.recipientName,
    issuedByName: handovers.handoverByName,
    status: handovers.status,
    issuedAt: handovers.handedOverAt,
    returnedAt: handovers.returnedAt,
    note: handovers.note,
    supplyCode: handoverSupplyItems.supplyCode,
    supplyName: handoverSupplyItems.supplyName,
    unit: handoverSupplyItems.unit,
    issuedQuantity: handoverSupplyItems.issuedQuantity,
    returnedQuantity: handoverSupplyItems.returnedQuantity,
  }).from(handoverSupplyItems).innerJoin(handovers, eq(handoverSupplyItems.handoverId, handovers.id)).where(and(eq(handovers.recipientUserId, recipientUserId), inArray(handovers.status, ["active", "returned"]))).orderBy(desc(handovers.handedOverAt), desc(handoverSupplyItems.id));
  return [
    ...issueSlipRows.map((row) => ({ ...row, source: "issue-slip" as const })),
    ...handoverRows.map((row) => ({ ...row, source: "handover" as const })),
  ].sort((left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime());
}

export async function getSupplyIssueSlipItemById(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return undefined;
  return (await db.select().from(supplyIssueSlipItems).where(eq(supplyIssueSlipItems.id, id)).limit(1))[0];
}

export async function updateSupplyIssueSlip(id: number, data: Partial<typeof supplyIssueSlips.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(supplyIssueSlips).set(data).where(eq(supplyIssueSlips.id, id));
}

export async function updateSupplyIssueSlipItem(id: number, data: Partial<typeof supplyIssueSlipItems.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(supplyIssueSlipItems).set(data).where(eq(supplyIssueSlipItems.id, id));
}

export async function listInventoryMovementReport() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: inventoryMovements.id,
    movementType: inventoryMovements.movementType,
    quantity: inventoryMovements.quantity,
    quantityBefore: inventoryMovements.quantityBefore,
    quantityAfter: inventoryMovements.quantityAfter,
    recipientName: inventoryMovements.recipientName,
    note: inventoryMovements.note,
    createdByName: inventoryMovements.createdByName,
    createdAt: inventoryMovements.createdAt,
    supplyCode: inventorySupplies.code,
    supplyName: inventorySupplies.name,
    unit: inventorySupplies.unit,
    issueReferenceCode: supplyIssueSlips.referenceCode,
  }).from(inventoryMovements).innerJoin(inventorySupplies, eq(inventoryMovements.supplyId, inventorySupplies.id)).leftJoin(supplyIssueSlips, eq(inventoryMovements.issueSlipId, supplyIssueSlips.id)).orderBy(desc(inventoryMovements.createdAt));
}

export async function listSupplyIssueAnalytics() {
  const db = await getDb();
  if (!db) return [];
  const issueSlipRows = await db.select({
    recipientUserId: supplyIssueSlips.recipientUserId,
    recipientName: supplyIssueSlips.recipientName,
    departmentName: departments.name,
    supplyId: supplyIssueSlipItems.supplyId,
    supplyCode: supplyIssueSlipItems.supplyCode,
    supplyName: supplyIssueSlipItems.supplyName,
    unit: supplyIssueSlipItems.unit,
    issuedQuantity: sql<number>`sum(${supplyIssueSlipItems.issuedQuantity})`,
    returnedQuantity: sql<number>`sum(${supplyIssueSlipItems.returnedQuantity})`,
    outstandingQuantity: sql<number>`sum(${supplyIssueSlipItems.issuedQuantity} - ${supplyIssueSlipItems.returnedQuantity})`,
  }).from(supplyIssueSlipItems).innerJoin(supplyIssueSlips, eq(supplyIssueSlipItems.issueSlipId, supplyIssueSlips.id)).leftJoin(departments, eq(supplyIssueSlips.recipientDepartmentId, departments.id)).groupBy(supplyIssueSlips.recipientUserId, supplyIssueSlips.recipientName, departments.name, supplyIssueSlipItems.supplyId, supplyIssueSlipItems.supplyCode, supplyIssueSlipItems.supplyName, supplyIssueSlipItems.unit);
  const handoverRows = await db.select({
    recipientUserId: handovers.recipientUserId,
    recipientName: handovers.recipientName,
    departmentName: handovers.recipientDepartmentName,
    supplyId: handoverSupplyItems.supplyId,
    supplyCode: handoverSupplyItems.supplyCode,
    supplyName: handoverSupplyItems.supplyName,
    unit: handoverSupplyItems.unit,
    issuedQuantity: sql<number>`sum(${handoverSupplyItems.issuedQuantity})`,
    returnedQuantity: sql<number>`sum(${handoverSupplyItems.returnedQuantity})`,
    outstandingQuantity: sql<number>`sum(${handoverSupplyItems.issuedQuantity} - ${handoverSupplyItems.returnedQuantity})`,
  }).from(handoverSupplyItems).innerJoin(handovers, eq(handoverSupplyItems.handoverId, handovers.id)).where(inArray(handovers.status, ["active", "returned"])).groupBy(handovers.recipientUserId, handovers.recipientName, handovers.recipientDepartmentName, handoverSupplyItems.supplyId, handoverSupplyItems.supplyCode, handoverSupplyItems.supplyName, handoverSupplyItems.unit);
  const totals = new Map<string, { recipientUserId: number | null; recipientName: string; departmentName: string | null; supplyId: number; supplyCode: string; supplyName: string; unit: string; issuedQuantity: number; returnedQuantity: number; outstandingQuantity: number }>();
  [...issueSlipRows, ...handoverRows].forEach((row) => {
    const key = `${row.recipientUserId ?? "external"}:${row.recipientName}:${row.departmentName ?? "unassigned"}:${row.supplyId}`;
    const previous = totals.get(key) ?? { recipientUserId: row.recipientUserId, recipientName: row.recipientName, departmentName: row.departmentName, supplyId: row.supplyId, supplyCode: row.supplyCode, supplyName: row.supplyName, unit: row.unit, issuedQuantity: 0, returnedQuantity: 0, outstandingQuantity: 0 };
    previous.issuedQuantity += Number(row.issuedQuantity || 0);
    previous.returnedQuantity += Number(row.returnedQuantity || 0);
    previous.outstandingQuantity += Number(row.outstandingQuantity || 0);
    totals.set(key, previous);
  });
  return [...totals.values()].sort((left, right) => right.outstandingQuantity - left.outstandingQuantity);
}

export async function listActiveHandoverSupplyHoldingsByRecipientUserId(recipientUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    handoverId: handovers.id,
    referenceCode: handovers.referenceCode,
    handedOverAt: handovers.handedOverAt,
    supplyId: handoverSupplyItems.supplyId,
    supplyCode: handoverSupplyItems.supplyCode,
    supplyName: handoverSupplyItems.supplyName,
    unit: handoverSupplyItems.unit,
    issuedQuantity: handoverSupplyItems.issuedQuantity,
    returnedQuantity: handoverSupplyItems.returnedQuantity,
    outstandingQuantity: sql<number>`${handoverSupplyItems.issuedQuantity} - ${handoverSupplyItems.returnedQuantity}`,
  }).from(handoverSupplyItems).innerJoin(handovers, eq(handoverSupplyItems.handoverId, handovers.id)).where(and(eq(handovers.recipientUserId, recipientUserId), inArray(handovers.status, ["active", "returned"]), sql`${handoverSupplyItems.issuedQuantity} - ${handoverSupplyItems.returnedQuantity} > 0`)).orderBy(desc(handovers.handedOverAt), desc(handoverSupplyItems.id));
}

export async function createAssetsBulk(data: Array<typeof assets.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!data.length) return 0;
  await db.insert(assets).values(data);
  return data.length;
}

export async function updateAsset(id: number, data: Partial<typeof assets.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(assets).set(data).where(eq(assets.id, id));
}

export async function createAssetImportSession(data: typeof assetImportSessions.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(assetImportSessions).values(data);
  return Number(result[0].insertId);
}

export async function updateAssetImportSession(id: number, data: Partial<typeof assetImportSessions.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(assetImportSessions).set(data).where(eq(assetImportSessions.id, id));
}

export async function getLatestAssetImportSession() {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(assetImportSessions).orderBy(desc(assetImportSessions.createdAt)).limit(1))[0];
}

export async function getAssetImportSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(assetImportSessions).where(eq(assetImportSessions.id, id)).limit(1))[0];
}

export async function listAssetImportSessions(page = 1, pageSize = 10) {
  const db = await getDb();
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize)));
  if (!db) return { items: [], total: 0, page: safePage, pageSize: safePageSize, totalPages: 0 };
  const successfulSession = sql`${assetImportSessions.createdCount} > 0 OR ${assetImportSessions.updatedCount} > 0`;
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(assetImportSessions).where(successfulSession);
  const items = await db.select().from(assetImportSessions).where(successfulSession).orderBy(desc(assetImportSessions.createdAt)).limit(safePageSize).offset((safePage - 1) * safePageSize);
  const totalNumber = Number(total || 0);
  return { items, total: totalNumber, page: safePage, pageSize: safePageSize, totalPages: Math.ceil(totalNumber / safePageSize) };
}

export async function createAssetImportItem(data: typeof assetImportItems.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(assetImportItems).values(data);
  return Number(result[0].insertId);
}

export async function listAssetImportItems(sessionId: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return [];
  return db.select().from(assetImportItems).where(eq(assetImportItems.importSessionId, sessionId));
}

export async function createSupplyImportSession(data: typeof supplyImportSessions.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(supplyImportSessions).values(data);
  return Number(result[0].insertId);
}

export async function updateSupplyImportSession(id: number, data: Partial<typeof supplyImportSessions.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(supplyImportSessions).set(data).where(eq(supplyImportSessions.id, id));
}

export async function createSupplyImportItem(data: typeof supplyImportItems.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(supplyImportItems).values(data);
  return Number(result[0].insertId);
}

export async function listSupplyImportSessions(page = 1, pageSize = 10) {
  const db = await getDb();
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize)));
  if (!db) return { items: [], total: 0, page: safePage, pageSize: safePageSize, totalPages: 0 };
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(supplyImportSessions);
  const items = await db.select().from(supplyImportSessions).orderBy(desc(supplyImportSessions.createdAt)).limit(safePageSize).offset((safePage - 1) * safePageSize);
  const totalNumber = Number(total || 0);
  return { items, total: totalNumber, page: safePage, pageSize: safePageSize, totalPages: Math.ceil(totalNumber / safePageSize) };
}

export async function getSupplyImportSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(supplyImportSessions).where(eq(supplyImportSessions.id, id)).limit(1))[0];
}

export async function listSupplyImportItems(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplyImportItems).where(eq(supplyImportItems.importSessionId, sessionId)).orderBy(supplyImportItems.id);
}

export async function createAssetFieldChanges(data: Array<typeof assetFieldChanges.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!data.length) return;
  await db.insert(assetFieldChanges).values(data);
}

export async function listAssetFieldChanges(assetId: number, page = 1, pageSize = 10) {
  const db = await getDb();
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize)));
  if (!db) return { items: [], total: 0, page: safePage, pageSize: safePageSize, totalPages: 0 };
  const where = eq(assetFieldChanges.assetId, assetId);
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(assetFieldChanges).where(where);
  const items = await db.select().from(assetFieldChanges).where(where).orderBy(desc(assetFieldChanges.createdAt)).limit(safePageSize).offset((safePage - 1) * safePageSize);
  const totalNumber = Number(total || 0);
  return { items, total: totalNumber, page: safePage, pageSize: safePageSize, totalPages: Math.ceil(totalNumber / safePageSize) };
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

export async function listHelpGuides() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(helpGuides).orderBy(helpGuides.audience, helpGuides.guideKey);
}

export async function saveHelpGuide(data: typeof helpGuides.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(helpGuides).values(data).onDuplicateKeyUpdate({ set: {
    audience: data.audience,
    title: data.title,
    description: data.description,
    steps: data.steps,
    updatedByUserId: data.updatedByUserId,
    updatedByName: data.updatedByName,
    updatedAt: new Date(),
  } });
}

export async function createHelpGuideVersion(data: typeof helpGuideVersions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(helpGuideVersions).values(data);
  return Number(result[0].insertId);
}

export async function listHelpGuideVersions(guideKey: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(helpGuideVersions).where(eq(helpGuideVersions.guideKey, guideKey)).orderBy(desc(helpGuideVersions.createdAt));
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
    recoveryCertificateNumber: handovers.recoveryCertificateNumber,
    recoveryCertificateYear: handovers.recoveryCertificateYear,
    recoveryCertificateMonth: handovers.recoveryCertificateMonth,
    recoveryCertificateSequence: handovers.recoveryCertificateSequence,
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

export async function getNextHandoverSequence(handoverYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ referenceCode: handovers.referenceCode }).from(handovers).where(like(handovers.referenceCode, `BG-${handoverYear}-%`));
  const maxSequence = rows.reduce((maximum, row) => {
    const match = row.referenceCode.match(new RegExp(`^BG-${handoverYear}-(\\d+)$`));
    return Math.max(maximum, match ? Number(match[1]) : 0);
  }, 0);
  return maxSequence + 1;
}

export async function getNextRecoveryCertificateSequence(recoveryYear: number, recoveryMonth: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows: Array<{ sequence: number | null }> = await db.select({ sequence: handovers.recoveryCertificateSequence }).from(handovers).where(and(eq(handovers.recoveryCertificateYear, recoveryYear), eq(handovers.recoveryCertificateMonth, recoveryMonth)));
  const maxSequence = rows.reduce((maximum, row) => Math.max(maximum, Number(row.sequence || 0)), 0);
  return maxSequence + 1;
}

export async function createHandover(data: typeof handovers.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(handovers).values(data);
  return Number(result[0].insertId);
}

export async function createHandoverSupplyItem(data: typeof handoverSupplyItems.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(handoverSupplyItems).values(data);
  return Number(result[0].insertId);
}

export async function listHandoverSupplyItems(handoverId: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return [];
  return db.select().from(handoverSupplyItems).where(eq(handoverSupplyItems.handoverId, handoverId));
}

export async function updateHandoverSupplyItem(id: number, data: Partial<typeof handoverSupplyItems.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(handoverSupplyItems).set(data).where(eq(handoverSupplyItems.id, id));
}

export async function updateHandover(id: number, data: Partial<typeof handovers.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(handovers).set(data).where(eq(handovers.id, id));
}

export async function transitionHandoverStatus(
  id: number,
  status: "draft" | "pending_signature" | "active" | "returned" | "cancelled",
  changes: Partial<typeof handovers.$inferInsert>,
  executor?: any,
) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");

  const transition = async (tx: any) => {
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
  };
  return executor ? transition(db) : db.transaction(transition);
}

export async function listMaintenanceTickets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(maintenanceTickets).orderBy(desc(maintenanceTickets.openedAt));
}

export async function listMaintenanceMonthlyBudgets(year: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(maintenanceMonthlyBudgets).where(eq(maintenanceMonthlyBudgets.year, year)).orderBy(maintenanceMonthlyBudgets.month);
}

export async function saveMaintenanceMonthlyBudget(data: { year: number; month: number; amount: string; updatedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(maintenanceMonthlyBudgets).values(data).onDuplicateKeyUpdate({ set: { amount: data.amount, updatedByUserId: data.updatedByUserId } });
  return (await db.select().from(maintenanceMonthlyBudgets).where(eq(maintenanceMonthlyBudgets.year, data.year)).orderBy(maintenanceMonthlyBudgets.month)).find((item) => item.month === data.month) ?? null;
}

export async function getNextMaintenanceTicketSequence(ticketYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select({ maxSequence: sql<number>`COALESCE(MAX(${maintenanceTickets.ticketSequence}), 0)` }).from(maintenanceTickets).where(eq(maintenanceTickets.ticketYear, ticketYear));
  return Number(result[0]?.maxSequence || 0) + 1;
}

export async function getNextWarrantyRequestSequence(warrantyYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ warrantyRequestCode: maintenanceTickets.warrantyRequestCode }).from(maintenanceTickets).where(like(maintenanceTickets.warrantyRequestCode, `BH-${warrantyYear}-%`));
  const maxSequence = rows.reduce((maximum, row) => {
    const match = row.warrantyRequestCode?.match(new RegExp(`^BH-${warrantyYear}-(\\d+)$`));
    return Math.max(maximum, match ? Number(match[1]) : 0);
  }, 0);
  return maxSequence + 1;
}

export async function getNextRepairTicketSequence(ticketYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ ticketCode: maintenanceTickets.ticketCode }).from(maintenanceTickets).where(like(maintenanceTickets.ticketCode, `SC-${ticketYear}-%`));
  const maxSequence = rows.reduce((maximum, row) => {
    const match = row.ticketCode.match(new RegExp(`^SC-${ticketYear}-(\\d+)$`));
    return Math.max(maximum, match ? Number(match[1]) : 0);
  }, 0);
  return maxSequence + 1;
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

export async function getAuditSession(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(auditSessions).where(eq(auditSessions.id, id)).limit(1))[0];
}

export async function createAuditSession(data: typeof auditSessions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(auditSessions).values(data);
  return Number(result[0].insertId);
}

export async function updateAuditSession(id: number, data: Partial<typeof auditSessions.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(auditSessions).set(data).where(eq(auditSessions.id, id));
}

export async function listAuditItems(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditItems).where(eq(auditItems.auditSessionId, sessionId));
}

export async function getAuditItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(auditItems).where(eq(auditItems.id, id)).limit(1))[0];
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

export async function recordActivity(data: typeof activityLogs.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return;
  await db.insert(activityLogs).values(data);
}

export async function runAssetImportTransaction<T>(callback: (transaction: any) => Promise<T>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (transaction) => callback(transaction));
}

export async function runInventoryTransaction<T>(callback: (transaction: any) => Promise<T>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (transaction) => callback(transaction));
}

export async function runRetirementCertificateTransaction<T>(callback: (transaction: any) => Promise<T>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (transaction) => callback(transaction));
}

export async function listActivityLogs(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
}

export async function listActivityLogsByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(activityLogs).where(eq(activityLogs.entityId, entityId)).orderBy(desc(activityLogs.createdAt));
  return rows.filter((row) => row.entityType === entityType);
}

export async function listHandoverReturnDecisionHistory(handoverId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(activityLogs).where(eq(activityLogs.entityId, handoverId)).orderBy(desc(activityLogs.createdAt));
  return rows.filter((row) => row.entityType === "handover" && (row.action === "return_approved" || row.action === "return_rejected"));
}

export async function getNextAuditSequence(auditYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ referenceCode: auditSessions.referenceCode }).from(auditSessions).where(like(auditSessions.referenceCode, `KK-${auditYear}-%`));
  const maxSequence = rows.reduce((maximum, row) => {
    const match = row.referenceCode.match(new RegExp(`^KK-${auditYear}-(\\d+)$`));
    return Math.max(maximum, match ? Number(match[1]) : 0);
  }, 0);
  return maxSequence + 1;
}

export async function deleteAuditItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(auditItems).where(eq(auditItems.id, id));
}

export async function deleteAuditItemsBySession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(auditItems).where(eq(auditItems.auditSessionId, sessionId));
}

export async function deleteAuditSession(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(auditSessions).where(eq(auditSessions.id, id));
}
