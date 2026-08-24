import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("audit reminder navigation", () => {
  it("shows overdue audit reminders in the Audit page with a direct open action", () => {
    const operations = readProjectFile("client/src/pages/OperationsModules.tsx");

    expect(operations).toContain("auditRemindersQuery");
    expect(operations).toContain("overdueAuditReminders");
    expect(operations).toContain("data-audit-overdue-reminder");
    expect(operations).toContain("Mở đợt");
    expect(operations).toContain("openAuditSession(reminder.auditSessionId)");
    expect(operations).not.toContain("<OperationalReminderPanel />");
  });

  it("surfaces overdue audits in the dashboard and opens the exact session", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const router = readProjectFile("server/routers.ts");

    expect(router).toContain("auditSessionId: audit.id");
    expect(home).toContain("overdueAuditReminders");
    expect(home).toContain("data-overdue-audit-alert");
    expect(home).toContain("openAuditSessionFromReminder");
    expect(home).toContain('url.searchParams.set("auditSession", String(sessionId))');
  });
});
