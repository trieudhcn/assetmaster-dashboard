import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildLifecycleEmail,
  getEmailTemplateCatalog,
  previewEmailTemplate,
  renderConfiguredLifecycleEmail,
} from "./emailNotifications";

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

  it("renders template variables and company branding with escaped content", () => {
    const message = previewEmailTemplate({
      templateKey: "handover_activated",
      brandName: "Công ty <Nội bộ>",
      brandColor: "#123456",
      logoUrl: "https://assetmaster.example.com/logo.png",
      footerText: "Liên hệ IT <không trả lời>",
      applicationUrl: "https://assetmaster.example.com",
      templateOverrides: {
        handover_activated: {
          subject: "Tài sản {{assetCode}} dành cho {{recipientName}}",
          title: "Xác nhận <b>{{assetCode}}</b>",
          intro: "Xin kiểm tra tài sản {{assetName}}.",
          actionLabel: "Mở phiếu {{referenceCode}}",
        },
      },
    });

    expect(message.subject).toBe("Tài sản LT-00128 dành cho Nguyễn Văn An");
    expect(message.htmlBody).toContain("background:#123456");
    expect(message.htmlBody).toContain("Công ty &lt;Nội bộ&gt;");
    expect(message.htmlBody).toContain("Xác nhận &lt;b&gt;LT-00128&lt;/b&gt;");
    expect(message.htmlBody).toContain("Mở phiếu BG-2026-0088");
    expect(message.htmlBody).toContain("Liên hệ IT &lt;không trả lời&gt;");
    expect(message.htmlBody).not.toContain("<b>LT-00128</b>");
  });

  it("publishes editable definitions for every supported template", () => {
    const templates = getEmailTemplateCatalog();
    expect(templates.map(template => template.key)).toEqual(
      expect.arrayContaining([
        "handover_activated",
        "handover_return_decision",
        "supply_request_fulfilled",
        "supply_return_approved",
        "system_test",
      ])
    );
    expect(templates.find(template => template.key === "handover_activated")?.variables)
      .toEqual(expect.arrayContaining([expect.objectContaining({ key: "assetCode" })]));
  });

  it("applies saved template overrides before an email enters the outbox", () => {
    const base = buildLifecycleEmail({
      title: "Bàn giao tài sản LT-0099",
      greetingName: "Trần Minh",
      intro: "Nội dung mặc định.",
      details: [{ label: "Mã tài sản", value: "LT-0099" }],
    });
    const rendered = renderConfiguredLifecycleEmail(
      {
        brandName: "ACME",
        brandColor: "#0055AA",
        logoUrl: null,
        footerText: "Thông báo nội bộ ACME.",
        templateOverrides: {
          handover_activated: {
            subject: "Đã cấp {{assetCode}} cho {{recipientName}}",
            intro: "Vui lòng kiểm tra {{assetCode}}.",
          },
        },
      } as any,
      "handover_activated",
      base
    );

    expect(rendered.subject).toBe("Đã cấp LT-0099 cho Trần Minh");
    expect(rendered.textBody).toContain("Vui lòng kiểm tra LT-0099.");
    expect(rendered.htmlBody).toContain("background:#0055AA");
    expect(rendered.htmlBody).toContain("Thông báo nội bộ ACME.");
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
    const templateMigration = read("drizzle/0071_dashing_jasper_sitwell.sql");
    expect(templateMigration).toContain("ADD `templateOverrides` json");
    expect(templateMigration).toContain("ADD `brandColor`");
    expect(templateMigration).not.toContain("CREATE TABLE");
    expect(templateMigration).not.toContain("ALTER TABLE `users`");
  });

  it("wires lifecycle events and keeps credentials outside the database", () => {
    const router = read("server/routers.ts");
    const mailer = read("server/emailNotifications.ts");
    const panel = read("client/src/components/EmailNotificationSettingsPanel.tsx");
    const editor = read("client/src/components/EmailTemplateEditor.tsx");
    const guide = read("docs/microsoft-365-email-notifications.md");

    expect(router).toContain('"handover_activated"');
    expect(router).toContain('templateKey: "supply_request_fulfilled"');
    expect(router).toContain('templateKey: "supply_return_approved"');
    expect(mailer).toContain("/v1.0/users/${encodeURIComponent");
    expect(mailer).toContain("saveToSentItems: true");
    expect(mailer).toContain("clientSecretRef");
    expect(panel).toContain("AssetMaster không lưu giá trị secret vào database");
    expect(panel).toContain("<EmailTemplateEditor");
    expect(editor).toContain("Dùng thương hiệu công ty");
    expect(editor).toContain("Bản xem trước thực tế");
    expect(guide).toContain("git switch codex/employee-supply-requests");
    expect(guide).toContain("Template và thương hiệu email");
  });
});
