import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Cloud,
  Mail,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type Draft = {
  provider: "mock" | "microsoft_graph";
  tenantId: string;
  clientId: string;
  clientSecretRef: string;
  senderEmail: string;
  senderName: string;
  applicationUrl: string;
  handoverEnabled: boolean;
  supplyRequestEnabled: boolean;
  supplyReturnEnabled: boolean;
  maxAttempts: number;
};

const initialDraft: Draft = {
  provider: "mock",
  tenantId: "",
  clientId: "",
  clientSecretRef: "/run/secrets/m365_mail_client_secret",
  senderEmail: "",
  senderName: "AssetMaster",
  applicationUrl: "",
  handoverEnabled: true,
  supplyRequestEnabled: true,
  supplyReturnEnabled: true,
  maxAttempts: 5,
};

function normalizeSettings(value: any): Draft {
  if (!value) return initialDraft;
  return {
    provider: value.provider || "mock",
    tenantId: value.tenantId || "",
    clientId: value.clientId || "",
    clientSecretRef:
      value.clientSecretRef || "/run/secrets/m365_mail_client_secret",
    senderEmail: value.senderEmail || "",
    senderName: value.senderName || "AssetMaster",
    applicationUrl: value.applicationUrl || "",
    handoverEnabled: value.handoverEnabled !== false,
    supplyRequestEnabled: value.supplyRequestEnabled !== false,
    supplyReturnEnabled: value.supplyReturnEnabled !== false,
    maxAttempts: Number(value.maxAttempts || 5),
  };
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Chưa thực hiện";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const statusLabel: Record<string, string> = {
  pending: "Chờ gửi",
  processing: "Đang gửi",
  sent: "Đã gửi",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};

export function EmailNotificationSettingsPanel() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [visible, setVisible] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const settingsQuery = trpc.emailNotifications.get.useQuery(undefined, {
    enabled: isAdmin,
  });
  const outboxQuery = trpc.emailNotifications.outbox.useQuery(
    { limit: 30 },
    { enabled: isAdmin && visible, refetchInterval: visible ? 30_000 : false }
  );

  useEffect(() => {
    const open = () => {
      setVisible(true);
      window.requestAnimationFrame(() =>
        document
          .getElementById("settings-email-notifications")
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    };
    window.addEventListener("assetmaster:open-email-settings", open);
    return () =>
      window.removeEventListener("assetmaster:open-email-settings", open);
  }, []);

  useEffect(() => {
    if (!dirty) setDraft(normalizeSettings(settingsQuery.data));
  }, [dirty, settingsQuery.data]);

  const refresh = () => {
    void utils.emailNotifications.get.invalidate();
    void utils.emailNotifications.outbox.invalidate();
  };
  const saveMutation = trpc.emailNotifications.save.useMutation({
    onSuccess: () => {
      setDirty(false);
      refresh();
      toast.success("Đã lưu cấu hình thông báo email.");
    },
    onError: error =>
      toast.error(error.message || "Không thể lưu cấu hình email."),
  });
  const testMutation = trpc.emailNotifications.test.useMutation({
    onSuccess: result => {
      refresh();
      result.success
        ? toast.success(result.message)
        : toast.error(result.message);
    },
    onError: error => toast.error(error.message || "Không thể kiểm tra email."),
  });
  const statusMutation = trpc.emailNotifications.setStatus.useMutation({
    onSuccess: settings => {
      refresh();
      toast.success(
        settings?.status === "active"
          ? "Đã kích hoạt thông báo email."
          : "Đã tắt thông báo email."
      );
    },
    onError: error => toast.error(error.message || "Không thể đổi trạng thái."),
  });
  const dispatchMutation = trpc.emailNotifications.dispatch.useMutation({
    onSuccess: result => {
      refresh();
      toast.success(
        `Đã xử lý ${result.processed} email; gửi thành công ${result.sent}.`
      );
    },
    onError: error => toast.error(error.message || "Không thể xử lý hàng đợi."),
  });
  const retryMutation = trpc.emailNotifications.retry.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Đã đưa email trở lại hàng đợi.");
    },
    onError: error => toast.error(error.message || "Không thể gửi lại email."),
  });

  const settings = settingsQuery.data;
  const summary = useMemo(() => {
    const rows = outboxQuery.data || [];
    return {
      pending: rows.filter(row => row.status === "pending").length,
      sent: rows.filter(row => row.status === "sent").length,
      failed: rows.filter(row => row.status === "failed").length,
    };
  }, [outboxQuery.data]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDirty(true);
    setDraft(current => ({ ...current, [key]: value }));
  };

  if (loading || !isAdmin) return null;
  if (!visible)
    return (
      <div
        id="settings-email-notifications"
        data-email-settings-anchor
        aria-hidden="true"
      />
    );

  const busy =
    saveMutation.isPending ||
    testMutation.isPending ||
    statusMutation.isPending ||
    dispatchMutation.isPending;

  return (
    <section
      id="settings-email-notifications"
      data-email-notification-settings
      className="mx-auto mt-5 w-[calc(100%-2rem)] max-w-[1100px] scroll-mt-24 overflow-hidden rounded-xl border border-[#C9DDF5] bg-white shadow-[0_8px_24px_rgba(16,42,67,.045)]"
    >
      <header className="flex flex-col gap-4 border-b border-[#DCE8F5] bg-[linear-gradient(120deg,#F4F9FF_0%,#FFFFFF_72%)] px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EAF3FF] text-[#2666A8]">
            <Mail size={20} />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#2666A8]">
              Kênh thông báo
            </div>
            <h2 className="mt-0.5 font-display text-xl font-extrabold tracking-[-.035em] text-[#102A43]">
              Email Microsoft 365
            </h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#60758A]">
              Gửi thông báo qua Microsoft Graph với hàng đợi, chống trùng, tự
              thử lại và chế độ mô phỏng để UAT trước khi cấu hình Entra.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end lg:self-start">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${settings?.status === "active" ? "bg-[#E6F6F2] text-[#087A6A]" : settings?.status === "disabled" ? "bg-[#F4F7F9] text-[#60758A]" : "bg-[#FFF5DC] text-[#A86B00]"}`}
          >
            {settings?.status === "active"
              ? "Đang kích hoạt"
              : settings?.status === "disabled"
                ? "Đã tắt"
                : "Bản nháp"}
          </span>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#DCE8F5] bg-white text-[#60758A] hover:bg-[#F4F9FF]"
            aria-label="Đóng cấu hình email"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <div className="space-y-4">
          <fieldset className="rounded-xl border border-[#E0E9EF] p-4">
            <legend className="px-1 text-xs font-extrabold text-[#193B57]">
              Nhà cung cấp gửi email
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="field-label">Chế độ gửi</span>
                <select
                  className="field-input"
                  value={draft.provider}
                  onChange={event =>
                    update("provider", event.target.value as Draft["provider"])
                  }
                >
                  <option value="mock">Mô phỏng – không gửi ra ngoài</option>
                  <option value="microsoft_graph">
                    Microsoft Graph – gửi thật
                  </option>
                </select>
              </label>
              <Field
                label="Directory (Tenant) ID"
                value={draft.tenantId}
                disabled={draft.provider === "mock"}
                onChange={value => update("tenantId", value)}
              />
              <Field
                label="Application (Client) ID"
                value={draft.clientId}
                disabled={draft.provider === "mock"}
                onChange={value => update("clientId", value)}
              />
              <Field
                label="Tệp Client Secret"
                value={draft.clientSecretRef}
                disabled={draft.provider === "mock"}
                className="sm:col-span-2"
                onChange={value => update("clientSecretRef", value)}
                help="Chỉ lưu đường dẫn secret; AssetMaster không lưu giá trị secret vào database."
              />
              <Field
                label="Mailbox người gửi"
                value={draft.senderEmail}
                disabled={draft.provider === "mock"}
                placeholder="assetmaster@congty.vn"
                onChange={value => update("senderEmail", value)}
              />
              <Field
                label="Tên người gửi"
                value={draft.senderName}
                onChange={value => update("senderName", value)}
              />
              <Field
                label="URL AssetMaster trong email"
                value={draft.applicationUrl}
                placeholder="https://assetmaster.congty.vn"
                className="sm:col-span-2"
                onChange={value => update("applicationUrl", value)}
              />
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-[#E0E9EF] p-4">
            <legend className="px-1 text-xs font-extrabold text-[#193B57]">
              Sự kiện gửi thông báo
            </legend>
            <div className="mt-2 space-y-2">
              <Toggle
                checked={draft.handoverEnabled}
                label="Bàn giao, thu hồi và kết quả hoàn trả tài sản"
                onChange={value => update("handoverEnabled", value)}
              />
              <Toggle
                checked={draft.supplyRequestEnabled}
                label="Duyệt, cấp một phần hoặc từ chối yêu cầu phụ kiện"
                onChange={value => update("supplyRequestEnabled", value)}
              />
              <Toggle
                checked={draft.supplyReturnEnabled}
                label="Tiếp nhận hoặc từ chối hoàn trả phụ kiện"
                onChange={value => update("supplyReturnEnabled", value)}
              />
            </div>
            <label className="mt-3 block max-w-[220px]">
              <span className="field-label">Số lần thử tối đa</span>
              <input
                type="number"
                min={1}
                max={10}
                className="field-input"
                value={draft.maxAttempts}
                onChange={event =>
                  update("maxAttempts", Number(event.target.value))
                }
              />
            </label>
          </fieldset>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="filter-action"
              disabled={busy || !settings}
              onClick={() => testMutation.mutate()}
            >
              <Play size={14} /> Kiểm tra
            </button>
            <button
              type="button"
              className="primary-action"
              disabled={busy || !dirty}
              onClick={() =>
                saveMutation.mutate({
                  ...draft,
                  tenantId: draft.tenantId || null,
                  clientId: draft.clientId || null,
                  clientSecretRef: draft.clientSecretRef || null,
                  senderEmail: draft.senderEmail || null,
                  applicationUrl: draft.applicationUrl || null,
                })
              }
            >
              <Save size={14} /> Lưu cấu hình
            </button>
            {settings?.status === "active" ? (
              <button
                type="button"
                className="filter-action"
                disabled={busy}
                onClick={() => statusMutation.mutate({ status: "disabled" })}
              >
                <XCircle size={14} /> Tắt gửi email
              </button>
            ) : (
              <button
                type="button"
                className="filter-action"
                disabled={busy || settings?.lastTestStatus !== "success"}
                onClick={() => statusMutation.mutate({ status: "active" })}
              >
                <ShieldCheck size={14} /> Kích hoạt
              </button>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#193B57]">
              <Cloud size={16} className="text-[#087A6A]" /> Trạng thái kết nối
            </div>
            <dl className="mt-3 space-y-2 text-[11px]">
              <Row
                label="Chế độ"
                value={
                  settings?.provider === "microsoft_graph"
                    ? "Microsoft Graph"
                    : "Mô phỏng"
                }
              />
              <Row
                label="Kiểm tra gần nhất"
                value={formatDate(settings?.lastTestedAt)}
              />
              <Row
                label="Kết quả"
                value={settings?.lastTestMessage || "Chưa kiểm tra"}
              />
              <Row
                label="Gửi gần nhất"
                value={formatDate(settings?.lastDispatchedAt)}
              />
            </dl>
          </section>

          <section className="rounded-xl border border-[#E0E9EF] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-extrabold text-[#193B57]">
                Hàng đợi email
              </div>
              <button
                type="button"
                className="filter-action !px-2 !py-1.5"
                disabled={busy || settings?.status !== "active"}
                onClick={() => dispatchMutation.mutate()}
              >
                <Send size={13} /> Gửi ngay
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Metric label="Chờ" value={summary.pending} tone="amber" />
              <Metric label="Đã gửi" value={summary.sent} tone="teal" />
              <Metric label="Lỗi" value={summary.failed} tone="red" />
            </div>
            <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto">
              {(outboxQuery.data || []).map(item => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[#E7EEF3] p-3 text-[10px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-extrabold text-[#193B57]">
                        {item.subject}
                      </div>
                      <div className="mt-1 truncate text-[#71869A]">
                        {item.recipientEmail}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#F4F7F9] px-2 py-1 font-bold text-[#60758A]">
                      {statusLabel[item.status] || item.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[#8AA0B6]">
                    <span>
                      {formatDate(item.createdAt)} · lần thử {item.attemptCount}
                      /{item.maxAttempts}
                    </span>
                    {item.status === "failed" && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-bold text-[#B44545]"
                        disabled={retryMutation.isPending}
                        onClick={() => retryMutation.mutate({ id: item.id })}
                      >
                        <RotateCcw size={11} /> Gửi lại
                      </button>
                    )}
                  </div>
                  {item.lastError && (
                    <div className="mt-2 rounded bg-[#FDEDEE] p-2 text-[#B44545]">
                      {item.lastError}
                    </div>
                  )}
                </div>
              ))}
              {!outboxQuery.isLoading && !outboxQuery.data?.length && (
                <div className="rounded-lg border border-dashed border-[#DDE7F0] p-5 text-center text-[11px] text-[#8AA0B6]">
                  Chưa có email trong hàng đợi.
                </div>
              )}
              {outboxQuery.isLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-[#8AA0B6]">
                  <RefreshCw size={13} className="animate-spin" /> Đang tải lịch
                  sử...
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  help,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  help?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
      {help && (
        <span className="mt-1 block text-[10px] leading-4 text-[#8AA0B6]">
          {help}
        </span>
      )}
    </label>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#E7EEF3] px-3 py-2.5 text-[11px] font-bold text-[#527089]">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-[#0F8C8C]"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[115px_1fr] gap-2">
      <dt className="text-[#71869A]">{label}</dt>
      <dd className="break-words font-bold text-[#193B57]">{value}</dd>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "teal" | "red";
}) {
  const classes =
    tone === "teal"
      ? "bg-[#E6F6F2] text-[#087A6A]"
      : tone === "red"
        ? "bg-[#FDEDEE] text-[#B44545]"
        : "bg-[#FFF5DC] text-[#A86B00]";
  const Icon =
    tone === "teal" ? CheckCircle2 : tone === "red" ? XCircle : Clock3;
  return (
    <div className={`rounded-lg p-2 ${classes}`}>
      <div className="flex items-center justify-center gap-1 text-sm font-extrabold">
        <Icon size={13} />
        {value}
      </div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
