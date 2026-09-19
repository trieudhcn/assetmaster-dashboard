import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildLifecycleEmail } from "./emailNotifications";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path: string) => readFileSync(`${root}${path}`, "utf8");

describe("Microsoft 365 email notifications", () => {
  it("renders Vietnamese text and escapes untrusted HTML values", () => {
    const message = buildLifecycleEmail({
      title: "Bàn giao tài sản",
      greetingName: "Nguyễn <Admin>",
      intro: "Phiếu đã được xác nhận.",
      details: [
        { label: "Mã tài sản", value: "TS-001" },
        { label: "Tên tài sản", value: '<script>alert("x")</script>' },
      ],
      note: "Không <b>thực thi</b> HTML",
      applicationUrl: "https://assetmaster.example.com",
    });

    expect(message.subject).toBe("[AssetMaster] Bàn giao tài sản");
    expect(message.textBody).toContain("Nguyễn <Admin>");
    expect(message.htmlBody).toContain("Nguyễn &lt;Admin&gt;");
    expect(message.htmlBody).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
    expect(message.htmlBody).not.toContain("<script>");
    expect(message.htmlBody).toContain("https://assetmaster.example.com");
  });

  it("does not render an unsafe external HTTP application link", () => {
    const message = buildLifecycleEmail({
      title: "Kiểm tra",
      intro: "Nội dung kiểm tra.",
      details: [],
      applicationUrl: "http://assetmaster.example.com",
    });

    expect(message.textBody).not.toContain("http://assetmaster.example.com");
    expect(message.htmlBody).not.toContain("http://assetmaster.example.com");
  });

  it("keeps the outbox durable, idempotent and retryable in the schema", () => {
    const schema = read("drizzle/schema.ts");
    const migration = read("drizzle/0070_handy_senator_kelly.sql");

    expect(schema).toContain('eventKey: varchar("eventKey"');
    expect(schema).toContain('status: mysqlEnum("status", [');
    expect(schema).toContain('attemptCount: int("attemptCount")');
    expect(migration).toContain("CREATE TABLE `emailOutbox`");
    expect(migration).toContain("CONSTRAINT `emailOutbox_eventKey_unique`");
    expect(migration).toContain("email_outbox_dispatch_idx");
    expect(migration).not.toContain("CREATE TABLE `entraSettings`");
    expect(migration).not.toContain("ALTER TABLE `users`");
  });

  it("wires lifecycle events and keeps credentials outside the database", () => {
    const router = read("server/routers.ts");
    const mailer = read("server/emailNotifications.ts");
    const panel = read("client/src/components/EmailNotificationSettingsPanel.tsx");

    expect(router).toContain('"handover_activated"');
    expect(router).toContain('templateKey: "supply_request_fulfilled"');
    expect(router).toContain('templateKey: "supply_return_approved"');
    expect(mailer).toContain("/v1.0/users/${encodeURIComponent");
    expect(mailer).toContain("saveToSentItems: true");
    expect(mailer).toContain("clientSecretRef");
    expect(panel).toContain("AssetMaster không lưu giá trị secret vào database");
  });
});
