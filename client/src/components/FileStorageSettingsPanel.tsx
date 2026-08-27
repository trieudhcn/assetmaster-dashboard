import {
  CheckCircle2,
  CircleAlert,
  FolderCog,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  HiddenSelfHostedSettingsAnchor,
  SelfHostedSettingsPanelFrame,
  useHiddenSelfHostedSettingsPanel,
} from "./SelfHostedSettingsPanelFrame";

export function FileStorageSettingsPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const visibility = useHiddenSelfHostedSettingsPanel(
    "self-hosted-file-storage",
    "assetmaster:open-self-hosted-file-storage"
  );
  const statusQuery = trpc.fileStorage.status.useQuery(undefined, {
    enabled: isAdmin && visibility.isVisible,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const [relativeDirectory, setRelativeDirectory] = useState("attachments");
  useEffect(() => {
    if (statusQuery.data?.settings?.relativeDirectory)
      setRelativeDirectory(statusQuery.data.settings.relativeDirectory);
  }, [statusQuery.data?.settings?.relativeDirectory]);
  const save = trpc.fileStorage.save.useMutation({
    onSuccess: () => {
      void utils.fileStorage.status.invalidate();
      toast.success("Đã lưu cấu hình kho tệp.");
    },
    onError: error =>
      toast.error(error.message || "Không thể lưu cấu hình kho tệp."),
  });
  const test = trpc.fileStorage.test.useMutation({
    onSuccess: result => {
      void utils.fileStorage.status.invalidate();
      result.status === "success"
        ? toast.success(result.message)
        : toast.error(result.message);
    },
    onError: error =>
      toast.error(error.message || "Không thể kiểm tra kho tệp."),
  });
  if (!isAdmin) return null;
  if (!visibility.isVisible)
    return <HiddenSelfHostedSettingsAnchor id="self-hosted-file-storage" />;
  if (statusQuery.isSuccess && !statusQuery.data.selfHosted) return null;
  const settings = statusQuery.data?.settings;
  const tested = settings?.lastTestStatus === "success";
  return (
    <SelfHostedSettingsPanelFrame
      id="self-hosted-file-storage"
      eyebrow="Lưu trữ self-hosted"
      title="Kho tệp đính kèm"
      description="Chọn thư mục con lưu chứng từ dưới vùng tệp đã được đội hạ tầng mount vào container. Không nhập đường dẫn tuyệt đối của host hoặc secret tại đây."
      icon={FolderCog}
      iconClassName="bg-[#EFF6FF] text-[#2666A8]"
      onClose={visibility.hide}
      actions={
        <>
          <span
            className={`inline-flex h-8 items-center gap-1.5 self-start rounded-full px-3 text-[10px] font-extrabold ${statusQuery.data?.mounted ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-[#FFF5DC] text-[#A86B00]"}`}
          >
            {statusQuery.data?.mounted ? (
              <CheckCircle2 size={13} />
            ) : (
              <CircleAlert size={13} />
            )}
            {statusQuery.data?.mounted ? "Đã mount" : "Chưa mount"}
          </span>
          <button
            type="button"
            onClick={() => void statusQuery.refetch()}
            disabled={statusQuery.isFetching}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#CDE5E5] bg-white text-[#087A6A] transition hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Làm mới trạng thái kho tệp"
            title="Làm mới"
          >
            <RefreshCw
              className={statusQuery.isFetching ? "animate-spin" : ""}
              size={15}
            />
          </button>
        </>
      }
    >
      {statusQuery.isLoading ? (
        <div className="mt-5 h-28 animate-pulse rounded-xl bg-[#F3F7F9]" />
      ) : null}
      {statusQuery.data?.selfHosted ? (
        <>
          {!statusQuery.data.mounted ? (
            <div
              role="alert"
              className="mt-4 flex gap-2 rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-3 text-xs leading-5 text-[#8F5A00]"
            >
              <CircleAlert className="mt-0.5 shrink-0" size={16} />
              Cần mount `ASSETMASTER_FILES_DIR` vào `/data/files` trong Docker
              Compose trước khi lưu hoặc kiểm tra. Xem hướng dẫn step-by-step ở
              runbook.
            </div>
          ) : null}
          <form
            onSubmit={event => {
              event.preventDefault();
              save.mutate({ relativeDirectory: relativeDirectory.trim() });
            }}
            className="mt-5 rounded-xl border border-[#DCE7F0] bg-[#FBFDFF] p-4"
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A]">
                Thư mục con trong vùng chia sẻ
                <input
                  value={relativeDirectory}
                  onChange={event => setRelativeDirectory(event.target.value)}
                  required
                  pattern="[A-Za-z0-9][A-Za-z0-9._/-]*"
                  placeholder="attachments"
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#D7E3EB] bg-white px-3 text-sm font-semibold normal-case tracking-normal text-[#193B57] outline-none focus:border-[#0F8C8C]"
                />
              </label>
              <button
                type="submit"
                disabled={!statusQuery.data.mounted || save.isPending}
                className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {save.isPending ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Save size={14} />
                )}
                Lưu cấu hình
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#71869A]">
              Ví dụ an toàn: `attachments`, `documents/2026`. Hệ thống chặn
              đường dẫn `..`; mọi tệp vẫn được truy cập qua ứng dụng đã đăng
              nhập.
            </p>
          </form>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#DCEDEA] bg-[#F8FCFB] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2.5">
              <ShieldCheck
                className="mt-0.5 shrink-0 text-[#087A6A]"
                size={17}
              />
              <div>
                <h3 className="text-xs font-extrabold text-[#193B57]">
                  Kiểm tra quyền thư mục
                </h3>
                <p className="mt-0.5 text-[11px] leading-5 text-[#71869A]">
                  Tạo rồi xóa một tệp probe vô hại. Không đọc hoặc sửa tệp đính
                  kèm hiện có.
                </p>
                {settings?.lastTestMessage ? (
                  <p
                    className={`mt-1 text-[10px] font-semibold ${tested ? "text-[#087A6A]" : "text-[#B44545]"}`}
                  >
                    {settings.lastTestMessage}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => test.mutate()}
              disabled={
                !statusQuery.data.mounted || !settings || test.isPending
              }
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#B8E3DA] bg-white px-3 text-xs font-extrabold text-[#087A6A] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {test.isPending ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <FolderCog size={14} />
              )}
              {test.isPending ? "Đang kiểm tra…" : "Kiểm tra thư mục"}
            </button>
          </div>
        </>
      ) : null}
    </SelfHostedSettingsPanelFrame>
  );
}
