import {
  CheckCircle2,
  CircleAlert,
  Database,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  HiddenSelfHostedSettingsAnchor,
  SelfHostedSettingsPanelFrame,
  useHiddenSelfHostedSettingsPanel,
} from "./SelfHostedSettingsPanelFrame";

const backupLabels = {
  mysql_logical: "MySQL logical dump",
  runtime: "Runtime / cấu hình",
  file_storage: "Kho tệp nội bộ",
  full: "Sao lưu đầy đủ",
} as const;

type BackupType = keyof typeof backupLabels;

function dateTimeValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatusBadge({ value, failed }: { value: string; failed?: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold ${failed ? "bg-[#FFF0F0] text-[#B44545]" : "bg-[#E6F6F2] text-[#087A6A]"}`}
    >
      {value}
    </span>
  );
}

export function SelfHostedBackupRecoveryPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const visibility = useHiddenSelfHostedSettingsPanel(
    "self-hosted-backup-recovery",
    "assetmaster:open-self-hosted-backup-recovery"
  );
  const monitoring = trpc.backupMonitoring.summary.useQuery(undefined, {
    enabled: isAdmin && visibility.isVisible,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const [backupOpen, setBackupOpen] = useState(false);
  const [drillOpen, setDrillOpen] = useState(false);
  const [backupType, setBackupType] = useState<BackupType>("mysql_logical");
  const [backupStatus, setBackupStatus] = useState<"completed" | "failed">(
    "completed"
  );
  const [verificationStatus, setVerificationStatus] = useState<
    "not_verified" | "verified" | "failed"
  >("not_verified");
  const [storageReference, setStorageReference] = useState(
    "RAID backup · ghi nhận thủ công"
  );
  const [backupAt, setBackupAt] = useState(dateTimeValue());
  const [backupNote, setBackupNote] = useState("");
  const [drillStatus, setDrillStatus] = useState<"successful" | "failed">(
    "successful"
  );
  const [drillEnvironment, setDrillEnvironment] = useState("Staging cô lập");
  const [drillAt, setDrillAt] = useState(dateTimeValue());
  const [drillNote, setDrillNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const recordBackup = trpc.backupMonitoring.recordBackup.useMutation({
    onSuccess: () => {
      void utils.backupMonitoring.summary.invalidate();
      setBackupOpen(false);
      setBackupAt(dateTimeValue());
      setBackupNote("");
      toast.success("Đã ghi nhận kết quả sao lưu.");
    },
    onError: error =>
      toast.error(error.message || "Không thể ghi nhận sao lưu."),
  });
  const recordDrill = trpc.backupMonitoring.recordRestoreDrill.useMutation({
    onSuccess: () => {
      void utils.backupMonitoring.summary.invalidate();
      setDrillOpen(false);
      setDrillAt(dateTimeValue());
      setDrillNote("");
      setConfirmed(false);
      toast.success("Đã ghi nhận kết quả restore drill.");
    },
    onError: error =>
      toast.error(error.message || "Không thể ghi nhận restore drill."),
  });

  if (!isAdmin) return null;
  if (!visibility.isVisible)
    return <HiddenSelfHostedSettingsAnchor id="self-hosted-backup-recovery" />;
  if (monitoring.isSuccess && !monitoring.data.selfHosted) return null;
  const backups = monitoring.data?.backupRecords ?? [];
  const drills = monitoring.data?.restoreDrills ?? [];
  const latestBackup = backups[0];
  const latestDrill = drills[0];

  return (
    <SelfHostedSettingsPanelFrame
      id="self-hosted-backup-recovery"
      eyebrow="Khả năng phục hồi self-hosted"
      title="Sao lưu & phục hồi"
      description="Theo dõi kết quả do đội hạ tầng thực hiện trên RAID. Dashboard chỉ ghi nhận metadata và hướng dẫn; không chạy lệnh host hoặc tự phục hồi dữ liệu."
      icon={Database}
      iconClassName="bg-[#EEF7F7] text-[#087A6A]"
      onClose={visibility.hide}
      actions={
        <button
          type="button"
          onClick={() => void monitoring.refetch()}
          disabled={monitoring.isFetching}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-extrabold text-[#087A6A] hover:bg-[#ECF8F7] disabled:opacity-60"
        >
          <RefreshCw
            className={monitoring.isFetching ? "animate-spin" : ""}
            size={15}
          />
          Làm mới
        </button>
      }
    >
      {monitoring.isLoading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="h-28 animate-pulse rounded-xl bg-[#F3F7F9]" />
          <div className="h-28 animate-pulse rounded-xl bg-[#F3F7F9]" />
        </div>
      ) : null}
      {monitoring.isError ? (
        <div
          role="alert"
          className="mt-5 flex gap-2 rounded-xl border border-[#F3C7C7] bg-[#FFF6F6] p-3 text-xs leading-5 text-[#B44545]"
        >
          <CircleAlert className="mt-0.5 shrink-0" size={16} />
          Không thể đọc nhật ký sao lưu. Hãy kiểm tra kết nối MySQL hoặc log ứng
          dụng.
        </div>
      ) : null}
      {monitoring.data?.selfHosted ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <SummaryCard
              title="Sao lưu gần nhất"
              primary={
                latestBackup
                  ? backupLabels[latestBackup.backupType]
                  : "Chưa có bản ghi"
              }
              detail={
                latestBackup
                  ? `${formatDate(latestBackup.completedAt)} · ${latestBackup.storageReference}`
                  : "Sau khi hạ tầng chạy dump, ghi nhận kết quả tại đây."
              }
              badge={
                latestBackup?.status === "failed"
                  ? "Thất bại"
                  : latestBackup
                    ? "Hoàn tất"
                    : "Chưa ghi nhận"
              }
              failed={latestBackup?.status === "failed"}
            />
            <SummaryCard
              title="Restore drill gần nhất"
              primary={latestDrill?.environment || "Chưa có restore drill"}
              detail={
                latestDrill
                  ? formatDate(latestDrill.completedAt)
                  : "Khôi phục thử vào môi trường cô lập trước cutover."
              }
              badge={
                latestDrill?.status === "failed"
                  ? "Không đạt"
                  : latestDrill
                    ? "Đạt"
                    : "Chưa kiểm thử"
              }
              failed={latestDrill?.status === "failed"}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E7EEF3] pt-4">
            <button
              type="button"
              onClick={() => setBackupOpen(open => !open)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#087A6A]"
            >
              <Database size={14} />
              Ghi nhận sao lưu
            </button>
            <button
              type="button"
              onClick={() => setDrillOpen(open => !open)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#D5C8F3] bg-white px-3.5 py-2 text-xs font-extrabold text-[#6841C6] hover:bg-[#F5F1FF]"
            >
              <ShieldCheck size={14} />
              Ghi nhận restore drill
            </button>
          </div>
          {backupOpen ? (
            <form
              data-backup-record-form
              onSubmit={event => {
                event.preventDefault();
                recordBackup.mutate({
                  backupType,
                  status: backupStatus,
                  verificationStatus,
                  storageReference,
                  completedAt: new Date(backupAt),
                  note: backupNote.trim() || null,
                });
              }}
              className="mt-4 rounded-xl border border-[#CDE5E5] bg-[#FBFEFD] p-4"
            >
              <h3 className="text-xs font-extrabold text-[#193B57]">
                Ghi nhận kết quả backup do hạ tầng thực hiện
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  label="Loại sao lưu"
                  value={backupType}
                  onChange={value => setBackupType(value as BackupType)}
                  options={Object.entries(backupLabels)}
                />
                <Select
                  label="Kết quả"
                  value={backupStatus}
                  onChange={value =>
                    setBackupStatus(value as "completed" | "failed")
                  }
                  options={[
                    ["completed", "Hoàn tất"],
                    ["failed", "Thất bại"],
                  ]}
                />
                <Select
                  label="Kiểm chứng"
                  value={verificationStatus}
                  onChange={value =>
                    setVerificationStatus(
                      value as "not_verified" | "verified" | "failed"
                    )
                  }
                  options={[
                    ["not_verified", "Chưa kiểm chứng"],
                    ["verified", "Đã kiểm chứng"],
                    ["failed", "Kiểm chứng lỗi"],
                  ]}
                />
                <Input
                  label="Tham chiếu nơi lưu"
                  value={storageReference}
                  onChange={setStorageReference}
                  required
                />
                <Input
                  label="Thời điểm hoàn tất"
                  type="datetime-local"
                  value={backupAt}
                  onChange={setBackupAt}
                  required
                />
              </div>
              <TextArea
                label="Ghi chú"
                value={backupNote}
                onChange={setBackupNote}
                placeholder="Không ghi password, token hoặc đường dẫn secret."
              />
              <FormActions
                cancel={() => setBackupOpen(false)}
                pending={recordBackup.isPending}
                label="Lưu nhật ký backup"
              />
            </form>
          ) : null}
          {drillOpen ? (
            <form
              data-restore-drill-form
              onSubmit={event => {
                event.preventDefault();
                recordDrill.mutate({
                  status: drillStatus,
                  environment: drillEnvironment,
                  completedAt: new Date(drillAt),
                  note: drillNote.trim() || null,
                });
              }}
              className="mt-4 rounded-xl border border-[#D5C8F3] bg-[#FCFBFF] p-4"
            >
              <h3 className="text-xs font-extrabold text-[#193B57]">
                Ghi nhận restore drill đã thực hiện
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-[#71869A]">
                Chỉ ghi nhận sau khi hạ tầng đã khôi phục thử trên môi trường cô
                lập. Form không chạy lệnh restore hoặc thay đổi production.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Select
                  label="Kết quả drill"
                  value={drillStatus}
                  onChange={value =>
                    setDrillStatus(value as "successful" | "failed")
                  }
                  options={[
                    ["successful", "Thành công"],
                    ["failed", "Thất bại"],
                  ]}
                />
                <Input
                  label="Môi trường kiểm thử"
                  value={drillEnvironment}
                  onChange={setDrillEnvironment}
                  required
                />
                <Input
                  label="Thời điểm hoàn tất"
                  type="datetime-local"
                  value={drillAt}
                  onChange={setDrillAt}
                  required
                />
              </div>
              <TextArea
                label="Kết quả / ghi chú"
                value={drillNote}
                onChange={setDrillNote}
                placeholder="Phạm vi, thời lượng và lỗi (nếu có). Không ghi secret."
              />
              <label className="mt-3 flex items-start gap-2 rounded-lg border border-[#E4DDF5] bg-white p-3 text-[11px] leading-5 text-[#526779]">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={event => setConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#6841C6]"
                />
                Tôi xác nhận thao tác chỉ thực hiện trên môi trường cô lập,
                không có dữ liệu production bị ghi đè từ dashboard.
              </label>
              <FormActions
                cancel={() => setDrillOpen(false)}
                pending={recordDrill.isPending}
                disabled={!confirmed}
                label="Lưu kết quả restore drill"
                tone="violet"
              />
            </form>
          ) : null}
          <div className="mt-5 grid gap-4 border-t border-[#E7EEF3] pt-4 lg:grid-cols-2">
            <History
              title="Nhật ký sao lưu"
              empty="Chưa có backup được ghi nhận."
              items={backups
                .slice(0, 5)
                .map(item => ({
                  id: item.id,
                  title: backupLabels[item.backupType],
                  detail: `${formatDate(item.completedAt)} · ${item.storageReference}`,
                  label: item.status === "completed" ? "Hoàn tất" : "Thất bại",
                  failed: item.status === "failed",
                }))}
            />
            <History
              title="Lịch sử restore drill"
              empty="Chưa có khôi phục thử được ghi nhận."
              items={drills
                .slice(0, 5)
                .map(item => ({
                  id: item.id,
                  title: item.environment,
                  detail: formatDate(item.completedAt),
                  label: item.status === "successful" ? "Đạt" : "Không đạt",
                  failed: item.status === "failed",
                }))}
            />
          </div>
          <details className="mt-4 rounded-xl border border-dashed border-[#C8DADF] bg-[#F8FBFC] p-3">
            <summary className="cursor-pointer text-xs font-extrabold text-[#193B57]">
              Hướng dẫn phục hồi có kiểm soát
            </summary>
            <ol className="mt-2 space-y-1.5 pl-4 text-[11px] leading-5 text-[#60758A]">
              <li>Mở maintenance window và ngăn ghi dữ liệu vào production.</li>
              <li>
                Đội hạ tầng restore dump đã kiểm chứng vào môi trường cô lập
                trước.
              </li>
              <li>
                Kiểm tra dữ liệu, migration, tệp đính kèm và đăng nhập trước
                cutover.
              </li>
              <li>
                Ghi nhận kết quả restore drill tại đây; không nhập password hoặc
                secret.
              </li>
            </ol>
          </details>
        </>
      ) : null}
    </SelfHostedSettingsPanelFrame>
  );
}

function SummaryCard({
  title,
  primary,
  detail,
  badge,
  failed,
}: {
  title: string;
  primary: string;
  detail: string;
  badge: string;
  failed?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#DCEDEA] bg-[#F8FCFB] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#60758A]">
          {title}
        </span>
        <StatusBadge failed={failed} value={badge} />
      </div>
      <p className="mt-2 text-sm font-extrabold text-[#193B57]">{primary}</p>
      <p className="mt-1 truncate text-[11px] text-[#71869A]">{detail}</p>
    </div>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A]">
      {label}
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-1.5 h-9 w-full rounded-lg border border-[#D7E3EB] bg-white px-2.5 text-xs font-medium normal-case tracking-normal text-[#193B57] outline-none focus:border-[#0F8C8C]"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A]">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-1.5 h-9 w-full rounded-lg border border-[#D7E3EB] bg-white px-3 text-xs font-medium normal-case tracking-normal text-[#193B57] outline-none focus:border-[#0F8C8C]"
      />
    </label>
  );
}
function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="mt-3 block text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A]">
      {label}
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 min-h-20 w-full resize-y rounded-lg border border-[#D7E3EB] bg-white px-3 py-2 text-xs font-medium normal-case tracking-normal text-[#193B57] outline-none focus:border-[#0F8C8C]"
      />
    </label>
  );
}
function FormActions({
  cancel,
  pending,
  disabled = false,
  label,
  tone = "teal",
}: {
  cancel: () => void;
  pending: boolean;
  disabled?: boolean;
  label: string;
  tone?: "teal" | "violet";
}) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button
        type="button"
        onClick={cancel}
        className="rounded-lg border border-[#DDE7F0] bg-white px-3.5 py-2 text-xs font-bold text-[#60758A]"
      >
        Hủy
      </button>
      <button
        type="submit"
        disabled={pending || disabled}
        className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-extrabold text-white disabled:opacity-55 ${tone === "violet" ? "bg-[#6841C6]" : "bg-[#0F8C8C]"}`}
      >
        {pending ? <Loader2 className="animate-spin" size={14} /> : null}
        {label}
      </button>
    </div>
  );
}
function History({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{
    id: number;
    title: string;
    detail: string;
    label: string;
    failed: boolean;
  }>;
}) {
  return (
    <section>
      <h3 className="text-xs font-extrabold text-[#193B57]">{title}</h3>
      {items.length ? (
        <div className="mt-2 space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-[#E7EEF3] bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-[#193B57]">
                  {item.title}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-[#71869A]">
                  {item.detail}
                </p>
              </div>
              <StatusBadge failed={item.failed} value={item.label} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-lg border border-dashed border-[#DCE7EB] px-3 py-3 text-[11px] text-[#8AA0B6]">
          {empty}
        </p>
      )}
    </section>
  );
}
