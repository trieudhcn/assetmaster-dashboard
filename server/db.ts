import { and, asc, count, desc, eq, gt, inArray, isNull, like, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
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
  backupRecords,
  backupRestoreDrills,
  brands,
  branches,
  companies,
  departments,
  directorySettingAudits,
  directorySettings,
  fileStorageSettings,
  divisions,
  handovers,
  handoverSupplyItems,
  helpGuides,
  helpGuideVersions,
  inventoryMovements,
  inventorySupplies,
  installationSettings,
  maintenanceMonthlyBudgets,
  maintenanceTickets,
  purchaseContractDocuments,
  purchaseContractItems,
  purchaseContracts,
  purchaseInvoiceDocuments,
  purchaseInvoiceLines,
  purchaseInvoiceSupplyReceipts,
  purchaseInvoices,
  retirementCertificateAssets,
  retirementCertificates,
  selfHostedSessions,
  softwareLicenseActivationAccounts,
  softwareLicenseAssignments,
  softwareLicenseCredentialAccessLogs,
  softwareLicenseDocuments,
  softwareLicenseKeys,
  softwareLicenses,
  licenseTypes,
  supplyImportItems,
  supplyImportSessions,
  supplyUnits,
  supplyIssueSlipItems,
  supplyIssueSlips,
  supplyRequestItems,
  supplyRequests,
  technologyServices,
  technologyVendorContractDocuments,
  technologyVendorContracts,
  technologyVendors,
  uiLabels,
  type InsertUser,
  userDashboardAlertStates,
  userMenuPreferences,
  userNotificationPreferences,
  users,
  vendors,
  vendorDocuments,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { readRuntimeDatabaseUrl } from "./selfHostedRuntimeConfig";
import {
  normalizeDirectoryProfile,
  resolveDirectoryDepartmentId,
} from "../shared/directoryProfile";

let database: ReturnType<typeof drizzle> | null = null;

export function resetDatabaseConnection() {
  database = null;
}

export async function getDb() {
  if (!database) {
    const databaseUrl = await readRuntimeDatabaseUrl();
    if (databaseUrl) database = drizzle(databaseUrl);
  }
  return database;
}

export async function getInstallationSettings() {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(installationSettings).where(eq(installationSettings.id, 1)).limit(1))[0] ?? null;
}

export async function getFileStorageSettings() {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(fileStorageSettings).where(eq(fileStorageSettings.id, 1)).limit(1))[0] ?? null;
}

export async function saveFileStorageSettings(input: { relativeDirectory: string; actor: { userId: number; name: string | null } }) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu của AssetMaster.");
  const existing = await getFileStorageSettings();
  const values = {
    id: 1,
    mode: "shared_directory" as const,
    relativeDirectory: input.relativeDirectory,
    lastTestStatus: "not_tested" as const,
    lastTestMessage: null,
    lastTestedAt: null,
    updatedByUserId: input.actor.userId,
    updatedByName: input.actor.name,
  };
  await db.insert(fileStorageSettings).values(values).onDuplicateKeyUpdate({ set: { ...values, createdAt: existing?.createdAt } });
  return getFileStorageSettings();
}

export async function updateFileStorageTestResult(input: { status: "success" | "failed"; message: string; actor: { userId: number; name: string | null } }) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu của AssetMaster.");
  const existing = await getFileStorageSettings();
  if (!existing) throw new Error("Hãy lưu cấu hình kho tệp trước khi kiểm tra.");
  await db.update(fileStorageSettings).set({ lastTestStatus: input.status, lastTestMessage: input.message.slice(0, 300), lastTestedAt: new Date(), updatedByUserId: input.actor.userId, updatedByName: input.actor.name }).where(eq(fileStorageSettings.id, 1));
  return getFileStorageSettings();
}

export async function listBackupRecords(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(backupRecords).orderBy(desc(backupRecords.completedAt)).limit(limit);
}

export async function createBackupRecord(input: {
  backupType: "mysql_logical" | "runtime" | "file_storage" | "full";
  status: "completed" | "failed";
  verificationStatus: "not_verified" | "verified" | "failed";
  storageReference: string;
  completedAt: Date;
  note?: string | null;
  recordedByUserId: number;
  recordedByName: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu của AssetMaster.");
  const result = await db.insert(backupRecords).values(input);
  const id = Number(result[0].insertId);
  return (await db.select().from(backupRecords).where(eq(backupRecords.id, id)).limit(1))[0];
}

export async function listBackupRestoreDrills(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(backupRestoreDrills).orderBy(desc(backupRestoreDrills.completedAt)).limit(limit);
}

export async function createBackupRestoreDrill(input: {
  backupRecordId?: number | null;
  status: "successful" | "failed";
  environment: string;
  completedAt: Date;
  note?: string | null;
  recordedByUserId: number;
  recordedByName: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu của AssetMaster.");
  const result = await db.insert(backupRestoreDrills).values(input);
  const id = Number(result[0].insertId);
  return (await db.select().from(backupRestoreDrills).where(eq(backupRestoreDrills.id, id)).limit(1))[0];
}

export async function completeInstallation(input: { websiteName: string; websiteUrl: string | null; databaseName: string; bootstrapEmail: string; bootstrapName: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Không thể kết nối cơ sở dữ liệu của AssetMaster.");
  return db.transaction(async (tx) => {
    const installed = (await tx.select().from(installationSettings).where(eq(installationSettings.id, 1)).limit(1))[0];
    if (installed?.status === "installed") throw new Error("AssetMaster đã hoàn tất cài đặt. Không thể chạy lại /setup.");
    const existingBootstrap = (await tx.select().from(users).where(eq(users.authSource, "bootstrap_local")).limit(1))[0];
    if (existingBootstrap) throw new Error("Tài khoản quản trị bootstrap đã tồn tại. Vui lòng dùng trang đăng nhập.");
    const openId = `local:${createHash("sha256").update(input.bootstrapEmail).digest("hex").slice(0, 58)}`;
    const result = await tx.insert(users).values({ openId, name: input.bootstrapName, email: input.bootstrapEmail, loginMethod: "local", authSource: "bootstrap_local", passwordHash: input.passwordHash, mustChangePassword: false, role: "admin", isActive: true, lastSignedIn: new Date() });
    const userId = Number(result[0].insertId);
    const company = (await tx.select().from(companies).orderBy(desc(companies.updatedAt)).limit(1))[0];
    const companyValues = { name: input.websiteName, websiteTitle: input.websiteName, websiteUrl: input.websiteUrl, brandColor: "#0F8C8C", loginGreeting: "Quản lý tài sản, theo đúng vai trò của bạn." };
    if (company) await tx.update(companies).set(companyValues).where(eq(companies.id, company.id));
    else await tx.insert(companies).values(companyValues);
    await tx.insert(installationSettings).values({ id: 1, status: "installed", websiteName: input.websiteName, websiteUrl: input.websiteUrl, databaseName: input.databaseName, bootstrapEmail: input.bootstrapEmail });
    return { userId, email: input.bootstrapEmail, websiteName: input.websiteName };
  });
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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
}

export async function getBootstrapUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(and(eq(users.email, email), eq(users.authSource, "bootstrap_local"), eq(users.isActive, true))).limit(1))[0];
}

export async function getUserByDirectorySessionTokenHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select({ user: users }).from(selfHostedSessions)
    .innerJoin(users, eq(selfHostedSessions.userId, users.id))
    .where(and(eq(selfHostedSessions.tokenHash, tokenHash), sql`${selfHostedSessions.expiresAt} > NOW()`, eq(users.isActive, true)))
    .limit(1);
  return rows[0]?.user;
}

export async function createSelfHostedSession(input: { userId: number; tokenHash: string; expiresAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(selfHostedSessions).values(input);
}

export async function deleteSelfHostedSession(tokenHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(selfHostedSessions).where(eq(selfHostedSessions.tokenHash, tokenHash));
}

export type DirectorySettingsInput = {
  ldapUrl: string;
  usersDn: string;
  groupsDn: string | null;
  bindDn: string | null;
  bindSecretRef: string | null;
  loginAttribute: string;
  emailAttribute: string;
  displayNameAttribute: string;
  directoryIdAttribute: string;
  departmentAttribute: string;
  jobTitleAttribute: string;
  adminGroupDn: string | null;
  userGroupDn: string | null;
  allowNestedGroups: boolean;
  caCertificatePem: string | null;
};

function directorySnapshot(settings: DirectorySettingsInput) {
  return {
    ldapUrl: settings.ldapUrl,
    usersDn: settings.usersDn,
    groupsDn: settings.groupsDn,
    bindDn: settings.bindDn,
    bindSecretRef: settings.bindSecretRef,
    loginAttribute: settings.loginAttribute,
    emailAttribute: settings.emailAttribute,
    displayNameAttribute: settings.displayNameAttribute,
    directoryIdAttribute: settings.directoryIdAttribute,
    departmentAttribute: settings.departmentAttribute,
    jobTitleAttribute: settings.jobTitleAttribute,
    adminGroupDn: settings.adminGroupDn,
    userGroupDn: settings.userGroupDn,
    allowNestedGroups: settings.allowNestedGroups,
    hasCaCertificate: Boolean(settings.caCertificatePem),
  };
}

export async function getDirectorySettings() {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(directorySettings).where(eq(directorySettings.id, 1)).limit(1))[0];
}

export async function listDirectorySettingAudits(limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(directorySettingAudits).where(eq(directorySettingAudits.directorySettingsId, 1)).orderBy(desc(directorySettingAudits.createdAt)).limit(limit);
}

export async function saveDirectorySettings(input: DirectorySettingsInput, actor: { userId: number; name: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await getDirectorySettings();
  const version = (existing?.version ?? 0) + 1;
  const values = {
    id: 1,
    version,
    status: existing?.status === "active" ? "disabled" as const : existing?.status ?? "draft" as const,
    ...input,
    bindSecretConfigured: Boolean(input.bindSecretRef),
    lastTestStatus: "not_tested" as const,
    lastTestMessage: null,
    lastTestedAt: null,
    createdByUserId: existing?.createdByUserId ?? actor.userId,
    updatedByUserId: actor.userId,
  };
  await db.insert(directorySettings).values(values).onDuplicateKeyUpdate({ set: { ...values, createdAt: existing?.createdAt } });
  await db.insert(directorySettingAudits).values({ directorySettingsId: 1, version, action: "saved", summary: "Lưu bản nháp cấu hình Directory LDAP/AD", snapshot: directorySnapshot(input), actorUserId: actor.userId, actorName: actor.name });
  return getDirectorySettings();
}

export async function updateDirectoryTestResult(input: { status: "success" | "failed"; message: string; actor: { userId: number; name: string | null } }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await getDirectorySettings();
  if (!current) throw new Error("Chưa có cấu hình Directory LDAP/AD.");
  await db.update(directorySettings).set({ lastTestStatus: input.status, lastTestMessage: input.message, lastTestedAt: new Date(), updatedByUserId: input.actor.userId }).where(eq(directorySettings.id, 1));
  await db.insert(directorySettingAudits).values({ directorySettingsId: 1, version: current.version, action: "tested", summary: input.message, snapshot: directorySnapshot(current), actorUserId: input.actor.userId, actorName: input.actor.name });
  return getDirectorySettings();
}

export async function setDirectoryStatus(status: "active" | "disabled", actor: { userId: number; name: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await getDirectorySettings();
  if (!current) throw new Error("Chưa có cấu hình Directory LDAP/AD.");
  await db.update(directorySettings).set({ status, updatedByUserId: actor.userId }).where(eq(directorySettings.id, 1));
  await db.insert(directorySettingAudits).values({ directorySettingsId: 1, version: current.version, action: status === "active" ? "activated" : "disabled", summary: status === "active" ? "Kích hoạt xác thực LDAP/LDAPS" : "Tắt xác thực LDAP/LDAPS", snapshot: directorySnapshot(current), actorUserId: actor.userId, actorName: actor.name });
  return getDirectorySettings();
}

export async function getDepartmentIdByDirectoryName(
  departmentName: string | null
) {
  if (!departmentName) return undefined;
  const departmentRows = await listAllDepartments();
  return resolveDirectoryDepartmentId(departmentName, departmentRows);
}

export async function upsertDirectoryUser(input: { openId: string; directoryObjectId: string; directoryUsername: string; name: string | null; email: string; department: string | null; jobTitle: string | null; role: "admin" | "user" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = normalizeDirectoryProfile(input);
  const byDirectoryId = (await db.select().from(users).where(eq(users.directoryObjectId, input.directoryObjectId)).limit(1))[0];
  const byEmail = byDirectoryId ? undefined : await getUserByEmail(profile.email);
  const current = byDirectoryId ?? byEmail;
  const role = current && input.role === "user" ? current.role : input.role;
  const matchedDepartmentId = await getDepartmentIdByDirectoryName(profile.department);
  const departmentId = matchedDepartmentId ?? current?.departmentId ?? null;
  const values = { name: profile.name, email: profile.email, directoryObjectId: input.directoryObjectId, directoryUsername: profile.directoryUsername, directoryDepartment: profile.department, departmentId, jobTitle: profile.jobTitle, authSource: "ldap" as const, loginMethod: "ldap", lastDirectorySyncAt: new Date(), lastSignedIn: new Date(), role };
  if (current) {
    await db.update(users).set(values).where(eq(users.id, current.id));
    return { ...current, ...values };
  }
  const result = await db.insert(users).values({ openId: input.openId, ...values, isActive: true });
  const id = Number(result[0].insertId);
  return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0]!;
}

export async function getUserMenuPreference(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(userMenuPreferences).where(eq(userMenuPreferences.userId, userId)).limit(1))[0];
}

export async function saveUserMenuPreference(userId: number, menuOrder: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(userMenuPreferences).values({ userId, menuOrder }).onDuplicateKeyUpdate({ set: { menuOrder } });
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.lastSignedIn));
}

export async function getUserByEmployeeCode(employeeCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.employeeCode, employeeCode)).limit(1))[0];
}

export async function updateUserDirectoryProfile(id: number, profile: { employeeCode: string | null; jobTitle: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set(profile).where(eq(users.id, id));
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

export async function updateUserActiveStatus(id: number, isActive: boolean, executor?: any) {
  const db = executor ?? await getDb();
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

export async function listUserDashboardAlertStateIds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ alertId: userDashboardAlertStates.alertId }).from(userDashboardAlertStates).where(eq(userDashboardAlertStates.userId, userId));
  return rows.map((row) => row.alertId);
}

export async function listUserDashboardAlertHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ alertId: userDashboardAlertStates.alertId, dismissedAt: userDashboardAlertStates.dismissedAt })
    .from(userDashboardAlertStates)
    .where(eq(userDashboardAlertStates.userId, userId))
    .orderBy(desc(userDashboardAlertStates.dismissedAt))
    .limit(limit);
}

export async function dismissUserDashboardAlerts(userId: number, alertIds: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const uniqueAlertIds = Array.from(new Set(alertIds));
  if (!uniqueAlertIds.length) return;
  await db.insert(userDashboardAlertStates).values(uniqueAlertIds.map((alertId) => ({ userId, alertId }))).onDuplicateKeyUpdate({ set: { dismissedAt: new Date() } });
}

export async function restoreUserDashboardAlerts(userId: number, alertIds: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const uniqueAlertIds = Array.from(new Set(alertIds));
  if (!uniqueAlertIds.length) return;
  await db.delete(userDashboardAlertStates).where(and(eq(userDashboardAlertStates.userId, userId), inArray(userDashboardAlertStates.alertId, uniqueAlertIds)));
}

export async function updateUserDepartment(id: number, departmentId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ departmentId, divisionId: null }).where(eq(users.id, id));
}

export async function updateUserBranch(id: number, branchId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ branchId }).where(eq(users.id, id));
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

export async function listTechnologyVendors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(technologyVendors).orderBy(desc(technologyVendors.updatedAt));
}

export async function getTechnologyVendorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(technologyVendors).where(eq(technologyVendors.id, id)).limit(1))[0];
}

export async function createTechnologyVendor(data: typeof technologyVendors.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(technologyVendors).values(data);
  return Number(result[0].insertId);
}

export async function updateTechnologyVendor(id: number, data: Partial<typeof technologyVendors.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(technologyVendors).set(data).where(eq(technologyVendors.id, id));
}

export async function listTechnologyVendorContracts(technologyVendorId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(technologyVendorContracts);
  return technologyVendorId
    ? query.where(eq(technologyVendorContracts.technologyVendorId, technologyVendorId)).orderBy(desc(technologyVendorContracts.updatedAt))
    : query.orderBy(desc(technologyVendorContracts.updatedAt));
}

export async function listTechnologyVendorUsageStats() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: technologyVendors.id,
    name: technologyVendors.name,
    isActive: technologyVendors.isActive,
    activeLicenseCount: sql<number>`(select count(*) from ${softwareLicenses} where ${softwareLicenses.technologyVendorId} = ${technologyVendors.id} and ${softwareLicenses.status} in ('active', 'expiring'))`.mapWith(Number),
    activeServiceCount: sql<number>`(select count(*) from ${technologyServices} where ${technologyServices.technologyVendorId} = ${technologyVendors.id} and ${technologyServices.status} in ('active', 'expiring'))`.mapWith(Number),
    contractCount: sql<number>`(select count(*) from ${technologyVendorContracts} where ${technologyVendorContracts.technologyVendorId} = ${technologyVendors.id})`.mapWith(Number),
  }).from(technologyVendors).orderBy(desc(technologyVendors.updatedAt));
}

export async function listTechnologyVendorContractAlerts(daysAhead = 30) {
  const db = await getDb();
  if (!db) return [];
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + daysAhead);
  return db.select({
    id: technologyVendorContracts.id,
    contractCode: technologyVendorContracts.contractCode,
    title: technologyVendorContracts.title,
    technologyVendorId: technologyVendorContracts.technologyVendorId,
    vendorName: technologyVendors.name,
    effectiveTo: technologyVendorContracts.effectiveTo,
    status: technologyVendorContracts.status,
    autoRenew: technologyVendorContracts.autoRenew,
  }).from(technologyVendorContracts).innerJoin(technologyVendors, eq(technologyVendorContracts.technologyVendorId, technologyVendors.id)).where(and(sql`${technologyVendorContracts.effectiveTo} is not null`, sql`${technologyVendorContracts.effectiveTo} <= ${limitDate}`, sql`${technologyVendorContracts.status} in ('active', 'expiring', 'expired')`)).orderBy(technologyVendorContracts.effectiveTo);
}

export async function getTechnologyVendorContractById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(technologyVendorContracts).where(eq(technologyVendorContracts.id, id)).limit(1))[0];
}

export async function createTechnologyVendorContract(data: typeof technologyVendorContracts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(technologyVendorContracts).values(data);
  return Number(result[0].insertId);
}

export async function updateTechnologyVendorContract(id: number, data: Partial<typeof technologyVendorContracts.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(technologyVendorContracts).set(data).where(eq(technologyVendorContracts.id, id));
}

export async function listSoftwareLicenses(executor?: any): Promise<Array<typeof softwareLicenses.$inferSelect>> {
  const db = executor ?? await getDb();
  if (!db) return [];
  return db.select().from(softwareLicenses).orderBy(desc(softwareLicenses.updatedAt));
}

export async function listLicenseTypes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(licenseTypes).orderBy(asc(licenseTypes.name));
}

export async function getLicenseTypeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(licenseTypes).where(eq(licenseTypes.id, id)).limit(1))[0];
}

export async function createLicenseType(data: typeof licenseTypes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(licenseTypes).values(data);
  return Number(result[0].insertId);
}

export async function updateLicenseType(id: number, data: Partial<typeof licenseTypes.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(licenseTypes).set(data).where(eq(licenseTypes.id, id));
}

export async function deleteLicenseType(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(licenseTypes).where(eq(licenseTypes.id, id));
}

export async function countSoftwareLicensesByTypeId(licenseTypeId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: count() }).from(softwareLicenses).where(eq(softwareLicenses.licenseTypeId, licenseTypeId));
  return Number(result[0]?.total || 0);
}

export async function getSoftwareLicenseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(softwareLicenses).where(eq(softwareLicenses.id, id)).limit(1))[0];
}

export async function createSoftwareLicense(data: typeof softwareLicenses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(softwareLicenses).values(data);
  return Number(result[0].insertId);
}

export async function updateSoftwareLicense(id: number, data: Partial<typeof softwareLicenses.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(softwareLicenses).set(data).where(eq(softwareLicenses.id, id));
}

export async function listSoftwareLicenseDocuments(softwareLicenseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(softwareLicenseDocuments).where(eq(softwareLicenseDocuments.softwareLicenseId, softwareLicenseId)).orderBy(desc(softwareLicenseDocuments.createdAt));
}

export async function getSoftwareLicenseDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(softwareLicenseDocuments).where(eq(softwareLicenseDocuments.id, id)).limit(1))[0];
}

export async function createSoftwareLicenseDocument(data: typeof softwareLicenseDocuments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(softwareLicenseDocuments).values(data);
  return Number(result[0].insertId);
}

export async function deleteSoftwareLicenseDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(softwareLicenseDocuments).where(eq(softwareLicenseDocuments.id, id));
}

export async function listTechnologyVendorContractDocuments(technologyVendorContractId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(technologyVendorContractDocuments).where(eq(technologyVendorContractDocuments.technologyVendorContractId, technologyVendorContractId)).orderBy(desc(technologyVendorContractDocuments.createdAt));
}

export async function getTechnologyVendorContractDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(technologyVendorContractDocuments).where(eq(technologyVendorContractDocuments.id, id)).limit(1))[0];
}

export async function createTechnologyVendorContractDocument(data: typeof technologyVendorContractDocuments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(technologyVendorContractDocuments).values(data);
  return Number(result[0].insertId);
}

export async function deleteTechnologyVendorContractDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(technologyVendorContractDocuments).where(eq(technologyVendorContractDocuments.id, id));
}

export async function listSoftwareLicenseAssignments(softwareLicenseId?: number, executor?: any): Promise<Array<typeof softwareLicenseAssignments.$inferSelect>> {
  const db = executor ?? await getDb();
  if (!db) return [];
  const query = db.select().from(softwareLicenseAssignments);
  return softwareLicenseId ? query.where(eq(softwareLicenseAssignments.softwareLicenseId, softwareLicenseId)).orderBy(desc(softwareLicenseAssignments.assignedAt)) : query.orderBy(desc(softwareLicenseAssignments.assignedAt));
}

export async function listActiveSoftwareLicenseAssignmentsForHandover(assetId: number, recipientUserId: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return [];
  return db.select({
    id: softwareLicenseAssignments.id,
    softwareLicenseId: softwareLicenseAssignments.softwareLicenseId,
    softwareLicenseKeyId: softwareLicenseAssignments.softwareLicenseKeyId,
    productName: softwareLicenses.productName,
    licenseCode: softwareLicenses.licenseCode,
  }).from(softwareLicenseAssignments).innerJoin(softwareLicenses, eq(softwareLicenseAssignments.softwareLicenseId, softwareLicenses.id)).where(and(
    eq(softwareLicenseAssignments.status, "active"),
    eq(softwareLicenseAssignments.assetId, assetId),
    eq(softwareLicenseAssignments.userId, recipientUserId),
  )).orderBy(desc(softwareLicenseAssignments.assignedAt));
}

export async function getSoftwareLicenseAssignmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(softwareLicenseAssignments).where(eq(softwareLicenseAssignments.id, id)).limit(1))[0];
}

export async function listSoftwareLicenseKeys(softwareLicenseId: number, executor?: any): Promise<Array<typeof softwareLicenseKeys.$inferSelect>> {
  const db = executor ?? await getDb();
  if (!db) return [];
  return db.select().from(softwareLicenseKeys).where(eq(softwareLicenseKeys.softwareLicenseId, softwareLicenseId)).orderBy(desc(softwareLicenseKeys.createdAt));
}

export async function getSoftwareLicenseKeyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(softwareLicenseKeys).where(eq(softwareLicenseKeys.id, id)).limit(1))[0];
}

export async function createSoftwareLicenseKey(data: typeof softwareLicenseKeys.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(softwareLicenseKeys).values(data);
  return Number(result[0].insertId);
}

export async function updateSoftwareLicenseKey(id: number, data: Partial<typeof softwareLicenseKeys.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(softwareLicenseKeys).set(data).where(eq(softwareLicenseKeys.id, id));
}

export async function listSoftwareLicenseActivationAccounts(softwareLicenseId: number, executor?: any): Promise<Array<typeof softwareLicenseActivationAccounts.$inferSelect>> {
  const db = executor ?? await getDb();
  if (!db) return [];
  return db.select().from(softwareLicenseActivationAccounts).where(eq(softwareLicenseActivationAccounts.softwareLicenseId, softwareLicenseId)).orderBy(desc(softwareLicenseActivationAccounts.createdAt));
}

export async function getSoftwareLicenseActivationAccountById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(softwareLicenseActivationAccounts).where(eq(softwareLicenseActivationAccounts.id, id)).limit(1))[0];
}

export async function createSoftwareLicenseActivationAccount(data: typeof softwareLicenseActivationAccounts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(softwareLicenseActivationAccounts).values(data);
  return Number(result[0].insertId);
}

export async function updateSoftwareLicenseActivationAccount(id: number, data: Partial<typeof softwareLicenseActivationAccounts.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(softwareLicenseActivationAccounts).set(data).where(eq(softwareLicenseActivationAccounts.id, id));
}

export async function updateSoftwareLicenseActivationAccountLimits(softwareLicenseId: number, maxUsers: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(softwareLicenseActivationAccounts).set({ maxUsers }).where(eq(softwareLicenseActivationAccounts.softwareLicenseId, softwareLicenseId));
}

export async function createSoftwareLicenseCredentialAccessLog(data: typeof softwareLicenseCredentialAccessLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(softwareLicenseCredentialAccessLogs).values(data);
  return Number(result[0].insertId);
}

export async function listSoftwareLicenseCredentialAccessLogs(softwareLicenseId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(softwareLicenseCredentialAccessLogs).where(eq(softwareLicenseCredentialAccessLogs.softwareLicenseId, softwareLicenseId)).orderBy(desc(softwareLicenseCredentialAccessLogs.createdAt)).limit(limit);
}

export async function createSoftwareLicenseAssignment(data: typeof softwareLicenseAssignments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(softwareLicenseAssignments).values(data);
  return Number(result[0].insertId);
}

export async function revokeSoftwareLicenseAssignment(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(softwareLicenseAssignments).set({ status: "revoked", revokedAt: new Date() }).where(eq(softwareLicenseAssignments.id, id));
}

export async function restoreSoftwareLicenseAssignment(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(softwareLicenseAssignments).set({ status: "active", revokedAt: null }).where(eq(softwareLicenseAssignments.id, id));
}

export async function listTechnologyServices() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(technologyServices).orderBy(desc(technologyServices.updatedAt));
}

export async function createTechnologyService(data: typeof technologyServices.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(technologyServices).values(data);
  return Number(result[0].insertId);
}

export async function updateTechnologyService(id: number, data: Partial<typeof technologyServices.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(technologyServices).set(data).where(eq(technologyServices.id, id));
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

export async function listPurchaseContracts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseContracts).orderBy(desc(purchaseContracts.updatedAt));
}

export async function getPurchaseContractById(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return undefined;
  return (await db.select().from(purchaseContracts).where(eq(purchaseContracts.id, id)).limit(1))[0];
}

export async function getPurchaseContractByReferenceCode(referenceCode: string, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return undefined;
  return (await db.select().from(purchaseContracts).where(eq(purchaseContracts.referenceCode, referenceCode)).limit(1))[0];
}

export async function createPurchaseContract(data: typeof purchaseContracts.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(purchaseContracts).values(data);
  return Number(result[0].insertId);
}

export async function updatePurchaseContract(id: number, data: Partial<typeof purchaseContracts.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(purchaseContracts).set(data).where(eq(purchaseContracts.id, id));
}

export async function deletePurchaseContract(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(purchaseContracts).where(eq(purchaseContracts.id, id));
}

export async function listPurchaseContractDocuments(purchaseContractId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseContractDocuments).where(eq(purchaseContractDocuments.purchaseContractId, purchaseContractId)).orderBy(desc(purchaseContractDocuments.createdAt));
}

export async function getPurchaseContractDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(purchaseContractDocuments).where(eq(purchaseContractDocuments.id, id)).limit(1))[0];
}

export async function createPurchaseContractDocument(data: typeof purchaseContractDocuments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(purchaseContractDocuments).values(data);
  return Number(result[0].insertId);
}

export async function deletePurchaseContractDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(purchaseContractDocuments).where(eq(purchaseContractDocuments.id, id));
}

export async function listAssetsByPurchaseContractId(purchaseContractId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assets).where(eq(assets.purchaseContractId, purchaseContractId)).orderBy(desc(assets.updatedAt));
}

export async function listInventorySuppliesByPurchaseContractId(purchaseContractId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventorySupplies).where(eq(inventorySupplies.purchaseContractId, purchaseContractId)).orderBy(desc(inventorySupplies.updatedAt));
}

export async function listPurchaseContractItems(purchaseContractId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseContractItems).where(eq(purchaseContractItems.purchaseContractId, purchaseContractId)).orderBy(desc(purchaseContractItems.updatedAt));
}

export async function createPurchaseContractItem(data: typeof purchaseContractItems.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(purchaseContractItems).values(data);
  return Number(result[0].insertId);
}

export async function deletePurchaseContractItemsByAssetId(assetId: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(purchaseContractItems).where(eq(purchaseContractItems.assetId, assetId));
}

export async function deletePurchaseContractItemsBySupplyId(supplyId: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(purchaseContractItems).where(eq(purchaseContractItems.supplyId, supplyId));
}

export async function listPurchaseInvoices() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseInvoices).orderBy(desc(purchaseInvoices.issuedAt), desc(purchaseInvoices.updatedAt));
}

export async function listPurchaseInvoicePage(input: { page: number; pageSize: number; query?: string; vendorId?: number | null; status?: string | null }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0, totalPages: 1, summary: { issued: 0, draft: 0 } };
  const page = Math.max(1, input.page);
  const pageSize = Math.min(50, Math.max(5, input.pageSize));
  const query = input.query?.trim() || "";
  const filters = [];
  if (input.vendorId) filters.push(eq(purchaseInvoices.vendorId, input.vendorId));
  if (input.status) filters.push(eq(purchaseInvoices.status, input.status as typeof purchaseInvoices.status.enumValues[number]));
  if (query) {
    const pattern = `%${query}%`;
    filters.push(sql`(${purchaseInvoices.invoiceKey} LIKE ${pattern} OR ${vendors.name} LIKE ${pattern})`);
  }
  const where = filters.length ? and(...filters) : undefined;
  const [rows, totals, statuses] = await Promise.all([
    db.select({ invoice: purchaseInvoices }).from(purchaseInvoices).leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id)).where(where).orderBy(desc(purchaseInvoices.issuedAt), desc(purchaseInvoices.updatedAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)` }).from(purchaseInvoices).leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id)).where(where),
    db.select({ status: purchaseInvoices.status, count: sql<number>`count(*)` }).from(purchaseInvoices).leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id)).where(where).groupBy(purchaseInvoices.status),
  ]);
  const total = Number(totals[0]?.total || 0);
  const summaryByStatus = new Map(statuses.map((item) => [item.status, Number(item.count || 0)]));
  return { items: rows.map((row) => row.invoice), total, totalPages: Math.max(1, Math.ceil(total / pageSize)), summary: { issued: summaryByStatus.get("issued") || 0, draft: summaryByStatus.get("draft") || 0 } };
}

export async function getPurchaseInvoiceById(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return undefined;
  return (await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id)).limit(1))[0];
}

export async function getPurchaseInvoiceByKey(invoiceKey: string, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return undefined;
  return (await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.invoiceKey, invoiceKey)).limit(1))[0];
}

export async function createPurchaseInvoice(data: typeof purchaseInvoices.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(purchaseInvoices).values(data);
  return Number(result[0].insertId);
}

export async function updatePurchaseInvoice(id: number, data: Partial<typeof purchaseInvoices.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(purchaseInvoices).set(data).where(eq(purchaseInvoices.id, id));
}

export async function listPurchaseInvoiceLines(purchaseInvoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseInvoiceLines).where(eq(purchaseInvoiceLines.purchaseInvoiceId, purchaseInvoiceId)).orderBy(purchaseInvoiceLines.lineNumber);
}

export async function getPurchaseInvoiceLineById(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return undefined;
  return (await db.select().from(purchaseInvoiceLines).where(eq(purchaseInvoiceLines.id, id)).limit(1))[0];
}

export async function createPurchaseInvoiceLine(data: typeof purchaseInvoiceLines.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(purchaseInvoiceLines).values(data);
  return Number(result[0].insertId);
}

export async function updatePurchaseInvoiceLine(id: number, data: Partial<typeof purchaseInvoiceLines.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(purchaseInvoiceLines).set(data).where(eq(purchaseInvoiceLines.id, id));
}

export async function deletePurchaseInvoiceLine(id: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(purchaseInvoiceLines).where(eq(purchaseInvoiceLines.id, id));
}

export async function listPurchaseInvoiceDocuments(purchaseInvoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseInvoiceDocuments).where(eq(purchaseInvoiceDocuments.purchaseInvoiceId, purchaseInvoiceId)).orderBy(desc(purchaseInvoiceDocuments.createdAt));
}

export async function getPurchaseInvoiceDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(purchaseInvoiceDocuments).where(eq(purchaseInvoiceDocuments.id, id)).limit(1))[0];
}

export async function createPurchaseInvoiceDocument(data: typeof purchaseInvoiceDocuments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(purchaseInvoiceDocuments).values(data);
  return Number(result[0].insertId);
}

export async function deletePurchaseInvoiceDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(purchaseInvoiceDocuments).where(eq(purchaseInvoiceDocuments.id, id));
}

export async function listAssetsByPurchaseInvoiceId(purchaseInvoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assets).where(eq(assets.purchaseInvoiceId, purchaseInvoiceId)).orderBy(desc(assets.updatedAt));
}

export async function updateAssetPurchaseInvoiceReference(assetId: number, values: { purchaseInvoiceId: number | null; purchaseInvoiceLineId: number | null; vendorId?: number | null; vendor?: string | null }, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(assets).set(values).where(eq(assets.id, assetId));
}

export async function listPurchaseInvoiceSupplyReceipts(purchaseInvoiceLineId: number, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) return [];
  return db.select().from(purchaseInvoiceSupplyReceipts).where(eq(purchaseInvoiceSupplyReceipts.purchaseInvoiceLineId, purchaseInvoiceLineId)).orderBy(desc(purchaseInvoiceSupplyReceipts.createdAt));
}

export async function createPurchaseInvoiceSupplyReceipt(data: typeof purchaseInvoiceSupplyReceipts.$inferInsert, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(purchaseInvoiceSupplyReceipts).values(data);
  return Number(result[0].insertId);
}

export async function updatePurchaseInvoiceSupplyReceipt(id: number, data: Partial<typeof purchaseInvoiceSupplyReceipts.$inferInsert>, executor?: any) {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(purchaseInvoiceSupplyReceipts).set(data).where(eq(purchaseInvoiceSupplyReceipts.id, id));
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

export async function listSupplyUnits() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplyUnits).orderBy(supplyUnits.name);
}

export async function listSupplyUnitUsageCounts() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ unit: inventorySupplies.unit, usageCount: sql<number>`count(*)` }).from(inventorySupplies).groupBy(inventorySupplies.unit);
}

export async function countInventorySuppliesByUnit(unit: string) {
  const db = await getDb();
  if (!db) return 0;
  const [{ usageCount }] = await db.select({ usageCount: sql<number>`count(*)` }).from(inventorySupplies).where(eq(inventorySupplies.unit, unit));
  return Number(usageCount || 0);
}

export async function getSupplyUnitById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(supplyUnits).where(eq(supplyUnits.id, id)).limit(1))[0];
}

export async function getSupplyUnitByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(supplyUnits).where(eq(supplyUnits.name, name)).limit(1))[0];
}

export async function createSupplyUnit(data: typeof supplyUnits.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(supplyUnits).values(data);
  return Number(result[0].insertId);
}

export async function updateSupplyUnit(id: number, data: Partial<typeof supplyUnits.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(supplyUnits).set(data).where(eq(supplyUnits.id, id));
}

export async function deleteSupplyUnit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(supplyUnits).where(eq(supplyUnits.id, id));
}

export async function listBranches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).orderBy(branches.name);
}

export async function getBranchById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(branches).where(eq(branches.id, id)).limit(1))[0];
}

export async function getBranchByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(branches).where(eq(branches.code, code)).limit(1))[0];
}

export async function getBranchByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(branches).where(eq(branches.name, name)).limit(1))[0];
}

export async function createBranch(data: typeof branches.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(branches).values(data);
  return Number(result[0].insertId);
}

export async function updateBranch(id: number, data: Partial<typeof branches.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(branches).set(data).where(eq(branches.id, id));
}

export async function deleteBranch(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(branches).where(eq(branches.id, id));
}

export async function getBranchUsageCounts(id: number) {
  const db = await getDb();
  if (!db) return { userCount: 0, assetCount: 0 };
  const [userRows, assetRows] = await Promise.all([
    db.select({ usageCount: sql<number>`count(*)` }).from(users).where(eq(users.branchId, id)),
    db.select({ usageCount: sql<number>`count(*)` }).from(assets).where(eq(assets.branchId, id)),
  ]);
  return {
    userCount: Number(userRows[0]?.usageCount || 0),
    assetCount: Number(assetRows[0]?.usageCount || 0),
  };
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

export async function listRequestableInventorySupplies() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: inventorySupplies.id,
      code: inventorySupplies.code,
      name: inventorySupplies.name,
      unit: inventorySupplies.unit,
      stockQuantity: inventorySupplies.stockQuantity,
      location: inventorySupplies.location,
    })
    .from(inventorySupplies)
    .where(
      and(
        eq(inventorySupplies.isActive, true),
        gt(inventorySupplies.stockQuantity, "0")
      )
    )
    .orderBy(asc(inventorySupplies.name), asc(inventorySupplies.code));
}

export async function getNextSupplyRequestSequence(
  requestYear: number,
  executor?: any
) {
  const db = executor ?? (await getDb());
  if (!db) throw new Error("Database unavailable");
  const rows: Array<{ requestCode: string }> = await db
    .select({ requestCode: supplyRequests.requestCode })
    .from(supplyRequests)
    .where(like(supplyRequests.requestCode, `YCPK-${requestYear}-%`));
  const maxSequence = rows.reduce((maximum: number, row) => {
    const match = row.requestCode.match(
      new RegExp(`^YCPK-${requestYear}-(\\d+)$`)
    );
    return Math.max(maximum, match ? Number(match[1]) : 0);
  }, 0);
  return maxSequence + 1;
}

export async function createSupplyRequest(
  data: typeof supplyRequests.$inferInsert,
  executor?: any
) {
  const db = executor ?? (await getDb());
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(supplyRequests).values(data);
  return Number(result[0].insertId);
}

export async function createSupplyRequestItem(
  data: typeof supplyRequestItems.$inferInsert,
  executor?: any
) {
  const db = executor ?? (await getDb());
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(supplyRequestItems).values(data);
  return Number(result[0].insertId);
}

export async function getSupplyRequestById(id: number, executor?: any) {
  const db = executor ?? (await getDb());
  if (!db) return undefined;
  return (
    await db
      .select()
      .from(supplyRequests)
      .where(eq(supplyRequests.id, id))
      .limit(1)
  )[0];
}

export async function listSupplyRequestItems(
  requestId: number,
  executor?: any
) {
  const db = executor ?? (await getDb());
  if (!db) return [];
  return db
    .select()
    .from(supplyRequestItems)
    .where(eq(supplyRequestItems.requestId, requestId))
    .orderBy(asc(supplyRequestItems.id));
}

export async function listSupplyRequests(requesterUserId?: number) {
  const db = await getDb();
  if (!db) return [];
  const requests =
    requesterUserId === undefined
      ? await db
          .select()
          .from(supplyRequests)
          .orderBy(desc(supplyRequests.createdAt))
      : await db
          .select()
          .from(supplyRequests)
          .where(eq(supplyRequests.requesterUserId, requesterUserId))
          .orderBy(desc(supplyRequests.createdAt));
  if (!requests.length) return [];
  const requestItems = await db
    .select()
    .from(supplyRequestItems)
    .where(
      inArray(
        supplyRequestItems.requestId,
        requests.map(request => request.id)
      )
    )
    .orderBy(asc(supplyRequestItems.id));
  const itemsByRequest = new Map<number, typeof requestItems>();
  for (const item of requestItems) {
    const items = itemsByRequest.get(item.requestId) ?? [];
    items.push(item);
    itemsByRequest.set(item.requestId, items);
  }
  return requests.map(request => ({
    ...request,
    items: itemsByRequest.get(request.id) ?? [],
  }));
}

export async function transitionSupplyRequestStatus(
  id: number,
  expectedStatus:
    | "pending"
    | "approved"
    | "rejected"
    | "fulfilled"
    | "cancelled",
  data: Partial<typeof supplyRequests.$inferInsert>,
  executor?: any
) {
  const db = executor ?? (await getDb());
  if (!db) throw new Error("Database unavailable");
  const result = await db
    .update(supplyRequests)
    .set(data)
    .where(
      and(
        eq(supplyRequests.id, id),
        eq(supplyRequests.status, expectedStatus)
      )
    );
  return Number(result[0].affectedRows) > 0;
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
  const directMovementRows = await db.select({
    issueSlipId: inventoryMovements.id,
    recipientUserId: inventoryMovements.recipientUserId,
    referenceCode: sql<string>`concat('XK-', ${inventoryMovements.id})`,
    recipientName: sql<string>`coalesce(${inventoryMovements.recipientName}, '')`,
    issuedByName: inventoryMovements.createdByName,
    status: sql<string>`'active'`,
    issuedAt: inventoryMovements.createdAt,
    returnedAt: sql<Date | null>`null`,
    note: inventoryMovements.note,
    supplyCode: inventorySupplies.code,
    supplyName: inventorySupplies.name,
    unit: inventorySupplies.unit,
    issuedQuantity: sql<string>`abs(${inventoryMovements.quantity})`,
    returnedQuantity: sql<string>`0`,
  }).from(inventoryMovements).innerJoin(inventorySupplies, eq(inventoryMovements.supplyId, inventorySupplies.id)).where(and(eq(inventoryMovements.movementType, "issue"), eq(inventoryMovements.recipientUserId, recipientUserId), isNull(inventoryMovements.issueSlipId), isNull(inventoryMovements.handoverId))).orderBy(desc(inventoryMovements.createdAt));
  return [
    ...issueSlipRows.map((row) => ({ ...row, source: "issue-slip" as const })),
    ...handoverRows.map((row) => ({ ...row, source: "handover" as const })),
    ...directMovementRows.map((row) => ({ ...row, source: "issue-slip" as const })),
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
    updatedAt: handovers.updatedAt,
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
    const recipient = existing.recipientUserId
      ? (await tx.select({ branchId: users.branchId }).from(users).where(eq(users.id, existing.recipientUserId)).limit(1))[0]
      : undefined;

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
        ...(recipient?.branchId ? { branchId: recipient.branchId } : {}),
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

export async function runSoftwareLicenseTransaction<T>(callback: (transaction: any) => Promise<T>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (transaction) => callback(transaction));
}

export async function runRetirementCertificateTransaction<T>(callback: (transaction: any) => Promise<T>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (transaction) => callback(transaction));
}

export async function runPurchaseContractTransaction<T>(callback: (transaction: any) => Promise<T>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (transaction) => callback(transaction));
}

export async function runPurchaseInvoiceTransaction<T>(callback: (transaction: any) => Promise<T>) {
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
