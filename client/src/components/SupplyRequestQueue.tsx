import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  PackageSearch,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusPresentation = {
  pending: {
    label: "Chờ duyệt",
    className: "border-[#F0DCA4] bg-[#FFF7E2] text-[#9A6800]",
  },
  approved: {
    label: "Đang xử lý",
    className: "border-[#BFD8F2] bg-[#EFF6FD] text-[#2666A8]",
  },
  fulfilled: {
    label: "Đã tạo phiếu",
    className: "border-[#B8E9DD] bg-[#ECF8F7] text-[#087A6A]",
  },
  rejected: {
    label: "Đã từ chối",
    className: "border-[#F2B7B7] bg-[#FDEDEE] text-[#B44545]",
  },
  cancelled: {
    label: "Nhân viên đã hủy",
    className: "border-[#DDE7F0] bg-[#F7FAFC] text-[#71869A]",
  },
} as const;

function numberText(value: number | string) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function SupplyRequestQueue() {
  const utils = trpc.useUtils();
  const requestsQuery = trpc.supplies.adminRequests.useQuery(undefined, {
    refetchInterval: 20_000,
  });
  const suppliesQuery = trpc.supplies.list.useQuery();
  const [fulfillTargetId, setFulfillTargetId] = useState<number | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showProcessed, setShowProcessed] = useState(false);

  const fulfill = trpc.supplies.fulfillRequest.useMutation({
    onSuccess: result => {
      setFulfillTargetId(null);
      toast.success(
        `Đã duyệt ${result.requestCode} và tạo phiếu ${result.referenceCode}.`
      );
      void utils.supplies.adminRequests.invalidate();
      void utils.supplies.issueSlips.invalidate();
      void utils.supplies.list.invalidate();
      void utils.supplies.issueAnalytics.invalidate();
      void utils.supplies.historyReport.invalidate();
    },
    onError: error =>
      toast.error(error.message || "Không thể duyệt yêu cầu."),
  });

  const reject = trpc.supplies.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success("Đã từ chối yêu cầu và lưu phản hồi.");
      setRejectTargetId(null);
      setRejectNote("");
      void utils.supplies.adminRequests.invalidate();
    },
    onError: error =>
      toast.error(error.message || "Không thể từ chối yêu cầu."),
  });

  const requests = requestsQuery.data || [];
  const pending = requests.filter(request => request.status === "pending");
  const processed = requests.filter(request => request.status !== "pending");
  const stockBySupplyId = useMemo(
    () =>
      new Map(
        (suppliesQuery.data || []).map(supply => [
          supply.id,
          Number(supply.stockQuantity),
        ])
      ),
    [suppliesQuery.data]
  );
  const fulfillTarget =
    requests.find(request => request.id === fulfillTargetId) || null;
  const rejectTarget =
    requests.find(request => request.id === rejectTargetId) || null;

  const RequestCard = ({
    request,
    actionable,
  }: {
    request: (typeof requests)[number];
    actionable: boolean;
  }) => {
    const presentation =
      statusPresentation[request.status as keyof typeof statusPresentation];
    const hasShortage = request.items.some(
      item =>
        (stockBySupplyId.get(item.supplyId) ?? 0) <
        Number(item.requestedQuantity)
    );
    return (
      <article className="rounded-xl border border-[#E3EDF2] bg-[#FBFDFE] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-[#193B57]">
                {request.requestCode}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${presentation.className}`}
              >
                {presentation.label}
              </span>
              {hasShortage && actionable && (
                <span className="rounded-full border border-[#F2B7B7] bg-[#FFF4F4] px-2.5 py-1 text-[10px] font-extrabold text-[#B44545]">
                  Tồn kho không đủ
                </span>
              )}
            </div>
            <div className="mt-1 text-xs font-extrabold text-[#526779]">
              {request.requesterName}
            </div>
            <div className="mt-1 text-[10px] text-[#8AA0B6]">
              Gửi lúc {new Date(request.createdAt).toLocaleString("vi-VN")}
            </div>
          </div>
          {actionable && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectTargetId(request.id);
                  setRejectNote("");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#F1CCCC] bg-white px-3 text-[11px] font-extrabold text-[#B44545] hover:bg-[#FFF4F4]"
              >
                <XCircle size={14} /> Từ chối
              </button>
              <button
                type="button"
                disabled={fulfill.isPending || hasShortage}
                onClick={() => setFulfillTargetId(request.id)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F8C8C] px-3 text-[11px] font-extrabold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <FilePlus2 size={14} />
                {fulfill.isPending ? "Đang tạo phiếu..." : "Duyệt & tạo phiếu"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {request.items.map(item => {
            const stock = stockBySupplyId.get(item.supplyId);
            const shortage =
              stock !== undefined && stock < Number(item.requestedQuantity);
            return (
              <div
                key={item.id}
                className={`rounded-lg border bg-white px-3 py-2 ${shortage && actionable ? "border-[#F2B7B7]" : "border-[#EDF2F5]"}`}
              >
                <div className="truncate text-xs font-bold text-[#193B57]">
                  {item.supplyName}
                </div>
                <div className="mt-1 flex flex-wrap justify-between gap-2 text-[10px]">
                  <span className="text-[#71869A]">{item.supplyCode}</span>
                  <span
                    className={
                      shortage && actionable
                        ? "font-extrabold text-[#B44545]"
                        : "font-extrabold text-[#087A6A]"
                    }
                  >
                    Yêu cầu {numberText(item.requestedQuantity)} {item.unit}
                    {stock !== undefined &&
                      ` · Kho ${numberText(stock)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs leading-5 text-[#526779]">
          <b>Mục đích:</b> {request.reason}
        </p>
        {request.reviewNote && (
          <p className="mt-2 rounded-lg bg-[#F4F7FB] px-3 py-2 text-xs leading-5 text-[#60758A]">
            <b>Phản hồi:</b> {request.reviewNote}
          </p>
        )}
        {request.issueSlipId && (
          <p className="mt-2 text-[11px] font-extrabold text-[#087A6A]">
            Phiếu cấp phát liên kết: #{request.issueSlipId}
          </p>
        )}
      </article>
    );
  };

  return (
    <>
      <section className="mt-5 rounded-xl border border-[#CDE5E5] bg-[#F7FCFB] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#0F8C8C]">
              <ClipboardCheck size={14} /> Yêu cầu từ portal
            </div>
            <h3 className="mt-1 font-display text-base font-extrabold text-[#193B57]">
              Duyệt yêu cầu cấp phụ kiện
            </h3>
            <p className="mt-1 text-xs text-[#71869A]">
              Khi duyệt, hệ thống trừ kho và tạo phiếu cấp phát trong cùng một
              giao dịch.
            </p>
          </div>
          <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#FFF1C7] px-3 text-xs font-extrabold text-[#8A5C00]">
            <Clock3 size={14} /> {pending.length} chờ duyệt
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {requestsQuery.isLoading && (
            <p className="py-5 text-center text-xs text-[#71869A]">
              Đang tải yêu cầu...
            </p>
          )}
          {pending.map(request => (
            <RequestCard
              key={request.id}
              request={request}
              actionable
            />
          ))}
          {!requestsQuery.isLoading && !pending.length && (
            <div className="rounded-xl border border-dashed border-[#CDE5E5] bg-white px-4 py-6 text-center">
              <PackageSearch
                size={24}
                className="mx-auto text-[#8BCDC6]"
              />
              <p className="mt-2 text-xs font-bold text-[#60758A]">
                Không có yêu cầu nào đang chờ duyệt.
              </p>
            </div>
          )}
        </div>

        {!!processed.length && (
          <div className="mt-4 border-t border-[#DCEBE9] pt-4">
            <button
              type="button"
              onClick={() => setShowProcessed(value => !value)}
              className="inline-flex items-center gap-2 text-xs font-extrabold text-[#60758A] hover:text-[#087A6A]"
            >
              <CheckCircle2 size={14} />
              {showProcessed
                ? "Ẩn yêu cầu đã xử lý"
                : `Xem ${processed.length} yêu cầu đã xử lý`}
            </button>
            {showProcessed && (
              <div className="mt-3 space-y-3">
                {processed.slice(0, 20).map(request => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    actionable={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <AlertDialog
        open={Boolean(fulfillTarget)}
        onOpenChange={open => {
          if (!open && !fulfill.isPending) setFulfillTargetId(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border-[#CDE5E5] bg-white p-0 shadow-[0_24px_70px_rgba(16,42,67,.24)]">
          <AlertDialogHeader className="border-b border-[#E7EEF3] px-5 py-5 pr-12">
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">
              <ClipboardCheck size={14} /> Xác nhận duyệt yêu cầu
            </div>
            <AlertDialogTitle className="font-display text-lg font-extrabold text-[#193B57]">
              {fulfillTarget?.requestCode}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-5 text-[#71869A]">
              Hệ thống sẽ trừ tồn kho và tạo phiếu cấp phát cho{" "}
              <b className="text-[#193B57]">
                {fulfillTarget?.requesterName}
              </b>
              . Thao tác này không thể hoàn tác từ màn hình yêu cầu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 px-5">
            {(fulfillTarget?.items || []).map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#E3EDF2] bg-[#F8FBFC] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-extrabold text-[#193B57]">
                    {item.supplyName}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[#71869A]">
                    {item.supplyCode}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-extrabold text-[#087A6A]">
                  {numberText(item.requestedQuantity)} {item.unit}
                </span>
              </div>
            ))}
          </div>
          <AlertDialogFooter className="border-t border-[#E7EEF3] px-5 py-4">
            <AlertDialogCancel disabled={fulfill.isPending}>
              Quay lại
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={fulfill.isPending || !fulfillTarget}
              onClick={event => {
                event.preventDefault();
                if (fulfillTarget)
                  fulfill.mutate({
                    id: fulfillTarget.id,
                    reviewNote: null,
                  });
              }}
              className="bg-[#0F8C8C] text-white hover:bg-[#087A6A]"
            >
              <FilePlus2 size={15} />
              {fulfill.isPending
                ? "Đang tạo phiếu..."
                : "Xác nhận duyệt & tạo phiếu"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {rejectTarget && (
        <>
          <button
            type="button"
            aria-label="Đóng hộp thoại từ chối"
            onClick={() => setRejectTargetId(null)}
            className="fixed inset-0 z-[94] bg-[#102A43]/30 backdrop-blur-[1px]"
          />
          <section
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-[95] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#B44545]">
                  Từ chối yêu cầu
                </div>
                <h3 className="mt-1 font-display text-lg font-extrabold text-[#193B57]">
                  {rejectTarget.requestCode}
                </h3>
                <p className="mt-1 text-xs text-[#71869A]">
                  Phản hồi sẽ hiển thị trong lịch sử portal của nhân viên.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setRejectTargetId(null)}
                className="drawer-close-action"
              >
                <X size={18} />
              </button>
            </div>
            <label className="mt-5 block">
              <span className="field-label">Lý do từ chối *</span>
              <textarea
                autoFocus
                maxLength={1000}
                value={rejectNote}
                onChange={event => setRejectNote(event.target.value)}
                className="field-input mt-1 min-h-24 resize-y"
                placeholder="Nêu rõ lý do để nhân viên theo dõi..."
              />
            </label>
            <button
              type="button"
              disabled={reject.isPending || rejectNote.trim().length < 3}
              onClick={() =>
                reject.mutate({
                  id: rejectTarget.id,
                  reviewNote: rejectNote.trim(),
                })
              }
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#B44545] px-4 text-xs font-extrabold text-white hover:bg-[#963B3B] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <XCircle size={15} />
              {reject.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
            </button>
          </section>
        </>
      )}
    </>
  );
}
