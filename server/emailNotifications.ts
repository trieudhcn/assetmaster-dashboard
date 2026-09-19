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

export const EMAIL_TEMPLATE_KEYS = [
  "handover_activated",
  "handover_returned",
  "handover_return_decision",
  "supply_request_rejected",
  "supply_request_fulfilled",
  "supply_return_rejected",
  "supply_return_approved",
  "system_test",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export type EmailTemplateOverride = {
  subject?: string;
  title?: string;
  intro?: string;
  actionLabel?: string;
};

export type EmailBranding = {
  brandName: string;
  brandColor: string;
  logoUrl?: string | null;
  footerText: string;
};

export type LifecycleEmailInput = {
  title: string;
  greetingName?: string | null;
  intro: string;
  details: Array<{
    label: string;
    value: string | number | null | undefined;
  }>;
  note?: string | null;
  applicationUrl?: string | null;
  actionLabel?: string;
  variables?: Record<string, string | number | null | undefined>;
};

export type EmailMessage = {
  subject: string;
  textBody: string;
  htmlBody: string;
  source?: LifecycleEmailInput;
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

function interpolateTemplate(
  value: string,
  variables: Record<string, string | number | null | undefined>
) {
  return value.replace(/{{\s*([A-Za-z0-9_]+)\s*}}/g, (token, key) => {
    const replacement = variables[key];
    return replacement === null || replacement === undefined
      ? token
      : String(replacement);
  });
}

function normalizedBrandColor(value: string | null | undefined) {
  return /^#[0-9A-F]{6}$/i.test(value || "") ? value! : "#0F8C8C";
}

function normalizedLogoUrl(
  value: string | null | undefined,
  applicationUrl: string | null
) {
  if (!value?.trim()) return null;
  const candidate = value.trim();
  if (candidate.startsWith("/") && applicationUrl)
    return `${applicationUrl}${candidate}`;
  try {
    const url = new URL(candidate);
    const localHttp =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !localHttp) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function buildLifecycleEmail(
  input: LifecycleEmailInput & {
    template?: EmailTemplateOverride | null;
    branding?: Partial<EmailBranding> | null;
  }
): EmailMessage {
  const brandName = input.branding?.brandName?.trim() || "AssetMaster";
  const details = input.details.filter(
    detail =>
      detail.value !== null && detail.value !== undefined && detail.value !== ""
  );
  const detailVariableKeys: Record<string, string> = {
    "Phiếu bàn giao": "referenceCode",
    "Mã tài sản": "assetCode",
    "Tên tài sản": "assetName",
    "Mã yêu cầu": "requestCode",
    "Phiếu cấp phát": "issueSlipCode",
    "Phiếu nguồn": "sourceReferenceCode",
    "Biên bản hoàn trả": "receiptCode",
    "Kết quả": "result",
    "Người xử lý": "actorName",
    "Người tiếp nhận": "actorName",
  };
  const detailVariables = Object.fromEntries(
    details
      .map(detail => [detailVariableKeys[detail.label], detail.value] as const)
      .filter(([key]) => Boolean(key))
  );
  const variables = {
    recipientName: input.greetingName || "",
    brandName,
    ...detailVariables,
    ...(input.variables || {}),
  };
  const brandColor = normalizedBrandColor(input.branding?.brandColor);
  const footerText =
    input.branding?.footerText?.trim() ||
    "Đây là email tự động từ AssetMaster. Vui lòng không trả lời email này.";
  const title = interpolateTemplate(
    input.template?.title?.trim() || input.title,
    variables
  );
  const intro = interpolateTemplate(
    input.template?.intro?.trim() || input.intro,
    variables
  );
  const actionLabel = interpolateTemplate(
    input.template?.actionLabel?.trim() ||
      input.actionLabel ||
      "Mở AssetMaster",
    variables
  );
  const subject = interpolateTemplate(
    input.template?.subject?.trim() || `[${brandName}] ${title}`,
    variables
  );
  const greeting = input.greetingName?.trim()
    ? `Xin chào ${input.greetingName.trim()},`
    : "Xin chào,";
  const textLines = [
    greeting,
    "",
    intro,
    "",
    ...details.map(detail => `${detail.label}: ${detail.value}`),
    ...(input.note?.trim() ? ["", `Ghi chú: ${input.note.trim()}`] : []),
  ];
  const applicationUrl = normalizedApplicationUrl(input.applicationUrl);
  if (applicationUrl)
    textLines.push("", `${actionLabel}: ${applicationUrl}`);
  textLines.push("", footerText);

  const detailRows = details
    .map(
      detail =>
        `<tr><td style="padding:8px 12px;color:#60758A;border-bottom:1px solid #E7EEF3;width:38%">${escapeHtml(detail.label)}</td><td style="padding:8px 12px;color:#193B57;font-weight:700;border-bottom:1px solid #E7EEF3">${escapeHtml(detail.value)}</td></tr>`
    )
    .join("");
  const action = applicationUrl
    ? `<p style="margin:24px 0 4px"><a href="${escapeHtml(applicationUrl)}" style="display:inline-block;background:${brandColor};color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:8px">${escapeHtml(actionLabel)}</a></p>`
    : "";
  const note = input.note?.trim()
    ? `<div style="margin-top:16px;padding:12px 14px;background:#FFF8E7;border:1px solid #F2D38B;border-radius:8px;color:#72510A"><strong>Ghi chú:</strong> ${escapeHtml(input.note.trim())}</div>`
    : "";
  const logoUrl = normalizedLogoUrl(input.branding?.logoUrl, applicationUrl);
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" style="display:block;max-width:132px;max-height:42px;margin:0 0 10px;object-fit:contain" />`
    : "";

  return {
    subject,
    textBody: textLines.join("\n"),
    htmlBody: `<!doctype html><html lang="vi"><body style="margin:0;background:#F4F7F9;font-family:Arial,sans-serif;color:#193B57"><div style="max-width:640px;margin:0 auto;padding:24px"><div style="background:#fff;border:1px solid #DFE9F0;border-radius:14px;overflow:hidden"><div style="background:${brandColor};color:#fff;padding:18px 22px">${logo}<div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(brandName)}</div><h1 style="font-size:20px;margin:5px 0 0">${escapeHtml(title)}</h1></div><div style="padding:22px"><p style="margin-top:0">${escapeHtml(greeting)}</p><p style="line-height:1.6">${escapeHtml(intro)}</p><table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #E7EEF3;border-radius:8px">${detailRows}</table>${note}${action}<p style="margin:24px 0 0;color:#8AA0B6;font-size:12px;line-height:1.5">${escapeHtml(footerText)}</p></div></div></div></body></html>`,
    source: {
      title: input.title,
      greetingName: input.greetingName,
      intro: input.intro,
      details: input.details,
      note: input.note,
      applicationUrl: input.applicationUrl,
      actionLabel: input.actionLabel,
      variables: input.variables,
    },
  };
}

type EmailTemplateCatalogItem = {
  key: EmailTemplateKey;
  label: string;
  category: EmailNotificationCategory;
  variables: Array<{ key: string; label: string; sample: string }>;
  defaults: Required<EmailTemplateOverride>;
  sample: LifecycleEmailInput;
};

const EMAIL_TEMPLATE_CATALOG: EmailTemplateCatalogItem[] = [
  {
    key: "handover_activated",
    label: "Bàn giao tài sản có hiệu lực",
    category: "handover",
    variables: [
      { key: "recipientName", label: "Tên người nhận", sample: "Nguyễn Văn An" },
      { key: "assetCode", label: "Mã tài sản", sample: "LT-00128" },
      { key: "assetName", label: "Tên tài sản", sample: "Laptop Dell Latitude" },
      { key: "referenceCode", label: "Mã phiếu", sample: "BG-2026-0088" },
    ],
    defaults: {
      subject: "[{{brandName}}] Bàn giao tài sản {{assetCode}}",
      title: "Bàn giao tài sản {{assetCode}}",
      intro: "Phiếu bàn giao tài sản của bạn đã được xác nhận và có hiệu lực.",
      actionLabel: "Xem phiếu bàn giao",
    },
    sample: {
      title: "Bàn giao tài sản LT-00128",
      greetingName: "Nguyễn Văn An",
      intro: "Phiếu bàn giao tài sản của bạn đã được xác nhận và có hiệu lực.",
      details: [
        { label: "Phiếu bàn giao", value: "BG-2026-0088" },
        { label: "Mã tài sản", value: "LT-00128" },
        { label: "Tên tài sản", value: "Laptop Dell Latitude" },
        { label: "Ngày bàn giao", value: "19 thg 9, 2026" },
      ],
      actionLabel: "Xem phiếu bàn giao",
      variables: {
        assetCode: "LT-00128",
        assetName: "Laptop Dell Latitude",
        referenceCode: "BG-2026-0088",
      },
    },
  },
  {
    key: "handover_returned",
    label: "Hoàn tất hoàn trả tài sản",
    category: "handover",
    variables: [
      { key: "recipientName", label: "Tên người nhận", sample: "Nguyễn Văn An" },
      { key: "assetCode", label: "Mã tài sản", sample: "LT-00128" },
      { key: "assetName", label: "Tên tài sản", sample: "Laptop Dell Latitude" },
      { key: "referenceCode", label: "Mã phiếu", sample: "BG-2026-0088" },
    ],
    defaults: {
      subject: "[{{brandName}}] Đã hoàn trả tài sản {{assetCode}}",
      title: "Đã hoàn trả tài sản {{assetCode}}",
      intro: "Hệ thống đã ghi nhận hoàn tất việc hoàn trả tài sản.",
      actionLabel: "Xem phiếu bàn giao",
    },
    sample: {
      title: "Đã hoàn trả tài sản LT-00128",
      greetingName: "Nguyễn Văn An",
      intro: "Hệ thống đã ghi nhận hoàn tất việc hoàn trả tài sản.",
      details: [
        { label: "Phiếu bàn giao", value: "BG-2026-0088" },
        { label: "Mã tài sản", value: "LT-00128" },
        { label: "Tên tài sản", value: "Laptop Dell Latitude" },
        { label: "Ngày hoàn trả", value: "19 thg 9, 2026" },
      ],
      actionLabel: "Xem phiếu bàn giao",
      variables: {
        assetCode: "LT-00128",
        assetName: "Laptop Dell Latitude",
        referenceCode: "BG-2026-0088",
      },
    },
  },
  {
    key: "handover_return_decision",
    label: "Kết quả yêu cầu hoàn trả tài sản",
    category: "handover",
    variables: [
      { key: "recipientName", label: "Tên người nhận", sample: "Nguyễn Văn An" },
      { key: "assetCode", label: "Mã tài sản", sample: "LT-00128" },
      { key: "referenceCode", label: "Mã phiếu", sample: "BG-2026-0088" },
      { key: "result", label: "Kết quả", sample: "Đã duyệt" },
    ],
    defaults: {
      subject: "[{{brandName}}] Yêu cầu hoàn trả {{referenceCode}} đã được xử lý",
      title: "Yêu cầu hoàn trả {{referenceCode}} đã được xử lý",
      intro: "Yêu cầu hoàn trả tài sản của bạn đã được quản trị viên xử lý.",
      actionLabel: "Xem kết quả hoàn trả",
    },
    sample: {
      title: "Yêu cầu hoàn trả BG-2026-0088 đã được xử lý",
      greetingName: "Nguyễn Văn An",
      intro: "Yêu cầu hoàn trả tài sản của bạn đã được quản trị viên xử lý.",
      details: [
        { label: "Phiếu bàn giao", value: "BG-2026-0088" },
        { label: "Mã tài sản", value: "LT-00128" },
        { label: "Kết quả", value: "Đã duyệt" },
      ],
      note: "Thiết bị được tiếp nhận tại phòng IT.",
      actionLabel: "Xem kết quả hoàn trả",
      variables: {
        assetCode: "LT-00128",
        referenceCode: "BG-2026-0088",
        result: "Đã duyệt",
      },
    },
  },
  {
    key: "supply_request_rejected",
    label: "Từ chối yêu cầu phụ kiện",
    category: "supply_request",
    variables: [
      { key: "recipientName", label: "Tên người nhận", sample: "Nguyễn Văn An" },
      { key: "requestCode", label: "Mã yêu cầu", sample: "YC-2026-0042" },
      { key: "result", label: "Kết quả", sample: "Từ chối" },
      { key: "actorName", label: "Người xử lý", sample: "Quản trị viên IT" },
    ],
    defaults: {
      subject: "[{{brandName}}] Yêu cầu {{requestCode}} đã bị từ chối",
      title: "Yêu cầu {{requestCode}} đã bị từ chối",
      intro: "Yêu cầu cấp phụ kiện của bạn đã được quản trị viên xử lý.",
      actionLabel: "Xem yêu cầu",
    },
    sample: {
      title: "Yêu cầu YC-2026-0042 đã bị từ chối",
      greetingName: "Nguyễn Văn An",
      intro: "Yêu cầu cấp phụ kiện của bạn đã được quản trị viên xử lý.",
      details: [
        { label: "Mã yêu cầu", value: "YC-2026-0042" },
        { label: "Kết quả", value: "Từ chối" },
        { label: "Người xử lý", value: "Quản trị viên IT" },
      ],
      note: "Phụ kiện tạm thời chưa còn trong kho.",
      actionLabel: "Xem yêu cầu",
      variables: {
        requestCode: "YC-2026-0042",
        result: "Từ chối",
        actorName: "Quản trị viên IT",
      },
    },
  },
  {
    key: "supply_request_fulfilled",
    label: "Cấp phát phụ kiện",
    category: "supply_request",
    variables: [
      { key: "recipientName", label: "Tên người nhận", sample: "Nguyễn Văn An" },
      { key: "requestCode", label: "Mã yêu cầu", sample: "YC-2026-0042" },
      { key: "issueSlipCode", label: "Mã phiếu cấp", sample: "PX-2026-0031" },
      { key: "result", label: "Kết quả", sample: "Đã cấp đầy đủ" },
    ],
    defaults: {
      subject: "[{{brandName}}] Yêu cầu {{requestCode}} đã được cấp phát",
      title: "Yêu cầu {{requestCode}} đã được cấp phát",
      intro: "Yêu cầu phụ kiện của bạn đã được duyệt và cấp phát.",
      actionLabel: "Xem phiếu cấp phát",
    },
    sample: {
      title: "Yêu cầu YC-2026-0042 đã được cấp phát",
      greetingName: "Nguyễn Văn An",
      intro: "Yêu cầu phụ kiện của bạn đã được duyệt và cấp phát.",
      details: [
        { label: "Mã yêu cầu", value: "YC-2026-0042" },
        { label: "Phiếu cấp phát", value: "PX-2026-0031" },
        { label: "Kết quả", value: "Đã cấp đầy đủ" },
      ],
      actionLabel: "Xem phiếu cấp phát",
      variables: {
        requestCode: "YC-2026-0042",
        issueSlipCode: "PX-2026-0031",
        result: "Đã cấp đầy đủ",
      },
    },
  },
  {
    key: "supply_return_rejected",
    label: "Từ chối hoàn trả phụ kiện",
    category: "supply_return",
    variables: [
      { key: "recipientName", label: "Tên người nhận", sample: "Nguyễn Văn An" },
      { key: "requestCode", label: "Mã yêu cầu", sample: "HT-2026-0014" },
      { key: "sourceReferenceCode", label: "Phiếu nguồn", sample: "PX-2026-0031" },
      { key: "result", label: "Kết quả", sample: "Từ chối" },
    ],
    defaults: {
      subject: "[{{brandName}}] Yêu cầu hoàn trả {{requestCode}} đã bị từ chối",
      title: "Yêu cầu hoàn trả {{requestCode}} đã bị từ chối",
      intro: "Yêu cầu hoàn trả phụ kiện của bạn đã được xử lý.",
      actionLabel: "Xem yêu cầu hoàn trả",
    },
    sample: {
      title: "Yêu cầu hoàn trả HT-2026-0014 đã bị từ chối",
      greetingName: "Nguyễn Văn An",
      intro: "Yêu cầu hoàn trả phụ kiện của bạn đã được xử lý.",
      details: [
        { label: "Mã yêu cầu", value: "HT-2026-0014" },
        { label: "Phiếu nguồn", value: "PX-2026-0031" },
        { label: "Kết quả", value: "Từ chối" },
      ],
      actionLabel: "Xem yêu cầu hoàn trả",
      variables: {
        requestCode: "HT-2026-0014",
        sourceReferenceCode: "PX-2026-0031",
        result: "Từ chối",
      },
    },
  },
  {
    key: "supply_return_approved",
    label: "Tiếp nhận hoàn trả phụ kiện",
    category: "supply_return",
    variables: [
      { key: "recipientName", label: "Tên người nhận", sample: "Nguyễn Văn An" },
      { key: "requestCode", label: "Mã yêu cầu", sample: "HT-2026-0014" },
      { key: "receiptCode", label: "Mã biên bản", sample: "BBHT-2026-0009" },
      { key: "actorName", label: "Người tiếp nhận", sample: "Quản trị viên IT" },
    ],
    defaults: {
      subject: "[{{brandName}}] Đã tiếp nhận hoàn trả {{requestCode}}",
      title: "Đã tiếp nhận hoàn trả {{requestCode}}",
      intro: "Yêu cầu hoàn trả phụ kiện của bạn đã được duyệt và lập biên bản.",
      actionLabel: "Xem biên bản hoàn trả",
    },
    sample: {
      title: "Đã tiếp nhận hoàn trả HT-2026-0014",
      greetingName: "Nguyễn Văn An",
      intro: "Yêu cầu hoàn trả phụ kiện của bạn đã được duyệt và lập biên bản.",
      details: [
        { label: "Mã yêu cầu", value: "HT-2026-0014" },
        { label: "Biên bản hoàn trả", value: "BBHT-2026-0009" },
        { label: "Người tiếp nhận", value: "Quản trị viên IT" },
      ],
      actionLabel: "Xem biên bản hoàn trả",
      variables: {
        requestCode: "HT-2026-0014",
        receiptCode: "BBHT-2026-0009",
        actorName: "Quản trị viên IT",
      },
    },
  },
  {
    key: "system_test",
    label: "Email kiểm tra hệ thống",
    category: "system_test",
    variables: [
      { key: "recipientName", label: "Tên người nhận", sample: "Quản trị viên" },
      { key: "brandName", label: "Tên thương hiệu", sample: "AssetMaster" },
    ],
    defaults: {
      subject: "[{{brandName}}] Kiểm tra kết nối email Microsoft 365",
      title: "Kiểm tra kết nối email Microsoft 365",
      intro: "Hệ thống đã kiểm tra thành công cấu hình gửi thông báo email.",
      actionLabel: "Mở AssetMaster",
    },
    sample: {
      title: "Kiểm tra kết nối email Microsoft 365",
      greetingName: "Quản trị viên",
      intro: "Hệ thống đã kiểm tra thành công cấu hình gửi thông báo email.",
      details: [
        { label: "Chế độ", value: "Mô phỏng" },
        { label: "Thời điểm", value: "19/09/2026 15:00" },
      ],
      actionLabel: "Mở AssetMaster",
    },
  },
];

function templateOverridesFromSettings(settings: EmailSettings) {
  return (settings.templateOverrides || {}) as Record<
    string,
    EmailTemplateOverride
  >;
}

function brandingFromSettings(settings: EmailSettings): EmailBranding {
  return {
    brandName: settings.brandName || "AssetMaster",
    brandColor: settings.brandColor || "#0F8C8C",
    logoUrl: settings.logoUrl,
    footerText:
      settings.footerText ||
      "Đây là email tự động từ AssetMaster. Vui lòng không trả lời email này.",
  };
}

export function getEmailTemplateCatalog() {
  return EMAIL_TEMPLATE_CATALOG.map(({ sample: _sample, ...definition }) =>
    definition
  );
}

export function renderConfiguredLifecycleEmail(
  settings: EmailSettings,
  templateKey: string,
  message: EmailMessage
) {
  if (!message.source) return message;
  return buildLifecycleEmail({
    ...message.source,
    template: templateOverridesFromSettings(settings)[templateKey],
    branding: brandingFromSettings(settings),
  });
}

export function previewEmailTemplate(input: {
  templateKey: EmailTemplateKey;
  brandName: string;
  brandColor: string;
  logoUrl: string | null;
  footerText: string;
  applicationUrl: string | null;
  templateOverrides: Record<string, EmailTemplateOverride>;
}) {
  const definition = EMAIL_TEMPLATE_CATALOG.find(
    item => item.key === input.templateKey
  );
  if (!definition) throw new Error("Mẫu email không tồn tại.");
  return buildLifecycleEmail({
    ...definition.sample,
    applicationUrl: input.applicationUrl,
    template: input.templateOverrides[input.templateKey],
    branding: input,
  });
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
  const renderedMessage = renderConfiguredLifecycleEmail(
    settings,
    input.templateKey,
    input.message
  );
  const outbox = await createEmailOutboxItem(
    {
      eventKey: input.eventKey,
      category: input.category,
      templateKey: input.templateKey,
      entityType: input.entityType,
      entityId: input.entityId,
      recipientEmail,
      recipientName: input.recipientName || recipient?.name || null,
      subject: renderedMessage.subject,
      textBody: renderedMessage.textBody,
      htmlBody: renderedMessage.htmlBody,
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
  const message = renderConfiguredLifecycleEmail(settings, "system_test", buildLifecycleEmail({
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
  }));
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
