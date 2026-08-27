import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, DatabaseZap, FileKey2, Loader2, Network, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
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
  loginAttribute: "mail",
  emailAttribute: "mail",
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
    bindSecretRef: value.bindSecretRef || "/run/secrets/assetmaster_ldap_bind_password",
    loginAttribute: value.loginAttribute || "mail",
    emailAttribute: value.emailAttribute || "mail",
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

function StatusPill({ status }: { status: "draft" | "active" | "disabled" | undefined }) {
  const detail = status === "active" ? ["Đang kích hoạt", "bg-[#E6F6F2] text-[#087A6A]"] : status === "disabled" ? ["Đã tắt", "bg-[#F4F7F9] text-[#60758A]"] : ["Bản nháp", "bg-[#FFF5DC] text-[#A86B00]"];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${detail[1]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{detail[0]}</span>;
}

function TestPill({ status }: { status: "not_tested" | "success" | "failed" | undefined }) {
  if (status === "success") return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#087A6A]"><CheckCircle2 size={14} />Đã kiểm tra</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#B44545]"><CircleAlert size={14} />Kiểm tra lỗi</span>;
  return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#8F5A00]"><CircleAlert size={14} />Chưa kiểm tra</span>;
}

export function DirectorySettingsPanel({ onOpenUsers }: { onOpenUsers?: () => void }) {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const settingsQuery = trpc.directory.get.useQuery(undefined, { enabled: isAdmin });
  const statusQuery = trpc.directory.publicStatus.useQuery();
  const auditQuery = trpc.directory.audit.useQuery({ limit: 8 }, { enabled: isAdmin });
  const [draft, setDraft] = useState<DirectoryDraft>(initialDraft);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settingsQuery.data && !dirty) setDraft(normalizeSettings(settingsQuery.data));
  }, [dirty, settingsQuery.data]);

  const saveMutation = trpc.directory.save.useMutation({
    onSuccess: () => {
      setDirty(false);
      void utils.directory.get.invalidate();
      void utils.directory.audit.invalidate();
      void utils.directory.publicStatus.invalidate();
      toast.success("Đã lưu bản nháp Directory LDAP/AD.");
    },
    onError: (error) => toast.error(error.message || "Không thể lưu cấu hình Directory."),
  });
  const testMutation = trpc.directory.test.useMutation({
    onSuccess: (result) => {
      void utils.directory.get.invalidate();
      void utils.directory.audit.invalidate();
      void utils.directory.publicStatus.invalidate();
      result.success ? toast.success(result.message) : toast.error(result.message);
    },
    onError: (error) => toast.error(error.message || "Không thể kiểm tra LDAPS."),
  });
  const statusMutation = trpc.directory.setStatus.useMutation({
    onSuccess: (settings) => {
      setDirty(false);
      void utils.directory.get.invalidate();
      void utils.directory.audit.invalidate();
      void utils.directory.publicStatus.invalidate();
      toast.success(settings?.status === "active" ? "Đã kích hoạt xác thực LDAPS." : "Đã tắt xác thực LDAPS.");
    },
    onError: (error) => toast.error(error.message || "Không thể cập nhật trạng thái LDAPS."),
  });

  const isSelfHosted = statusQuery.data?.selfHosted === true;
  const settings = settingsQuery.data;
  const lastTest = useMemo(() => settings?.lastTestedAt ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(settings.lastTestedAt)) : "Chưa kiểm tra", [settings?.lastTestedAt]);
  const update = <K extends keyof DirectoryDraft>(key: K, value: DirectoryDraft[K]) => { setDirty(true); setDraft((current) => ({ ...current, [key]: value })); };

  if (authLoading) return null;
  if (!isAdmin) return null;

  return <section id="settings-directory" data-directory-settings className="mx-auto mt-5 w-[calc(100%-2rem)] max-w-[1100px] rounded-xl border border-[#CDE5E5] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]">
    <header className="flex flex-col gap-4 border-b border-[#DDECEB] bg-[linear-gradient(120deg,#F6FCFB_0%,#FFFFFF_72%)] px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><Network size={18} /></div><div><div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#0F8C8C]">Xác thực nội bộ</div><h2 className="mt-0.5 font-display text-xl font-extrabold tracking-[-.035em] text-[#102A43]">Directory LDAP / Active Directory</h2></div><StatusPill status={settings?.status} /></div><p className="mt-3 max-w-2xl text-xs leading-5 text-[#60758A]">Thiết lập kết nối <b>LDAPS</b>, ánh xạ hồ sơ và nhóm quyền. Mật khẩu nhân viên không đi qua hoặc lưu trong cấu hình; mật khẩu tài khoản bind chỉ được mount dưới dạng Docker secret.</p></div>
      <div className="rounded-xl border border-[#DCEDEA] bg-white px-3 py-2.5 text-right shadow-sm"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#8AA0B6]">Trạng thái môi trường</div><div className={`mt-1 text-xs font-extrabold ${isSelfHosted ? "text-[#087A6A]" : "text-[#A86B00]"}`}>{isSelfHosted ? "Self-hosted đã bật" : "Bản Manus — chỉ xem trước"}</div><div className="mt-1"><TestPill status={settings?.lastTestStatus} /></div></div>
    </header>

    {!isSelfHosted && <div className="mx-4 mt-4 flex gap-3 rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-3.5 text-xs leading-5 text-[#8F5A00] sm:mx-6"><CircleAlert className="mt-0.5 shrink-0" size={16} /><p><b>Chế độ staging an toàn.</b> Bạn có thể lưu bản nháp và xem cấu hình tại đây. Nút kiểm tra/kích hoạt chỉ chạy khi source được triển khai nội bộ với <code>SELF_HOSTED_AUTH_ENABLED=true</code> và Docker secret đã mount.</p></div>}

    <div className="p-4 sm:p-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,.82fr)]">
        <div className="space-y-4">
          <fieldset className="rounded-xl border border-[#E0E9EF] p-4"><legend className="px-1 text-xs font-extrabold text-[#193B57]">Máy chủ và phạm vi tìm kiếm</legend><div className="mt-2 grid gap-3 sm:grid-cols-2"><InputField label="URL LDAPS" value={draft.ldapUrl} onChange={(value) => update("ldapUrl", value)} placeholder="ldaps://dc01.congty.local:636" required className="sm:col-span-2" help="Chỉ sử dụng LDAPS; không dùng ldap:// hoặc port 389." /><InputField label="Users Base DN" value={draft.usersDn} onChange={(value) => update("usersDn", value)} placeholder="OU=Users,DC=congty,DC=local" required className="sm:col-span-2" /><InputField label="Groups Base DN" value={draft.groupsDn} onChange={(value) => update("groupsDn", value)} placeholder="OU=Groups,DC=congty,DC=local" className="sm:col-span-2" /></div></fieldset>
          <fieldset className="rounded-xl border border-[#E0E9EF] p-4"><legend className="px-1 text-xs font-extrabold text-[#193B57]">Tài khoản truy vấn và chứng chỉ</legend><p className="mt-1 text-[11px] leading-5 text-[#71869A]">Tài khoản bind chỉ cần quyền đọc Users/Groups. Nhập đường dẫn secret đã được đội vận hành mount, không nhập mật khẩu vào ứng dụng.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><InputField label="Bind DN" value={draft.bindDn} onChange={(value) => update("bindDn", value)} placeholder="CN=svc-assetmaster,OU=Service Accounts,..." className="sm:col-span-2" /><InputField label="Docker secret reference" value={draft.bindSecretRef} onChange={(value) => update("bindSecretRef", value)} placeholder="/run/secrets/assetmaster_ldap_bind_password" className="sm:col-span-2" help="Bắt buộc nằm trong /run/secrets/." /><TextAreaField label="CA certificate PEM" value={draft.caCertificatePem} onChange={(value) => update("caCertificatePem", value)} placeholder="-----BEGIN CERTIFICATE-----" help="Dán CA nội bộ khi máy chủ chưa trust chain AD. Chứng chỉ không phải mật khẩu." /></div></fieldset>
          <fieldset className="rounded-xl border border-[#E0E9EF] p-4"><legend className="px-1 text-xs font-extrabold text-[#193B57]">Ánh xạ thuộc tính tài khoản</legend><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><InputField label="Login" value={draft.loginAttribute} onChange={(value) => update("loginAttribute", value)} /><InputField label="Email" value={draft.emailAttribute} onChange={(value) => update("emailAttribute", value)} /><InputField label="Tên hiển thị" value={draft.displayNameAttribute} onChange={(value) => update("displayNameAttribute", value)} /><InputField label="ID bất biến" value={draft.directoryIdAttribute} onChange={(value) => update("directoryIdAttribute", value)} help="AD thường dùng objectGUID." /><InputField label="Phòng ban" value={draft.departmentAttribute} onChange={(value) => update("departmentAttribute", value)} /><InputField label="Chức vụ" value={draft.jobTitleAttribute} onChange={(value) => update("jobTitleAttribute", value)} /></div></fieldset>
          <fieldset className="rounded-xl border border-[#E0E9EF] p-4"><legend className="px-1 text-xs font-extrabold text-[#193B57]">Nhóm quyền AssetMaster</legend><div className="mt-2 grid gap-3 sm:grid-cols-2"><InputField label="Nhóm Quản trị viên" value={draft.adminGroupDn} onChange={(value) => update("adminGroupDn", value)} placeholder="CN=AssetMaster-Admins,OU=Groups,..." /><InputField label="Nhóm Nhân viên" value={draft.userGroupDn} onChange={(value) => update("userGroupDn", value)} placeholder="CN=AssetMaster-Users,OU=Groups,..." /></div><label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg bg-[#F8FBFC] p-3 text-[11px] leading-5 text-[#60758A]"><input checked={draft.allowNestedGroups} onChange={(event) => update("allowNestedGroups", event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0F8C8C]" type="checkbox" /><span><b className="text-[#193B57]">Có nhóm lồng nhau</b><br />Chỉ bật nếu AD doanh nghiệp dùng nested groups và mô-đun LDAPS đã được cấu hình matching rule tương ứng.</span></label></fieldset>
        </div>

        <aside className="space-y-4"><section className="rounded-xl border border-[#DCEDEA] bg-[#F8FCFB] p-4"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 text-[#087A6A]" size={18} /><div><h3 className="text-xs font-extrabold text-[#193B57]">Trình tự an toàn</h3><p className="mt-1 text-[11px] leading-5 text-[#60758A]">Lưu nháp, mount secret, kiểm tra kết nối thành công, rồi mới kích hoạt. Admin bootstrap vẫn là lối vào break-glass khi Directory gặp sự cố.</p></div></div><div className="mt-4 space-y-2 border-t border-[#DCEDEA] pt-3 text-[11px]"><div className="flex items-center justify-between gap-3"><span className="text-[#71869A]">Lần kiểm tra gần nhất</span><b className="text-right text-[#193B57]">{lastTest}</b></div>{settings?.lastTestMessage && <p className={`rounded-lg p-2.5 leading-5 ${settings.lastTestStatus === "success" ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-[#FDEDEE] text-[#B44545]"}`}>{settings.lastTestMessage}</p>}</div></section>
          <section className="rounded-xl border border-[#E0E9EF] p-4"><div className="flex items-center gap-2"><UsersRound size={17} className="text-[#2666A8]" /><div><h3 className="text-xs font-extrabold text-[#193B57]">Quản lý tài khoản</h3><p className="mt-1 text-[11px] leading-5 text-[#71869A]">Sau lần LDAP login đầu tiên, hồ sơ được tạo/cập nhật bằng ID Directory bất biến. Role từ nhóm AD không hạ quyền Admin được chỉ định trực tiếp.</p></div></div><button type="button" onClick={onOpenUsers} className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#2666A8] hover:text-[#1E5084]">Mở danh sách tài khoản <span aria-hidden="true">→</span></button></section>
          <section className="rounded-xl border border-[#E0E9EF] p-4"><div className="flex items-center gap-2"><FileKey2 size={17} className="text-[#6841C6]" /><div><h3 className="text-xs font-extrabold text-[#193B57]">Lịch sử cấu hình</h3><p className="mt-1 text-[11px] text-[#71869A]">Không lưu mật khẩu, chỉ lưu metadata và người thực hiện.</p></div></div>{auditQuery.isLoading ? <div className="mt-3 flex items-center gap-2 text-[11px] text-[#71869A]"><Loader2 className="animate-spin" size={14} />Đang tải lịch sử...</div> : auditQuery.data?.length ? <div className="mt-3 space-y-2">{auditQuery.data.map((entry) => <div key={entry.id} className="rounded-lg border border-[#EDF2F5] bg-[#FBFCFD] p-2.5"><div className="text-[11px] font-bold text-[#193B57]">{entry.summary}</div><div className="mt-1 text-[10px] text-[#8AA0B6]">{entry.actorName || "Quản trị viên"} · {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.createdAt))}</div></div>)}</div> : <p className="mt-3 text-[11px] text-[#8AA0B6]">Chưa có thay đổi nào.</p>}</section></aside>
      </div>
      <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-[#E7EEF3] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-[11px] leading-5 text-[#71869A]"><DatabaseZap size={15} className="shrink-0 text-[#0F8C8C]" />Lưu nháp sẽ tự tắt cấu hình đang active cho đến khi kiểm tra/kích hoạt lại.</p><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => { setDraft(normalizeSettings(settings)); setDirty(false); }} disabled={!dirty || saveMutation.isPending} className="rounded-lg border border-[#DDE7F0] bg-white px-3.5 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-45">Hoàn tác nháp</button><button type="button" onClick={() => saveMutation.mutate({ ...draft, groupsDn: draft.groupsDn || null, bindDn: draft.bindDn || null, bindSecretRef: draft.bindSecretRef || null, adminGroupDn: draft.adminGroupDn || null, userGroupDn: draft.userGroupDn || null, caCertificatePem: draft.caCertificatePem || null })} disabled={saveMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-3.5 py-2 text-xs font-extrabold text-white shadow-[0_5px_12px_rgba(15,140,140,.18)] hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-55">{saveMutation.isPending && <Loader2 className="animate-spin" size={14} />}Lưu nháp</button><button type="button" onClick={() => testMutation.mutate()} disabled={!isSelfHosted || testMutation.isPending || saveMutation.isPending} title={!isSelfHosted ? "Chỉ khả dụng trên server self-hosted" : undefined} className="inline-flex items-center gap-2 rounded-lg border border-[#2666A8] bg-white px-3.5 py-2 text-xs font-extrabold text-[#2666A8] hover:bg-[#EAF3FF] disabled:cursor-not-allowed disabled:opacity-50">{testMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}Kiểm tra LDAPS</button>{settings?.status === "active" ? <button type="button" onClick={() => statusMutation.mutate({ status: "disabled" })} disabled={!isSelfHosted || statusMutation.isPending} className="rounded-lg border border-[#E6BBBB] bg-white px-3.5 py-2 text-xs font-extrabold text-[#B44545] hover:bg-[#FFF5F5] disabled:cursor-not-allowed disabled:opacity-50">Tắt LDAPS</button> : <button type="button" onClick={() => statusMutation.mutate({ status: "active" })} disabled={!isSelfHosted || settings?.lastTestStatus !== "success" || statusMutation.isPending} title={settings?.lastTestStatus !== "success" ? "Cần kiểm tra LDAPS thành công trước" : undefined} className="rounded-lg bg-[#193B57] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#102A43] disabled:cursor-not-allowed disabled:opacity-50">Kích hoạt LDAPS</button>}</div></footer>
    </div>
  </section>;
}

function InputField({ label, value, onChange, placeholder, required, help, className = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; help?: string; className?: string }) {
  return <label className={`block min-w-0 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A] ${className}`}>{label}{required && <span className="ml-1 text-[#B44545]">*</span>}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 h-9 w-full rounded-lg border border-[#D7E3EB] bg-white px-3 text-xs font-medium normal-case tracking-normal text-[#193B57] outline-none transition placeholder:text-[#AAB9C6] focus:border-[#0F8C8C] focus:ring-2 focus:ring-[#E6F6F2]" />{help && <span className="mt-1 block normal-case tracking-normal text-[10px] font-medium leading-4 text-[#8AA0B6]">{help}</span>}</label>;
}

function TextAreaField({ label, value, onChange, placeholder, help }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; help?: string }) {
  return <label className="block text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A] sm:col-span-2">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-[#D7E3EB] bg-white px-3 py-2 text-xs font-mono font-medium normal-case tracking-normal text-[#193B57] outline-none transition placeholder:font-sans placeholder:text-[#AAB9C6] focus:border-[#0F8C8C] focus:ring-2 focus:ring-[#E6F6F2]" />{help && <span className="mt-1 block normal-case tracking-normal text-[10px] font-medium leading-4 text-[#8AA0B6]">{help}</span>}</label>;
}
