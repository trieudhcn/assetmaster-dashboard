import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  activityLogs,
  assets,
  auditItems,
  auditSessions,
  companies,
  handovers,
  maintenanceTickets,
  type InsertUser,
  users,
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

export async function listAssets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assets).where(eq(assets.isArchived, false)).orderBy(desc(assets.updatedAt));
}

export async function createAsset(data: typeof assets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(assets).values(data);
  return Number(result[0].insertId);
}

export async function updateAsset(id: number, data: Partial<typeof assets.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(assets).set(data).where(eq(assets.id, id));
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

export async function listMaintenanceTickets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(maintenanceTickets).orderBy(desc(maintenanceTickets.openedAt));
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
