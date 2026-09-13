import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  CircleAlert,
  Cloud,
  DatabaseZap,
  ExternalLink,
  FileKey2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type EntraDraft = {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  clientSecretRef: string;
  adminAppRole: string;
  userAppRole: string;
};

const ENTRA_CONFIGURATION_GUIDE_URL =
  "https://github.com/trieudhcn/assetmaster-dashboard/blob/codex/employee-supply-requests/docs/huong-dan-entra-id-microsoft-graph.md";

const initialDraft: EntraDraft = {
  tenantId: "",
  clientId: "",
  redirectUri: "",
  clientSecretRef: "/run/secrets/entra_client_secret",
  adminAppRole: "AssetMaster.Admin",
  userAppRole: "AssetMaster.User",
};

function normalizeSettings(value: any): EntraDraft {
  if (!value) return initialDraft;
  return {
    tenantId: value.tenantId || "",
    clientId: value.clientId || "",
    redirectUri: value.redirectUri || "",
    clientSecretRef:
      value.clientSecretRef || "/run/secrets/entra_client_secret",
    adminAppRole: value.adminAppRole || "AssetMaster.Admin",
    userAppRole: value.userAppRole || "AssetMaster.User",
  };
}

function StatusPill({
  status,
}: {
  status: "draft" | "active" | "disabled" | undefined;
}) {
  const detail =
    status === "active"
      ? ["Đang kích hoạt", "bg-[#E6F6F2] text-[#087A6A]"]
      : status === "disabled"
        ? ["Đã tắt", "bg-[#F4F7F9] text-[#60758A]"]
        : ["Bản nháp", "bg-[#FFF5DC] text-[#A86B00]"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${detail[1]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {detail[0]}
    </span>
  );
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Chưa thực hiện";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function EntraSettingsPanel({
  onOpenUsers,
}: {
  onOpenUsers?: () => void;
}) {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const statusQuery = trpc.entra.get.useQuery(undefined, { enabled: isAdmin });
  const auditQuery = trpc.entra.audit.useQuery(
    { limit: 8 },
    { enabled: isAdmin }
  );
  const [draft, setDraft] = useState(initialDraft);
  const [dirty, setDirty] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    scanned: number;
    matched: number;
    synced: number;
    skipped: number;
    reachedLimit: boolean;
  } | null>(null);

  useEffect(() => {
    const openEntra = () => {
      setIsVisible(true);
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() =>
          document
            .getElementById("settings-entra")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        )
      );
    };
    window.addEventListener("assetmaster:open-entra-settings", openEntra);
    return () =>
      window.removeEventListener("assetmaster:open-entra-settings", openEntra);
  }, []);

  useEffect(() => {
    if (!dirty && statusQuery.data?.settings)
      setDraft(normalizeSettings(statusQuery.data.settings));
  }, [dirty, statusQuery.data?.settings]);

  const refresh = () => {
    void utils.entra.get.invalidate();
    void utils.entra.audit.invalidate();
    void utils.entra.publicStatus.invalidate();
    void utils.directory.publicStatus.invalidate();
  };
  const saveMutation = trpc.entra.save.useMutation({
    onSuccess: () => {
      setDirty(false);
      refresh();
      toast.success("Đã lưu bản nháp Microsoft Entra ID.");
    },
    onError: error => toast.error(error.message || "Không thể lưu Entra ID."),
  });
  const testMutation = trpc.entra.test.useMutation({
    onSuccess: result => {
      refresh();
      result.success ? toast.success(result.message) : toast.error(result.message);
    },
    onError: error =>
      toast.error(error.message || "Không thể kiểm tra Microsoft Entra ID."),
  });
  const statusMutation = trpc.entra.setStatus.useMutation({
    onSuccess: settings => {
      refresh();
      toast.success(
        settings?.status === "active"
          ? "Đã kích hoạt đăng nhập Microsoft."
          : "Đã tắt đăng nhập Microsoft."
      );
    },
    onError: error =>
      toast.error(error.message || "Không thể cập nhật trạng thái Entra ID."),
  });
  const syncMutation = trpc.entra.syncUsers.useMutation({
    onMutate: () => setSyncResult(null),
    onSuccess: result => {
      setSyncResult(result);
      refresh();
      toast.success(`Đã đồng bộ ${result.synced} hồ sơ từ Microsoft Graph.`);
    },
    onError: error =>
      toast.error(error.message || "Không thể đồng bộ Microsoft Graph."),
  });

  const settings = statusQuery.data?.settings;
  const isSelfHosted = statusQuery.data?.selfHosted === true;
  const lastTest = useMemo(
    () => formatDate(settings?.lastTestedAt),
    [settings?.lastTestedAt]
  );
  const lastSync = useMemo(
    () => formatDate(settings?.lastSyncedAt),
    [settings?.lastSyncedAt]
  );
  const update = <K extends keyof EntraDraft>(key: K, value: EntraDraft[K]) => {
    setDirty(true);
    setDraft(current => ({ ...current, [key]: value }));
  };

  if (authLoading || !isAdmin) return null;
  if (!isVisible)
    return <div id="settings-entra" data-entra-settings-anchor aria-hidden="true" />;

  return (
    <section
      id="settings-entra"
      data-entra-settings
      className="mx-auto mt-5 w-[calc(100%-2rem)] max-w-[1100px] rounded-xl border border-[#C9DDF5] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]"
    >
      <header className="flex flex-col gap-4 border-b border-[#DCE8F5] bg-[linear-gradient(120deg,#F4F9FF_0%,#FFFFFF_72%)] px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EAF3FF] text-[#2666A8]">
            <Cloud size={20} />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#2666A8]">
              Xác thực đám mây
            </div>
            <h2 className="mt-0.5 font-display text-xl font-extrabold tracking-[-.035em] text-[#102A43]">
              Microsoft Entra ID & Graph
            </h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#60758A]">
              Cấu hình đăng nhập Microsoft, kiểm tra quyền ứng dụng và đồng bộ
              phòng ban, chức danh, nhóm vào hồ sơ AssetMaster.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 self-end lg:self-start">
          <a
            href={ENTRA_CONFIGURATION_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#B8D2EF] bg-white px-3 text-[10px] font-extrabold text-[#2666A8] shadow-[0_3px_10px_rgba(38,102,168,.08)] transition hover:border-[#8FB8E3] hover:bg-[#F4F9FF] focus:outline-none focus:ring-2 focus:ring-[#C9DDF5]"
            aria-label="Xem hướng dẫn cấu hình Microsoft Entra ID (mở trong tab mới)"
          >
            <BookOpenText size={15} />
            <span>Xem hướng dẫn cấu hình</span>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          <StatusPill status={settings?.status} />
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#DCE8F5] bg-white text-[#60758A] hover:bg-[#F4F9FF]"
            aria-label="Đóng cấu hình Microsoft Entra ID"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,.75fr)]">
          <div className="space-y-4">
            <fieldset className="rounded-xl border border-[#E0E9EF] p-4">
              <legend className="px-1 text-xs font-extrabold text-[#193B57]">
                App Registration
              </legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <InputField
                  label="Directory (Tenant) ID"
                  value={draft.tenantId}
                  onChange={value => update("tenantId", value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
                <InputField
                  label="Application (Client) ID"
                  value={draft.clientId}
                  onChange={value => update("clientId", value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
                <InputField
                  label="Redirect URI"
                  value={draft.redirectUri}
                  onChange={value => update("redirectUri", value)}
                  placeholder="https://assetmaster.example.com/api/auth/entra/callback"
                  className="sm:col-span-2"
                />
                <InputField
                  label="Tệp Client Secret"
                  value={draft.clientSecretRef}
                  onChange={value => update("clientSecretRef", value)}
                  placeholder="/run/secrets/entra_client_secret"
                  className="sm:col-span-2"
                  help="Không nhập secret thô. Mount secret vào container rồi khai báo đường dẫn. ENTRA_CLIENT_SECRET trong môi trường vẫn được ưu tiên cho UAT."
                />
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-[#E0E9EF] p-4">
              <legend className="px-1 text-xs font-extrabold text-[#193B57]">
                App Roles và Microsoft Graph
              </legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <InputField
                  label="App Role quản trị"
                  value={draft.adminAppRole}
                  onChange={value => update("adminAppRole", value)}
                />
                <InputField
                  label="App Role nhân viên"
                  value={draft.userAppRole}
                  onChange={value => update("userAppRole", value)}
                />
              </div>
              <div className="mt-3 rounded-lg border border-[#C9DDF5] bg-[#F4F9FF] p-3 text-[11px] leading-5 text-[#526779]">
                Microsoft Graph cần Application permissions
                <b className="text-[#193B57]"> User.Read.All</b> và
                <b className="text-[#193B57]"> Group.Read.All</b>, đã được
                Grant admin consent. Đồng bộ chỉ cập nhật tài khoản AssetMaster
                đã tồn tại và không thay đổi vai trò.
              </div>
            </fieldset>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-[#DCE8F5] bg-[#F7FAFF] p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 text-[#2666A8]" size={18} />
                <div>
                  <h3 className="text-xs font-extrabold text-[#193B57]">
                    Trạng thái kết nối
                  </h3>
                  <p className="mt-1 text-[11px] leading-5 text-[#60758A]">
                    Nguồn cấu hình: {statusQuery.data?.source === "environment" ? "biến môi trường" : "Cài đặt hệ thống"}.
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2 border-t border-[#DCE8F5] pt-3 text-[11px]">
                <StatusRow label="Self-hosted" ok={isSelfHosted} />
                <StatusRow
                  label="Client Secret"
                  ok={statusQuery.data?.secretConfigured === true}
                />
                <StatusRow
                  label="Graph đã kiểm tra"
                  ok={settings?.lastTestStatus === "success"}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#71869A]">Kiểm tra gần nhất</span>
                  <b className="text-right text-[#193B57]">{lastTest}</b>
                </div>
              </div>
              {(settings?.lastTestMessage || statusQuery.data?.error) && (
                <p
                  className={`mt-3 rounded-lg p-2.5 text-[10px] leading-4 ${settings?.lastTestStatus === "success" ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-[#FDEDEE] text-[#B44545]"}`}
                >
                  {settings?.lastTestMessage || statusQuery.data?.error}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-[#E0E9EF] p-4">
              <div className="flex items-center gap-2">
                <UsersRound size={17} className="text-[#2666A8]" />
                <h3 className="text-xs font-extrabold text-[#193B57]">
                  Đồng bộ hồ sơ Microsoft Graph
                </h3>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#71869A]">
                Đồng bộ tối đa 500 người dùng: tên, email, phòng ban, chức danh
                và nhóm trực tiếp/lồng nhau. Lần gần nhất: {lastSync}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => syncMutation.mutate({ limit: 500 })}
                  disabled={
                    settings?.status !== "active" ||
                    settings?.lastTestStatus !== "success" ||
                    syncMutation.isPending
                  }
                  title={
                    settings?.status !== "active"
                      ? "Cần kiểm tra và kích hoạt Entra ID trước"
                      : undefined
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9DDF5] bg-[#F4F9FF] px-3 py-2 text-[10px] font-extrabold text-[#2666A8] disabled:opacity-50"
                >
                  {syncMutation.isPending ? (
                    <Loader2 className="animate-spin" size={13} />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  Đồng bộ Microsoft Graph
                </button>
                <button
                  type="button"
                  onClick={onOpenUsers}
                  className="text-[10px] font-extrabold text-[#2666A8]"
                >
                  Mở hồ sơ nhân viên →
                </button>
              </div>
              {syncResult && (
                <div className="mt-3 rounded-lg bg-[#F6FCFB] p-2.5 text-[10px] leading-4 text-[#087A6A]">
                  Quét {syncResult.scanned}; khớp {syncResult.matched}; đồng bộ {syncResult.synced}; bỏ qua {syncResult.skipped}.
                  {syncResult.reachedLimit ? " Đã chạm giới hạn 500 tài khoản." : ""}
                </div>
              )}
              {settings?.lastSyncMessage && !syncResult && (
                <p className="mt-3 rounded-lg bg-[#F7FAFC] p-2.5 text-[10px] leading-4 text-[#60758A]">
                  {settings.lastSyncMessage}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-[#E0E9EF] p-4">
              <div className="flex items-center gap-2">
                <FileKey2 size={17} className="text-[#6841C6]" />
                <h3 className="text-xs font-extrabold text-[#193B57]">
                  Lịch sử cấu hình
                </h3>
              </div>
              {auditQuery.isLoading ? (
                <p className="mt-3 text-[11px] text-[#71869A]">Đang tải...</p>
              ) : auditQuery.data?.length ? (
                <div className="mt-3 space-y-2">
                  {auditQuery.data.map(entry => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-[#EDF2F5] bg-[#FBFCFD] p-2.5"
                    >
                      <p className="text-[10px] font-bold text-[#193B57]">
                        {entry.summary}
                      </p>
                      <p className="mt-1 text-[9px] text-[#8AA0B6]">
                        {entry.actorName || "Quản trị viên"} · {formatDate(entry.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-[#8AA0B6]">
                  Chưa có thay đổi nào.
                </p>
              )}
            </section>
          </aside>
        </div>

        <footer className="mt-5 flex flex-col-reverse gap-3 border-t border-[#E7EEF3] pt-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex items-center gap-2 text-[11px] leading-5 text-[#71869A]">
            <DatabaseZap size={15} className="shrink-0 text-[#2666A8]" />
            Lưu thay đổi sẽ tự tắt cấu hình đang active cho đến khi kiểm tra và kích hoạt lại.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(normalizeSettings(settings));
                setDirty(false);
              }}
              disabled={!dirty || saveMutation.isPending}
              className="rounded-lg border border-[#DDE7F0] bg-white px-3.5 py-2 text-xs font-bold text-[#60758A] disabled:opacity-45"
            >
              Hoàn tác
            </button>
            <button
              type="button"
              onClick={() =>
                saveMutation.mutate({
                  ...draft,
                  clientSecretRef: draft.clientSecretRef || null,
                })
              }
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2666A8] px-3.5 py-2 text-xs font-extrabold text-white shadow-[0_5px_12px_rgba(38,102,168,.18)] disabled:opacity-55"
            >
              {saveMutation.isPending && <Loader2 className="animate-spin" size={14} />}
              Lưu nháp
            </button>
            <button
              type="button"
              onClick={() => testMutation.mutate()}
              disabled={!settings || !isSelfHosted || testMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2666A8] bg-white px-3.5 py-2 text-xs font-extrabold text-[#2666A8] disabled:opacity-50"
            >
              {testMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
              Kiểm tra kết nối
            </button>
            {settings?.status === "active" ? (
              <button
                type="button"
                onClick={() => statusMutation.mutate({ status: "disabled" })}
                disabled={statusMutation.isPending}
                className="rounded-lg border border-[#E6BBBB] bg-white px-3.5 py-2 text-xs font-extrabold text-[#B44545] disabled:opacity-50"
              >
                Tắt Entra ID
              </button>
            ) : (
              <button
                type="button"
                onClick={() => statusMutation.mutate({ status: "active" })}
                disabled={
                  settings?.lastTestStatus !== "success" ||
                  statusMutation.isPending
                }
                className="rounded-lg bg-[#193B57] px-3.5 py-2 text-xs font-extrabold text-white disabled:opacity-50"
              >
                Kích hoạt Entra ID
              </button>
            )}
          </div>
        </footer>
      </div>
    </section>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#71869A]">{label}</span>
      <span className={`inline-flex items-center gap-1 font-bold ${ok ? "text-[#087A6A]" : "text-[#B44545]"}`}>
        {ok ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
        {ok ? "Sẵn sàng" : "Chưa sẵn sàng"}
      </span>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  help,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
  className?: string;
}) {
  return (
    <label className={`block text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A] ${className}`}>
      {label}
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-10 w-full rounded-lg border border-[#D7E3EB] bg-white px-3 text-[11px] font-medium normal-case tracking-normal text-[#193B57] outline-none focus:border-[#2666A8] focus:ring-2 focus:ring-[#EAF3FF]"
      />
      {help && (
        <span className="mt-1.5 block text-[9px] font-medium normal-case leading-4 tracking-normal text-[#8AA0B6]">
          {help}
        </span>
      )}
    </label>
  );
}
