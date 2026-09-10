import {
  CheckCircle2,
  Clock3,
  History,
  PackagePlus,
  Send,
  ShoppingBasket,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { SearchableSelect } from "@/components/SearchableSelect";

type DraftItem = {
  supplyId: number;
  code: string;
  name: string;
  unit: string;
  stockQuantity: number;
  quantity: number;
};

const requestStatus = {
  pending: {
    label: "Chờ duyệt",
    className: "border-[#F0DCA4] bg-[#FFF7E2] text-[#9A6800]",
    icon: Clock3,
  },
  approved: {
    label: "Đã duyệt",
    className: "border-[#B8E9DD] bg-[#ECF8F7] text-[#087A6A]",
    icon: CheckCircle2,
  },
  fulfilled: {
    label: "Đã cấp phát",
    className: "border-[#B8E9DD] bg-[#ECF8F7] text-[#087A6A]",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Bị từ chối",
    className: "border-[#F2B7B7] bg-[#FDEDEE] text-[#B44545]",
    icon: XCircle,
  },
  cancelled: {
    label: "Đã hủy",
    className: "border-[#DDE7F0] bg-[#F7FAFC] text-[#71869A]",
    icon: XCircle,
  },
} as const;

function numberText(value: number | string) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function EmployeeSupplyRequests() {
  const utils = trpc.useUtils();
  const suppliesQuery = trpc.supplies.requestable.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const requestsQuery = trpc.supplies.myRequests.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const [selectedSupplyId, setSelectedSupplyId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  const createRequest = trpc.supplies.createRequest.useMutation({
    onSuccess: result => {
      toast.success(`Đã gửi yêu cầu ${result.requestCode}.`);
      setItems([]);
      setReason("");
      setSelectedSupplyId("");
      setQuantity("1");
      void utils.supplies.myRequests.invalidate();
      void utils.supplies.requestable.invalidate();
    },
    onError: error =>
      toast.error(error.message || "Không thể gửi yêu cầu cấp phụ kiện."),
  });

  const cancelRequest = trpc.supplies.cancelRequest.useMutation({
    onSuccess: () => {
      toast.success("Đã hủy yêu cầu.");
      void utils.supplies.myRequests.invalidate();
    },
    onError: error =>
      toast.error(error.message || "Không thể hủy yêu cầu."),
  });

  const supplies = suppliesQuery.data || [];
  const supplyOptions = useMemo(
    () =>
      supplies.map(supply => ({
        value: String(supply.id),
        label: `${supply.name} · còn ${numberText(supply.stockQuantity)} ${supply.unit}`,
        searchText: `${supply.code} ${supply.name} ${supply.location || ""}`,
      })),
    [supplies]
  );
  const selectedSupply = supplies.find(
    supply => supply.id === Number(selectedSupplyId)
  );

  const addItem = () => {
    if (!selectedSupply)
      return toast.error("Vui lòng chọn phụ kiện cần cấp.");
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0)
      return toast.error("Số lượng yêu cầu phải lớn hơn 0.");
    if (parsedQuantity > Number(selectedSupply.stockQuantity))
      return toast.error(
        `Kho hiện chỉ còn ${numberText(selectedSupply.stockQuantity)} ${selectedSupply.unit}.`
      );
    if (items.some(item => item.supplyId === selectedSupply.id))
      return toast.error("Phụ kiện này đã có trong yêu cầu.");
    setItems(current => [
      ...current,
      {
        supplyId: selectedSupply.id,
        code: selectedSupply.code,
        name: selectedSupply.name,
        unit: selectedSupply.unit,
        stockQuantity: Number(selectedSupply.stockQuantity),
        quantity: parsedQuantity,
      },
    ]);
    setSelectedSupplyId("");
    setQuantity("1");
  };

  const submit = () => {
    if (!items.length)
      return toast.error("Vui lòng thêm ít nhất một phụ kiện.");
    if (reason.trim().length < 3)
      return toast.error("Vui lòng nhập mục đích sử dụng.");
    createRequest.mutate({
      reason: reason.trim(),
      items: items.map(item => ({
        supplyId: item.supplyId,
        quantity: item.quantity,
      })),
    });
  };

  return (
    <section className="mb-5 rounded-2xl border border-[#CDE5E5] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,.05)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">
            <PackagePlus size={14} /> Yêu cầu phụ kiện
          </div>
          <h2 className="mt-1 font-display text-xl font-extrabold text-[#193B57]">
            Đề nghị cấp phụ kiện từ kho
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#71869A]">
            Chọn phụ kiện còn tồn, nhập số lượng và mục đích sử dụng. Quản trị
            viên QLTS sẽ kiểm tra trước khi lập phiếu cấp phát.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowHistory(value => !value)}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#CDE5E5] bg-[#F4FBFA] px-3 text-xs font-extrabold text-[#087A6A]"
        >
          <History size={15} />
          {showHistory ? "Ẩn lịch sử" : "Xem lịch sử"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_130px_auto] md:items-end">
        <label className="block">
          <span className="field-label">Phụ kiện còn trong kho</span>
          <SearchableSelect
            value={selectedSupplyId}
            onChange={setSelectedSupplyId}
            options={supplyOptions}
            placeholder={
              suppliesQuery.isLoading
                ? "Đang tải danh mục..."
                : "Chọn phụ kiện"
            }
            searchPlaceholder="Tìm theo mã hoặc tên phụ kiện..."
            emptyText="Không có phụ kiện phù hợp còn tồn"
          />
        </label>
        <label className="block">
          <span className="field-label">Số lượng</span>
          <input
            type="number"
            min="0.01"
            step="any"
            inputMode="decimal"
            value={quantity}
            onChange={event => setQuantity(event.target.value)}
            className="field-input"
          />
        </label>
        <button
          type="button"
          onClick={addItem}
          disabled={!selectedSupply}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#193B57] px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ShoppingBasket size={15} /> Thêm
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[#E3EDF2]">
        {items.length ? (
          <div className="divide-y divide-[#EDF2F5]">
            {items.map(item => (
              <div
                key={item.supplyId}
                className="flex items-center justify-between gap-4 bg-[#FBFDFE] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-extrabold text-[#193B57]">
                    {item.name}
                  </div>
                  <div className="mt-1 text-[10px] text-[#71869A]">
                    {item.code} · Kho còn {numberText(item.stockQuantity)}{" "}
                    {item.unit}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-extrabold text-[#087A6A]">
                    {numberText(item.quantity)} {item.unit}
                  </span>
                  <button
                    type="button"
                    aria-label={`Xóa ${item.name}`}
                    onClick={() =>
                      setItems(current =>
                        current.filter(row => row.supplyId !== item.supplyId)
                      )
                    }
                    className="grid h-8 w-8 place-items-center rounded-md border border-[#F1CCCC] text-[#B44545] hover:bg-[#FFF4F4]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-5 text-center text-xs text-[#8AA0B6]">
            Chưa chọn phụ kiện nào cho yêu cầu.
          </p>
        )}
      </div>

      <label className="mt-4 block">
        <span className="field-label">Mục đích sử dụng *</span>
        <textarea
          value={reason}
          maxLength={1000}
          onChange={event => setReason(event.target.value)}
          className="field-input mt-1 min-h-20 resize-y"
          placeholder="Ví dụ: thay chuột bị hỏng, bổ sung bàn làm việc mới..."
        />
      </label>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={createRequest.isPending || !items.length}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-5 text-xs font-extrabold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={15} />
          {createRequest.isPending ? "Đang gửi..." : "Gửi yêu cầu"}
        </button>
      </div>

      {showHistory && (
        <section className="mt-6 border-t border-[#E7EEF3] pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#193B57]">
                Lịch sử yêu cầu cấp phụ kiện
              </h3>
              <p className="mt-1 text-[11px] text-[#71869A]">
                Trạng thái được cập nhật tự động sau khi QLTS xử lý.
              </p>
            </div>
            <span className="rounded-full bg-[#EEF4F7] px-2.5 py-1 text-[10px] font-extrabold text-[#60758A]">
              {(requestsQuery.data || []).length} yêu cầu
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {requestsQuery.isLoading && (
              <p className="py-4 text-center text-xs text-[#71869A]">
                Đang tải lịch sử...
              </p>
            )}
            {(requestsQuery.data || []).map(request => {
              const presentation =
                requestStatus[request.status as keyof typeof requestStatus];
              const StatusIcon = presentation.icon;
              return (
                <article
                  key={request.id}
                  className="rounded-xl border border-[#E3EDF2] bg-[#FBFDFE] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-mono text-xs font-extrabold text-[#193B57]">
                        {request.requestCode}
                      </div>
                      <div className="mt-1 text-[11px] text-[#71869A]">
                        Gửi lúc{" "}
                        {new Date(request.createdAt).toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <span
                      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${presentation.className}`}
                    >
                      <StatusIcon size={12} /> {presentation.label}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {request.items.map(item => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-[#EDF2F5] bg-white px-3 py-2"
                      >
                        <div className="truncate text-xs font-bold text-[#193B57]">
                          {item.supplyName}
                        </div>
                        <div className="mt-1 text-[10px] text-[#71869A]">
                          {item.supplyCode} ·{" "}
                          {numberText(item.requestedQuantity)} {item.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#526779]">
                    <b>Mục đích:</b> {request.reason}
                  </p>
                  {request.reviewNote && (
                    <p className="mt-2 rounded-lg bg-[#F4F7FB] px-3 py-2 text-xs leading-5 text-[#60758A]">
                      <b>Phản hồi QLTS:</b> {request.reviewNote}
                    </p>
                  )}
                  {request.issueSlipId && (
                    <p className="mt-2 text-[11px] font-bold text-[#087A6A]">
                      Đã tạo phiếu cấp phát #{request.issueSlipId}
                    </p>
                  )}
                  {request.status === "pending" && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={cancelRequest.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Hủy yêu cầu ${request.requestCode}?`
                            )
                          )
                            cancelRequest.mutate({ id: request.id });
                        }}
                        className="rounded-lg border border-[#F1CCCC] px-3 py-2 text-[11px] font-extrabold text-[#B44545] hover:bg-[#FFF4F4] disabled:opacity-50"
                      >
                        Hủy yêu cầu
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
            {!requestsQuery.isLoading && !(requestsQuery.data || []).length && (
              <p className="rounded-xl border border-dashed border-[#DDE7F0] px-4 py-6 text-center text-xs text-[#8AA0B6]">
                Bạn chưa có yêu cầu cấp phụ kiện.
              </p>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
