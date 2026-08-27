import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readProjectFile = (relativePath: string) => readFile(path.join(root, relativePath), "utf8");

describe("self-hosted backup monitoring", () => {
  it("chỉ ghi metadata backup/restore drill qua API Admin, không thực thi lệnh host", async () => {
    const [schema, router, panel, home] = await Promise.all([
      readProjectFile("drizzle/schema.ts"),
      readProjectFile("server/routers.ts"),
      readProjectFile("client/src/components/SelfHostedBackupRecoveryPanel.tsx"),
      readProjectFile("client/src/pages/Home.tsx"),
    ]);
    expect(schema).toMatch(/mysqlTable\(\s*"backupRecords"/);
    expect(schema).toMatch(/mysqlTable\(\s*"backupRestoreDrills"/);
    expect(router).toContain("backupMonitoring: router");
    expect(router).toContain("recordBackup: adminProcedure");
    expect(router).toContain("recordRestoreDrill: adminProcedure");
    expect(panel).toContain("Sao lưu & phục hồi");
    expect(panel).toContain("Ghi nhận restore drill");
    expect(panel).toContain("không chạy lệnh host hoặc tự phục hồi dữ liệu");
    expect(home).toContain("<SelfHostedBackupRecoveryPanel />");
  });
});
