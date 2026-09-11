import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
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

const statusCopy = {
  pending: {
    label: "Chờ duyệt",
    className: "border-[#F0DCA4] bg-[#FFF7E2] text-[#9A6800]",
  },
  approved: {
    label: "Đã nhập kho",
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
  return Number(value).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  });
}

export function SupplyReturnRequestQueue() {
  const utils = trpc.useUtils();
  const requestsQuery = trpc.supplies.adminReturnRequests.useQuery(undefined, {
    refetchInterval: 20_000,
  });
  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [showProcessed, setShowProcessed] = useState(false);
  const requests = requestsQuery.data || [];
  const pending = requests.filter(request => request.status === "pending");
  const processed = requests.filter(request => request.status !== "pending");
  const approveTarget = requests.find(request => request.id === approveId);
  const rejectTarget = requests.find(request => request.id === rejectId);

  const refresh = () => {
    void utils.supplies.adminReturnRequests.invalidate();
    void utils.supplies.list.invalidate();
    void utils.supplies.issueSlips.invalidate();
    void utils.supplies.issueSlipItems.invalidate();
    void utils.supplies.issueAnalytics.invalidate();
    void utils.supplies.historyReport.invalidate();
  };
  const approve = trpc.supplies.approveReturnRequest.useMutation({
    onSuccess: result => {
      toast.success(
        `Đã duyệt ${result.requestCode} và cộng phụ kiện về kho.`
      );
      setApproveId(null);
      setReviewNote("");
      refresh();
    },
    onError: error =>
      toast.error(error.message || "Không thể duyệt yêu cầu hoàn trả."),
  });
  const reject = trpc.supplies.rejectReturnRequest.useMutation({
    onSuccess: () => {
      toast.success("Đã từ chối yêu cầu hoàn trả phụ kiện.");
      setRejectId(null);
      setReviewNote("");
      refresh();
    },
    onError: error =>
      toast.error(error.message || "Không thể từ chối yêu cầu hoàn trả."),
  });

  const RequestRow = ({
    request,
    actionable,
  }: {
    request: (typeof requests)[number];
    actionable: boolean;
  }) => {
    const presentation =
      statusCopy[request.status as keyof typeof statusCopy];
    return (
      <article className="rounded-xl border border-[#E3EDF2] bg-white p-4">
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
            </div>
            <div className="mt-1 text-xs font-extrabold text-[#526779]">
              {request.requesterName} · {request.sourceReferenceCode}
            </div>
            <div className="mt-1 text-[10px] text-[#8AA0B6]">
              Gửi lúc {new Date(request.createdAt).toLocaleString("vi-VN")}
            </div>
          </div>
          {actionable ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectId(request.id);
                  setReviewNote("");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#F1CCCC] bg-white px-3 text-[11px] font-extrabold text-[#B44545] hover:bg-[#FFF4F4]"
              >
                <XCircle size={14} />
                Từ chối
              </button>
              <button
                type="button"
                onClick={() => {
                  setApproveId(request.id);
                  setReviewNote("");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F8C8C] px-3 text-[11px] font-extrabold text-white hover:bg-[#087A6A]"
              >
                <CheckCircle2 size={14} />
                Duyệt nhập kho
              </button>
            </div>
          ) : null}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {request.items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-[#F7FAFC] px-3 py-2 text-xs"
            >
              <div>
                <div className="font-extrabold text-[#193B57]">
                  {item.supplyName}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-[#71869A]">
                  {item.supplyCode}
                </div>
              </div>
              <div className="shrink-0 font-extrabold text-[#087A6A]">
                {numberText(item.requestedQuantity)} {item.unit}
              </div>
            </div>
          ))}
        </div>
        {request.note ? (
          <p className="mt-3 text-xs leading-5 text-[#60758A]">
            <b>Lý do:</b> {request.note}
          </p>
        ) : null}
        {request.reviewNote ? (
          <p className="mt-2 rounded-lg bg-[#F4F7FB] px-3 py-2 text-xs text-[#60758A]">
            <b>Phản hồi:</b> {request.reviewNote}
          </p>
        ) : null}
      </article>
    );
  };

  return (
    <>
      <section className="mt-5 rounded-xl border border-[#D7E4F1] bg-[#F8FBFE] p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#2666A8]">
              <RotateCcw size={14} />
              Hoàn trả từ portal
            </div>
            <h3 className="mt-1 font-display text-base font-extrabold text-[#193B57]">
              Duyệt hoàn trả phụ kiện về kho
            </h3>
            <p className="mt-1 text-xs text-[#71869A]">
              Kho chỉ tăng sau khi quản trị viên xác nhận yêu cầu.
            </p>
          </div>
          <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#FFF1C7] px-3 text-xs font-extrabold text-[#8A5C00]">
            <Clock3 size={14} />
            {pending.length} chờ duyệt
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {requestsQuery.isLoading ? (
            <p className="py-5 text-center text-xs text-[#71869A]">
              Đang tải yêu cầu hoàn trả...
            </p>
          ) : null}
          {pending.map(request => (
            <RequestRow key={request.id} request={request} actionable />
          ))}
          {!requestsQuery.isLoading && !pending.length ? (
            <div className="rounded-xl border border-dashed border-[#D7E4F1] bg-white px-4 py-6 text-center">
              <ClipboardCheck
                size={24}
                className="mx-auto text-[#94B6D8]"
              />
              <p className="mt-2 text-xs font-bold text-[#60758A]">
                Không có yêu cầu hoàn trả phụ kiện đang chờ duyệt.
              </p>
            </div>
          ) : null}
        </div>
        {processed.length ? (
          <div className="mt-4 border-t border-[#DDE7F0] pt-4">
            <button
              type="button"
              onClick={() => setShowProcessed(value => !value)}
              className="text-xs font-extrabold text-[#60758A] hover:text-[#2666A8]"
            >
              {showProcessed
                ? "Ẩn lịch sử hoàn trả"
                : `Xem ${processed.length} yêu cầu đã xử lý`}
            </button>
            {showProcessed ? (
              <div className="mt-3 space-y-2">
                {processed.slice(0, 10).map(request => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    actionable={false}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <AlertDialog
        open={Boolean(approveTarget)}
        onOpenChange={open => {
          if (!open && !approve.isPending) {
            setApproveId(null);
            setReviewNote("");
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl border-[#CDE5E5] bg-white p-0">
          <AlertDialogHeader className="border-b border-[#E7EEF3] px-5 py-5">
            <AlertDialogTitle className="font-display text-lg font-extrabold text-[#193B57]">
              Duyệt {approveTarget?.requestCode}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-5 text-[#71869A]">
              Xác nhận đã nhận đủ phụ kiện thực tế. Hệ thống sẽ cộng kho và ghi
              nhận lịch sử nhập trả.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-5">
            <label className="block">
              <span className="field-label">Ghi chú duyệt (không bắt buộc)</span>
              <textarea
                value={reviewNote}
                onChange={event => setReviewNote(event.target.value)}
                maxLength={1000}
                className="field-input mt-1 min-h-[80px] resize-y"
              />
            </label>
          </div>
          <AlertDialogFooter className="border-t border-[#E7EEF3] px-5 py-4">
            <AlertDialogCancel disabled={approve.isPending}>
              Đóng
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={approve.isPending}
              onClick={event => {
                event.preventDefault();
                if (approveTarget)
                  approve.mutate({
                    id: approveTarget.id,
                    reviewNote: reviewNote.trim() || null,
                  });
              }}
              className="bg-[#0F8C8C] text-white hover:bg-[#087A6A]"
            >
              {approve.isPending ? "Đang nhập kho..." : "Xác nhận duyệt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(rejectTarget)}
        onOpenChange={open => {
          if (!open && !reject.isPending) {
            setRejectId(null);
            setReviewNote("");
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl border-[#F2D2D2] bg-white p-0">
          <AlertDialogHeader className="border-b border-[#F3E1E1] px-5 py-5">
            <AlertDialogTitle className="font-display text-lg font-extrabold text-[#193B57]">
              Từ chối {rejectTarget?.requestCode}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-5 text-[#71869A]">
              Nêu rõ lý do để nhân viên điều chỉnh và gửi lại yêu cầu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-5">
            <label className="block">
              <span className="field-label">Lý do từ chối</span>
              <textarea
                value={reviewNote}
                onChange={event => setReviewNote(event.target.value)}
                maxLength={1000}
                className="field-input mt-1 min-h-[90px] resize-y"
              />
            </label>
          </div>
          <AlertDialogFooter className="border-t border-[#F3E1E1] px-5 py-4">
            <AlertDialogCancel disabled={reject.isPending}>
              Đóng
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={reject.isPending || reviewNote.trim().length < 2}
              onClick={event => {
                event.preventDefault();
                if (rejectTarget)
                  reject.mutate({
                    id: rejectTarget.id,
                    reviewNote: reviewNote.trim(),
                  });
              }}
              className="bg-[#B44545] text-white hover:bg-[#933737]"
            >
              {reject.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
