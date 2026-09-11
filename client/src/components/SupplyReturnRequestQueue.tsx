import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  RotateCcw,
  Wrench,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { openSupplyReturnReceiptPdf } from "@/lib/supplyReturnReceiptPdf";
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
    label: "Đã lập biên bản",
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

type InspectionDraft = {
  good: string;
  damaged: string;
  missing: string;
  repair: string;
  note: string;
};

function numberText(value: number | string) {
  return Number(value).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  });
}

function quantity(value: string) {
  if (value.trim() === "") return Number.NaN;
  return Number(value);
}

export function SupplyReturnRequestQueue() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const requestsQuery = trpc.supplies.adminReturnRequests.useQuery(undefined, {
    refetchInterval: 20_000,
  });
  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [deliveredByName, setDeliveredByName] = useState("");
  const [receivedByName, setReceivedByName] = useState("");
  const [inspection, setInspection] = useState<
    Record<number, InspectionDraft>
  >({});
  const [showProcessed, setShowProcessed] = useState(false);
  const [processedPage, setProcessedPage] = useState(1);
  const [highlightedRequestId, setHighlightedRequestId] = useState<
    number | null
  >(null);
  const [preparingReceiptId, setPreparingReceiptId] = useState<number | null>(
    null
  );
  const requests = requestsQuery.data || [];
  const pending = requests.filter(request => request.status === "pending");
  const processed = requests.filter(request => request.status !== "pending");
  const processedPageSize = 10;
  const processedPageCount = Math.max(
    1,
    Math.ceil(processed.length / processedPageSize)
  );
  const activeProcessedPage = Math.min(processedPage, processedPageCount);
  const pagedProcessed = processed.slice(
    (activeProcessedPage - 1) * processedPageSize,
    activeProcessedPage * processedPageSize
  );
  const approveTarget = requests.find(request => request.id === approveId);
  const rejectTarget = requests.find(request => request.id === rejectId);

  useEffect(() => {
    setProcessedPage(page => Math.min(page, processedPageCount));
  }, [processedPageCount]);

  useEffect(() => {
    const storedId = Number(
      sessionStorage.getItem("assetmaster-open-supply-return-request-id")
    );
    if (!Number.isInteger(storedId) || storedId <= 0 || !requests.length)
      return;
    const target = requests.find(request => request.id === storedId);
    sessionStorage.removeItem("assetmaster-open-supply-return-request-id");
    if (!target) return;
    if (target.status !== "pending") {
      const targetIndex = processed.findIndex(request => request.id === storedId);
      setShowProcessed(true);
      setProcessedPage(
        Math.max(1, Math.floor(targetIndex / processedPageSize) + 1)
      );
    }
    setHighlightedRequestId(storedId);
    const scrollTimer = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(
          `[data-supply-return-request-id="${storedId}"]`
        )
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    const highlightTimer = window.setTimeout(
      () => setHighlightedRequestId(null),
      3_500
    );
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [requests]);

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
        `Đã duyệt ${result.requestCode} và tạo biên bản ${result.receiptCode}.`
      );
      setApproveId(null);
      setReviewNote("");
      setInspection({});
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

  const openInspection = (request: (typeof requests)[number]) => {
    setApproveId(request.id);
    setReviewNote("");
    setDeliveredByName(request.requesterName);
    setReceivedByName(user?.name || user?.email || "Quản trị viên");
    setInspection(
      Object.fromEntries(
        request.items.map(item => [
          item.id,
          {
            good: String(item.requestedQuantity),
            damaged: "0",
            missing: "0",
            repair: "0",
            note: "",
          },
        ])
      )
    );
  };

  const inspectionRows = (approveTarget?.items || []).map(item => {
    const draft = inspection[item.id] || {
      good: "",
      damaged: "",
      missing: "",
      repair: "",
      note: "",
    };
    const good = quantity(draft.good);
    const damaged = quantity(draft.damaged);
    const missing = quantity(draft.missing);
    const repair = quantity(draft.repair);
    const requested = Number(item.requestedQuantity);
    const values = [good, damaged, missing, repair];
    const total = values.reduce((sum, value) => sum + value, 0);
    const quantitiesValid =
      values.every(
        value =>
          Number.isFinite(value) &&
          value >= 0 &&
          Number.isInteger(value * 100)
      ) && Math.abs(total - requested) <= 0.001;
    const exceptionTotal = damaged + missing + repair;
    const noteValid =
      !Number.isFinite(exceptionTotal) ||
      exceptionTotal <= 0 ||
      draft.note.trim().length >= 2;
    return {
      item,
      draft,
      good,
      damaged,
      missing,
      repair,
      total,
      requested,
      valid: quantitiesValid && noteValid,
    };
  });
  const canApprove =
    Boolean(approveTarget) &&
    deliveredByName.trim().length >= 2 &&
    receivedByName.trim().length >= 2 &&
    inspectionRows.length > 0 &&
    inspectionRows.every(row => row.valid);

  const setInspectionField = (
    itemId: number,
    field: keyof InspectionDraft,
    value: string
  ) =>
    setInspection(current => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || {
          good: "0",
          damaged: "0",
          missing: "0",
          repair: "0",
          note: "",
        }),
        [field]: value,
      },
    }));

  const previewReceipt = async (request: (typeof requests)[number]) => {
    if (!request.returnReceiptCode) return;
    setPreparingReceiptId(request.id);
    try {
      await openSupplyReturnReceiptPdf(request, request.items);
      toast.success("Đã mở bản xem trước biên bản hoàn trả.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tạo PDF biên bản hoàn trả."
      );
    } finally {
      setPreparingReceiptId(null);
    }
  };

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
      <article
        data-supply-return-request-id={request.id}
        className={`rounded-xl border bg-white p-4 transition ${highlightedRequestId === request.id ? "border-[#0F8C8C] ring-4 ring-[#0F8C8C]/10" : "border-[#E3EDF2]"}`}
      >
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
              {request.returnReceiptCode ? (
                <span className="font-mono text-[10px] font-extrabold text-[#087A6A]">
                  {request.returnReceiptCode}
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-xs font-extrabold text-[#526779]">
              {request.requesterName} · {request.sourceReferenceCode}
            </div>
            <div className="mt-1 text-[10px] text-[#8AA0B6]">
              Gửi lúc {new Date(request.createdAt).toLocaleString("vi-VN")}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {request.status === "approved" && request.returnReceiptCode ? (
              <button
                type="button"
                disabled={preparingReceiptId === request.id}
                onClick={() => void previewReceipt(request)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#CDE5E5] bg-white px-3 text-[11px] font-extrabold text-[#087A6A] hover:bg-[#ECF8F7] disabled:opacity-50"
              >
                <Download size={14} />
                {preparingReceiptId === request.id
                  ? "Đang tạo PDF..."
                  : "Biên bản PDF"}
              </button>
            ) : null}
            {actionable ? (
              <>
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
                  onClick={() => openInspection(request)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F8C8C] px-3 text-[11px] font-extrabold text-white hover:bg-[#087A6A]"
                >
                  <ClipboardCheck size={14} />
                  Kiểm đếm & duyệt
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {request.items.map(item => (
            <div
              key={item.id}
              className="rounded-lg bg-[#F7FAFC] px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-3">
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
              {request.status === "approved" ? (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#E5EDF2] pt-2 text-[10px] font-bold">
                  <span className="text-[#087A6A]">
                    Tốt {numberText(item.goodQuantity)}
                  </span>
                  <span className="text-[#B44545]">
                    Hỏng {numberText(item.damagedQuantity)}
                  </span>
                  <span className="text-[#A86B00]">
                    Thiếu {numberText(item.missingQuantity)}
                  </span>
                  <span className="text-[#3855A6]">
                    Cần sửa {numberText(item.repairQuantity)}
                  </span>
                </div>
              ) : null}
              {item.conditionNote ? (
                <div className="mt-1 text-[10px] text-[#71869A]">
                  {item.conditionNote}
                </div>
              ) : null}
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
        {request.returnReceiptCode ? (
          <div className="mt-2 text-[10px] text-[#71869A]">
            Người giao: <b>{request.deliveredByName}</b> · Người nhận:{" "}
            <b>{request.receivedByName}</b>
          </div>
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
              Kiểm đếm và duyệt hoàn trả phụ kiện
            </h3>
            <p className="mt-1 text-xs text-[#71869A]">
              Hàng tốt nhập kho khả dụng; hàng hỏng và cần sửa được đưa vào tồn
              cách ly riêng.
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
              <ClipboardCheck size={24} className="mx-auto text-[#94B6D8]" />
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
              <>
                <div className="mt-3 space-y-2">
                  {pagedProcessed.map(request => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      actionable={false}
                    />
                  ))}
                </div>
                {processedPageCount > 1 ? (
                  <div className="mt-3 flex items-center justify-between border-t border-[#E3EDF2] pt-3 text-[10px] font-bold text-[#71869A]">
                    <span>
                      Trang {activeProcessedPage}/{processedPageCount}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={activeProcessedPage <= 1}
                        onClick={() => setProcessedPage(page => page - 1)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#DDE7F0] bg-white disabled:opacity-40"
                        aria-label="Trang trước"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={activeProcessedPage >= processedPageCount}
                        onClick={() => setProcessedPage(page => page + 1)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#DDE7F0] bg-white disabled:opacity-40"
                        aria-label="Trang sau"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
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
            setInspection({});
          }
        }}
      >
        <AlertDialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-2xl border-[#CDE5E5] bg-white p-0">
          <AlertDialogHeader className="border-b border-[#E7EEF3] px-5 py-5">
            <AlertDialogTitle className="font-display text-lg font-extrabold text-[#193B57]">
              Kiểm đếm {approveTarget?.requestCode}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-5 text-[#71869A]">
              Tổng Tốt + Hỏng + Thiếu + Cần sửa của mỗi dòng phải bằng số lượng
              yêu cầu hoàn trả. Chỉ hàng tốt được cộng vào tồn khả dụng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 px-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="field-label">Người giao</span>
                <input
                  value={deliveredByName}
                  onChange={event => setDeliveredByName(event.target.value)}
                  maxLength={160}
                  className="field-input mt-1"
                />
              </label>
              <label>
                <span className="field-label">Người nhận / kiểm đếm</span>
                <input
                  value={receivedByName}
                  onChange={event => setReceivedByName(event.target.value)}
                  maxLength={160}
                  className="field-input mt-1"
                />
              </label>
            </div>
            <div className="space-y-3">
              {inspectionRows.map(row => (
                <div
                  key={row.item.id}
                  className={`rounded-xl border p-3 ${row.valid ? "border-[#E3EDF2] bg-[#F8FBFC]" : "border-[#F1C9C9] bg-[#FFF9F9]"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-[#193B57]">
                        {row.item.supplyName}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-[#71869A]">
                        {row.item.supplyCode}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#60758A]">
                      Cần kiểm đếm: {numberText(row.requested)} {row.item.unit}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {(
                      [
                        ["good", "Tốt", "text-[#087A6A]"],
                        ["damaged", "Hỏng", "text-[#B44545]"],
                        ["missing", "Thiếu", "text-[#A86B00]"],
                        ["repair", "Cần sửa", "text-[#3855A6]"],
                      ] as Array<
                        [keyof InspectionDraft, string, string]
                      >
                    ).map(([field, label, tone]) => (
                      <label key={field}>
                        <span className={`text-[10px] font-extrabold ${tone}`}>
                          {label}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.draft[field]}
                          onChange={event =>
                            setInspectionField(
                              row.item.id,
                              field,
                              event.target.value
                            )
                          }
                          className="field-input mt-1 text-right"
                        />
                      </label>
                    ))}
                  </div>
                  <label className="mt-3 block">
                    <span className="text-[10px] font-bold text-[#60758A]">
                      Ghi chú tình trạng{" "}
                      {row.damaged + row.missing + row.repair > 0
                        ? "(bắt buộc)"
                        : "(không bắt buộc)"}
                    </span>
                    <input
                      value={row.draft.note}
                      onChange={event =>
                        setInspectionField(
                          row.item.id,
                          "note",
                          event.target.value
                        )
                      }
                      maxLength={1000}
                      placeholder="Ví dụ: Vỡ nút bấm, thiếu đầu thu USB..."
                      className="field-input mt-1"
                    />
                  </label>
                  {!row.valid ? (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-[#B44545]">
                      <AlertTriangle size={12} />
                      Tổng phân loại phải bằng {numberText(row.requested)}{" "}
                      {row.item.unit}; hàng bất thường phải có ghi chú.
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <label className="block">
              <span className="field-label">
                Kết luận kiểm đếm (không bắt buộc)
              </span>
              <textarea
                value={reviewNote}
                onChange={event => setReviewNote(event.target.value)}
                maxLength={1000}
                className="field-input mt-1 min-h-[80px] resize-y"
              />
            </label>
            <div className="rounded-lg bg-[#F2F6FF] px-3 py-2 text-[10px] leading-5 text-[#3855A6]">
              <Wrench size={13} className="mr-1 inline" />
              Hàng hỏng và cần sửa được theo dõi riêng, không xuất hiện trong tồn
              khả dụng để cấp phát. Số thiếu được lưu trên biên bản đối soát.
            </div>
          </div>
          <AlertDialogFooter className="border-t border-[#E7EEF3] px-5 py-4">
            <AlertDialogCancel disabled={approve.isPending}>
              Đóng
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!canApprove || approve.isPending}
              onClick={event => {
                event.preventDefault();
                if (!approveTarget || !canApprove) return;
                approve.mutate({
                  id: approveTarget.id,
                  deliveredByName: deliveredByName.trim(),
                  receivedByName: receivedByName.trim(),
                  reviewNote: reviewNote.trim() || null,
                  items: inspectionRows.map(row => ({
                    requestItemId: row.item.id,
                    goodQuantity: row.good,
                    damagedQuantity: row.damaged,
                    missingQuantity: row.missing,
                    repairQuantity: row.repair,
                    conditionNote: row.draft.note.trim() || null,
                  })),
                });
              }}
              className="bg-[#0F8C8C] text-white hover:bg-[#087A6A]"
            >
              {approve.isPending
                ? "Đang lập biên bản..."
                : "Duyệt & lập biên bản"}
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
