import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  PackageSearch,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  partially_fulfilled: {
    label: "Cấp một phần",
    className: "border-[#F0DCA4] bg-[#FFF7E2] text-[#9A6800]",
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
  const [fulfillQuantities, setFulfillQuantities] = useState<
    Record<number, string>
  >({});
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showProcessed, setShowProcessed] = useState(false);
  const [processedPage, setProcessedPage] = useState(1);
  const [expandedProcessedRequestId, setExpandedProcessedRequestId] =
    useState<number | null>(null);
  const [highlightedRequestId, setHighlightedRequestId] = useState<number | null>(null);

  const fulfill = trpc.supplies.fulfillRequest.useMutation({
    onSuccess: result => {
      setFulfillTargetId(null);
      setFulfillQuantities({});
      toast.success(
        result.status === "partially_fulfilled"
          ? `Đã cấp một phần ${result.requestCode} và tạo phiếu ${result.referenceCode}.`
          : `Đã duyệt ${result.requestCode} và tạo phiếu ${result.referenceCode}.`
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
  const processedPageSize = 5;
  const processedPageCount = Math.max(
    1,
    Math.ceil(processed.length / processedPageSize)
  );
  const activeProcessedPage = Math.min(processedPage, processedPageCount);
  const pagedProcessed = processed.slice(
    (activeProcessedPage - 1) * processedPageSize,
    activeProcessedPage * processedPageSize
  );

  useEffect(() => {
    setProcessedPage(page => Math.min(page, processedPageCount));
  }, [processedPageCount]);

  useEffect(() => {
    const storedId = Number(
      sessionStorage.getItem("assetmaster-open-supply-request-id")
    );
    if (!Number.isInteger(storedId) || storedId <= 0 || !requests.length)
      return;
    const target = requests.find(request => request.id === storedId);
    sessionStorage.removeItem("assetmaster-open-supply-request-id");
    if (!target) return;
    if (target.status !== "pending") {
      const targetIndex = processed.findIndex(request => request.id === storedId);
      setShowProcessed(true);
      setProcessedPage(
        Math.max(1, Math.floor(targetIndex / processedPageSize) + 1)
      );
      setExpandedProcessedRequestId(storedId);
    }
    setHighlightedRequestId(storedId);
    const scrollTimer = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(
          `[data-supply-request-id="${storedId}"]`
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
  const fulfillmentRows = (fulfillTarget?.items || []).map(item => {
    const requested = Number(item.requestedQuantity);
    const stock = stockBySupplyId.get(item.supplyId) ?? 0;
    const rawQuantity = fulfillQuantities[item.id] ?? "";
    const approved =
      rawQuantity.trim() === "" ? Number.NaN : Number(rawQuantity);
    const valid =
      Number.isFinite(approved) &&
      approved >= 0 &&
      approved <= requested &&
      approved <= stock;
    return { item, requested, stock, approved, valid };
  });
  const canFulfill =
    fulfillmentRows.length > 0 &&
    fulfillmentRows.every(row => row.valid) &&
    fulfillmentRows.some(row => row.approved > 0);
  const isPartialFulfillment =
    canFulfill &&
    fulfillmentRows.some(row => row.approved < row.requested);

  const ProcessedRequestRow = ({
    request,
  }: {
    request: (typeof requests)[number];
  }) => {
    const presentation =
      statusPresentation[request.status as keyof typeof statusPresentation];
    const expanded = expandedProcessedRequestId === request.id;
    const completed =
      request.status === "fulfilled" ||
      request.status === "partially_fulfilled";
    const itemSummary = request.items
      .slice(0, 2)
      .map(item => item.supplyName)
      .join(", ");
    const remainingItems = Math.max(0, request.items.length - 2);
    return (
      <article
        data-supply-request-id={request.id}
        tabIndex={-1}
        className={`overflow-hidden rounded-lg border bg-white outline-none transition ${highlightedRequestId === request.id ? "border-[#0F8C8C] ring-2 ring-[#8BCDC6]/60" : "border-[#E3EDF2]"}`}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`processed-supply-request-${request.id}`}
          onClick={() =>
            setExpandedProcessedRequestId(current =>
              current === request.id ? null : request.id
            )
          }
          className="grid w-full gap-2 px-3 py-3 text-left transition hover:bg-[#F8FBFC] sm:grid-cols-[150px_minmax(120px,.65fr)_minmax(0,1fr)_auto_24px] sm:items-center"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-extrabold text-[#193B57]">
              {request.requestCode}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold ${presentation.className}`}
            >
              {presentation.label}
            </span>
          </div>
          <div className="truncate text-[11px] font-bold text-[#526779]">
            {request.requesterName}
          </div>
          <div className="truncate text-[10px] text-[#71869A]">
            {itemSummary}
            {remainingItems ? ` và ${remainingItems} loại khác` : ""}
          </div>
          <div className="text-[10px] text-[#8AA0B6] sm:text-right">
            {new Date(request.reviewedAt || request.createdAt).toLocaleString(
              "vi-VN"
            )}
          </div>
          <ChevronDown
            size={15}
            className={`text-[#8AA0B6] transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded ? (
          <div
            id={`processed-supply-request-${request.id}`}
            className="border-t border-[#EDF2F5] bg-[#FBFDFE] px-3 py-3"
          >
            <div className="grid gap-2 md:grid-cols-2">
              {request.items.map(item => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[#EDF2F5] bg-white px-3 py-2"
                >
                  <div className="truncate text-xs font-bold text-[#193B57]">
                    {item.supplyName}
                  </div>
                  <div className="mt-1 flex flex-wrap justify-between gap-2 text-[10px]">
                    <span className="text-[#71869A]">{item.supplyCode}</span>
                    <span className="font-extrabold text-[#087A6A]">
                      {completed
                        ? `Thực cấp ${numberText(item.approvedQuantity ?? 0)} / yêu cầu ${numberText(item.requestedQuantity)} ${item.unit}`
                        : `Yêu cầu ${numberText(item.requestedQuantity)} ${item.unit}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 text-[11px] leading-5 text-[#60758A] md:grid-cols-2">
              <p>
                <b className="text-[#526779]">Mục đích:</b> {request.reason}
              </p>
              {request.reviewNote ? (
                <p>
                  <b className="text-[#526779]">Phản hồi:</b>{" "}
                  {request.reviewNote}
                </p>
              ) : null}
            </div>
            {request.issueSlipId ? (
              <p className="mt-2 text-[11px] font-extrabold text-[#087A6A]">
                Phiếu cấp phát liên kết: #{request.issueSlipId}
              </p>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  };

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
      <article
        data-supply-request-id={request.id}
        tabIndex={-1}
        className={`rounded-xl border bg-[#FBFDFE] p-4 outline-none transition ${highlightedRequestId === request.id ? "border-[#0F8C8C] ring-2 ring-[#8BCDC6]/60" : "border-[#E3EDF2]"}`}
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
                disabled={fulfill.isPending}
                onClick={() => {
                  setFulfillTargetId(request.id);
                  setFulfillQuantities(
                    Object.fromEntries(
                      request.items.map(item => {
                        const requested = Number(item.requestedQuantity);
                        const stock = stockBySupplyId.get(item.supplyId);
                        return [
                          item.id,
                          String(
                            stock === undefined
                              ? requested
                              : Math.min(requested, Math.max(0, stock))
                          ),
                        ];
                      })
                    )
                  );
                }}
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
                    {request.status === "fulfilled" ||
                    request.status === "partially_fulfilled"
                      ? `Thực cấp ${numberText(item.approvedQuantity ?? 0)} / yêu cầu ${numberText(item.requestedQuantity)} ${item.unit}`
                      : `Yêu cầu ${numberText(item.requestedQuantity)} ${item.unit}`}
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
              <div className="mt-3 overflow-hidden rounded-xl border border-[#DCEBE9] bg-white">
                <div className="divide-y divide-[#EDF2F5] p-2">
                  {pagedProcessed.map(request => (
                    <ProcessedRequestRow key={request.id} request={request} />
                  ))}
                </div>
                <div className="flex flex-col gap-3 border-t border-[#E7EEF3] bg-[#FBFCFD] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold text-[#60758A]">
                    Hiển thị{" "}
                    {(activeProcessedPage - 1) * processedPageSize + 1}–
                    {Math.min(
                      activeProcessedPage * processedPageSize,
                      processed.length
                    )}{" "}
                    / {processed.length} yêu cầu
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Trang yêu cầu đã xử lý trước"
                      disabled={activeProcessedPage <= 1}
                      onClick={() => {
                        setExpandedProcessedRequestId(null);
                        setProcessedPage(page => Math.max(1, page - 1));
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#DDE7F0] bg-white text-[#60758A] transition hover:border-[#8BCDC6] hover:text-[#087A6A] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="min-w-[82px] text-center text-xs font-bold text-[#193B57]">
                      Trang {activeProcessedPage}/{processedPageCount}
                    </span>
                    <button
                      type="button"
                      aria-label="Trang yêu cầu đã xử lý sau"
                      disabled={activeProcessedPage >= processedPageCount}
                      onClick={() => {
                        setExpandedProcessedRequestId(null);
                        setProcessedPage(page =>
                          Math.min(processedPageCount, page + 1)
                        );
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#DDE7F0] bg-white text-[#60758A] transition hover:border-[#8BCDC6] hover:text-[#087A6A] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <AlertDialog
        open={Boolean(fulfillTarget)}
        onOpenChange={open => {
          if (!open && !fulfill.isPending) {
            setFulfillTargetId(null);
            setFulfillQuantities({});
          }
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
            {fulfillmentRows.map(({ item, requested, stock, approved, valid }) => (
              <div
                key={item.id}
                className={`grid gap-3 rounded-lg border bg-[#F8FBFC] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_130px] sm:items-end ${valid ? "border-[#E3EDF2]" : "border-[#F2B7B7]"}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-extrabold text-[#193B57]">
                    {item.supplyName}
                  </div>
                  <div className="mt-1 text-[10px] text-[#71869A]">
                    {item.supplyCode} · Yêu cầu {numberText(requested)}{" "}
                    {item.unit} · Kho {numberText(stock)}
                  </div>
                  {!valid && (
                    <div className="mt-1 text-[10px] font-bold text-[#B44545]">
                      Số lượng phải từ 0 đến{" "}
                      {numberText(Math.min(requested, stock))} {item.unit}.
                    </div>
                  )}
                </div>
                <label className="block">
                  <span className="field-label">Số lượng thực cấp</span>
                  <input
                    type="number"
                    min="0"
                    max={Math.min(requested, stock)}
                    step="any"
                    inputMode="decimal"
                    value={fulfillQuantities[item.id] ?? ""}
                    onChange={event =>
                      setFulfillQuantities(current => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    className={`field-input mt-1 text-right font-extrabold ${valid ? "text-[#087A6A]" : "border-[#E2A5A5] text-[#B44545]"}`}
                    aria-invalid={!valid}
                  />
                </label>
              </div>
            ))}
            {fulfillmentRows.length > 0 &&
              !fulfillmentRows.some(row => row.approved > 0) && (
                <p className="rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2 text-[11px] font-semibold text-[#A86B00]">
                  Cần thực cấp ít nhất một phụ kiện. Nếu không cấp dòng nào,
                  hãy dùng thao tác Từ chối.
                </p>
              )}
          </div>
          <AlertDialogFooter className="border-t border-[#E7EEF3] px-5 py-4">
            <AlertDialogCancel disabled={fulfill.isPending}>
              Quay lại
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={fulfill.isPending || !fulfillTarget || !canFulfill}
              onClick={event => {
                event.preventDefault();
                if (fulfillTarget && canFulfill)
                  fulfill.mutate({
                    id: fulfillTarget.id,
                    reviewNote: null,
                    items: fulfillmentRows.map(row => ({
                      requestItemId: row.item.id,
                      approvedQuantity: row.approved,
                    })),
                  });
              }}
              className="bg-[#0F8C8C] text-white hover:bg-[#087A6A]"
            >
              <FilePlus2 size={15} />
              {fulfill.isPending
                ? "Đang tạo phiếu..."
                : isPartialFulfillment
                  ? "Xác nhận cấp một phần"
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
