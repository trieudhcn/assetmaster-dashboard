import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileBarChart,
  History,
  Plus,
  Save,
  Search,
  UserRound,
  Wrench,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { DatePickerField } from "@/components/DatePickerField";
import { SearchableSelect } from "@/components/SearchableSelect";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useAuth } from "@/_core/hooks/useAuth";
import { matchesVietnameseSearch } from "@/lib/catalogUi";
import { numberToVietnameseWords, parseVndAmount } from "@/lib/formatters";
import { ModuleEmptyState } from "@/components/ModuleEmptyState";
import { ModalTableSkeleton } from "@/components/ModalTableSkeleton";

const shell = "min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8";
const card = "rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]";

const maintenanceStatusLabels = {
  open: "Mới tiếp nhận",
  in_progress: "Đang xử lý",
  resolved: "Đã xử lý",
  closed: "Đã đóng",
} as const;

const priorityLabels = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Khẩn cấp",
} as const;

const issueTypeLabels = {
  maintenance: "Bảo trì định kỳ",
  incident: "Sự cố",
  damage: "Báo hỏng",
} as const;

const toDateInputValue = (value: Date | null | undefined) => value ? new Date(value).toISOString().slice(0, 10) : "";
const dateInputToMs = (value: string) => value ? new Date(`${value}T09:00:00`).getTime() : null;

function OperationalReminderPanel() {
  const remindersQuery = trpc.reminders.list.useQuery();
  const reminders = remindersQuery.data || [];
  return <section className={`mb-5 ${card} overflow-hidden`}>
    <div className="flex items-center justify-between border-b border-[#E7EEF3] px-5 py-4"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><BellRing size={16} className="text-[#A86B00]" />Nhắc việc vận hành</div><p className="mt-1 text-xs text-[#71869A]">Tổng hợp tự động hạn bảo trì và đợt kiểm kê trong 14 ngày tới.</p></div><span className="rounded-full bg-[#FFF9EB] px-2.5 py-1 text-[10px] font-extrabold text-[#A86B00]">{reminders.length} việc cần theo dõi</span></div>
    {remindersQuery.isLoading ? <div className="px-5 py-6 text-xs text-[#71869A]">Đang tải nhắc việc...</div> : remindersQuery.isError ? <div className="px-5 py-6 text-xs text-[#B44545]">Không thể tải nhắc việc. <button onClick={() => remindersQuery.refetch()} className="font-bold underline">Thử lại</button></div> : reminders.length === 0 ? <div className="px-5 py-6 text-xs text-[#71869A]">Chưa có lịch bảo trì hoặc kiểm kê nào đến hạn trong 14 ngày tới.</div> : <div className="divide-y divide-[#EDF2F5]">{reminders.slice(0, 5).map((reminder) => <div key={reminder.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2"><CalendarClock size={15} className="mt-0.5 text-[#0F8C8C]" /><div><div className="text-xs font-bold text-[#193B57]">{reminder.title}</div><div className="mt-0.5 text-[11px] text-[#71869A]">{reminder.kind === "maintenance" ? "Bảo trì" : "Kiểm kê"} · {reminder.detail}{reminder.recurrenceDays ? ` · Lặp lại mỗi ${reminder.recurrenceDays} ngày` : ""}</div></div></div><span className={`w-fit rounded-full px-2 py-1 text-[10px] font-extrabold ${reminder.isOverdue ? "bg-[#FDEDEE] text-[#B44545]" : "bg-[#FFF9EB] text-[#A86B00]"}`}>{reminder.isOverdue ? "Đã quá hạn" : `Hạn ${new Date(reminder.dueAt).toLocaleDateString("vi-VN")}`}</span></div>)}</div>}
  </section>;
}

type TicketDraft = {
  assigneeUserId: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  estimatedCost: string;
  actualCost: string;
  dueDate: string;
  recurrenceDays: string;
  resolution: string;
};

export function MaintenancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [assetId, setAssetId] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState<"maintenance" | "incident" | "damage">("incident");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurrenceDays, setRecurrenceDays] = useState("");
  const [ticketEdits, setTicketEdits] = useState<Record<number, TicketDraft>>({});
  const [isExportingCosts, setIsExportingCosts] = useState(false);
  const currentYear = new Date().getFullYear();
  const [maintenanceYear, setMaintenanceYear] = useState(String(currentYear));
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [historyTicket, setHistoryTicket] = useState<(typeof tickets)[number] | null>(null);
  const maintenancePageSize = 5;

  const assetsQuery = trpc.assets.list.useQuery();
  const ticketsQuery = trpc.maintenance.list.useQuery();
  const historyQuery = trpc.maintenance.history.useQuery({ id: historyTicket?.id || 0 }, { enabled: Boolean(historyTicket) });
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;
  const historyEntries = historyQuery.data ?? [];
  const historyTotalPages = Math.max(1, Math.ceil(historyEntries.length / historyPageSize));
  const visibleHistoryEntries = historyEntries.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);
  useEffect(() => { setHistoryPage(1); }, [historyTicket?.id]);
  useEffect(() => { setHistoryPage((current) => Math.min(current, historyTotalPages)); }, [historyTotalPages]);
  const employeesQuery = trpc.employees.list.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();

  const createMutation = trpc.maintenance.create.useMutation({
    onSuccess: () => {
      void ticketsQuery.refetch();
      void utils.assets.list.invalidate();
      setAssetId("");
      setDescription("");
      setEstimatedCost("");
      setDueDate("");
      setRecurrenceDays("");
      setIssueType("incident");
      setPriority("medium");
      toast.success("Đã tạo yêu cầu bảo trì.");
    },
    onError: (error) => toast.error(error.message || "Không thể tạo yêu cầu bảo trì."),
  });
  const updateMutation = trpc.maintenance.update.useMutation({
    onSuccess: (_, variables) => {
      void ticketsQuery.refetch();
      void utils.assets.list.invalidate();
      setTicketEdits((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      toast.success("Đã cập nhật yêu cầu bảo trì.");
    },
    onError: (error) => toast.error(error.message || "Không thể cập nhật yêu cầu bảo trì."),
  });
  const uploadAttachmentMutation = trpc.maintenance.uploadAttachment.useMutation({
    onSuccess: () => {
      void ticketsQuery.refetch();
      toast.success("Đã tải chứng từ lên hệ thống.");
    },
    onError: (error) => toast.error(error.message || "Không thể tải chứng từ."),
  });

  const assets = assetsQuery.data || [];
  const tickets = ticketsQuery.data || [];
  const maintenanceYears = Array.from(new Set([currentYear, ...tickets.map((ticket) => ticket.ticketYear || new Date(ticket.openedAt).getFullYear())])).sort((left, right) => right - left);
  const filteredTickets = tickets.filter((ticket) => maintenanceYear === "all" || (ticket.ticketYear || new Date(ticket.openedAt).getFullYear()) === Number(maintenanceYear));
  const maintenanceTotalPages = Math.max(1, Math.ceil(filteredTickets.length / maintenancePageSize));
  const pagedTickets = filteredTickets.slice((maintenancePage - 1) * maintenancePageSize, maintenancePage * maintenancePageSize);
  const employees = employeesQuery.data || [];
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  useEffect(() => {
    setMaintenancePage(1);
  }, [maintenanceYear]);
  useEffect(() => {
    setMaintenancePage((page) => Math.min(page, maintenanceTotalPages));
  }, [maintenanceTotalPages]);

  const draftFor = (ticket: (typeof tickets)[number]): TicketDraft => {
    return ticketEdits[ticket.id] || {
      assigneeUserId: ticket.assigneeUserId ? String(ticket.assigneeUserId) : "",
      status: ticket.status,
      estimatedCost: ticket.estimatedCost ? String(ticket.estimatedCost) : "",
      actualCost: ticket.actualCost ? String(ticket.actualCost) : "",
      dueDate: toDateInputValue(ticket.dueAt),
      recurrenceDays: ticket.recurrenceDays ? String(ticket.recurrenceDays) : "",
      resolution: ticket.resolution || "",
    };
  };

  const updateDraft = (ticket: (typeof tickets)[number], changes: Partial<TicketDraft>) => {
    setTicketEdits((current) => ({
      ...current,
      [ticket.id]: {
        ...{
          assigneeUserId: ticket.assigneeUserId ? String(ticket.assigneeUserId) : "",
          status: ticket.status,
          estimatedCost: ticket.estimatedCost ? String(ticket.estimatedCost) : "",
          actualCost: ticket.actualCost ? String(ticket.actualCost) : "",
          dueDate: toDateInputValue(ticket.dueAt),
          recurrenceDays: ticket.recurrenceDays ? String(ticket.recurrenceDays) : "",
          resolution: ticket.resolution || "",
        },
        ...(current[ticket.id] || {}),
        ...changes,
      },
    }));
  };

  const saveTicket = (ticket: (typeof tickets)[number]) => {
    const draft = draftFor(ticket);
    updateMutation.mutate({
      id: ticket.id,
      status: draft.status,
      assigneeUserId: draft.assigneeUserId ? Number(draft.assigneeUserId) : null,
      resolution: draft.resolution.trim() || null,
      estimatedCost: draft.estimatedCost.trim() || null,
      actualCost: draft.actualCost.trim() || null,
      dueAt: dateInputToMs(draft.dueDate),
      recurrenceDays: draft.recurrenceDays ? Number(draft.recurrenceDays) : null,
    });
  };

  const exportMaintenanceCosts = () => {
    if (tickets.length === 0) {
      toast.info("Chưa có dữ liệu chi phí bảo trì để xuất.");
      return;
    }
    setIsExportingCosts(true);
    const toastId = toast.loading("Đang chuẩn bị file Excel chi phí bảo trì...");
    window.setTimeout(() => {
      try {
        const rows = tickets.map((ticket) => {
      const estimated = parseVndAmount(String(ticket.estimatedCost ?? ""));
      const actual = parseVndAmount(String(ticket.actualCost ?? ""));
      const asset = assetById.get(ticket.assetId);
      return {
        "Mã phiếu": `BT-${ticket.id}`,
        "Mã tài sản": asset?.assetCode || "",
        "Tên tài sản": asset?.name || "",
        "Loại yêu cầu": issueTypeLabels[ticket.issueType as keyof typeof issueTypeLabels] || ticket.issueType,
        "Mức ưu tiên": priorityLabels[ticket.priority as keyof typeof priorityLabels] || ticket.priority,
        "Trạng thái": maintenanceStatusLabels[ticket.status as keyof typeof maintenanceStatusLabels] || ticket.status,
        "Chi phí dự kiến (VNĐ)": estimated || null,
        "Chi phí dự kiến bằng chữ": estimated ? numberToVietnameseWords(estimated) : "Chưa ghi nhận",
        "Chi phí thực tế (VNĐ)": actual || null,
        "Chi phí thực tế bằng chữ": actual ? numberToVietnameseWords(actual) : "Chưa ghi nhận",
        "Ngày tạo": ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("vi-VN") : "",
        "Hạn bảo trì": ticket.dueAt ? new Date(ticket.dueAt).toLocaleDateString("vi-VN") : "",
        "Người xử lý": ticket.assigneeUserId ? employeeById.get(ticket.assigneeUserId)?.name || "" : "Chưa phân công",
        "Mô tả": ticket.description,
        "Kết quả xử lý": ticket.resolution || "",
      };
    });
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 32 }, { wch: 20 }, { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 42 }, { wch: 42 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Chi phí bảo trì");
        XLSX.writeFile(workbook, `assetmaster-chi-phi-bao-tri-${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success(`Đã xuất ${rows.length} dòng chi phí bảo trì.`, { id: toastId });
      } catch (error) {
        console.error(error);
        toast.error("Không thể tạo file Excel chi phí bảo trì.", { id: toastId });
      } finally {
        setIsExportingCosts(false);
      }
    }, 180);
  };

  const uploadAttachment = (ticket: (typeof tickets)[number], file: File | undefined) => {
    if (!file) return;
    const supportedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
    if (!supportedTypes.includes(file.type as (typeof supportedTypes)[number])) {
      toast.error("Chỉ hỗ trợ chứng từ PDF, PNG, JPG hoặc WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Chứng từ không được vượt quá 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error("Không thể đọc tệp chứng từ.");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        toast.error("Không thể đọc tệp chứng từ.");
        return;
      }
      uploadAttachmentMutation.mutate({ id: ticket.id, fileName: file.name, contentType: file.type as "application/pdf" | "image/png" | "image/jpeg" | "image/webp", dataUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={shell}>
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#A86B00]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />Service operations
            </div>
            <h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">Bảo trì & Báo hỏng</h1>
            <p className="mt-1 text-sm text-[#71869A]">Ghi nhận sự cố, giao người xử lý, theo dõi tiến độ và đối soát chi phí.</p>
          </div>
          <div className="rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2 text-xs font-semibold text-[#A86B00]">
            {isAdmin ? "Quản trị viên có thể phân công và cập nhật xử lý." : "Chỉ quản trị viên có thể cập nhật phân công và chi phí."}
          </div>
        </div>

        <OperationalReminderPanel />

        <section className={`${card} p-5`}>
          <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-[#193B57]">
            <Wrench size={16} className="text-[#A86B00]" />Tạo yêu cầu mới
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SearchableSelect value={assetId} onChange={setAssetId} disabled={assetsQuery.isLoading} placeholder="Chọn tài sản" searchPlaceholder="Tìm mã hoặc tên tài sản..." options={[{ value: "", label: "Chọn tài sản" }, ...assets.map((asset) => ({ value: String(asset.id), label: `${asset.assetCode} · ${asset.name}`, searchText: asset.assetCode }))]} />
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả tình trạng cần xử lý" className="field-input" />
            <SearchableSelect value={issueType} onChange={(value) => setIssueType(value as typeof issueType)} searchPlaceholder="Tìm loại yêu cầu..." options={Object.entries(issueTypeLabels).map(([value, label]) => ({ value, label }))} />
            <SearchableSelect value={priority} onChange={(value) => setPriority(value as typeof priority)} searchPlaceholder="Tìm mức ưu tiên..." options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label: `${label} ưu tiên` }))} />
            <CurrencyInput value={estimatedCost} onChange={setEstimatedCost} placeholder="Chi phí dự kiến" aria-label="Chi phí dự kiến" showWords />
            <DatePickerField value={dueDate} onChange={setDueDate} aria-label="Hạn bảo trì" />
            <input value={recurrenceDays} onChange={(event) => setRecurrenceDays(event.target.value.replace(/\D/g, ""))} placeholder="Lặp lại (ngày)" inputMode="numeric" className="field-input" />
            <button
              disabled={createMutation.isPending}
              onClick={() => {
                if (!assetId || description.trim().length < 5) {
                  toast.error("Chọn tài sản và nhập mô tả tối thiểu 5 ký tự.");
                  return;
                }
                createMutation.mutate({ assetId: Number(assetId), description, issueType, priority, estimatedCost: estimatedCost.trim() || null, dueAt: dateInputToMs(dueDate), recurrenceDays: recurrenceDays ? Number(recurrenceDays) : null });
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={15} />{createMutation.isPending ? "Đang tạo" : "Tạo yêu cầu"}
            </button>
          </div>
          {!assetsQuery.isLoading && assets.length === 0 && <p className="mt-3 text-xs text-[#A86B00]">Chưa có tài sản để tạo yêu cầu bảo trì.</p>}
        </section>

        <section className={`mt-5 overflow-hidden ${card}`}>
          <div className="flex flex-col gap-2 border-b border-[#E7EEF3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-[#193B57]">Quản lý yêu cầu</h2>
              <p className="mt-1 text-xs text-[#8AA0B6]">Phân công, tiến độ, chi phí dự kiến và chi phí thực tế được lưu tập trung.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2"><label className="flex min-w-[180px] items-center gap-2 text-xs font-bold text-[#60758A]"><span className="shrink-0">Năm</span><SearchableSelect value={maintenanceYear} onChange={setMaintenanceYear} className="min-w-0 flex-1" placeholder="Tất cả năm" searchPlaceholder="Tìm năm..." options={[{ value: "all", label: "Tất cả năm" }, ...maintenanceYears.map((year) => ({ value: String(year), label: String(year) }))]} /></label><button type="button" onClick={exportMaintenanceCosts} disabled={ticketsQuery.isLoading || tickets.length === 0 || isExportingCosts} className="inline-flex items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-50"><Download size={14} className={isExportingCosts ? "animate-pulse" : ""} />{isExportingCosts ? "Đang xuất..." : "Xuất Excel chi phí"}</button><span className="text-xs font-bold text-[#60758A]">{filteredTickets.length} yêu cầu</span></div>
          </div>

          {ticketsQuery.isError ? (
            <div className="m-5 rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-4 text-sm">
              <div className="flex items-center gap-2 font-bold text-[#A86B00]"><AlertTriangle size={16} />Không thể tải yêu cầu bảo trì</div>
              <p className="mt-1 text-xs leading-5 text-[#71869A]">{ticketsQuery.error.message || "Vui lòng kiểm tra kết nối và thử lại."}</p>
              <button onClick={() => ticketsQuery.refetch()} className="mt-3 rounded-lg border border-[#F2D596] px-3 py-2 text-xs font-bold text-[#A86B00] hover:bg-white">Thử lại</button>
            </div>
          ) : (
            <div className="mobile-table-scroll overflow-x-auto">
              <table className="w-full min-w-[1280px] text-left text-xs">
                <thead className="bg-[#FBFCFD] text-[10px] uppercase tracking-[.12em] text-[#8AA0B6]">
                  <tr>
                    <th className="px-5 py-3">Phiếu / tài sản</th>
                    <th className="px-4 py-3">Sự cố</th>
                    <th className="px-4 py-3">Ưu tiên</th>
                    <th className="px-4 py-3">Người xử lý</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Chi phí</th>
                    <th className="px-4 py-3">Chứng từ</th>
                    <th className="px-4 py-3">Kết quả xử lý</th>
                    <th className="px-5 py-3 text-right">Lưu</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsQuery.isLoading && <tr><td colSpan={9}><ModalTableSkeleton rows={5} columns={9} /></td></tr>}
                  {!ticketsQuery.isLoading && pagedTickets.map((ticket) => {
                    const draft = draftFor(ticket);
                    const asset = assetById.get(ticket.assetId);
                    const assignee = ticket.assigneeUserId ? employeeById.get(ticket.assigneeUserId) : undefined;
                    const priorityTone = ticket.priority === "critical" ? "bg-[#FDEDEE] text-[#B44545]" : ticket.priority === "high" ? "bg-[#FFF5DC] text-[#A86B00]" : ticket.priority === "medium" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#F0F5F8] text-[#60758A]";
                    const isClosed = ticket.status === "closed";
                    const canEditTicket = isAdmin && !isClosed;
                    return (
                      <tr key={ticket.id} className={`border-t border-[#EDF2F5] align-top ${isClosed ? "bg-[#FBFCFD]" : ""}`}>
                        <td className="px-5 py-4">
                          <div className="font-mono text-[11px] font-bold text-[#0F8C8C]">{ticket.ticketCode}</div>
                          <div className="mt-1 flex items-center gap-1.5 font-semibold text-[#193B57]"><Wrench size={13} className="text-[#A86B00]" />{asset?.name || `Tài sản #${ticket.assetId}`}</div>
                          <div className="mt-1 text-[10px] text-[#8AA0B6]">{asset?.assetCode || "Mã tài sản không còn khả dụng"} · Báo bởi {ticket.reporterName || "Người dùng"}</div>
                          <button type="button" onClick={() => setHistoryTicket(ticket)} className="mt-2 inline-flex items-center gap-1 rounded-md border border-[#CDE5E5] px-2 py-1 text-[10px] font-bold text-[#087A6A] transition hover:bg-[#ECF8F7]" aria-label={`Xem lịch sử ${ticket.ticketCode}`}><History size={12} />Xem lịch sử</button>
                        </td>
                        <td className="max-w-[230px] px-4 py-4"><div className="font-semibold text-[#193B57]">{issueTypeLabels[ticket.issueType]}</div><p className="mt-1 leading-5 text-[#60758A]">{ticket.description}</p></td>
                        <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-extrabold ${priorityTone}`}>{priorityLabels[ticket.priority]}</span></td>
                        <td className="px-4 py-4">
                          <SearchableSelect value={draft.assigneeUserId} onChange={(value) => updateDraft(ticket, { assigneeUserId: value })} disabled={!canEditTicket || updateMutation.isPending || employeesQuery.isLoading} className="min-w-[155px]" placeholder="Chưa phân công" searchPlaceholder="Tìm người xử lý..." options={[{ value: "", label: "Chưa phân công" }, ...employees.map((employee) => ({ value: String(employee.id), label: `${employee.name || employee.email || `Nhân viên #${employee.id}`}${employee.isActive ? "" : " · Đã khóa"}`, searchText: employee.email || "" }))]} />
                          {assignee && <div className="mt-1 flex items-center gap-1 text-[10px] text-[#8AA0B6]"><UserRound size={11} />Đang giao: {assignee.name || assignee.email}</div>}
                        </td>
                        <td className="px-4 py-4">
                          <SearchableSelect value={draft.status} onChange={(value) => updateDraft(ticket, { status: value as TicketDraft["status"] })} disabled={!canEditTicket || updateMutation.isPending} className="min-w-[135px]" searchPlaceholder="Tìm trạng thái..." options={Object.entries(maintenanceStatusLabels).map(([value, label]) => ({ value, label }))} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="min-w-[148px] space-y-2"><label className="block text-[10px] font-bold text-[#8AA0B6]">Dự kiến<CurrencyInput disabled={!canEditTicket || updateMutation.isPending} value={draft.estimatedCost} onChange={(value) => updateDraft(ticket, { estimatedCost: value })} placeholder={canEditTicket ? "0" : "Chưa nhập"} aria-label="Chi phí dự kiến" showWords className="mt-1 h-9 !w-full min-w-[140px] text-xs" /></label><label className="block text-[10px] font-bold text-[#8AA0B6]">Thực tế<CurrencyInput disabled={!canEditTicket || updateMutation.isPending} value={draft.actualCost} onChange={(value) => updateDraft(ticket, { actualCost: value })} placeholder={canEditTicket ? "0" : "Chưa nhập"} aria-label="Chi phí thực tế" showWords className="mt-1 h-9 !w-full min-w-[140px] text-xs" /></label></div>
                        </td>
                        <td className="px-4 py-4">
                          {ticket.attachmentUrl ? <a href={ticket.attachmentUrl} target="_blank" rel="noreferrer" className="block max-w-[160px] truncate text-xs font-bold text-[#087A6A] underline decoration-[#8BCDC6] underline-offset-2" title={ticket.attachmentName || "Mở chứng từ"}>{ticket.attachmentName || "Mở chứng từ"}</a> : <span className="text-[10px] text-[#8AA0B6]">Chưa có chứng từ</span>}
                          {isAdmin && <label className={`mt-2 inline-flex items-center rounded-md border border-[#CDE5E5] px-2 py-1.5 text-[10px] font-bold ${canEditTicket ? "cursor-pointer text-[#087A6A] hover:bg-[#ECF8F7]" : "cursor-not-allowed text-[#8AA0B6] opacity-70"}`}><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" disabled={!canEditTicket || uploadAttachmentMutation.isPending} onChange={(event) => { uploadAttachment(ticket, event.target.files?.[0]); event.currentTarget.value = ""; }} />{uploadAttachmentMutation.isPending ? "Đang tải" : isClosed ? "Phiếu đã đóng" : "Tải chứng từ"}</label>}
                        </td>
                        <td className="px-4 py-4"><textarea disabled={!canEditTicket || updateMutation.isPending} value={draft.resolution} onChange={(event) => updateDraft(ticket, { resolution: event.target.value })} placeholder="Nhập kết quả hoặc hướng xử lý..." className="min-h-[72px] w-[210px] resize-y rounded-md border border-[#DDE7F0] p-2 text-xs leading-5 text-[#193B57] outline-none focus:border-[#0F8C8C] disabled:cursor-not-allowed disabled:opacity-60" /></td>
                        <td className="px-5 py-4 text-right"><button disabled={!canEditTicket || updateMutation.isPending} onClick={() => saveTicket(ticket)} className="inline-flex items-center gap-1.5 rounded-md bg-[#0F8C8C] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Save size={13} />{updateMutation.isPending ? "Đang lưu" : isClosed ? "Đã đóng" : "Lưu"}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!ticketsQuery.isLoading && filteredTickets.length === 0 && <ModuleEmptyState module="maintenance" title="Chưa có yêu cầu bảo trì" description="Khi có sự cố hoặc lịch bảo trì mới, yêu cầu sẽ hiển thị tại đây để bạn theo dõi và xử lý." />}
              {filteredTickets.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7EEF3] px-5 py-4 text-xs text-[#8AA0B6]"><span>Trang <b className="text-[#60758A]">{maintenancePage}</b> / {maintenanceTotalPages}</span><div className="flex items-center gap-2"><button type="button" onClick={() => setMaintenancePage((page) => Math.max(1, page - 1))} disabled={maintenancePage === 1} className="rounded-md border border-[#DDE7F0] px-3 py-1.5 font-bold text-[#60758A] disabled:cursor-not-allowed disabled:opacity-40">‹</button><button type="button" onClick={() => setMaintenancePage((page) => Math.min(maintenanceTotalPages, page + 1))} disabled={maintenancePage === maintenanceTotalPages} className="rounded-md border border-[#DDE7F0] px-3 py-1.5 font-bold text-[#60758A] disabled:cursor-not-allowed disabled:opacity-40">›</button></div></div>}
            </div>
          )}
        </section>
        {historyTicket && <div className="fixed inset-0 z-[140] flex justify-end bg-[#102A43]/30 p-0 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryTicket(null); }}><aside className="motion-drawer-panel h-full w-full max-w-[480px] overflow-y-auto bg-white p-5 shadow-[-12px_0_32px_rgba(16,42,67,0.18)]" role="dialog" aria-modal="true" aria-label={`Lịch sử phiếu ${historyTicket.ticketCode}`}><div className="flex items-start justify-between gap-3 border-b border-[#E7EEF3] pb-4"><div><div className="font-mono text-xs font-extrabold text-[#0F8C8C]">{historyTicket.ticketCode}</div><h2 className="mt-1 text-base font-extrabold text-[#193B57]">Lịch sử thay đổi</h2><p className="mt-1 text-xs text-[#71869A]">Theo dõi toàn bộ thao tác và cập nhật của phiếu bảo trì.</p></div><button type="button" onClick={() => setHistoryTicket(null)} className="grid h-8 w-8 place-items-center rounded-lg text-xl text-[#60758A] hover:bg-[#ECF8F7] hover:text-[#087A6A]" aria-label="Đóng lịch sử">×</button></div><div className="mt-5 space-y-3">{historyQuery.isLoading ? <div className="rounded-xl bg-[#F6FAFC] px-4 py-8 text-center text-xs font-semibold text-[#8AA0B6]">Đang tải lịch sử...</div> : historyQuery.isError ? <div className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] px-4 py-5 text-xs text-[#A86B00]">Không thể tải lịch sử phiếu. <button type="button" onClick={() => historyQuery.refetch()} className="font-bold underline">Thử lại</button></div> : historyEntries.length ? <>{visibleHistoryEntries.map((entry) => <div key={entry.id} className="relative rounded-xl border border-[#E7EEF3] bg-white p-4 shadow-[0_4px_14px_rgba(16,42,67,0.04)]"><div className="flex items-start justify-between gap-3"><div className="text-xs font-extrabold text-[#193B57]">{entry.summary || entry.action}</div><span className="shrink-0 text-[10px] font-semibold text-[#8AA0B6]">{new Date(entry.createdAt).toLocaleString("vi-VN")}</span></div><div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#60758A]"><span className="rounded-full bg-[#ECF8F7] px-2 py-1 font-bold text-[#087A6A]">{entry.action}</span><span>Thực hiện bởi: <b>{entry.actorName || "Hệ thống"}</b></span></div></div>)}{historyEntries.length > 0 && <div className="flex items-center justify-between border-t border-[#E7EEF3] pt-3"><span className="text-[10px] font-semibold text-[#8AA0B6]">Trang {historyPage}/{historyTotalPages} · {historyEntries.length} bản ghi</span><div className="flex gap-1"><button type="button" disabled={historyPage === 1} onClick={() => setHistoryPage((current) => Math.max(1, current - 1))} className="rounded-md border border-[#DDE7F0] px-2 py-1 text-[10px] font-bold text-[#60758A] disabled:cursor-not-allowed disabled:opacity-40">‹</button><button type="button" disabled={historyPage >= historyTotalPages} onClick={() => setHistoryPage((current) => Math.min(historyTotalPages, current + 1))} className="rounded-md border border-[#DDE7F0] px-2 py-1 text-[10px] font-bold text-[#60758A] disabled:cursor-not-allowed disabled:opacity-40">›</button></div></div>}</> : <div className="rounded-xl border border-dashed border-[#CDE5E5] bg-[#F8FCFC] px-4 py-8 text-center text-xs font-semibold text-[#8AA0B6]">Chưa có lịch sử thay đổi cho phiếu này.</div>}</div></aside></div>}
      </div>
    </div>
  );
}

function LegacyAuditPageDisabled() {
  const [name, setName] = useState("");
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [assetId, setAssetId] = useState("");
  const audits = trpc.audits.list.useQuery();
  const assets = trpc.assets.list.useQuery();
  const items = trpc.audits.getItems.useQuery({ sessionId: selectedSession ?? 0 }, { enabled: Boolean(selectedSession) });
  const create = trpc.audits.create.useMutation({ onSuccess: () => { audits.refetch(); setName(""); toast.success("Đã tạo đợt kiểm kê."); } });
  const addItem = trpc.audits.addItem.useMutation({ onSuccess: () => { items.refetch(); setAssetId(""); toast.success("Đã thêm tài sản vào đợt kiểm kê."); } });
  const record = trpc.audits.recordItem.useMutation({ onSuccess: () => { items.refetch(); toast.success("Đã ghi nhận kết quả kiểm kê."); } });
  return <div className={shell}><div className="mx-auto max-w-[1500px]"><div className="mb-7"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#0F8C8C]" />Inventory verification</div><h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">Kiểm kê tài sản</h1><p className="mt-1 text-sm text-[#71869A]">Lập đợt kiểm kê, đối chiếu thực tế và xử lý chênh lệch theo từng tài sản.</p></div><div className={`${card} p-5`}><div className="flex flex-col gap-3 sm:flex-row"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên đợt kiểm kê, ví dụ: Kiểm kê Quý I/2026" className="field-input flex-1" /><button onClick={() => { if (name.trim().length < 3) { toast.error("Nhập tên đợt kiểm kê tối thiểu 3 ký tự."); return; } create.mutate({ name }); }} className="flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white"><ClipboardCheck size={15} />Tạo đợt kiểm kê</button></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{audits.data?.map((audit) => <button key={audit.id} onClick={() => setSelectedSession(audit.id)} className={`${card} p-5 text-left transition hover:-translate-y-0.5 ${selectedSession === audit.id ? "ring-2 ring-[#0F8C8C]" : ""}`}><div className="font-mono text-[10px] font-bold text-[#0F8C8C]">{audit.referenceCode}</div><div className="mt-2 text-sm font-extrabold text-[#193B57]">{audit.name}</div><div className="mt-4 inline-flex rounded-full bg-[#F0F5F8] px-2.5 py-1 text-[10px] font-bold text-[#60758A]">{audit.status}</div></button>)}</div>{selectedSession && <div className={`mt-5 ${card} overflow-hidden`}><div className="flex flex-col gap-3 border-b border-[#E7EEF3] p-5 sm:flex-row"><SearchableSelect value={assetId} onChange={setAssetId} className="flex-1" placeholder="Chọn tài sản cần kiểm kê" searchPlaceholder="Tìm mã hoặc tên tài sản..." options={[{ value: "", label: "Chọn tài sản cần kiểm kê" }, ...(assets.data || []).map((asset) => ({ value: String(asset.id), label: `${asset.assetCode} · ${asset.name}`, searchText: asset.assetCode }))]} /><button onClick={() => { if (!assetId) { toast.error("Chọn một tài sản."); return; } addItem.mutate({ sessionId: selectedSession, assetId: Number(assetId), expectedStatus: "available" }); }} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white">Thêm tài sản</button></div><div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-[#FBFCFD] text-[10px] uppercase tracking-[.12em] text-[#8AA0B6]"><tr><th className="px-5 py-3">Tài sản</th><th className="px-4 py-3">Kỳ vọng</th><th className="px-4 py-3">Kết quả</th><th className="px-4 py-3">Ghi nhận</th></tr></thead><tbody>{items.data?.map((item) => <tr key={item.id} className="border-t border-[#EDF2F5]"><td className="px-5 py-4 font-mono font-bold text-[#0F8C8C]">#{item.assetId}</td><td className="px-4 py-4">{item.expectedStatus || "—"}</td><td className="px-4 py-4 font-bold text-[#A86B00]">{item.result}</td><td className="px-4 py-4"><div className="flex gap-2"><button onClick={() => record.mutate({ id: item.id, actualStatus: item.expectedStatus, result: "matched", note: null })} className="rounded-md border border-[#CDE5E5] px-2 py-1 text-[10px] font-bold text-[#087A6A]">Khớp</button><button onClick={() => record.mutate({ id: item.id, actualStatus: null, result: "missing", note: "Không tìm thấy tại vị trí kiểm kê" })} className="rounded-md border border-[#F2D596] px-2 py-1 text-[10px] font-bold text-[#A86B00]">Thiếu</button></div></td></tr>)}</tbody></table></div></div>}</div></div>;
}

type AuditItemDraft = {
  actualStatus: string;
  result: "pending" | "matched" | "missing" | "mismatch";
  note: string;
};

const auditResultLabels = {
  pending: "Chưa kiểm",
  matched: "Khớp",
  missing: "Không tìm thấy",
  mismatch: "Chênh lệch",
} as const;

const auditSessionStatusLabels = {
  draft: "Nháp",
  active: "Đang kiểm kê",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
} as const;

export function AuditPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [name, setName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [auditRecurrenceDays, setAuditRecurrenceDays] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [assetId, setAssetId] = useState("");
  const [itemEdits, setItemEdits] = useState<Record<number, AuditItemDraft>>({});

  const auditsQuery = trpc.audits.list.useQuery();
  const assetsQuery = trpc.assets.list.useQuery();
  const auditItemsQuery = trpc.audits.getItems.useQuery({ sessionId: selectedSessionId ?? 0 }, { enabled: Boolean(selectedSessionId) });
  const createSessionMutation = trpc.audits.create.useMutation({
    onSuccess: ({ id }) => {
      void auditsQuery.refetch();
      setName("");
      setScheduledDate("");
      setAuditRecurrenceDays("");
      setSelectedSessionId(id);
      toast.success("Đã tạo đợt kiểm kê.");
    },
    onError: (error) => toast.error(error.message || "Không thể tạo đợt kiểm kê."),
  });
  const addItemMutation = trpc.audits.addItem.useMutation({
    onSuccess: () => {
      void auditItemsQuery.refetch();
      setAssetId("");
      toast.success("Đã thêm tài sản vào đợt kiểm kê.");
    },
    onError: (error) => toast.error(error.message || "Không thể thêm tài sản vào đợt kiểm kê."),
  });
  const recordItemMutation = trpc.audits.recordItem.useMutation({
    onSuccess: (_, variables) => {
      void auditItemsQuery.refetch();
      setItemEdits((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      toast.success("Đã ghi nhận kết quả kiểm kê.");
    },
    onError: (error) => toast.error(error.message || "Không thể lưu kết quả kiểm kê."),
  });

  const auditSessions = auditsQuery.data || [];
  const assets = assetsQuery.data || [];
  const auditItems = auditItemsQuery.data || [];
  const selectedAudit = auditSessions.find((audit) => audit.id === selectedSessionId);
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const alreadyAddedAssetIds = new Set(auditItems.map((item) => item.assetId));
  const availableAssets = assets.filter((asset) => !alreadyAddedAssetIds.has(asset.id));

  const draftFor = (item: (typeof auditItems)[number]): AuditItemDraft => itemEdits[item.id] || {
    actualStatus: item.actualStatus || "",
    result: item.result,
    note: item.note || "",
  };

  const updateDraft = (item: (typeof auditItems)[number], changes: Partial<AuditItemDraft>) => {
    setItemEdits((current) => ({
      ...current,
      [item.id]: {
        ...{ actualStatus: item.actualStatus || "", result: item.result, note: item.note || "" },
        ...(current[item.id] || {}),
        ...changes,
      },
    }));
  };

  const recordItem = (item: (typeof auditItems)[number]) => {
    const draft = draftFor(item);
    recordItemMutation.mutate({
      id: item.id,
      actualStatus: draft.actualStatus.trim() || null,
      result: draft.result,
      note: draft.note.trim() || null,
    });
  };

  const summary = {
    total: auditItems.length,
    pending: auditItems.filter((item) => item.result === "pending").length,
    matched: auditItems.filter((item) => item.result === "matched").length,
    discrepancies: auditItems.filter((item) => item.result === "missing" || item.result === "mismatch").length,
  };

  return (
    <div className={shell}>
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#0F8C8C]" />Inventory verification</div>
            <h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">Kiểm kê tài sản</h1>
            <p className="mt-1 text-sm text-[#71869A]">Đối chiếu expected/actual, ghi nhận chênh lệch và lưu lịch sử theo từng tài sản.</p>
          </div>
          <div className="rounded-lg border border-[#CDE5E5] bg-[#ECF8F7] px-3 py-2 text-xs font-semibold text-[#087A6A]">{isAdmin ? "Bạn có thể tạo đợt và ghi nhận kết quả kiểm kê." : "Chỉ quản trị viên có thể ghi nhận kết quả kiểm kê."}</div>
        </div>

        <OperationalReminderPanel />

        <section className={`${card} p-5`}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_155px_145px_auto]">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên đợt kiểm kê, ví dụ: Kiểm kê Quý I/2026" className="field-input flex-1" disabled={!isAdmin || createSessionMutation.isPending} />
            <DatePickerField value={scheduledDate} onChange={setScheduledDate} aria-label="Ngày kiểm kê" disabled={!isAdmin || createSessionMutation.isPending} />
            <input value={auditRecurrenceDays} onChange={(event) => setAuditRecurrenceDays(event.target.value.replace(/\D/g, ""))} placeholder="Chu kỳ (ngày)" inputMode="numeric" className="field-input" disabled={!isAdmin || createSessionMutation.isPending} />
            <button disabled={!isAdmin || createSessionMutation.isPending} onClick={() => {
              if (name.trim().length < 3) { toast.error("Nhập tên đợt kiểm kê tối thiểu 3 ký tự."); return; }
              createSessionMutation.mutate({ name: name.trim(), scheduledAt: dateInputToMs(scheduledDate), recurrenceDays: auditRecurrenceDays ? Number(auditRecurrenceDays) : null });
            }} className="flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><ClipboardCheck size={15} />{createSessionMutation.isPending ? "Đang tạo" : "Tạo đợt kiểm kê"}</button>
          </div>
        </section>

        {auditsQuery.isError ? (
          <div className="mt-5 rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-5 text-sm"><div className="flex items-center gap-2 font-bold text-[#A86B00]"><AlertTriangle size={16} />Không thể tải các đợt kiểm kê</div><p className="mt-1 text-xs text-[#71869A]">{auditsQuery.error.message || "Vui lòng kiểm tra kết nối và thử lại."}</p><button onClick={() => auditsQuery.refetch()} className="mt-3 rounded-lg border border-[#F2D596] px-3 py-2 text-xs font-bold text-[#A86B00] hover:bg-white">Thử lại</button></div>
        ) : (
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#193B57]">Các đợt kiểm kê</h2><span className="text-xs font-bold text-[#60758A]">{auditSessions.length} đợt</span></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {auditsQuery.isLoading && <div className={`${card} col-span-full p-8 text-center text-sm text-[#71869A]`}>Đang tải các đợt kiểm kê...</div>}
              {!auditsQuery.isLoading && auditSessions.map((audit) => {
                const selected = selectedSessionId === audit.id;
                const tone = audit.status === "completed" ? "bg-[#E6F6F2] text-[#087A6A]" : audit.status === "cancelled" ? "bg-[#FDEDEE] text-[#B44545]" : audit.status === "active" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#F0F5F8] text-[#60758A]";
                return <button key={audit.id} onClick={() => setSelectedSessionId(audit.id)} className={`${card} p-5 text-left transition hover:-translate-y-0.5 ${selected ? "ring-2 ring-[#0F8C8C]" : ""}`}><div className="flex items-start justify-between gap-3"><div className="font-mono text-[10px] font-bold text-[#0F8C8C]">{audit.referenceCode}</div><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${tone}`}>{auditSessionStatusLabels[audit.status]}</span></div><div className="mt-3 text-sm font-extrabold text-[#193B57]">{audit.name}</div><div className="mt-2 text-xs text-[#8AA0B6]">Tạo ngày {new Date(audit.createdAt).toLocaleDateString("vi-VN")}</div></button>;
              })}
              {!auditsQuery.isLoading && auditSessions.length === 0 && <div className={`${card} col-span-full p-10 text-center text-sm text-[#8AA0B6]`}>Chưa có đợt kiểm kê nào. Hãy tạo một đợt để bắt đầu đối chiếu tài sản.</div>}
            </div>
          </section>
        )}

        {selectedAudit && <section className={`mt-5 overflow-hidden ${card}`}>
          <div className="flex flex-col gap-4 border-b border-[#E7EEF3] p-5 lg:flex-row lg:items-end lg:justify-between">
            <div><div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0F8C8C]">Chi tiết kiểm kê</div><h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">{selectedAudit.name}</h2><p className="mt-1 text-xs text-[#71869A]">{selectedAudit.referenceCode} · Đối chiếu trạng thái hệ thống với thực tế kiểm kê.</p></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-[#F0F5F8] px-3 py-2 text-center"><div className="text-[10px] font-bold text-[#8AA0B6]">Tổng</div><div className="mt-1 font-display text-lg font-extrabold text-[#193B57]">{summary.total}</div></div>
              <div className="rounded-lg bg-[#FFF9EB] px-3 py-2 text-center"><div className="text-[10px] font-bold text-[#A86B00]">Chưa kiểm</div><div className="mt-1 font-display text-lg font-extrabold text-[#A86B00]">{summary.pending}</div></div>
              <div className="rounded-lg bg-[#ECF8F7] px-3 py-2 text-center"><div className="text-[10px] font-bold text-[#087A6A]">Khớp</div><div className="mt-1 font-display text-lg font-extrabold text-[#087A6A]">{summary.matched}</div></div>
              <div className="rounded-lg bg-[#FDEDEE] px-3 py-2 text-center"><div className="text-[10px] font-bold text-[#B44545]">Chênh lệch</div><div className="mt-1 font-display text-lg font-extrabold text-[#B44545]">{summary.discrepancies}</div></div>
            </div>
          </div>

          <div className="border-b border-[#E7EEF3] bg-[#FBFCFD] p-5"><div className="flex flex-col gap-3 sm:flex-row"><SearchableSelect value={assetId} onChange={setAssetId} disabled={!isAdmin || assetsQuery.isLoading || addItemMutation.isPending} className="flex-1" placeholder="Chọn tài sản cần kiểm kê" searchPlaceholder="Tìm mã, tên hoặc trạng thái..." options={[{ value: "", label: "Chọn tài sản cần kiểm kê" }, ...availableAssets.map((asset) => ({ value: String(asset.id), label: `${asset.assetCode} · ${asset.name} · ${asset.status}`, searchText: `${asset.assetCode} ${asset.status}` }))]} /><button disabled={!isAdmin || !assetId || addItemMutation.isPending} onClick={() => { const asset = assets.find((candidate) => candidate.id === Number(assetId)); if (!asset) { toast.error("Chọn một tài sản hợp lệ."); return; } addItemMutation.mutate({ sessionId: selectedAudit.id, assetId: asset.id, expectedStatus: asset.status }); }} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60">{addItemMutation.isPending ? "Đang thêm" : "Thêm tài sản"}</button></div>{availableAssets.length === 0 && !assetsQuery.isLoading && <p className="mt-2 text-xs text-[#8AA0B6]">Tất cả tài sản hiện có đã được thêm vào đợt kiểm kê này.</p>}</div>

          {auditItemsQuery.isError ? <div className="m-5 rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-4 text-sm"><div className="flex items-center gap-2 font-bold text-[#A86B00]"><AlertTriangle size={16} />Không thể tải chi tiết kiểm kê</div><p className="mt-1 text-xs text-[#71869A]">{auditItemsQuery.error.message || "Vui lòng thử lại."}</p><button onClick={() => auditItemsQuery.refetch()} className="mt-3 rounded-lg border border-[#F2D596] px-3 py-2 text-xs font-bold text-[#A86B00] hover:bg-white">Thử lại</button></div> : <div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[1160px] text-left text-xs"><thead className="bg-[#FCFDFE] text-[10px] uppercase tracking-[.12em] text-[#8AA0B6]"><tr><th className="px-5 py-3">Tài sản</th><th className="px-4 py-3">Expected</th><th className="px-4 py-3">Actual</th><th className="px-4 py-3">Kết quả</th><th className="px-4 py-3">Ghi chú / lịch sử</th><th className="px-5 py-3 text-right">Lưu</th></tr></thead><tbody>{auditItemsQuery.isLoading && <tr><td colSpan={6}><ModalTableSkeleton rows={5} columns={6} /></td></tr>}{!auditItemsQuery.isLoading && auditItems.map((item) => { const asset = assetById.get(item.assetId); const draft = draftFor(item); const isDiscrepancy = draft.result === "missing" || draft.result === "mismatch"; const badgeTone = draft.result === "matched" ? "bg-[#E6F6F2] text-[#087A6A]" : isDiscrepancy ? "bg-[#FDEDEE] text-[#B44545]" : "bg-[#FFF5DC] text-[#A86B00]"; return <tr key={item.id} className={`border-t border-[#EDF2F5] align-top ${isDiscrepancy ? "bg-[#FFF9FA]" : ""}`}><td className="px-5 py-4"><div className="font-bold text-[#193B57]">{asset?.name || `Tài sản #${item.assetId}`}</div><div className="mt-1 font-mono text-[10px] text-[#0F8C8C]">{asset?.assetCode || "Tài sản đã bị lưu trữ"}</div><div className="mt-1 text-[10px] text-[#8AA0B6]">Trạng thái hệ thống: {asset?.status || "—"}</div></td><td className="px-4 py-4"><span className="rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]">{item.expectedStatus || "Chưa xác định"}</span></td><td className="px-4 py-4"><SearchableSelect value={draft.actualStatus} onChange={(value) => updateDraft(item, { actualStatus: value })} disabled={!isAdmin || recordItemMutation.isPending} className="min-w-[140px]" placeholder="Chưa ghi nhận" searchPlaceholder="Tìm trạng thái thực tế..." options={[{ value: "", label: "Chưa ghi nhận" }, { value: "available", label: "Sẵn có" }, { value: "assigned", label: "Đang cấp phát" }, { value: "maintenance", label: "Bảo trì" }, { value: "retired", label: "Ngừng sử dụng" }, { value: "lost", label: "Thất lạc" }, { value: "damaged", label: "Hư hỏng" }]} /></td><td className="px-4 py-4"><SearchableSelect value={draft.result} onChange={(value) => updateDraft(item, { result: value as AuditItemDraft["result"] })} disabled={!isAdmin || recordItemMutation.isPending} className="min-w-[145px]" searchPlaceholder="Tìm kết quả..." options={[{ value: "pending", label: "Chưa kiểm" }, { value: "matched", label: "Khớp" }, { value: "mismatch", label: "Chênh lệch" }, { value: "missing", label: "Không tìm thấy" }]} /><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-extrabold ${badgeTone}`}>{auditResultLabels[draft.result]}</span></td><td className="px-4 py-4"><textarea disabled={!isAdmin || recordItemMutation.isPending} value={draft.note} onChange={(event) => updateDraft(item, { note: event.target.value })} placeholder="Mô tả hiện trạng, vị trí hoặc lý do chênh lệch..." className="min-h-[70px] w-[250px] resize-y rounded-md border border-[#DDE7F0] p-2 text-xs leading-5 text-[#193B57] outline-none focus:border-[#0F8C8C] disabled:cursor-not-allowed disabled:opacity-60" />{item.checkedAt && <div className="mt-2 flex items-center gap-1 text-[10px] text-[#8AA0B6]"><CheckCircle2 size={11} />Ghi nhận {new Date(item.checkedAt).toLocaleString("vi-VN")}</div>}</td><td className="px-5 py-4 text-right"><div className="flex flex-col items-end gap-2"><button disabled={!isAdmin || recordItemMutation.isPending} onClick={() => recordItem(item)} className="inline-flex items-center gap-1.5 rounded-md bg-[#0F8C8C] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Save size={13} />{recordItemMutation.isPending ? "Đang lưu" : "Lưu kết quả"}</button><button disabled={!isAdmin || recordItemMutation.isPending} onClick={() => updateDraft(item, { actualStatus: "", result: "missing", note: draft.note || "Không tìm thấy tại vị trí kiểm kê." })} className="text-[10px] font-bold text-[#B44545] hover:underline disabled:cursor-not-allowed disabled:opacity-60">Đánh dấu thất lạc</button></div></td></tr>; })}</tbody></table>{!auditItemsQuery.isLoading && auditItems.length === 0 && <ModuleEmptyState module="audit" title="Chưa có tài sản trong đợt kiểm kê" description="Hãy chọn tài sản để bắt đầu đối chiếu và ghi nhận kết quả kiểm kê." />}</div>}
        </section>}
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [departmentId, setDepartmentId] = useState("all");
  const [activityQuery, setActivityQuery] = useState("");
  const [activityType, setActivityType] = useState("all");
  const assets = trpc.assets.list.useQuery();
  const handovers = trpc.handovers.list.useQuery();
  const maintenance = trpc.maintenance.list.useQuery();
  const audits = trpc.audits.list.useQuery();
  const departments = trpc.departments.list.useQuery(undefined, { enabled: isAdmin });
  const activities = trpc.activity.list.useQuery({ limit: 150 }, { enabled: isAdmin });
  const selectedAssets = useMemo(() => (assets.data || []).filter((asset) => departmentId === "all" || asset.departmentId === Number(departmentId)), [assets.data, departmentId]);
  const filteredActivities = useMemo(() => (activities.data || []).filter((item) => (activityType === "all" || item.entityType === activityType) && matchesVietnameseSearch(`${item.summary || ""} ${item.actorName || ""} ${item.action}`, activityQuery)), [activities.data, activityType, activityQuery]);
  const metrics = [
    { label: "Tài sản đang quản lý", value: assets.data?.length ?? 0 },
    { label: "Phiếu bàn giao", value: handovers.data?.length ?? 0 },
    { label: "Yêu cầu bảo trì", value: maintenance.data?.length ?? 0 },
    { label: "Đợt kiểm kê", value: audits.data?.length ?? 0 },
  ];
  const exportExcel = () => { const departmentName = departmentId === "all" ? "Tất cả phòng ban" : departments.data?.find((department) => department.id === Number(departmentId))?.name || "Chưa gán"; const rows = selectedAssets.map((asset) => ({ "Mã tài sản": asset.assetCode, "Tên tài sản": asset.name, "Phòng ban": departments.data?.find((department) => department.id === asset.departmentId)?.name || "Chưa gán", "Người giữ": asset.holderName || "Chưa cấp phát", "Trạng thái": asset.status, "Tình trạng": asset.condition, "Vị trí": asset.location || "", "Serial/IMEI": asset.serialNumber || "", "Giá trị (VNĐ)": Number(asset.purchaseValue || 0), "Hạn bảo hành": asset.warrantyUntil ? new Date(asset.warrantyUntil).toLocaleDateString("vi-VN") : "" })); const workbook = XLSX.utils.book_new(); const sheet = XLSX.utils.json_to_sheet(rows); sheet["!cols"] = [{ wch: 16 }, { wch: 34 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }]; XLSX.utils.book_append_sheet(workbook, sheet, "Tài sản"); XLSX.writeFile(workbook, `assetmaster-${departmentName.replace(/[^a-zA-Z0-9]/g, "-")}.xlsx`); };
  return <div className={shell}><div className="mx-auto max-w-[1500px]"><div className="mb-7"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2666A8]"><span className="h-1.5 w-1.5 rounded-full bg-[#2666A8]" />Live management data</div><h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">Báo cáo vận hành</h1><p className="mt-1 text-sm text-[#71869A]">Tổng hợp chỉ số, xuất dữ liệu phòng ban và tra cứu lịch sử thao tác.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <div key={metric.label} className={`${card} p-5`}><FileBarChart size={19} className="text-[#2666A8]" /><div className="mt-5 text-xs font-semibold text-[#7890A5]">{metric.label}</div><div className="mt-1 font-display text-3xl font-extrabold text-[#102A43]">{metric.value}</div></div>)}</div><section className={`mt-5 ${card} p-5`}><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><Download size={16} className="text-[#087A6A]" />Xuất tài sản theo phòng ban</div><p className="mt-1 text-xs text-[#71869A]">Tệp Excel gồm thông tin định danh, người giữ, trạng thái và giá trị tài sản.</p></div><div className="flex flex-col gap-2 sm:flex-row"><select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} disabled={!isAdmin || departments.isLoading} className="field-input min-w-[210px]"><option value="all">Tất cả phòng ban</option>{departments.data?.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><button onClick={exportExcel} disabled={!isAdmin || selectedAssets.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} />Xuất Excel ({selectedAssets.length})</button></div></div>{!isAdmin && <p className="mt-3 text-xs text-[#A86B00]">Chỉ quản trị viên có thể xuất báo cáo theo phòng ban và xem nhật ký chi tiết.</p>}</section>{isAdmin && <section className={`mt-5 overflow-hidden ${card}`}><div className="border-b border-[#E7EEF3] px-5 py-4"><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><History size={16} className="text-[#2666A8]" />Nhật ký hoạt động</div><p className="mt-1 text-xs text-[#71869A]">Theo dõi các thay đổi tài sản, bàn giao, bảo trì, kiểm kê và quản trị tài khoản.</p><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_190px]"><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-[#8AA0B6]" /><input value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} placeholder="Tìm theo người thực hiện, nội dung hoặc thao tác..." className="field-input pl-9" /></div><select value={activityType} onChange={(event) => setActivityType(event.target.value)} className="field-input"><option value="all">Tất cả đối tượng</option>{[...new Set((activities.data || []).map((item) => item.entityType))].map((type) => <option key={type} value={type}>{type}</option>)}</select></div></div><div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-[#FBFCFD] text-[10px] uppercase tracking-[.12em] text-[#8AA0B6]"><tr><th className="px-5 py-3">Thời gian</th><th className="px-4 py-3">Người thực hiện</th><th className="px-4 py-3">Đối tượng</th><th className="px-4 py-3">Thao tác</th><th className="px-5 py-3">Chi tiết</th></tr></thead><tbody>{activities.isLoading && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#71869A]">Đang tải nhật ký...</td></tr>}{!activities.isLoading && filteredActivities.map((item) => <tr key={item.id} className="border-t border-[#EDF2F5]"><td className="px-5 py-3 text-[#60758A]">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="px-4 py-3 font-semibold text-[#193B57]">{item.actorName || "Hệ thống"}</td><td className="px-4 py-3"><span className="rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]">{item.entityType} #{item.entityId}</span></td><td className="px-4 py-3 font-mono text-[10px] text-[#0F8C8C]">{item.action}</td><td className="px-5 py-3 text-[#60758A]">{item.summary || "—"}</td></tr>)}{!activities.isLoading && filteredActivities.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#8AA0B6]">Không có nhật ký phù hợp.</td></tr>}</tbody></table></div></section>}</div></div>;
}
