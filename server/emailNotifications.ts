import { lstat, readFile } from "node:fs/promises";
import {
  claimEmailOutboxItem,
  completeEmailOutboxItem,
  createEmailOutboxItem,
  failEmailOutboxItem,
  getEmailNotificationSettings,
  getUserById,
  listDueEmailOutbox,
  recoverStaleEmailOutboxItems,
} from "./db";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_TIMEOUT_MS = 15_000;
const WORKER_INTERVAL_MS = 30_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECRET_REF_PATTERN =
  /^\/(?:run\/secrets|etc\/assetmaster\/secrets)\/[A-Za-z0-9._-]{1,128}$/;

export type EmailNotificationCategory =
  | "handover"
  | "supply_request"
  | "supply_return"
  | "system_test";

export type EmailMessage = {
  subject: string;
  textBody: string;
  htmlBody: string;
};

type EmailSettings = NonNullable<
  Awaited<ReturnType<typeof getEmailNotificationSettings>>
>;
type EmailOutboxItem = Awaited<ReturnType<typeof listDueEmailOutbox>>[number];

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizedApplicationUrl(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const localHttp =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !localHttp) return null;
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function buildLifecycleEmail(input: {
  title: string;
  greetingName?: string | null;
  intro: string;
  details: Array<{ label: string; value: string | number | null | undefined }>;
  note?: string | null;
  applicationUrl?: string | null;
  actionLabel?: string;
}): EmailMessage {
  const details = input.details.filter(
    detail =>
      detail.value !== null && detail.value !== undefined && detail.value !== ""
  );
  const greeting = input.greetingName?.trim()
    ? `Xin chào ${input.greetingName.trim()},`
    : "Xin chào,";
  const textLines = [
    greeting,
    "",
    input.intro,
    "",
    ...details.map(detail => `${detail.label}: ${detail.value}`),
    ...(input.note?.trim() ? ["", `Ghi chú: ${input.note.trim()}`] : []),
  ];
  const applicationUrl = normalizedApplicationUrl(input.applicationUrl);
  if (applicationUrl)
    textLines.push(
      "",
      `${input.actionLabel || "Mở AssetMaster"}: ${applicationUrl}`
    );
  textLines.push(
    "",
    "Đây là email tự động từ AssetMaster. Vui lòng không trả lời email này."
  );

  const detailRows = details
    .map(
      detail =>
        `<tr><td style="padding:8px 12px;color:#60758A;border-bottom:1px solid #E7EEF3;width:38%">${escapeHtml(detail.label)}</td><td style="padding:8px 12px;color:#193B57;font-weight:700;border-bottom:1px solid #E7EEF3">${escapeHtml(detail.value)}</td></tr>`
    )
    .join("");
  const action = applicationUrl
    ? `<p style="margin:24px 0 4px"><a href="${escapeHtml(applicationUrl)}" style="display:inline-block;background:#0F8C8C;color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:8px">${escapeHtml(input.actionLabel || "Mở AssetMaster")}</a></p>`
    : "";
  const note = input.note?.trim()
    ? `<div style="margin-top:16px;padding:12px 14px;background:#FFF8E7;border:1px solid #F2D38B;border-radius:8px;color:#72510A"><strong>Ghi chú:</strong> ${escapeHtml(input.note.trim())}</div>`
    : "";

  return {
    subject: `[AssetMaster] ${input.title}`,
    textBody: textLines.join("\n"),
    htmlBody: `<!doctype html><html lang="vi"><body style="margin:0;background:#F4F7F9;font-family:Arial,sans-serif;color:#193B57"><div style="max-width:640px;margin:0 auto;padding:24px"><div style="background:#fff;border:1px solid #DFE9F0;border-radius:14px;overflow:hidden"><div style="background:#0F8C8C;color:#fff;padding:18px 22px"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">AssetMaster</div><h1 style="font-size:20px;margin:5px 0 0">${escapeHtml(input.title)}</h1></div><div style="padding:22px"><p style="margin-top:0">${escapeHtml(greeting)}</p><p style="line-height:1.6">${escapeHtml(input.intro)}</p><table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #E7EEF3;border-radius:8px">${detailRows}</table>${note}${action}<p style="margin:24px 0 0;color:#8AA0B6;font-size:12px;line-height:1.5">Đây là email tự động từ AssetMaster. Vui lòng không trả lời email này.</p></div></div></div></body></html>`,
  };
}

function categoryEnabled(
  settings: EmailSettings,
  category: EmailNotificationCategory
) {
  if (category === "handover") return settings.handoverEnabled;
  if (category === "supply_request") return settings.supplyRequestEnabled;
  if (category === "supply_return") return settings.supplyReturnEnabled;
  return true;
}

export async function queueLifecycleEmail(
  input: {
    eventKey: string;
    category: Exclude<EmailNotificationCategory, "system_test">;
    templateKey: string;
    entityType: string;
    entityId: number;
    recipientUserId: number | null | undefined;
    recipientName?: string | null;
    message: EmailMessage;
    payload?: Record<string, unknown>;
  },
  executor?: any
) {
  const settings = await getEmailNotificationSettings(executor);
  if (!settings || settings.status !== "active")
    return { queued: false as const, reason: "disabled" as const };
  if (!categoryEnabled(settings, input.category))
    return { queued: false as const, reason: "category_disabled" as const };
  if (!input.recipientUserId)
    return { queued: false as const, reason: "missing_user" as const };
  const recipient = await getUserById(input.recipientUserId, executor);
  const recipientEmail = recipient?.email?.trim().toLocaleLowerCase("en-US");
  if (!recipientEmail)
    return { queued: false as const, reason: "missing_email" as const };
  const outbox = await createEmailOutboxItem(
    {
      eventKey: input.eventKey,
      category: input.category,
      templateKey: input.templateKey,
      entityType: input.entityType,
      entityId: input.entityId,
      recipientEmail,
      recipientName: input.recipientName || recipient?.name || null,
      subject: input.message.subject,
      textBody: input.message.textBody,
      htmlBody: input.message.htmlBody,
      payload: input.payload ?? null,
      status: "pending",
      attemptCount: 0,
      maxAttempts: settings.maxAttempts,
      nextAttemptAt: new Date(),
    },
    executor
  );
  return { queued: true as const, outboxId: outbox.id };
}

async function readMailClientSecret(settings: EmailSettings) {
  const environmentSecret = process.env.M365_MAIL_CLIENT_SECRET?.trim();
  if (environmentSecret && process.env.NODE_ENV !== "production")
    return environmentSecret;
  const secretRef =
    settings.clientSecretRef?.trim() ||
    process.env.M365_MAIL_CLIENT_SECRET_FILE?.trim() ||
    null;
  if (!secretRef || !SECRET_REF_PATTERN.test(secretRef))
    throw new Error(
      "Tệp secret email phải nằm trong /run/secrets hoặc /etc/assetmaster/secrets."
    );
  const stat = await lstat(secretRef);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error("Tệp secret email phải là tệp thường, không phải symlink.");
  if ((stat.mode & 0o022) !== 0)
    throw new Error("Tệp secret email không được cho phép group/other ghi.");
  if (stat.size < 1 || stat.size > 16_384)
    throw new Error("Tệp secret email có kích thước không hợp lệ.");
  const value = (await readFile(secretRef, "utf8")).trim();
  if (!value) throw new Error("Tệp secret email đang trống.");
  return value;
}

function assertGraphSettings(settings: EmailSettings) {
  if (!UUID_PATTERN.test(settings.tenantId || ""))
    throw new Error("Tenant ID email Microsoft 365 không hợp lệ.");
  if (!UUID_PATTERN.test(settings.clientId || ""))
    throw new Error("Client ID email Microsoft 365 không hợp lệ.");
  if (!settings.senderEmail?.includes("@"))
    throw new Error("Chưa cấu hình mailbox người gửi Microsoft 365.");
}

async function requestGraphToken(settings: EmailSettings) {
  assertGraphSettings(settings);
  const response = await fetch(
    `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: settings.clientId!,
        client_secret: await readMailClientSecret(settings),
        grant_type: "client_credentials",
        scope: GRAPH_SCOPE,
      }),
      signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
    }
  );
  const payload = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.access_token)
    throw new Error(
      payload.error_description ||
        payload.error ||
        "Không lấy được Graph access token."
    );
  return payload.access_token;
}

async function sendViaMicrosoftGraph(
  settings: EmailSettings,
  message: Pick<
    EmailOutboxItem,
    "recipientEmail" | "recipientName" | "subject" | "htmlBody"
  >
) {
  const accessToken = await requestGraphToken(settings);
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(settings.senderEmail!)}/sendMail`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: message.subject,
        body: { contentType: "HTML", content: message.htmlBody },
        toRecipients: [
          {
            emailAddress: {
              address: message.recipientEmail,
              name: message.recipientName || undefined,
            },
          },
        ],
        from: {
          emailAddress: {
            address: settings.senderEmail,
            name: settings.senderName,
          },
        },
      },
      saveToSentItems: true,
    }),
    signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      detail = payload.error?.message || payload.error?.code || "";
    } catch {
      detail = "";
    }
    throw new Error(
      detail || `Microsoft Graph trả về HTTP ${response.status}.`
    );
  }
  return (
    response.headers.get("request-id") ||
    response.headers.get("client-request-id")
  );
}

async function deliverEmail(
  settings: EmailSettings,
  message: Pick<
    EmailOutboxItem,
    "id" | "recipientEmail" | "recipientName" | "subject" | "htmlBody"
  >
) {
  if (settings.provider === "mock") return `mock-${message.id}-${Date.now()}`;
  return sendViaMicrosoftGraph(settings, message);
}

export async function testEmailNotificationConfiguration(
  recipientEmail: string
) {
  const settings = await getEmailNotificationSettings();
  if (!settings) throw new Error("Hãy lưu cấu hình thông báo email trước.");
  const message = buildLifecycleEmail({
    title: "Kiểm tra kết nối email Microsoft 365",
    greetingName: "Quản trị viên",
    intro: "AssetMaster đã kiểm tra thành công cấu hình gửi thông báo email.",
    details: [
      {
        label: "Chế độ",
        value: settings.provider === "mock" ? "Mô phỏng" : "Microsoft Graph",
      },
      {
        label: "Mailbox gửi",
        value: settings.senderEmail || "Chưa áp dụng trong chế độ mô phỏng",
      },
      {
        label: "Thời điểm",
        value: new Intl.DateTimeFormat("vi-VN", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date()),
      },
    ],
    applicationUrl: settings.applicationUrl,
  });
  const requestId = await deliverEmail(settings, {
    id: 0,
    recipientEmail,
    recipientName: "Quản trị viên",
    ...message,
  });
  return {
    requestId,
    message:
      settings.provider === "mock"
        ? "Chế độ mô phỏng hoạt động; chưa gửi email ra Microsoft 365."
        : `Microsoft Graph đã chấp nhận email kiểm tra gửi tới ${recipientEmail}.`,
  };
}

let dispatching = false;

export async function dispatchEmailOutboxBatch(limit = 10) {
  if (dispatching) return { processed: 0, sent: 0, failed: 0, skipped: true };
  dispatching = true;
  let processed = 0;
  let sent = 0;
  let failed = 0;
  try {
    const settings = await getEmailNotificationSettings();
    if (!settings || settings.status !== "active")
      return { processed, sent, failed, skipped: true };
    const items = await listDueEmailOutbox(limit);
    for (const item of items) {
      if (!(await claimEmailOutboxItem(item.id))) continue;
      processed += 1;
      try {
        const requestId = await deliverEmail(settings, item);
        await completeEmailOutboxItem(item.id, requestId);
        sent += 1;
      } catch (error) {
        await failEmailOutboxItem(
          item.id,
          item.attemptCount,
          item.maxAttempts,
          error instanceof Error ? error.message : "Không thể gửi email."
        );
        failed += 1;
      }
    }
    return { processed, sent, failed, skipped: false };
  } finally {
    dispatching = false;
  }
}

export function startEmailOutboxWorker() {
  let stopped = false;
  const run = async () => {
    if (stopped) return;
    try {
      await recoverStaleEmailOutboxItems();
      await dispatchEmailOutboxBatch();
    } catch (error) {
      console.error("[AssetMaster][Email] outbox dispatch failed", {
        message: error instanceof Error ? error.message : "Unknown email error",
      });
    }
  };
  const initial = setTimeout(() => void run(), 1_000);
  initial.unref();
  const interval = setInterval(() => void run(), WORKER_INTERVAL_MS);
  interval.unref();
  return () => {
    stopped = true;
    clearTimeout(initial);
    clearInterval(interval);
  };
}
