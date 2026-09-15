import {
  Box,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  PackageCheck,
  RotateCcw,
} from "lucide-react";

type AssetTab = "holding" | "returned";

type EmployeeAssetPanelProps = {
  history: any[];
  isLoading: boolean;
  isError: boolean;
  activeTab: AssetTab;
  onTabChange: (tab: AssetTab) => void;
  onRetry: () => void;
  onRequestReturn: (asset: {
    id: number;
    assetName: string;
    assetCode: string;
  }) => void;
};

const handoverStatus = {
  active: "Đang giữ",
  pending_signature: "Chờ ký",
  returned: "Đã hoàn trả",
  draft: "Bản nháp",
  cancelled: "Đã hủy",
} as const;

const returnRequestPresentation = {
  none: { label: "Đã hoàn trả", className: "bg-[#EAF3FF] text-[#2666A8]" },
  pending: { label: "Đang chờ duyệt", className: "bg-[#FFF5DC] text-[#A86B00]" },
  approved: { label: "Đã duyệt hoàn trả", className: "bg-[#E6F6F2] text-[#087A6A]" },
  rejected: { label: "Bị từ chối", className: "bg-[#FDEDEE] text-[#B44545]" },
} as const;

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa cập nhật";
}

function ReturnRequestStatus({
  status,
  resolution,
}: {
  status: "none" | "pending" | "approved" | "rejected";
  resolution?: string | null;
}) {
  const presentation = returnRequestPresentation[status];
  return (
    <div className="min-w-0">
      <span className={`inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${presentation.className}`}>
        {presentation.label}
      </span>
      {resolution ? (
        <p className="mt-1.5 text-[11px] leading-5 text-[#71869A]">
          Phản hồi: {resolution}
        </p>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-extrabold transition ${
        active
          ? "bg-white text-[#087A6A] shadow-sm ring-1 ring-[#CDE5E5]"
          : "text-[#71869A] hover:bg-white/70 hover:text-[#193B57]"
      }`}
    >
      {label}
      <span className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-[#E6F6F2]" : "bg-[#E8EEF3]"}`}>
        {count}
      </span>
    </button>
  );
}

export function EmployeeAssetPanel({
  history,
  isLoading,
  isError,
  activeTab,
  onTabChange,
  onRetry,
  onRequestReturn,
}: EmployeeAssetPanelProps) {
  const activeAssets = history.filter(item => item.status === "active");
  const returnedAssets = history.filter(item => item.status === "returned");

  return (
    <section
      id="employee-assets"
      className="mt-6 scroll-mt-6 overflow-hidden rounded-2xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,.045)]"
    >
      <div className="border-b border-[#E7EEF3] px-5 py-5 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2 text-base font-extrabold text-[#193B57]">
              <Box size={18} className="text-[#0F8C8C]" />
              Tài sản của bạn
            </div>
            <p className="mt-1 text-xs leading-5 text-[#71869A]">
              Theo dõi tài sản đang giữ và lịch sử hoàn trả trong cùng một khu vực.
            </p>
          </div>
          <div className="flex gap-2 text-center">
            <div className="rounded-xl bg-[#E6F6F2] px-3 py-2">
              <div className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#4B8884]">Đang giữ</div>
              <div className="mt-0.5 font-display text-lg font-extrabold text-[#087A6A]">{activeAssets.length}</div>
            </div>
            <div className="rounded-xl bg-[#EAF3FF] px-3 py-2">
              <div className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#4A79A9]">Đã trả</div>
              <div className="mt-0.5 font-display text-lg font-extrabold text-[#2666A8]">{returnedAssets.length}</div>
            </div>
          </div>
        </div>
        <div role="tablist" aria-label="Tài sản của bạn" className="mt-4 inline-flex rounded-xl bg-[#F0F5F8] p-1">
          <TabButton active={activeTab === "holding"} label="Đang giữ" count={activeAssets.length} onClick={() => onTabChange("holding")} />
          <TabButton active={activeTab === "returned"} label="Đã hoàn trả" count={returnedAssets.length} onClick={() => onTabChange("returned")} />
        </div>
      </div>

      {isLoading ? (
        <div className="px-6 py-12 text-center text-sm text-[#71869A]">Đang tải dữ liệu tài sản...</div>
      ) : isError ? (
        <div className="px-6 py-12 text-center">
          <div className="text-sm font-bold text-[#B44545]">Không thể tải tài sản của bạn.</div>
          <button onClick={onRetry} className="mt-3 rounded-lg border border-[#F2B7B7] px-3 py-2 text-xs font-bold text-[#B44545] hover:bg-[#FDEDEE]">Thử lại</button>
        </div>
      ) : activeTab === "holding" ? (
        activeAssets.length ? (
          <div id="employee-active-assets" role="tabpanel" className="divide-y divide-[#EDF2F5]">
            {activeAssets.map(item => (
              <article key={item.id} className="flex flex-col gap-4 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E6F6F2] text-[#0F8C8C]"><Box size={18} /></div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-[#193B57]">{item.assetName}</div>
                      <div className="mt-1 font-mono text-[11px] font-bold text-[#0F8C8C]">{item.assetCode} · {item.referenceCode}</div>
                    </div>
                  </div>
                  <span className="self-start rounded-full bg-[#E6F6F2] px-2.5 py-1.5 text-[10px] font-extrabold text-[#087A6A] sm:self-auto">{handoverStatus[item.status as keyof typeof handoverStatus]}</span>
                </div>
                <div className="grid gap-3 rounded-xl bg-[#F7FAFC] p-3 text-xs text-[#60758A] sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                  <div className="flex items-center gap-1.5"><CalendarDays size={14} className="text-[#0F8C8C]" /><span>Ngày nhận: <b className="text-[#193B57]">{formatDate(item.handedOverAt)}</b></span></div>
                  <div className="flex items-center gap-1.5"><Clock3 size={14} className="text-[#A86B00]" /><span>Hạn dự kiến: <b className="text-[#193B57]">{item.dueBackAt ? formatDate(item.dueBackAt) : "Chưa thiết lập"}</b></span></div>
                  {item.returnRequestStatus === "pending" ? (
                    <ReturnRequestStatus status="pending" resolution={item.returnRequestResolution} />
                  ) : (
                    <button onClick={() => onRequestReturn({ id: item.id, assetName: item.assetName, assetCode: item.assetCode })} className="flex items-center justify-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-[11px] font-extrabold text-[#087A6A] transition hover:bg-[#ECF8F7]"><RotateCcw size={14} />Yêu cầu hoàn trả</button>
                  )}
                </div>
                {item.returnRequestStatus === "rejected" ? <ReturnRequestStatus status="rejected" resolution={item.returnRequestResolution} /> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><PackageCheck size={19} /></div><div className="mt-3 text-sm font-extrabold text-[#193B57]">Bạn chưa được cấp phát tài sản nào</div><p className="mt-1 text-xs text-[#71869A]">Khi có thiết bị được bàn giao, thông tin sẽ xuất hiện tại đây.</p></div>
        )
      ) : returnedAssets.length ? (
        <div id="employee-returned-assets" role="tabpanel" className="divide-y divide-[#EDF2F5]">
          {returnedAssets.map(item => (
            <article key={item.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EAF3FF] text-[#2666A8]"><CheckCircle2 size={18} /></div>
                <div className="min-w-0"><div className="truncate text-sm font-extrabold text-[#193B57]">{item.assetName}</div><div className="mt-1 font-mono text-[11px] font-bold text-[#2666A8]">{item.assetCode} · {item.referenceCode}</div><div className="mt-2 text-xs text-[#71869A]">Ngày trả: <b className="text-[#193B57]">{formatDate(item.returnedAt)}</b> · Tình trạng: <b className="text-[#193B57]">{item.conditionIn || "Chưa cập nhật"}</b></div></div>
              </div>
              <ReturnRequestStatus status={item.returnRequestStatus === "approved" ? "approved" : "none"} resolution={item.returnRequestResolution} />
            </article>
          ))}
        </div>
      ) : (
        <div className="px-6 py-12 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><History size={19} /></div><div className="mt-3 text-sm font-extrabold text-[#193B57]">Chưa có tài sản hoàn trả</div><p className="mt-1 text-xs text-[#71869A]">Lịch sử sẽ xuất hiện sau khi quản trị viên duyệt hoàn trả.</p></div>
      )}
    </section>
  );
}
