import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveEntraRole } from "./entraAuth";

describe("Microsoft Entra authentication", () => {
  const auth = readFileSync(resolve(import.meta.dirname, "entraAuth.ts"), "utf8");
  const db = readFileSync(resolve(import.meta.dirname, "db.ts"), "utf8");
  const schema = readFileSync(resolve(import.meta.dirname, "../drizzle/schema.ts"), "utf8");
  const migration = readFileSync(resolve(import.meta.dirname, "../drizzle/0067_entra_identity.sql"), "utf8");
  const graphMigration = readFileSync(resolve(import.meta.dirname, "../drizzle/0068_entra_graph_settings.sql"), "utf8");
  const server = readFileSync(resolve(import.meta.dirname, "_core/index.ts"), "utf8");
  const routers = readFileSync(resolve(import.meta.dirname, "routers.ts"), "utf8");
  const login = readFileSync(resolve(import.meta.dirname, "../client/src/pages/LoginGateway.tsx"), "utf8");
  const compose = readFileSync(resolve(import.meta.dirname, "../docker-compose.yml"), "utf8");
  const guide = readFileSync(resolve(import.meta.dirname, "../docs/entra-id-authentication.md"), "utf8");
  const vietnameseGuide = readFileSync(resolve(import.meta.dirname, "../docs/huong-dan-entra-id-microsoft-graph.md"), "utf8");
  const panel = readFileSync(resolve(import.meta.dirname, "../client/src/components/EntraSettingsPanel.tsx"), "utf8");
  const quickNav = readFileSync(resolve(import.meta.dirname, "../client/src/components/SettingsQuickNav.tsx"), "utf8");
  const employeeProfile = readFileSync(resolve(import.meta.dirname, "../client/src/components/EmployeeDirectoryProfileSection.tsx"), "utf8");

  it("maps configured Entra App Roles without granting an implicit role", () => {
    expect(resolveEntraRole(["AssetMaster.User"], "AssetMaster.Admin", "AssetMaster.User")).toBe("user");
    expect(resolveEntraRole(["AssetMaster.Admin"], "AssetMaster.Admin", "AssetMaster.User")).toBe("admin");
    expect(resolveEntraRole([], "AssetMaster.Admin", "AssetMaster.User")).toBeNull();
  });

  it("uses authorization code flow with PKCE and validates the callback token", () => {
    expect(auth).toContain('app.get("/api/auth/entra/start"');
    expect(auth).toContain('app.get("/api/auth/entra/callback"');
    expect(auth).toContain('authorizationUrl.searchParams.set("code_challenge_method", "S256")');
    expect(auth).toContain("crypto.timingSafeEqual");
    expect(auth).toContain("createRemoteJWKSet");
    expect(auth).toContain("jwtVerify(tokenPayload.id_token");
    expect(auth).toContain("issuer,");
    expect(auth).toContain("audience: config.clientId");
    expect(auth).toContain('algorithms: ["RS256"]');
    expect(auth).toContain("Entra nonce mismatch");
    expect(auth).toContain("Entra tenant mismatch");
    expect(server).toContain("registerEntraAuthRoutes(app)");
  });

  it("links existing users safely and only provisions new users with an App Role", () => {
    expect(db).toContain("export async function upsertEntraUser");
    expect(db).toContain("eq(users.entraObjectId, input.objectId)");
    expect(db).toContain("await getUserByEmail(input.email)");
    expect(db).toContain("if (current && !current.isActive)");
    expect(db).toContain("if (!current && !input.assertedRole)");
    expect(db).toContain("Tài khoản chưa được gán App Role AssetMaster");
    expect(schema).toContain('"entra",');
    expect(schema).toContain('entraObjectId: varchar("entraObjectId"');
    expect(migration).toContain("enum('manus','bootstrap_local','ldap','entra')");
    expect(migration).toContain("users_entraObjectId_unique");
  });

  it("keeps the feature disabled by default and exposes it only when configured", () => {
    expect(compose).toContain('ENTRA_AUTH_ENABLED: "${ENTRA_AUTH_ENABLED:-false}"');
    expect(compose).toContain("ENTRA_TENANT_ID");
    expect(compose).toContain("ENTRA_CLIENT_ID");
    expect(routers).toContain("entraEnabled: await entraAuthEnabled()");
    expect(login).toContain('href="/api/auth/entra/start"');
    expect(login).toContain("Đăng nhập bằng Microsoft");
    expect(login).toContain("Đăng nhập dự phòng");
  });

  it("stores Entra settings and keeps the configuration panel hidden until opened", () => {
    expect(schema).toContain('export const entraSettings = mysqlTable(');
    expect(schema).toContain('export const entraSettingAudits = mysqlTable(');
    expect(graphMigration).toContain('CREATE TABLE `entraSettings`');
    expect(graphMigration).toContain('ADD `entraGroupNames` json');
    expect(routers).toContain("entra: router({");
    expect(routers).toContain("testEntraConnection()");
    expect(panel).toContain('id="settings-entra"');
    expect(panel).toContain("data-entra-settings-anchor");
    expect(panel).toContain("setIsVisible(false)");
    expect(quickNav).toContain('event: "assetmaster:open-entra-settings"');
  });

  it("synchronizes Graph profile fields and groups without changing AssetMaster roles", () => {
    expect(auth).toContain('scope: "https://graph.microsoft.com/.default"');
    expect(auth).toContain("$select=id,displayName,mail,userPrincipalName,department,jobTitle");
    expect(auth).toContain("transitiveMemberOf/microsoft.graph.group");
    expect(auth).toContain("mapWithConcurrency(matched, 5");
    expect(db).toContain("export async function applyEntraGraphProfiles");
    expect(db).toContain("directoryDepartment:");
    expect(db).toContain("entraGroupNames: profile.groupNames");
    expect(db).toContain("lastEntraSyncAt: new Date()");
    expect(employeeProfile).toContain("Nhóm Microsoft Entra");
    const graphApplyBlock = db.slice(
      db.indexOf("export async function applyEntraGraphProfiles"),
      db.indexOf("export async function getDepartmentIdByDirectoryName")
    );
    expect(graphApplyBlock).not.toContain("role:");
    expect(graphApplyBlock).not.toContain("isActive:");
  });

  it("documents App Registration, roles, Graph permissions, secret handling and rollback", () => {
    expect(guide).toContain("AssetMaster.User");
    expect(guide).toContain("AssetMaster.Admin");
    expect(guide).toContain("ENTRA_CLIENT_SECRET_FILE");
    expect(guide).toContain("0067_entra_identity.sql");
    expect(guide).toContain("0068_entra_graph_settings.sql");
    expect(guide).toContain("User.Read.All");
    expect(guide).toContain("Group.Read.All");
    expect(guide).toContain("ENTRA_AUTH_ENABLED=false");
    expect(guide).toContain("huong-dan-entra-id-microsoft-graph.md");
    expect(vietnameseGuide).toContain("Kích hoạt Entra ID");
    expect(vietnameseGuide).toContain("Đồng bộ Microsoft Graph");
    expect(vietnameseGuide).toContain("User.Read.All");
    expect(vietnameseGuide).toContain("Group.Read.All");
    expect(vietnameseGuide).toContain("AADSTS50011");
    expect(vietnameseGuide).toContain("Không commit file `.env`");
  });
});
