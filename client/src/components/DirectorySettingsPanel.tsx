import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  DatabaseZap,
  FileKey2,
  Loader2,
  Network,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type DirectoryDraft = {
  ldapUrl: string;
  usersDn: string;
  groupsDn: string;
  bindDn: string;
  bindSecretRef: string;
  loginAttribute: string;
  emailAttribute: string;
  displayNameAttribute: string;
  directoryIdAttribute: string;
  departmentAttribute: string;
  jobTitleAttribute: string;
  adminGroupDn: string;
  userGroupDn: string;
  allowNestedGroups: boolean;
  caCertificatePem: string;
};

const initialDraft: DirectoryDraft = {
  ldapUrl: "",
  usersDn: "",
  groupsDn: "",
  bindDn: "",
  bindSecretRef: "/run/secrets/assetmaster_ldap_bind_password",
  loginAttribute: "userPrincipalName",
  emailAttribute: "userPrincipalName",
  displayNameAttribute: "displayName",
  directoryIdAttribute: "objectGUID",
  departmentAttribute: "department",
  jobTitleAttribute: "title",
  adminGroupDn: "",
  userGroupDn: "",
  allowNestedGroups: false,
  caCertificatePem: "",
};

function normalizeSettings(value: any): DirectoryDraft {
  if (!value) return initialDraft;
  return {
    ldapUrl: value.ldapUrl || "",
    usersDn: value.usersDn || "",
    groupsDn: value.groupsDn || "",
    bindDn: value.bindDn || "",
    bindSecretRef:
      value.bindSecretRef || "/run/secrets/assetmaster_ldap_bind_password",
    loginAttribute: value.loginAttribute || "userPrincipalName",
    emailAttribute: value.emailAttribute || "userPrincipalName",
    displayNameAttribute: value.displayNameAttribute || "displayName",
    directoryIdAttribute: value.directoryIdAttribute || "objectGUID",
    departmentAttribute: value.departmentAttribute || "department",
    jobTitleAttribute: value.jobTitleAttribute || "title",
    adminGroupDn: value.adminGroupDn || "",
    userGroupDn: value.userGroupDn || "",
    allowNestedGroups: Boolean(value.allowNestedGroups),
    caCertificatePem: value.caCertificatePem || "",
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

function TestPill({
  status,
}: {
  status: "not_tested" | "success" | "failed" | undefined;
}) {
  if (status === "success")
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#087A6A]">
        <CheckCircle2 size={14} />
        Đã kiểm tra
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#B44545]">
        <CircleAlert size={14} />
        Kiểm tra lỗi
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#8F5A00]">
      <CircleAlert size={14} />
      Chưa kiểm tra
    </span>
  );
}

export function DirectorySettingsPanel({
  onOpenUsers,
}: {
  onOpenUsers?: () => void;
}) {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const settingsQuery = trpc.directory.get.useQuery(undefined, {
    enabled: isAdmin,
  });
  const statusQuery = trpc.directory.publicStatus.useQuery();
  const auditQuery = trpc.directory.audit.useQuery(
    { limit: 8 },
    { enabled: isAdmin }
  );
  const [draft, setDraft] = useState<DirectoryDraft>(initialDraft);
  const [dirty, setDirty] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupResults, setGroupResults] = useState<
    Array<{ dn: string; name: string; description: string | null }>
  >([]);
  const [syncResult, setSyncResult] = useState<{
    scanned: number;
    synced: number;
    skipped: number;
    reachedLimit: boolean;
    users: Array<{
      email: string;
      name: string | null;
      role: "admin" | "user";
      status: "synced" | "skipped";
      reason?: string;
    }>;
  } | null>(null);
  const [visibleSyncUsers, setVisibleSyncUsers] = useState(20);
  const [operationSteps, setOperationSteps] = useState<
    Array<{ label: string; state: "waiting" | "active" | "done" | "error" }>
  >([]);

  useEffect(() => {
    const openDirectory = () => {
      setIsVisible(true);
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() =>
          document
            .getElementById("settings-directory")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        )
      );
    };
    window.addEventListener(
      "assetmaster:open-directory-settings",
      openDirectory
    );
    return () =>
      window.removeEventListener(
        "assetmaster:open-directory-settings",
        openDirectory
      );
  }, []);

  useEffect(() => {
    if (settingsQuery.data && !dirty)
      setDraft(normalizeSettings(settingsQuery.data));
  }, [dirty, settingsQuery.data]);

  const saveMutation = trpc.directory.save.useMutation({
    onSuccess: () => {
      setDirty(false);
      void utils.directory.get.invalidate();
      void utils.directory.audit.invalidate();
      void utils.directory.publicStatus.invalidate();
      toast.success("Đã lưu bản nháp Directory LDAP/AD.");
    },
    onError: error =>
      toast.error(error.message || "Không thể lưu cấu hình Directory."),
  });
  const testMutation = trpc.directory.test.useMutation({
    onSuccess: result => {
      void utils.directory.get.invalidate();
      void utils.directory.audit.invalidate();
      void utils.directory.publicStatus.invalidate();
      result.success
        ? toast.success(result.message)
        : toast.error(result.message);
    },
    onError: error => toast.error(error.message || "Không thể kiểm tra LDAPS."),
  });
  const testDraftMutation = trpc.directory.testDraft.useMutation({
    onMutate: () =>
      setOperationSteps([
        { label: "Chuẩn hóa thông số bản nháp", state: "done" },
        { label: "Bắt tay TLS và kiểm tra CA", state: "active" },
        { label: "Xác thực tài khoản bind", state: "waiting" },
        { label: "Kiểm tra Users Base DN", state: "waiting" },
      ]),
    onSuccess: result => {
      setOperationSteps(
        result.success
          ? [
              { label: "Chuẩn hóa thông số bản nháp", state: "done" },
              { label: "Bắt tay TLS và kiểm tra CA", state: "done" },
              { label: "Xác thực tài khoản bind", state: "done" },
              { label: "Kiểm tra Users Base DN", state: "done" },
            ]
          : [{ label: "Không hoàn tất kiểm tra LDAPS", state: "error" }]
      );
      result.success
        ? toast.success(result.message)
        : toast.error(result.message);
    },
    onError: error => {
      setOperationSteps([
        { label: "Không hoàn tất kiểm tra LDAPS", state: "error" },
      ]);
      toast.error(error.message || "Không thể kiểm tra bản nháp LDAPS.");
    },
  });
  const groupSearchMutation = trpc.directory.searchGroups.useMutation({
    onSuccess: groups => {
      setGroupResults(groups);
      if (!groups.length) toast.message("Không tìm thấy nhóm phù hợp.");
    },
    onError: error => {
      setGroupResults([]);
      toast.error(error.message || "Không thể tìm kiếm nhóm LDAPS.");
    },
  });
  const syncUsersMutation = trpc.directory.syncUsers.useMutation({
    onMutate: () => {
      setSyncResult(null);
      setVisibleSyncUsers(20);
      setOperationSteps([
        { label: "Xác thực kết nối và tài khoản bind", state: "done" },
        {
          label: "Đọc các trang Directory, 100 tài khoản/lượt",
          state: "active",
        },
        { label: "Ánh xạ nhóm sang quyền website", state: "waiting" },
        {
          label: "Lưu metadata tài khoản, không lưu mật khẩu",
          state: "waiting",
        },
      ]);
    },
    onSuccess: result => {
      setSyncResult(result);
      setOperationSteps([
        { label: "Xác thực kết nối và tài khoản bind", state: "done" },
        { label: "Đọc các trang Directory, 100 tài khoản/lượt", state: "done" },
        { label: "Ánh xạ nhóm sang quyền website", state: "done" },
        { label: "Lưu metadata tài khoản, không lưu mật khẩu", state: "done" },
      ]);
      toast.success(`Đã đồng bộ ${result.synced} tài khoản Directory.`);
    },
    onError: error => {
      setOperationSteps([
        { label: "Không hoàn tất đồng bộ Directory", state: "error" },
      ]);
      toast.error(error.message || "Không thể đồng bộ tài khoản Directory.");
    },
  });
  const statusMutation = trpc.directory.setStatus.useMutation({
    onSuccess: settings => {
      setDirty(false);
      void utils.directory.get.invalidate();
      void utils.directory.audit.invalidate();
      void utils.directory.publicStatus.invalidate();
      toast.success(
        settings?.status === "active"
          ? "Đã kích hoạt xác thực LDAPS."
          : "Đã tắt xác thực LDAPS."
      );
    },
    onError: error =>
      toast.error(error.message || "Không thể cập nhật trạng thái LDAPS."),
  });

  const isSelfHosted = statusQuery.data?.selfHosted === true;
  const settings = settingsQuery.data;
  const lastTest = useMemo(
    () =>
      settings?.lastTestedAt
        ? new Intl.DateTimeFormat("vi-VN", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(settings.lastTestedAt))
        : "Chưa kiểm tra",
    [settings?.lastTestedAt]
  );
  const update = <K extends keyof DirectoryDraft>(
    key: K,
    value: DirectoryDraft[K]
  ) => {
    setDirty(true);
    setDraft(current => ({ ...current, [key]: value }));
  };

  if (authLoading) return null;
  if (!isAdmin) return null;
  if (!isVisible)
    return (
      <div
        id="settings-directory"
        data-directory-settings-anchor
        aria-hidden="true"
      />
    );

  return (
    <section
      id="settings-directory"
      data-directory-settings
      className="mx-auto mt-5 w-[calc(100%-2rem)] max-w-[1100px] rounded-xl border border-[#CDE5E5] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]"
    >
      <header className="flex flex-col gap-4 border-b border-[#DDECEB] bg-[linear-gradient(120deg,#F6FCFB_0%,#FFFFFF_72%)] px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]">
              <Network size={18} />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#0F8C8C]">
                Xác thực nội bộ
              </div>
              <h2 className="mt-0.5 font-display text-xl font-extrabold tracking-[-.035em] text-[#102A43]">
                Directory LDAP / Active Directory
              </h2>
            </div>
            <StatusPill status={settings?.status} />
          </div>
          <p className="mt-3 max-w-2xl text-xs leading-5 text-[#60758A]">
            Thiết lập kết nối <b>LDAPS</b>, ánh xạ hồ sơ và nhóm quyền. Mật khẩu
            nhân viên không đi qua hoặc lưu trong cấu hình; mật khẩu tài khoản
            bind được đọc từ Docker secret hoặc tệp secret Linux giới hạn quyền.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <div className="rounded-xl border border-[#DCEDEA] bg-white px-3 py-2.5 text-right shadow-sm">
            <div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#8AA0B6]">
              Trạng thái môi trường
            </div>
            <div
              className={`mt-1 text-xs font-extrabold ${isSelfHosted ? "text-[#087A6A]" : "text-[#A86B00]"}`}
            >
              {isSelfHosted
                ? "Self-hosted đã bật"
                : "Bản Manus — chỉ xem trước"}
            </div>
            <div className="mt-1">
              <TestPill status={settings?.lastTestStatus} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#DDE7F0] bg-white text-[#71869A] transition hover:bg-[#F4F7F9] hover:text-[#193B57]"
            aria-label="Ẩn cấu hình Directory"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {!isSelfHosted && (
        <div className="mx-4 mt-4 flex gap-3 rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-3.5 text-xs leading-5 text-[#8F5A00] sm:mx-6">
          <CircleAlert className="mt-0.5 shrink-0" size={16} />
          <p>
            <b>Chế độ staging an toàn.</b> Bạn có thể lưu bản nháp và xem cấu
            hình tại đây. Nút kiểm tra/kích hoạt chỉ chạy khi source được triển
            khai nội bộ với <code>SELF_HOSTED_AUTH_ENABLED=true</code> và Docker
            secret đã mount.
          </p>
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,.82fr)]">
          <div className="space-y-4">
            <fieldset className="rounded-xl border border-[#E0E9EF] p-4">
              <legend className="px-1 text-xs font-extrabold text-[#193B57]">
                Máy chủ và phạm vi tìm kiếm
              </legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <InputField
                  label="URL LDAPS"
                  value={draft.ldapUrl}
                  onChange={value => update("ldapUrl", value)}
                  placeholder="ldaps://dc01.congty.local:636"
                  required
                  className="sm:col-span-2"
                  help="Chỉ sử dụng LDAPS; không dùng ldap:// hoặc port 389."
                />
                <InputField
                  label="Users Base DN"
                  value={draft.usersDn}
                  onChange={value => update("usersDn", value)}
                  placeholder="OU=Users,DC=congty,DC=local"
                  required
                  className="sm:col-span-2"
                />
                <InputField
                  label="Groups Base DN"
                  value={draft.groupsDn}
                  onChange={value => update("groupsDn", value)}
                  placeholder="OU=Groups,DC=congty,DC=local"
                  className="sm:col-span-2"
                />
              </div>
            </fieldset>
            <fieldset className="rounded-xl border border-[#E0E9EF] p-4">
              <legend className="px-1 text-xs font-extrabold text-[#193B57]">
                Tài khoản truy vấn và chứng chỉ
              </legend>
              <p className="mt-1 text-[11px] leading-5 text-[#71869A]">
                Tài khoản bind chỉ cần quyền đọc Users/Groups. Nhập đường dẫn
                tệp secret do đội vận hành tạo, không nhập mật khẩu vào ứng
                dụng.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <InputField
                  label="Bind DN"
                  value={draft.bindDn}
                  onChange={value => update("bindDn", value)}
                  placeholder="CN=svc-assetmaster,OU=Service Accounts,..."
                  className="sm:col-span-2"
                />
                <InputField
                  label="Tệp secret LDAP"
                  value={draft.bindSecretRef}
                  onChange={value => update("bindSecretRef", value)}
                  placeholder="/run/secrets/... hoặc /etc/assetmaster/secrets/..."
                  className="sm:col-span-2"
                  help="Chỉ chấp nhận Docker /run/secrets/ hoặc Linux native /etc/assetmaster/secrets/."
                />
                <TextAreaField
                  label="CA certificate PEM"
                  value={draft.caCertificatePem}
                  onChange={value => update("caCertificatePem", value)}
                  placeholder="-----BEGIN CERTIFICATE-----"
                  help="Dán CA nội bộ khi máy chủ chưa trust chain AD. Chứng chỉ không phải mật khẩu."
                />
              </div>
            </fieldset>
            <fieldset className="rounded-xl border border-[#E0E9EF] p-4">
              <legend className="px-1 text-xs font-extrabold text-[#193B57]">
                Ánh xạ thuộc tính tài khoản
              </legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InputField
                  label="Login"
                  value={draft.loginAttribute}
                  onChange={value => update("loginAttribute", value)}
                />
                <InputField
                  label="Email"
                  value={draft.emailAttribute}
                  onChange={value => update("emailAttribute", value)}
                  help="AD Windows Server thường để trống mail; dùng userPrincipalName nếu nhân viên đăng nhập bằng email nội bộ."
                />
                <InputField
                  label="Tên hiển thị"
                  value={draft.displayNameAttribute}
                  onChange={value => update("displayNameAttribute", value)}
                />
                <InputField
                  label="ID bất biến"
                  value={draft.directoryIdAttribute}
                  onChange={value => update("directoryIdAttribute", value)}
                  help="AD thường dùng objectGUID."
                />
                <InputField
                  label="Phòng ban"
                  value={draft.departmentAttribute}
                  onChange={value => update("departmentAttribute", value)}
                />
                <InputField
                  label="Chức vụ"
                  value={draft.jobTitleAttribute}
                  onChange={value => update("jobTitleAttribute", value)}
                />
              </div>
            </fieldset>
            <fieldset className="rounded-xl border border-[#E0E9EF] p-4">
              <legend className="px-1 text-xs font-extrabold text-[#193B57]">
                Ánh xạ nhóm quyền AssetMaster
              </legend>
              <p className="mt-1 text-[11px] leading-5 text-[#71869A]">
                Mỗi email LDAPS chỉ truy cập khi thuộc một nhóm được ánh xạ. Nếu
                trùng hai nhóm, quyền Quản trị viên được ưu tiên.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#C9DDF5] bg-[#F4F9FF] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-[#2666A8]">
                      Quản trị viên
                    </span>
                    <span className="rounded-full bg-[#EAF3FF] px-2 py-0.5 text-[9px] font-extrabold text-[#2666A8]">
                      Toàn quyền
                    </span>
                  </div>
                  <InputField
                    label="DN nhóm Admin"
                    value={draft.adminGroupDn}
                    onChange={value => update("adminGroupDn", value)}
                    placeholder="CN=AssetMaster-Admins,OU=Groups,..."
                  />
                  <p className="mt-2 text-[10px] leading-4 text-[#60758A]">
                    Cài đặt Directory, phân quyền, dữ liệu và các thao tác quản
                    trị.
                  </p>
                </div>
                <div className="rounded-xl border border-[#DDE7F0] bg-[#FBFCFD] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-[#193B57]">
                      Nhân viên
                    </span>
                    <span className="rounded-full bg-[#F0F5F8] px-2 py-0.5 text-[9px] font-extrabold text-[#60758A]">
                      Quyền người dùng
                    </span>
                  </div>
                  <InputField
                    label="DN nhóm User"
                    value={draft.userGroupDn}
                    onChange={value => update("userGroupDn", value)}
                    placeholder="CN=AssetMaster-Users,OU=Groups,..."
                  />
                  <p className="mt-2 text-[10px] leading-4 text-[#60758A]">
                    Xem dashboard và dữ liệu theo phạm vi được cấp trong
                    website.
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-dashed border-[#DDE7F0] bg-[#FBFCFD] px-3 py-2.5 text-[10px] leading-4 text-[#71869A]">
                <b className="text-[#193B57]">Ngoài nhóm được ánh xạ:</b> từ
                chối đăng nhập. Quyền cấp trực tiếp cho Admin hiện hữu không tự
                bị hạ bởi lần đồng bộ LDAP.
              </div>
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg bg-[#F8FBFC] p-3 text-[11px] leading-5 text-[#60758A]">
                <input
                  checked={draft.allowNestedGroups}
                  onChange={event =>
                    update("allowNestedGroups", event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 accent-[#0F8C8C]"
                  type="checkbox"
                />
                <span>
                  <b className="text-[#193B57]">Có nhóm lồng nhau</b>
                  <br />
                  Chỉ bật nếu AD doanh nghiệp dùng nested groups và mô-đun LDAPS
                  đã được cấu hình matching rule tương ứng.
                </span>
              </label>
            </fieldset>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-[#DCEDEA] bg-[#F8FCFB] p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 text-[#087A6A]" size={18} />
                <div>
                  <h3 className="text-xs font-extrabold text-[#193B57]">
                    Trình tự an toàn
                  </h3>
                  <p className="mt-1 text-[11px] leading-5 text-[#60758A]">
                    Lưu nháp, mount secret, kiểm tra kết nối thành công, rồi mới
                    kích hoạt. Admin bootstrap vẫn là lối vào break-glass khi
                    Directory gặp sự cố.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-[#DCEDEA] pt-3 text-[11px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#71869A]">Lần kiểm tra gần nhất</span>
                  <b className="text-right text-[#193B57]">{lastTest}</b>
                </div>
                {settings?.lastTestMessage && (
                  <p
                    className={`rounded-lg p-2.5 leading-5 ${settings.lastTestStatus === "success" ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-[#FDEDEE] text-[#B44545]"}`}
                  >
                    {settings.lastTestMessage}
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-xl border border-[#E0E9EF] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-extrabold text-[#193B57]">
                    Kiểm tra và tìm nhóm
                  </h3>
                  <p className="mt-1 text-[11px] leading-5 text-[#71869A]">
                    Dùng chính thông số đang nhập, không lưu bản nháp khi kiểm
                    tra.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => testDraftMutation.mutate(draft)}
                  disabled={!isSelfHosted || testDraftMutation.isPending}
                  title={
                    !isSelfHosted
                      ? "Chỉ khả dụng trên server self-hosted"
                      : undefined
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-[10px] font-extrabold text-[#087A6A] disabled:opacity-50"
                >
                  {testDraftMutation.isPending && (
                    <Loader2 className="animate-spin" size={13} />
                  )}
                  Kiểm tra bản nháp
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={groupSearch}
                  onChange={event => setGroupSearch(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      groupSearchMutation.mutate({
                        settings: draft,
                        query: groupSearch,
                      });
                    }
                  }}
                  placeholder="Tìm tên nhóm LDAPS"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-[#D7E3EB] bg-white px-3 text-[11px] font-medium text-[#193B57] outline-none placeholder:text-[#AAB9C6] focus:border-[#0F8C8C]"
                />
                <button
                  type="button"
                  onClick={() =>
                    groupSearchMutation.mutate({
                      settings: draft,
                      query: groupSearch,
                    })
                  }
                  disabled={!isSelfHosted || groupSearchMutation.isPending}
                  className="rounded-lg border border-[#DDE7F0] bg-white px-3 text-[10px] font-extrabold text-[#526779] disabled:opacity-50"
                >
                  Tìm
                </button>
              </div>
              {groupResults.length > 0 && (
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {groupResults.map(group => (
                    <div
                      key={group.dn}
                      className="rounded-lg border border-[#E7EEF3] bg-white p-2.5"
                    >
                      <p
                        className="truncate text-[11px] font-extrabold text-[#193B57]"
                        title={group.dn}
                      >
                        {group.name}
                      </p>
                      {group.description && (
                        <p className="mt-0.5 truncate text-[10px] text-[#71869A]">
                          {group.description}
                        </p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => update("adminGroupDn", group.dn)}
                          className="rounded-md bg-[#EAF3FF] px-2 py-1 text-[9px] font-extrabold text-[#2666A8]"
                        >
                          Gán Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => update("userGroupDn", group.dn)}
                          className="rounded-md bg-[#EEF4F7] px-2 py-1 text-[9px] font-extrabold text-[#526779]"
                        >
                          Gán User
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="rounded-xl border border-[#E0E9EF] p-4">
              <div className="flex items-center gap-2">
                <UsersRound size={17} className="text-[#2666A8]" />
                <div>
                  <h3 className="text-xs font-extrabold text-[#193B57]">
                    Đồng bộ và quản lý tài khoản
                  </h3>
                  <p className="mt-1 text-[11px] leading-5 text-[#71869A]">
                    Nạp tối đa 500 tài khoản, truy vấn theo lô 100 và tải thêm
                    20 kết quả/lần để rà soát mượt mà. Không đồng bộ mật khẩu
                    nhân viên.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => syncUsersMutation.mutate({ limit: 500 })}
                  disabled={
                    !isSelfHosted ||
                    syncUsersMutation.isPending ||
                    settings?.lastTestStatus !== "success"
                  }
                  title={
                    settings?.lastTestStatus !== "success"
                      ? "Cần lưu và kiểm tra LDAPS thành công trước"
                      : undefined
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9DDF5] bg-[#F4F9FF] px-3 py-2 text-[10px] font-extrabold text-[#2666A8] disabled:opacity-50"
                >
                  {syncUsersMutation.isPending && (
                    <Loader2 className="animate-spin" size={13} />
                  )}
                  Đồng bộ 500 tài khoản
                </button>
                <button
                  type="button"
                  onClick={onOpenUsers}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#2666A8] hover:text-[#1E5084]"
                >
                  Mở danh sách tài khoản <span aria-hidden="true">→</span>
                </button>
              </div>
              {syncResult && (
                <p className="mt-3 rounded-lg bg-[#F6FCFB] p-2.5 text-[10px] leading-4 text-[#087A6A]">
                  Đã quét {syncResult.scanned}; đồng bộ {syncResult.synced}; bỏ
                  qua {syncResult.skipped}. Xem danh sách để kiểm tra quyền.
                </p>
              )}
            </section>
            <section className="rounded-xl border border-[#E0E9EF] p-4">
              <div className="flex items-center gap-2">
                <FileKey2 size={17} className="text-[#6841C6]" />
                <div>
                  <h3 className="text-xs font-extrabold text-[#193B57]">
                    Lịch sử cấu hình
                  </h3>
                  <p className="mt-1 text-[11px] text-[#71869A]">
                    Không lưu mật khẩu, chỉ lưu metadata và người thực hiện.
                  </p>
                </div>
              </div>
              {auditQuery.isLoading ? (
                <div className="mt-3 flex items-center gap-2 text-[11px] text-[#71869A]">
                  <Loader2 className="animate-spin" size={14} />
                  Đang tải lịch sử...
                </div>
              ) : auditQuery.data?.length ? (
                <div className="mt-3 space-y-2">
                  {auditQuery.data.map(entry => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-[#EDF2F5] bg-[#FBFCFD] p-2.5"
                    >
                      <div className="text-[11px] font-bold text-[#193B57]">
                        {entry.summary}
                      </div>
                      <div className="mt-1 text-[10px] text-[#8AA0B6]">
                        {entry.actorName || "Quản trị viên"} ·{" "}
                        {new Intl.DateTimeFormat("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(entry.createdAt))}
                      </div>
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
        <DirectoryOperationProgress
          steps={operationSteps}
          result={syncResult}
          visibleCount={visibleSyncUsers}
          onLoadMore={() =>
            setVisibleSyncUsers(current =>
              Math.min(current + 20, syncResult?.users.length || current)
            )
          }
        />
        <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-[#E7EEF3] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-[11px] leading-5 text-[#71869A]">
            <DatabaseZap size={15} className="shrink-0 text-[#0F8C8C]" />
            Lưu nháp sẽ tự tắt cấu hình đang active cho đến khi kiểm tra/kích
            hoạt lại.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(normalizeSettings(settings));
                setDirty(false);
              }}
              disabled={!dirty || saveMutation.isPending}
              className="rounded-lg border border-[#DDE7F0] bg-white px-3.5 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Hoàn tác nháp
            </button>
            <button
              type="button"
              onClick={() =>
                saveMutation.mutate({
                  ...draft,
                  groupsDn: draft.groupsDn || null,
                  bindDn: draft.bindDn || null,
                  bindSecretRef: draft.bindSecretRef || null,
                  adminGroupDn: draft.adminGroupDn || null,
                  userGroupDn: draft.userGroupDn || null,
                  caCertificatePem: draft.caCertificatePem || null,
                })
              }
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-3.5 py-2 text-xs font-extrabold text-white shadow-[0_5px_12px_rgba(15,140,140,.18)] hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saveMutation.isPending && (
                <Loader2 className="animate-spin" size={14} />
              )}
              Lưu nháp
            </button>
            <button
              type="button"
              onClick={() => testMutation.mutate()}
              disabled={
                !isSelfHosted ||
                testMutation.isPending ||
                saveMutation.isPending
              }
              title={
                !isSelfHosted
                  ? "Chỉ khả dụng trên server self-hosted"
                  : undefined
              }
              className="inline-flex items-center gap-2 rounded-lg border border-[#2666A8] bg-white px-3.5 py-2 text-xs font-extrabold text-[#2666A8] hover:bg-[#EAF3FF] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testMutation.isPending ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <RefreshCw size={14} />
              )}
              Kiểm tra LDAPS
            </button>
            {settings?.status === "active" ? (
              <button
                type="button"
                onClick={() => statusMutation.mutate({ status: "disabled" })}
                disabled={!isSelfHosted || statusMutation.isPending}
                className="rounded-lg border border-[#E6BBBB] bg-white px-3.5 py-2 text-xs font-extrabold text-[#B44545] hover:bg-[#FFF5F5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tắt LDAPS
              </button>
            ) : (
              <button
                type="button"
                onClick={() => statusMutation.mutate({ status: "active" })}
                disabled={
                  !isSelfHosted ||
                  settings?.lastTestStatus !== "success" ||
                  statusMutation.isPending
                }
                title={
                  settings?.lastTestStatus !== "success"
                    ? "Cần kiểm tra LDAPS thành công trước"
                    : undefined
                }
                className="rounded-lg bg-[#193B57] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#102A43] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Kích hoạt LDAPS
              </button>
            )}
          </div>
        </footer>
      </div>
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  required,
  help,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  help?: string;
  className?: string;
}) {
  return (
    <label
      className={`block min-w-0 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A] ${className}`}
    >
      {label}
      {required && <span className="ml-1 text-[#B44545]">*</span>}
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-9 w-full rounded-lg border border-[#D7E3EB] bg-white px-3 text-xs font-medium normal-case tracking-normal text-[#193B57] outline-none transition placeholder:text-[#AAB9C6] focus:border-[#0F8C8C] focus:ring-2 focus:ring-[#E6F6F2]"
      />
      {help && (
        <span className="mt-1 block normal-case tracking-normal text-[10px] font-medium leading-4 text-[#8AA0B6]">
          {help}
        </span>
      )}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
}) {
  return (
    <label className="block text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A] sm:col-span-2">
      {label}
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-[#D7E3EB] bg-white px-3 py-2 text-xs font-mono font-medium normal-case tracking-normal text-[#193B57] outline-none transition placeholder:font-sans placeholder:text-[#AAB9C6] focus:border-[#0F8C8C] focus:ring-2 focus:ring-[#E6F6F2]"
      />
      {help && (
        <span className="mt-1 block normal-case tracking-normal text-[10px] font-medium leading-4 text-[#8AA0B6]">
          {help}
        </span>
      )}
    </label>
  );
}

function DirectoryOperationProgress({
  steps,
  result,
  visibleCount,
  onLoadMore,
}: {
  steps: Array<{
    label: string;
    state: "waiting" | "active" | "done" | "error";
  }>;
  result: {
    scanned: number;
    synced: number;
    skipped: number;
    reachedLimit: boolean;
    users: Array<{
      email: string;
      name: string | null;
      role: "admin" | "user";
      status: "synced" | "skipped";
      reason?: string;
    }>;
  } | null;
  visibleCount: number;
  onLoadMore: () => void;
}) {
  if (!steps.length && !result) return null;
  const entries = result?.users.slice(0, visibleCount) || [];
  return (
    <section
      className="mt-5 rounded-xl border border-[#DCEDEA] bg-[#FBFEFD] p-4"
      data-directory-operation-progress
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-extrabold text-[#193B57]">
            Tiến trình Directory
          </h3>
          <p className="mt-0.5 text-[11px] text-[#71869A]">
            Chỉ hiển thị trạng thái kỹ thuật an toàn; không hiển thị secret hoặc
            mật khẩu.
          </p>
        </div>
        {steps.some(step => step.state === "active") && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3FF] px-2.5 py-1 text-[10px] font-extrabold text-[#2666A8]">
            <Loader2 className="animate-spin" size={12} />
            Đang xử lý
          </span>
        )}
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(step => (
          <li
            key={step.label}
            className={`rounded-lg border px-2.5 py-2 text-[10px] font-bold ${step.state === "done" ? "border-[#CDE5E5] bg-[#F2FBF8] text-[#087A6A]" : step.state === "active" ? "border-[#C9DDF5] bg-[#F4F9FF] text-[#2666A8]" : step.state === "error" ? "border-[#F2CDCD] bg-[#FFF7F7] text-[#B44545]" : "border-[#E7EEF3] bg-white text-[#71869A]"}`}
          >
            {step.state === "active"
              ? "Đang thực hiện · "
              : step.state === "done"
                ? "Hoàn tất · "
                : step.state === "error"
                  ? "Cần xử lý · "
                  : "Chờ · "}
            {step.label}
          </li>
        ))}
      </ol>
      {result && (
        <>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-white px-3 py-2 text-[11px] text-[#526779]">
            <span>
              Đã quét: <b className="text-[#193B57]">{result.scanned}</b>
            </span>
            <span>
              Đồng bộ: <b className="text-[#087A6A]">{result.synced}</b>
            </span>
            <span>
              Bỏ qua: <b className="text-[#A86B00]">{result.skipped}</b>
            </span>
            {result.reachedLimit && (
              <span className="text-[#A86B00]">
                Đã chạm giới hạn lượt đồng bộ; có thể chạy lại.
              </span>
            )}
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-[#E7EEF3] bg-white">
            <div className="grid grid-cols-[minmax(0,1fr)_72px_86px] gap-2 border-b border-[#E7EEF3] bg-[#F8FBFC] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[.06em] text-[#71869A]">
              <span>Tài khoản</span>
              <span>Quyền</span>
              <span>Trạng thái</span>
            </div>
            {entries.map(entry => (
              <div
                key={`${entry.email}-${entry.status}`}
                className="grid grid-cols-[minmax(0,1fr)_72px_86px] gap-2 border-b border-[#F0F4F6] px-3 py-2 text-[11px] last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#193B57]">
                    {entry.name || entry.email}
                  </p>
                  <p className="truncate text-[10px] text-[#71869A]">
                    {entry.email}
                    {entry.reason ? ` · ${entry.reason}` : ""}
                  </p>
                </div>
                <span className="self-center text-[10px] font-bold text-[#526779]">
                  {entry.role === "admin" ? "Admin" : "User"}
                </span>
                <span
                  className={`self-center text-[10px] font-extrabold ${entry.status === "synced" ? "text-[#087A6A]" : "text-[#A86B00]"}`}
                >
                  {entry.status === "synced" ? "Đồng bộ" : "Bỏ qua"}
                </span>
              </div>
            ))}
          </div>
          {visibleCount < (result?.users.length || 0) && (
            <button
              type="button"
              onClick={onLoadMore}
              className="mt-3 w-full rounded-lg border border-[#DDE7F0] bg-white px-3 py-2 text-[11px] font-extrabold text-[#2666A8] hover:bg-[#F4F9FF]"
            >
              Tải thêm 20 tài khoản (
              {Math.min(visibleCount, result.users.length)}/
              {result.users.length})
            </button>
          )}
        </>
      )}
    </section>
  );
}
