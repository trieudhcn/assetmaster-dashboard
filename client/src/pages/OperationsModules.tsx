import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
	  BellRing,
	  CalendarClock,
	  CheckCircle2,
	  ChevronDown,
	  ChevronLeft,
	  ChevronRight,
	  ClipboardCheck,
  Download,
  FileBarChart,
  FileText,
  History,
  LockKeyhole,
  Plus,
  Printer,
  QrCode,
  Save,
  Search,
  Upload,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { Toaster, toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { DatePickerField } from "@/components/DatePickerField";
import { SearchableSelect } from "@/components/SearchableSelect";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useAuth } from "@/_core/hooks/useAuth";
import { matchesVietnameseSearch } from "@/lib/catalogUi";
import { numberToVietnameseWords, parseVndAmount } from "@/lib/formatters";
import { handoverPdfFontUrl, registerVietnamesePdfFont } from "@/lib/handoverPdf";
import { writeBrandedWorkbook } from "@/lib/brandedWorkbook";
import { applyPdfLogoWatermark, createPdfLogoWatermark, openPdfPreview } from "@/lib/pdfExport";
import { ModuleEmptyState } from "@/components/ModuleEmptyState";
import { EditableSectionLabel } from "@/components/EditableSectionLabel";
import { ModalTableSkeleton } from "@/components/ModalTableSkeleton";
import { Progress } from "@/components/ui/progress";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const shell = "min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8";
const card = "rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]";
const AUDIT_ITEMS_PAGE_SIZE = 10;

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

const serviceChannelLabels = {
  warranty: "Bảo hành",
  repair: "Sửa chữa",
} as const;

const toDateInputValue = (value: Date | null | undefined) => value ? new Date(value).toISOString().slice(0, 10) : "";
const dateInputToMs = (value: string) => value ? new Date(`${value}T09:00:00`).getTime() : null;

type AuditCompanySettings = {
  name?: string | null;
  address?: string | null;
  taxCode?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteTitle?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
};

async function loadAuditPdfImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Không thể tải logo công ty dùng cho biên bản.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function auditPdfImageFormat(dataUrl: string) {
  if (dataUrl.startsWith("data:image/jpeg")) return "JPEG" as const;
  if (dataUrl.startsWith("data:image/webp")) return "WEBP" as const;
  return "PNG" as const;
}

function OperationalReminderPanel({ onCreateWarrantyTicket }: { onCreateWarrantyTicket?: (assetId: number) => void }) {
  const remindersQuery = trpc.reminders.list.useQuery();
  const reminders = remindersQuery.data || [];
  return <section className={`mb-5 ${card} overflow-hidden`}>
    <div className="flex items-center justify-between border-b border-[#E7EEF3] px-5 py-4"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><BellRing size={16} className="text-[#A86B00]" />Nhắc việc vận hành</div><p className="mt-1 text-xs text-[#71869A]">Tổng hợp hạn Bảo hành/Sửa chữa, kiểm kê trong 14 ngày và tài sản sắp hết bảo hành trong 30 ngày.</p></div><span className="rounded-full bg-[#FFF9EB] px-2.5 py-1 text-[10px] font-extrabold text-[#A86B00]">{reminders.length} việc cần theo dõi</span></div>
    {remindersQuery.isLoading ? <div className="px-5 py-6 text-xs text-[#71869A]">Đang tải nhắc việc...</div> : remindersQuery.isError ? <div className="px-5 py-6 text-xs text-[#B44545]">Không thể tải nhắc việc. <button onClick={() => remindersQuery.refetch()} className="font-bold underline">Thử lại</button></div> : reminders.length === 0 ? <div className="px-5 py-6 text-xs text-[#71869A]">Chưa có hạn Bảo hành/Sửa chữa, kiểm kê hoặc bảo hành tài sản cần theo dõi.</div> : <div className="divide-y divide-[#EDF2F5]">{reminders.slice(0, 5).map((reminder) => { const isWarrantyExpiry = reminder.kind === "warranty"; const canCreateWarrantyTicket = Boolean(onCreateWarrantyTicket) && isWarrantyExpiry && typeof reminder.assetId === "number"; return <div key={reminder.id} className={`flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between ${isWarrantyExpiry ? "bg-[#FFF9EB]" : ""}`}><div className="flex items-start gap-2"><CalendarClock size={15} className={`mt-0.5 ${isWarrantyExpiry ? "text-[#A86B00]" : "text-[#0F8C8C]"}`} /><div><div className="text-xs font-bold text-[#193B57]">{reminder.title}</div><div className="mt-0.5 text-[11px] text-[#71869A]">{isWarrantyExpiry ? "Bảo hành sắp hết hạn" : reminder.kind === "maintenance" ? "Bảo hành/Sửa chữa" : "Kiểm kê"} · {reminder.detail}{reminder.recurrenceDays ? ` · Lặp lại mỗi ${reminder.recurrenceDays} ngày` : ""}</div></div></div><div className="flex shrink-0 items-center gap-2"><span className={`w-fit rounded-full px-2 py-1 text-[10px] font-extrabold ${reminder.isOverdue ? "bg-[#FDEDEE] text-[#B44545]" : isWarrantyExpiry ? "bg-[#FFE7A4] text-[#8A5900]" : "bg-[#FFF9EB] text-[#A86B00]"}`}>{reminder.isOverdue ? "Đã quá hạn" : isWarrantyExpiry ? `Còn ${Math.max(0, Math.ceil((new Date(reminder.dueAt).getTime() - Date.now()) / 86_400_000))} ngày` : `Hạn ${new Date(reminder.dueAt).toLocaleDateString("vi-VN")}`}</span>{canCreateWarrantyTicket && <button type="button" onClick={() => onCreateWarrantyTicket?.(reminder.assetId!)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#0F8C8C] px-3 text-[10px] font-extrabold text-white shadow-[0_4px_10px_rgba(15,140,140,0.2)] transition hover:bg-[#087A6A]"><Plus size={13} />Tạo phiếu bảo hành</button>}</div></div>; })}</div>}
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

type MaintenanceCreatePayload = {
  assetId: number;
  description: string;
  issueType: "maintenance" | "incident" | "damage";
  serviceChannel: "warranty" | "repair";
  priority: "low" | "medium" | "high" | "critical";
  warrantyBrand: string | null;
  warrantyVendor: string | null;
  warrantyRequestCode: string | null;
  estimatedCost: string | null;
  dueAt: number | null;
  recurrenceDays: number | null;
};

export function MaintenancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [assetId, setAssetId] = useState("");
  const [description, setDescription] = useState("");
  const [serviceChannel, setServiceChannel] = useState<"warranty" | "repair">("repair");
  const [warrantyBrand, setWarrantyBrand] = useState("");
  const [warrantyVendor, setWarrantyVendor] = useState("");
  const [warrantyRequestCode, setWarrantyRequestCode] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurrenceDays, setRecurrenceDays] = useState("");
  const [ticketEdits, setTicketEdits] = useState<Record<number, TicketDraft>>({});
  const [isExportingCosts, setIsExportingCosts] = useState(false);
  const currentYear = new Date().getFullYear();
  const [maintenanceYear, setMaintenanceYear] = useState(String(currentYear));
  const [serviceChannelTab, setServiceChannelTab] = useState<"all" | "warranty" | "repair">("all");
  const [ticketCodeLookup, setTicketCodeLookup] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved" | "closed">("all");
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);
  const [historyTicket, setHistoryTicket] = useState<(typeof tickets)[number] | null>(null);
  const [warrantyHistoryDialogOpen, setWarrantyHistoryDialogOpen] = useState(false);
  const [warrantyAttachmentFile, setWarrantyAttachmentFile] = useState<File | null>(null);
  const [warrantyUploadProgress, setWarrantyUploadProgress] = useState<number | null>(null);
  const [warrantyUploadStatus, setWarrantyUploadStatus] = useState<"reading" | "uploading" | "complete" | "error" | null>(null);
  const [recentlyCreatedTicketId, setRecentlyCreatedTicketId] = useState<number | null>(null);
  const [queuedMaintenanceAssetIds, setQueuedMaintenanceAssetIds] = useState<Set<number>>(() => new Set());
  const [repairWarrantyWarning, setRepairWarrantyWarning] = useState<{ assetName: string; warrantyUntil: Date; payload: MaintenanceCreatePayload } | null>(null);
  const [repairPdfTicketId, setRepairPdfTicketId] = useState<number | null>(null);
  const maintenancePageSize = 5;

  const assetsQuery = trpc.assets.list.useQuery();
  const ticketsQuery = trpc.maintenance.list.useQuery();
  const companySettingsQuery = trpc.company.get.useQuery();
  const brandsQuery = trpc.brands.list.useQuery();
  const nextWarrantyCodeQuery = trpc.maintenance.nextWarrantyCode.useQuery(undefined, { enabled: serviceChannel === "warranty" });
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
    onSuccess: ({ id, ticketCode, warrantyRequestCode: createdWarrantyRequestCode }, variables) => {
      setRecentlyCreatedTicketId(id);
      setQueuedMaintenanceAssetIds((current) => {
        const next = new Set(current);
        next.add(variables.assetId);
        return next;
      });
      void ticketsQuery.refetch();
      void utils.assets.list.invalidate();
      setAssetId("");
      setDescription("");
      setEstimatedCost("");
      setDueDate("");
      setRecurrenceDays("");
      setServiceChannel("repair");
      setWarrantyBrand("");
      setWarrantyVendor("");
      setWarrantyRequestCode("");
      setWarrantyAttachmentFile(null);
      setPriority("medium");
      if (variables.serviceChannel === "warranty") void nextWarrantyCodeQuery.refetch();
      toast.success(`Đã tạo phiếu ${variables.serviceChannel === "warranty" ? "bảo hành" : "sửa chữa"} · mã ${createdWarrantyRequestCode || ticketCode}.`);
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
      toast.success("Đã cập nhật phiếu Bảo hành/Sửa chữa.");
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
  const assetsWithOpenTickets = new Set(tickets.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress").map((ticket) => ticket.assetId));
  const recentlyCreatedTicket = recentlyCreatedTicketId ? tickets.find((ticket) => ticket.id === recentlyCreatedTicketId) : null;
  const maintenanceAssets = assets.filter((asset) => asset.status === "maintenance" && !assetsWithOpenTickets.has(asset.id) && !queuedMaintenanceAssetIds.has(asset.id));
  const maintenanceYears = Array.from(new Set([currentYear, ...tickets.map((ticket) => ticket.ticketYear || new Date(ticket.openedAt).getFullYear())])).sort((left, right) => right - left);
  const yearTickets = tickets.filter((ticket) => maintenanceYear === "all" || (ticket.ticketYear || new Date(ticket.openedAt).getFullYear()) === Number(maintenanceYear));
  const filteredTickets = yearTickets.filter((ticket) => (serviceChannelTab === "all" || ticket.serviceChannel === serviceChannelTab) && (ticketStatusFilter === "all" || ticket.status === ticketStatusFilter) && (!ticketCodeLookup.trim() || `${ticket.ticketCode} ${ticket.warrantyRequestCode || ""}`.toLocaleLowerCase("vi").includes(ticketCodeLookup.trim().toLocaleLowerCase("vi"))));
  const maintenanceTotalPages = Math.max(1, Math.ceil(filteredTickets.length / maintenancePageSize));
  const pagedTickets = filteredTickets.slice((maintenancePage - 1) * maintenancePageSize, maintenancePage * maintenancePageSize);
  const employees = employeesQuery.data || [];
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const selectedWarrantyHistory = assetId && serviceChannel === "warranty" ? tickets.filter((ticket) => ticket.assetId === Number(assetId) && (ticket.serviceChannel || "repair") === "warranty").sort((left, right) => new Date(right.openedAt).getTime() - new Date(left.openedAt).getTime()) : [];

  useEffect(() => {
    if (!historyTicket || (historyTicket.serviceChannel || "repair") !== "warranty") return;
    const drawer = document.querySelector<HTMLElement>(`[aria-label="Chi tiết và lịch sử phiếu ${historyTicket.ticketCode}"]`);
    const historyBody = drawer?.querySelector<HTMLElement>(".mt-5.space-y-3");
    if (!drawer || !historyBody || drawer.querySelector("[data-warranty-ticket-details]")) return;
    const asset = assetById.get(historyTicket.assetId);
    const section = document.createElement("section");
    section.dataset.warrantyTicketDetails = "true";
    section.className = "rounded-xl border border-[#8BCDC6] bg-[#F4FBFA] p-4 shadow-[0_6px_18px_rgba(15,140,140,0.08)]";
    const heading = document.createElement("div");
    heading.className = "flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]";
    heading.innerHTML = '<span class="grid h-6 w-6 place-items-center rounded-md bg-[#DDF4F1] text-sm">✓</span>Thông tin bảo hành';
    const subtitle = document.createElement("p");
    subtitle.className = "mt-1 text-xs leading-5 text-[#4B8884]";
    subtitle.textContent = `Theo dõi hồ sơ bảo hành cho ${asset?.name || `tài sản #${historyTicket.assetId}`}.`;
    const grid = document.createElement("div");
    grid.className = "mt-3 grid gap-2 sm:grid-cols-2";
    [["Hãng", historyTicket.warrantyBrand || "Chưa cập nhật"], ["Nhà cung cấp / trung tâm", historyTicket.warrantyVendor || "Chưa cập nhật"], ["Mã yêu cầu", historyTicket.warrantyRequestCode || "Chưa cập nhật"]].forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "rounded-lg border border-[#CDE5E5] bg-white px-3 py-2.5";
      const itemLabel = document.createElement("div");
      itemLabel.className = "text-[10px] font-bold uppercase tracking-[0.1em] text-[#4B8884]";
      itemLabel.textContent = label;
      const itemValue = document.createElement("div");
      itemValue.className = "mt-1 break-words text-xs font-bold leading-5 text-[#193B57]";
      itemValue.textContent = String(value);
      item.append(itemLabel, itemValue);
      grid.append(item);
    });
    section.append(heading, subtitle, grid);
    historyBody.before(section);
    return () => section.remove();
  }, [historyTicket, assetById]);

  useEffect(() => {
    const selectedAsset = assets.find((asset) => asset.id === Number(assetId));
    if (serviceChannel !== "warranty" || !selectedAsset) return;
    setWarrantyVendor(selectedAsset.vendor || "");
    const selectedBrand = (brandsQuery.data || []).find((brand) => brand.id === selectedAsset.brandId);
    setWarrantyBrand(selectedBrand?.name || "");
  }, [assetId, assets, brandsQuery.data, serviceChannel]);
  useEffect(() => {
    if (serviceChannel !== "warranty") { setWarrantyRequestCode(""); return; }
    if (nextWarrantyCodeQuery.data?.code) setWarrantyRequestCode(nextWarrantyCodeQuery.data.code);
  }, [serviceChannel, nextWarrantyCodeQuery.data?.code]);

  useEffect(() => {
    setMaintenancePage(1);
  }, [maintenanceYear, serviceChannelTab, ticketCodeLookup, ticketStatusFilter]);
  useEffect(() => {
    const assetCode = sessionStorage.getItem("assetmaster-open-maintenance-asset-code");
    if (!assetCode || assetsQuery.isLoading || ticketsQuery.isLoading) return;
    const asset = assets.find((item) => item.assetCode === assetCode);
    const relatedTicket = asset ? tickets.filter((ticket) => ticket.assetId === asset.id).sort((left, right) => new Date(right.openedAt).getTime() - new Date(left.openedAt).getTime())[0] : undefined;
    sessionStorage.removeItem("assetmaster-open-maintenance-asset-code");
    if (!relatedTicket) {
      toast.info("Tài sản này chưa có phiếu Bảo hành/Sửa chữa để mở.");
      return;
    }
    setMaintenanceYear(String(relatedTicket.ticketYear || new Date(relatedTicket.openedAt).getFullYear()));
    setServiceChannelTab((relatedTicket.serviceChannel || "repair") as "warranty" | "repair");
    setHistoryTicket(relatedTicket);
  }, [assets, assetsQuery.isLoading, tickets, ticketsQuery.isLoading]);
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

  const buildCreatePayload = (): MaintenanceCreatePayload | null => {
    if (!assetId || description.trim().length < 5) {
      toast.error("Chọn tài sản và nhập mô tả tối thiểu 5 ký tự.");
      return null;
    }
    return {
      assetId: Number(assetId),
      description,
      issueType: serviceChannel === "warranty" ? "maintenance" : "damage",
      serviceChannel,
      priority,
      warrantyBrand: serviceChannel === "warranty" ? warrantyBrand.trim() || null : null,
      warrantyVendor: serviceChannel === "warranty" ? warrantyVendor.trim() || null : null,
      warrantyRequestCode: serviceChannel === "warranty" ? warrantyRequestCode.trim() || null : null,
      estimatedCost: estimatedCost.trim() || null,
      dueAt: dateInputToMs(dueDate),
      recurrenceDays: recurrenceDays ? Number(recurrenceDays) : null,
    };
  };

  const createTicketWithEvidence = (payload: MaintenanceCreatePayload) => {
    const attachment = payload.serviceChannel === "warranty" ? warrantyAttachmentFile : null;
    if (attachment) {
      setWarrantyUploadProgress(5);
      setWarrantyUploadStatus("reading");
    }
    createMutation.mutate(payload, { onSuccess: ({ id }) => { if (attachment) uploadAttachmentByTicketId(id, attachment, true); } });
  };

  const requestCreateTicket = () => {
    const payload = buildCreatePayload();
    if (!payload) return;
    const selectedAsset = assets.find((asset) => asset.id === payload.assetId);
    const warrantyUntil = selectedAsset?.warrantyUntil ? new Date(selectedAsset.warrantyUntil) : null;
    if (payload.serviceChannel === "repair" && warrantyUntil && warrantyUntil.getTime() >= Date.now()) {
      setRepairWarrantyWarning({ assetName: selectedAsset?.name || "Tài sản đã chọn", warrantyUntil, payload });
      return;
    }
    createTicketWithEvidence(payload);
  };

  const requestQuickRepairTicket = (asset: (typeof assets)[number], description: string) => {
    const payload: MaintenanceCreatePayload = {
      assetId: asset.id,
      issueType: "maintenance",
      serviceChannel: "repair",
      priority: "medium",
      description,
      warrantyBrand: null,
      warrantyVendor: null,
      warrantyRequestCode: null,
      estimatedCost: null,
      dueAt: null,
      recurrenceDays: null,
    };
    const warrantyUntil = asset.warrantyUntil ? new Date(asset.warrantyUntil) : null;
    if (warrantyUntil && warrantyUntil.getTime() >= Date.now()) {
      setRepairWarrantyWarning({ assetName: asset.name, warrantyUntil, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  const requestQuickWarrantyTicket = (asset: (typeof assets)[number], description: string) => {
    createMutation.mutate({ assetId: asset.id, issueType: "maintenance", serviceChannel: "warranty", priority: "medium", description, warrantyBrand: null, warrantyVendor: null, warrantyRequestCode: null, estimatedCost: null, dueAt: null, recurrenceDays: null });
  };

  const exportMaintenanceCosts = () => {
    if (filteredTickets.length === 0) {
      toast.info("Chưa có phiếu Bảo hành/Sửa chữa trong phạm vi đang lọc để xuất.");
      return;
    }
    setIsExportingCosts(true);
    const toastId = toast.loading("Đang chuẩn bị file Excel chi phí bảo trì...");
    window.setTimeout(() => { void (async () => {
      try {
        const rows = filteredTickets.map((ticket) => {
      const estimated = parseVndAmount(String(ticket.estimatedCost ?? ""));
      const actual = parseVndAmount(String(ticket.actualCost ?? ""));
      const asset = assetById.get(ticket.assetId);
      return {
        "Mã phiếu": ticket.ticketCode,
        "Mã tài sản": asset?.assetCode || "",
        "Tên tài sản": asset?.name || "",
        "Kênh xử lý": serviceChannelLabels[(ticket.serviceChannel || "repair") as keyof typeof serviceChannelLabels],
        "Hãng bảo hành": ticket.warrantyBrand || "",
        "Nhà cung cấp / trung tâm bảo hành": ticket.warrantyVendor || "",
        "Mã yêu cầu bảo hành": ticket.warrantyRequestCode || "",
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
        worksheet["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 32 }, { wch: 20 }, { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 42 }, { wch: 42 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bảo hành-Sửa chữa");
        await writeBrandedWorkbook(workbook, {
          documentTitle: "BÁO CÁO CHI PHÍ BẢO HÀNH/SỬA CHỮA",
          fileName: `assetmaster-bao-hanh-sua-chua-${new Date().toISOString().slice(0, 10)}.xlsx`,
          description: `Tổng hợp ${rows.length} phiếu Bảo hành/Sửa chữa trong phạm vi đang lọc.`,
        });
        toast.success(`Đã xuất ${rows.length} phiếu Bảo hành/Sửa chữa.`, { id: toastId });
      } catch (error) {
        console.error(error);
        toast.error("Không thể tạo file Excel Bảo hành/Sửa chữa.", { id: toastId });
      } finally {
        setIsExportingCosts(false);
      }
    })(); }, 180);
  };

  const previewRepairTicketPdf = async (ticket: (typeof tickets)[number], asset: (typeof assets)[number] | undefined) => {
    if ((ticket.serviceChannel || "repair") !== "repair") return;
    setRepairPdfTicketId(ticket.id);
    const loadingToast = toast.loading(`Đang tạo PDF phiếu ${ticket.ticketCode}...`);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const fontResponse = await fetch(handoverPdfFontUrl);
      if (!fontResponse.ok) throw new Error("Không thể tải phông chữ tiếng Việt.");
      registerVietnamesePdfFont(doc, await fontResponse.arrayBuffer());
      const company = (companySettingsQuery.data || {}) as AuditCompanySettings;
      const logoDataUrl = company.logoUrl ? await loadAuditPdfImage(company.logoUrl).catch(() => undefined) : undefined;
      const left = 16;
      const right = 194;
      const width = right - left;
      let y = 18;
      if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, auditPdfImageFormat(logoDataUrl), left, y - 7, 18, 18, undefined, "FAST"); } catch { /* Dùng nhận diện chữ nếu logo không tương thích. */ }
      }
      doc.setTextColor(16, 42, 67);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(12);
      doc.text(company.name || "ĐƠN VỊ QUẢN LÝ TÀI SẢN", logoDataUrl ? left + 22 : left, y);
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(96, 117, 138);
      const companyMeta = [company.address, company.taxCode ? `MST: ${company.taxCode}` : "", company.phone ? `ĐT: ${company.phone}` : ""].filter(Boolean).join(" · ");
      doc.text(doc.splitTextToSize(companyMeta || "Hệ thống Quản lý Tài sản Doanh nghiệp", logoDataUrl ? width - 22 : width), logoDataUrl ? left + 22 : left, y + 5);
      y += 27;
      doc.setDrawColor(15, 140, 140);
      doc.setLineWidth(0.7);
      doc.line(left, y, right, y);
      y += 11;
      doc.setTextColor(16, 42, 67);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(17);
      doc.text("PHIẾU SỬA CHỮA TÀI SẢN", 105, y, { align: "center" });
      y += 7;
      doc.setFontSize(9.5);
      doc.setTextColor(56, 85, 166);
      doc.text(ticket.ticketCode, 105, y, { align: "center" });
      y += 11;
      const estimated = parseVndAmount(String(ticket.estimatedCost || ""));
      const actual = parseVndAmount(String(ticket.actualCost || ""));
      const fields: Array<[string, string]> = [
        ["Mã tài sản", asset?.assetCode || `Tài sản #${ticket.assetId}`],
        ["Tên tài sản", asset?.name || "Không còn trong danh mục"],
        ["Loại yêu cầu", issueTypeLabels[ticket.issueType as keyof typeof issueTypeLabels] || ticket.issueType],
        ["Mức ưu tiên", priorityLabels[ticket.priority as keyof typeof priorityLabels] || ticket.priority],
        ["Trạng thái", maintenanceStatusLabels[ticket.status as keyof typeof maintenanceStatusLabels] || ticket.status],
        ["Ngày lập phiếu", new Date(ticket.openedAt || ticket.createdAt).toLocaleDateString("vi-VN")],
        ["Hạn xử lý", ticket.dueAt ? new Date(ticket.dueAt).toLocaleDateString("vi-VN") : "Chưa thiết lập"],
        ["Người báo", ticket.reporterName || "Chưa cập nhật"],
        ["Người xử lý", ticket.assigneeUserId ? employeeById.get(ticket.assigneeUserId)?.name || `Nhân sự #${ticket.assigneeUserId}` : "Chưa phân công"],
        ["Chi phí dự kiến", estimated ? `${estimated.toLocaleString("vi-VN")} VNĐ` : "Chưa ghi nhận"],
        ["Chi phí thực tế", actual ? `${actual.toLocaleString("vi-VN")} VNĐ` : "Chưa ghi nhận"],
      ];
      doc.setFontSize(9);
      fields.forEach(([label, value], index) => {
        const rowY = y + index * 7;
        doc.setFillColor(index % 2 ? 248 : 240, index % 2 ? 251 : 248, index % 2 ? 252 : 247);
        doc.rect(left, rowY - 4.8, width, 7, "F");
        doc.setFont("NotoSans", "bold");
        doc.setTextColor(82, 112, 137);
        doc.text(label, left + 3, rowY);
        doc.setFont("NotoSans", "normal");
        doc.setTextColor(25, 59, 87);
        doc.text(doc.splitTextToSize(value, 110), left + 62, rowY);
      });
      y += fields.length * 7 + 5;
      const notes: Array<[string, string]> = [["Mô tả sự cố", ticket.description || "Chưa cập nhật"], ["Kết quả xử lý", ticket.resolution || "Chưa ghi nhận kết quả xử lý"], ["Chứng từ", ticket.attachmentName || "Chưa đính kèm"]];
      notes.forEach(([label, value]) => {
        const lines = doc.splitTextToSize(value, width - 8);
        const height = Math.max(12, lines.length * 4.5 + 8);
        doc.setDrawColor(205, 229, 229);
        doc.setFillColor(250, 253, 253);
        doc.roundedRect(left, y, width, height, 2, 2, "FD");
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 140, 140);
        doc.text(label, left + 4, y + 5);
        doc.setFont("NotoSans", "normal");
        doc.setTextColor(25, 59, 87);
        doc.text(lines, left + 4, y + 10);
        y += height + 4;
      });
      y = Math.min(y + 6, 252);
      doc.setDrawColor(221, 231, 240);
      doc.line(left, y, right, y);
      y += 9;
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(96, 117, 138);
      doc.text("Người lập phiếu", left + 22, y, { align: "center" });
      doc.text("Người xử lý", 105, y, { align: "center" });
      doc.text("Xác nhận quản lý", right - 22, y, { align: "center" });
      doc.setFontSize(7.5);
      doc.text(`Tạo ngày ${new Date().toLocaleDateString("vi-VN")}`, left, 286);
      applyPdfLogoWatermark(doc, await createPdfLogoWatermark(company.logoUrl).catch(() => null));
      openPdfPreview(doc, `${ticket.ticketCode}-phieu-sua-chua.pdf`, `Phiếu Sửa chữa ${ticket.ticketCode}`);
      toast.success(`Đã mở xem trước PDF ${ticket.ticketCode}.`, { id: loadingToast });
    } catch (error) {
      console.error("[MaintenancePage] repair PDF export failed", error);
      toast.error(error instanceof Error ? error.message : "Không thể tạo PDF phiếu Sửa chữa.", { id: loadingToast });
    } finally {
      setRepairPdfTicketId(null);
    }
  };

  const uploadAttachmentByTicketId = (ticketId: number, file: File | undefined, showProgress = false) => {
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
    reader.onerror = () => {
      if (showProgress) {
        setWarrantyUploadProgress(0);
        setWarrantyUploadStatus("error");
      }
      toast.error("Không thể đọc tệp chứng từ.");
    };
    reader.onprogress = (event) => {
      if (showProgress && event.lengthComputable) setWarrantyUploadProgress(Math.max(8, Math.min(65, Math.round((event.loaded / event.total) * 65))));
    };
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        if (showProgress) {
          setWarrantyUploadProgress(0);
          setWarrantyUploadStatus("error");
        }
        toast.error("Không thể đọc tệp chứng từ.");
        return;
      }
      if (showProgress) {
        setWarrantyUploadProgress(75);
        setWarrantyUploadStatus("uploading");
      }
      uploadAttachmentMutation.mutate({ id: ticketId, fileName: file.name, contentType: file.type as "application/pdf" | "image/png" | "image/jpeg" | "image/webp", dataUrl: reader.result }, {
        onSuccess: () => {
          if (!showProgress) return;
          setWarrantyUploadProgress(100);
          setWarrantyUploadStatus("complete");
          window.setTimeout(() => {
            setWarrantyUploadProgress(null);
            setWarrantyUploadStatus(null);
          }, 2200);
        },
        onError: () => {
          if (!showProgress) return;
          setWarrantyUploadProgress(0);
          setWarrantyUploadStatus("error");
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const uploadAttachment = (ticket: (typeof tickets)[number], file: File | undefined) => uploadAttachmentByTicketId(ticket.id, file);

  return (
    <div className={shell}>
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#A86B00]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />Service operations
            </div>
            <h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">Bảo hành/Sửa chữa</h1>
            <p className="mt-1 text-sm text-[#71869A]">Phân loại rõ phiếu bảo hành và sửa chữa, giao người xử lý, theo dõi tiến độ và đối soát chi phí.</p>
          </div>
          <div className="rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2 text-xs font-semibold text-[#A86B00]">
            {isAdmin ? "Quản trị viên có thể phân công và cập nhật xử lý." : "Chỉ quản trị viên có thể cập nhật phân công và chi phí."}
          </div>
        </div>

        <OperationalReminderPanel />

        <AlertDialog open={Boolean(repairWarrantyWarning)} onOpenChange={(open) => { if (!open) setRepairWarrantyWarning(null); }}>
          <AlertDialogContent className="overflow-hidden border-2 border-[#E8743B] bg-[#FFFDF8] p-0 shadow-[0_24px_70px_rgba(184,69,69,0.26)]">
            <div className="border-b border-[#F2B18B] bg-[#FDEDE4] px-6 py-5">
              <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#B44545] text-white shadow-[0_8px_18px_rgba(180,69,69,0.28)]"><AlertTriangle size={22} /></div><AlertDialogHeader className="space-y-1.5 text-left"><AlertDialogTitle className="text-lg text-[#8F2626]">Tài sản vẫn còn thời hạn bảo hành</AlertDialogTitle><AlertDialogDescription className="text-sm leading-6 text-[#8C4B36]">{repairWarrantyWarning ? <><b className="font-extrabold text-[#7B2929]">{repairWarrantyWarning.assetName}</b> còn bảo hành đến <b className="font-extrabold text-[#7B2929]">{repairWarrantyWarning.warrantyUntil.toLocaleDateString("vi-VN")}</b>. Hãy ưu tiên phiếu Bảo hành để lưu hãng, nhà cung cấp và mã yêu cầu.</> : ""}</AlertDialogDescription></AlertDialogHeader></div>
            </div>
            <div className="mx-6 mt-4 rounded-lg border border-[#F2B18B] bg-white px-3 py-3 text-xs leading-5 text-[#8C4B36]"><b>Lưu ý:</b> Nếu tiếp tục Sửa chữa, chi phí có thể không được phía bảo hành tiếp nhận. Bạn vẫn có thể quay lại đổi kênh trước khi tạo phiếu.</div>
            <AlertDialogFooter className="m-0 gap-2 border-t border-[#F3D2BF] px-6 py-4 sm:justify-end"><AlertDialogCancel className="border-[#D6A47D] bg-white text-[#8C4B36] hover:bg-[#FFF4EB]">Quay lại chọn Bảo hành</AlertDialogCancel><AlertDialogAction className="bg-[#B44545] text-white hover:bg-[#933737] focus:ring-[#B44545]" disabled={createMutation.isPending} onClick={() => { if (!repairWarrantyWarning) return; const { payload } = repairWarrantyWarning; setRepairWarrantyWarning(null); createMutation.mutate(payload); }}>{createMutation.isPending ? "Đang tạo..." : "Vẫn tạo phiếu Sửa chữa"}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <section className={`mt-5 ${card} overflow-hidden`}>
          <div className="flex flex-col gap-2 border-b border-[#E7EEF3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><Wrench size={16} className="text-[#A86B00]" />Tài sản đang cần xử lý</div><p className="mt-1 text-xs text-[#8AA0B6]">Các tài sản vừa được chuyển sang trạng thái Bảo hành/Sửa chữa từ Danh mục tài sản; có thể tạo nhanh phiếu Bảo hành hoặc Sửa chữa.</p></div>
            <span className="rounded-full bg-[#FFF5DC] px-2.5 py-1 text-[10px] font-extrabold text-[#A86B00]">{maintenanceAssets.length} tài sản</span>
          </div>
          {assetsQuery.isLoading ? <div className="px-5 py-6 text-xs text-[#8AA0B6]">Đang tải tài sản...</div> : maintenanceAssets.length === 0 ? <div className="px-5 py-7 text-center text-xs font-semibold text-[#8AA0B6]">Chưa có tài sản nào đang chờ xử lý.</div> : <div className="overflow-x-auto overscroll-x-contain"><div className="flex min-w-max gap-3 p-4">{maintenanceAssets.map((asset) => { const quickDescription = asset.maintenanceReason?.trim() || `Kiểm tra và xử lý tình trạng của ${asset.name}.`; return <div key={asset.id} className="w-[280px] shrink-0 rounded-xl border border-[#F2D596] bg-[#FFFDF7] p-4 sm:w-[320px]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-mono text-[10px] font-bold text-[#A86B00]">{asset.assetCode}</div><div className="mt-1 truncate text-sm font-extrabold text-[#193B57]">{asset.name}</div></div><span className="shrink-0 rounded-full bg-[#FFF0C8] px-2 py-1 text-[10px] font-extrabold text-[#A86B00]">Cần xử lý</span></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-[#60758A]">{quickDescription}</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={createMutation.isPending} onClick={() => requestQuickWarrantyTicket(asset, quickDescription)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F8C8C] px-2 py-2 text-[11px] font-extrabold text-white transition hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Plus size={13} />Bảo hành</button><button type="button" disabled={createMutation.isPending} onClick={() => requestQuickRepairTicket(asset, quickDescription)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D7B65B] bg-white px-2 py-2 text-[11px] font-extrabold text-[#A86B00] transition hover:bg-[#FFF5DC] disabled:cursor-not-allowed disabled:opacity-60"><Plus size={13} />Sửa chữa</button></div></div>; })}</div></div>}
        </section>

        {recentlyCreatedTicketId && <section className="mb-5 flex flex-col gap-3 rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-extrabold text-[#087A6A]">Đã tạo phiếu Bảo hành/Sửa chữa thành công</div><p className="mt-1 text-[11px] text-[#4B8884]">{recentlyCreatedTicket ? `${recentlyCreatedTicket.ticketCode} · ${serviceChannelLabels[(recentlyCreatedTicket.serviceChannel || "repair") as keyof typeof serviceChannelLabels]} · ${recentlyCreatedTicket.description}` : "Đang đồng bộ thông tin phiếu vừa tạo..."}</p></div><button type="button" disabled={!recentlyCreatedTicket} onClick={() => { if (recentlyCreatedTicket) setHistoryTicket(recentlyCreatedTicket); }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#8BCDC6] bg-white px-3 py-2 text-xs font-extrabold text-[#087A6A] transition hover:bg-[#DDF4F1] disabled:cursor-wait disabled:opacity-60"><FileText size={14} />{recentlyCreatedTicket ? "Mở phiếu vừa tạo" : "Đang tải phiếu..."}</button></section>}

        <section id="maintenance-create-form" className={`${card} p-5`}>
          <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-[#193B57]">
            <Wrench size={16} className="text-[#A86B00]" />Tạo phiếu Bảo hành/Sửa chữa
          </div>
          <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SearchableSelect value={assetId} onChange={setAssetId} disabled={assetsQuery.isLoading} placeholder="Chọn tài sản" searchPlaceholder="Tìm mã hoặc tên tài sản..." options={[{ value: "", label: "Chọn tài sản" }, ...assets.map((asset) => ({ value: String(asset.id), label: `${asset.assetCode} · ${asset.name}`, searchText: asset.assetCode }))]} />
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả tình trạng cần xử lý" className="field-input" />
            <SearchableSelect value={serviceChannel} onChange={(value) => setServiceChannel(value as typeof serviceChannel)} placeholder="Chọn kênh xử lý" searchPlaceholder="Tìm kênh xử lý..." options={Object.entries(serviceChannelLabels).map(([value, label]) => ({ value, label }))} />
            {serviceChannel === "warranty" && <><div className="group relative z-10"><input value={warrantyBrand} disabled placeholder="Hãng bảo hành" aria-label="Hãng bảo hành được khóa" className="field-input cursor-not-allowed pr-10 opacity-75" /><span title="Được lấy từ dữ liệu mua hàng, không thể chỉnh sửa" className="pointer-events-none absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#B44545] text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"><LockKeyhole size={13} /></span><p className="mt-1 text-[10px] text-[#B44545]">Lấy từ dữ liệu mua hàng; không thể chỉnh sửa.</p></div><div className="group relative z-10"><input value={warrantyVendor} disabled placeholder="Nhà cung cấp / trung tâm bảo hành" aria-label="Nhà cung cấp hoặc trung tâm bảo hành được khóa" className="field-input cursor-not-allowed pr-10 opacity-75" /><span title="Được lấy từ dữ liệu mua hàng, không thể chỉnh sửa" className="pointer-events-none absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#B44545] text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"><LockKeyhole size={13} /></span><p className="mt-1 text-[10px] text-[#B44545]">Lấy từ dữ liệu mua hàng; không thể chỉnh sửa.</p></div><div className="group relative z-10"><input value={warrantyRequestCode} disabled placeholder="Đang cấp mã bảo hành..." aria-label="Mã bảo hành tự sinh được khóa" className="field-input cursor-not-allowed bg-[#F5F9FB] pr-10 font-mono font-bold text-[#087A6A] opacity-75" /><span title="Mã được hệ thống tự sinh, không thể chỉnh sửa" className="pointer-events-none absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#B44545] text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"><LockKeyhole size={13} /></span><p className="mt-1 text-[10px] text-[#087A6A]">Tự sinh theo mẫu BH-NĂM-001 khi tạo phiếu.</p></div></>}
            {serviceChannel === "warranty" && <div><label className="field-label">Ảnh / chứng từ bảo hành <span className="font-normal text-[#8AA0B6]">(tùy chọn)</span></label><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={warrantyUploadStatus === "reading" || warrantyUploadStatus === "uploading"} onChange={(event) => { const file = event.target.files?.[0] || null; if (file && file.size > 5 * 1024 * 1024) { toast.error("Chứng từ không được vượt quá 5 MB."); event.currentTarget.value = ""; setWarrantyAttachmentFile(null); setWarrantyUploadProgress(null); setWarrantyUploadStatus(null); return; } setWarrantyAttachmentFile(file); setWarrantyUploadProgress(null); setWarrantyUploadStatus(null); }} className="mt-1 block w-full text-xs text-[#60758A] file:mr-2 file:rounded-md file:border-0 file:bg-[#ECF8F7] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#087A6A] disabled:opacity-60" />{warrantyAttachmentFile ? <p className="mt-1 truncate text-[10px] font-semibold text-[#087A6A]">Đã chọn: {warrantyAttachmentFile.name}</p> : <p className="mt-1 text-[10px] text-[#8AA0B6]">PDF, PNG, JPG hoặc WebP; tối đa 5 MB.</p>}{warrantyUploadProgress !== null && <div data-warranty-upload-progress className="mt-2 rounded-lg border border-[#CDE5E5] bg-[#F8FCFC] p-2"><div className="flex items-center justify-between gap-2 text-[10px] font-bold"><span className={warrantyUploadStatus === "error" ? "text-[#B44545]" : warrantyUploadStatus === "complete" ? "text-[#087A6A]" : "text-[#4B8884]"}>{warrantyUploadStatus === "reading" ? "Đang đọc tệp chứng từ..." : warrantyUploadStatus === "uploading" ? "Đang tải chứng từ lên hệ thống..." : warrantyUploadStatus === "complete" ? "Đã tải chứng từ thành công." : "Không thể tải chứng từ. Vui lòng thử lại."}</span><span className="shrink-0 text-[#60758A]">{warrantyUploadProgress}%</span></div><Progress value={warrantyUploadProgress} className={warrantyUploadStatus === "error" ? "mt-1.5 bg-[#FBE4E4] [&>div]:bg-[#B44545]" : warrantyUploadStatus === "complete" ? "mt-1.5 bg-[#DDF4F1] [&>div]:bg-[#087A6A]" : "mt-1.5 bg-[#DDEFEF] [&>div]:bg-[#0F8C8C]"} /></div>}</div>}
            <SearchableSelect value={priority} onChange={(value) => setPriority(value as typeof priority)} searchPlaceholder="Tìm mức ưu tiên..." options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label: `${label} ưu tiên` }))} />
            <CurrencyInput value={estimatedCost} onChange={setEstimatedCost} placeholder="Chi phí dự kiến" aria-label="Chi phí dự kiến" showWords />
            <DatePickerField value={dueDate} onChange={setDueDate} aria-label="Hạn bảo trì" />
            <input value={recurrenceDays} onChange={(event) => setRecurrenceDays(event.target.value.replace(/\D/g, ""))} placeholder="Lặp lại (ngày)" inputMode="numeric" className="field-input" />
            <button
              disabled={createMutation.isPending}
              onClick={requestCreateTicket}
              className="flex min-h-11 self-start items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={15} />{createMutation.isPending ? "Đang tạo" : "Tạo yêu cầu"}
            </button>
          </div>
          {serviceChannel === "warranty" && assetId && <section data-warranty-create-history className="mt-4 rounded-xl border border-[#8BCDC6] bg-[#F4FBFA] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-extrabold text-[#087A6A]"><History size={15} />Lịch sử bảo hành trước đó</div><span className="rounded-full bg-[#DDF4F1] px-2 py-1 text-[10px] font-extrabold text-[#087A6A]">{selectedWarrantyHistory.length} phiếu</span></div>{ticketsQuery.isLoading ? <p className="mt-2 text-xs text-[#4B8884]">Đang tải lịch sử bảo hành...</p> : selectedWarrantyHistory.length ? <div className="mt-3 space-y-2">{selectedWarrantyHistory.slice(0, 3).map((ticket) => <div key={ticket.id} className="rounded-lg border border-[#CDE5E5] bg-white px-3 py-2.5"><div className="flex items-start justify-between gap-3"><div><div className="font-mono text-[10px] font-extrabold text-[#087A6A]">{ticket.warrantyRequestCode || ticket.ticketCode}</div><p className="mt-1 text-xs font-semibold text-[#193B57]">{ticket.description}</p></div><span className="text-[10px] font-bold text-[#71869A]">{new Date(ticket.openedAt).toLocaleDateString("vi-VN")}</span></div><p className="mt-1 text-[10px] text-[#71869A]">{maintenanceStatusLabels[ticket.status]}{ticket.resolution ? ` · ${ticket.resolution}` : ""}</p></div>)}</div> : <p className="mt-2 text-xs text-[#4B8884]">Tài sản này chưa có phiếu Bảo hành trước đó.</p>}</section>}
          {serviceChannel === "warranty" && assetId && selectedWarrantyHistory.length > 0 && <div className="mt-2 flex justify-end"><button type="button" onClick={() => setWarrantyHistoryDialogOpen(true)} className="rounded-md border border-[#8BCDC6] bg-white px-3 py-1.5 text-[10px] font-extrabold text-[#087A6A] transition hover:bg-[#DDF4F1]">Xem tất cả</button></div>}
          <Dialog open={warrantyHistoryDialogOpen} onOpenChange={setWarrantyHistoryDialogOpen}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Lịch sử Bảo hành đầy đủ</DialogTitle><DialogDescription>{assetById.get(Number(assetId))?.name || "Tài sản đã chọn"} · {selectedWarrantyHistory.length} phiếu Bảo hành.</DialogDescription></DialogHeader><div className="space-y-3">{selectedWarrantyHistory.map((ticket) => <article key={ticket.id} className="rounded-xl border border-[#CDE5E5] bg-[#F8FCFC] p-3.5"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-mono text-[11px] font-extrabold text-[#087A6A]">{ticket.warrantyRequestCode || ticket.ticketCode}</div><p className="mt-1 text-sm font-bold text-[#193B57]">{ticket.description}</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-extrabold text-[#60758A]">{maintenanceStatusLabels[ticket.status]}</span></div><div className="mt-2 grid gap-2 text-[11px] text-[#60758A] sm:grid-cols-2"><span>Ngày tạo: {new Date(ticket.openedAt).toLocaleDateString("vi-VN")}</span><span>{ticket.warrantyBrand || "Chưa cập nhật hãng"} · {ticket.warrantyVendor || "Chưa cập nhật nhà cung cấp"}</span></div>{ticket.resolution && <p className="mt-2 rounded-lg border border-[#DDEFEF] bg-white px-2.5 py-2 text-xs text-[#4B636E]"><b>Kết quả:</b> {ticket.resolution}</p>}{ticket.attachmentUrl && <a href={ticket.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#087A6A] hover:underline"><FileText size={13} />{ticket.attachmentName || "Mở chứng từ"}</a>}</article>)}{selectedWarrantyHistory.length === 0 && <p className="py-6 text-center text-sm text-[#71869A]">Chưa có phiếu Bảo hành trước đó.</p>}</div></DialogContent></Dialog>
          {!assetsQuery.isLoading && assets.length === 0 && <p className="mt-3 text-xs text-[#A86B00]">Chưa có tài sản để tạo phiếu Bảo hành/Sửa chữa.</p>}
        </section>

        <section className={`mt-5 overflow-hidden ${card}`}>
          <div className="flex flex-col gap-2 border-b border-[#E7EEF3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-[#193B57]">Quản lý phiếu Bảo hành/Sửa chữa</h2>
              <p className="mt-1 text-xs text-[#8AA0B6]">Phân công, tiến độ, chi phí và Kênh xử lý được lưu tập trung.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2"><div className="flex h-9 min-w-[205px] items-center rounded-lg border border-[#DDE7F0] bg-white px-3 focus-within:border-[#0F8C8C]"><input value={ticketCodeLookup} onChange={(event) => setTicketCodeLookup(event.target.value)} placeholder="Tra cứu mã phiếu BH / SC..." aria-label="Tra cứu mã phiếu Bảo hành hoặc Sửa chữa" className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#193B57] outline-none placeholder:text-[#9BAEC0]" /></div><SearchableSelect value={ticketStatusFilter} onChange={(value) => setTicketStatusFilter(value as typeof ticketStatusFilter)} className="min-w-[172px]" placeholder="Tất cả trạng thái" searchPlaceholder="Tìm trạng thái xử lý..." options={[{ value: "all", label: "Tất cả trạng thái" }, ...Object.entries(maintenanceStatusLabels).map(([value, label]) => ({ value, label }))]} /><label className="flex min-w-[180px] items-center gap-2 text-xs font-bold text-[#60758A]"><span className="shrink-0">Năm</span><SearchableSelect value={maintenanceYear} onChange={setMaintenanceYear} className="min-w-0 flex-1" placeholder="Tất cả năm" searchPlaceholder="Tìm năm..." options={[{ value: "all", label: "Tất cả năm" }, ...maintenanceYears.map((year) => ({ value: String(year), label: String(year) }))]} /></label><button type="button" onClick={exportMaintenanceCosts} disabled={ticketsQuery.isLoading || filteredTickets.length === 0 || isExportingCosts} className="inline-flex items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-50"><Download size={14} className={isExportingCosts ? "animate-pulse" : ""} />{isExportingCosts ? "Đang xuất..." : "Xuất Excel theo tab"}</button><span className="text-xs font-bold text-[#60758A]">{filteredTickets.length} phiếu</span></div>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[#E7EEF3] px-5 py-3" role="tablist" aria-label="Lọc Kênh xử lý">
            {(["all", "warranty", "repair"] as const).map((channel) => {
              const count = channel === "all" ? yearTickets.length : yearTickets.filter((ticket) => ticket.serviceChannel === channel).length;
              const label = channel === "all" ? "Tất cả" : serviceChannelLabels[channel];
              const active = serviceChannelTab === channel;
              return <button key={channel} type="button" role="tab" aria-selected={active} onClick={() => setServiceChannelTab(channel)} className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${active ? "border-[#0F8C8C] bg-[#0F8C8C] text-white" : "border-[#DDE7F0] bg-white text-[#60758A] hover:border-[#8BCDC6] hover:bg-[#ECF8F7]"}`}>{label}<span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-[#F0F5F8] text-[#60758A]"}`}>{count}</span></button>;
            })}
          </div>

          {ticketsQuery.isError ? (
            <div className="m-5 rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-4 text-sm">
              <div className="flex items-center gap-2 font-bold text-[#A86B00]"><AlertTriangle size={16} />Không thể tải phiếu Bảo hành/Sửa chữa</div>
              <p className="mt-1 text-xs leading-5 text-[#71869A]">{ticketsQuery.error.message || "Vui lòng kiểm tra kết nối và thử lại."}</p>
              <button onClick={() => ticketsQuery.refetch()} className="mt-3 rounded-lg border border-[#F2D596] px-3 py-2 text-xs font-bold text-[#A86B00] hover:bg-white">Thử lại</button>
            </div>
          ) : (
            <div className="mobile-table-scroll overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="bg-[#FBFCFD] text-[10px] uppercase tracking-[.12em] text-[#8AA0B6]">
                  <tr>
                    <th className="px-5 py-3">Phiếu / tài sản</th>
                    <th className="px-4 py-3">Kênh & ưu tiên</th>
                    <th className="px-4 py-3">Người xử lý</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Chi phí</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsQuery.isLoading && <tr><td colSpan={6}><ModalTableSkeleton rows={5} columns={6} /></td></tr>}
                  {!ticketsQuery.isLoading && pagedTickets.map((ticket) => {
                    const draft = draftFor(ticket);
                    const asset = assetById.get(ticket.assetId);
                    const assignee = ticket.assigneeUserId ? employeeById.get(ticket.assigneeUserId) : undefined;
                    const priorityTone = ticket.priority === "critical" ? "bg-[#FDEDEE] text-[#B44545]" : ticket.priority === "high" ? "bg-[#FFF5DC] text-[#A86B00]" : ticket.priority === "medium" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#F0F5F8] text-[#60758A]";
                    const isClosed = ticket.status === "closed";
                    const canEditTicket = isAdmin && !isClosed;
                    const isExpanded = expandedTicketId === ticket.id;
                    const estimatedCostLabel = Number(draft.estimatedCost || 0) > 0 ? `${Number(draft.estimatedCost).toLocaleString("vi-VN")} VNĐ` : "Chưa nhập";
                    const actualCostLabel = Number(draft.actualCost || 0) > 0 ? `${Number(draft.actualCost).toLocaleString("vi-VN")} VNĐ` : "Chưa nhập";
                    return (
                      <Fragment key={ticket.id}>
                        <tr className={`border-t border-[#EDF2F5] align-middle transition hover:bg-[#FAFDFD] ${isClosed ? "bg-[#FBFCFD]" : ""}`}>
                          <td className="px-5 py-4"><div className="font-mono text-[11px] font-bold text-[#0F8C8C]">{ticket.ticketCode}</div><div className="mt-1 flex items-center gap-1.5 font-semibold text-[#193B57]"><Wrench size={13} className="text-[#A86B00]" />{asset?.name || `Tài sản #${ticket.assetId}`}</div><p className="mt-1 max-w-[280px] truncate text-[10px] text-[#71869A]" title={ticket.description}>{ticket.description}</p></td>
                          <td className="px-4 py-4"><div className="flex flex-col items-start gap-1.5"><span title="Kênh xử lý được xác lập theo mã phiếu và không thể thay đổi sau khi tạo." className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-extrabold ${ticket.serviceChannel === "warranty" ? "border-[#8BCDC6] bg-[#ECF8F7] text-[#087A6A]" : "border-[#F2D596] bg-[#FFF9EB] text-[#A86B00]"}`}><LockKeyhole size={12} aria-hidden="true" />{serviceChannelLabels[(ticket.serviceChannel || "repair") as keyof typeof serviceChannelLabels]}</span><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${priorityTone}`}>{priorityLabels[ticket.priority]}</span></div></td>
                          <td className="px-4 py-4"><div className="flex items-center gap-1.5 text-xs font-semibold text-[#60758A]"><UserRound size={13} className="text-[#8AA0B6]" />{assignee?.name || assignee?.email || "Chưa phân công"}</div><div className="mt-1 text-[10px] text-[#9BAEC0]">Báo bởi {ticket.reporterName || "Người dùng"}</div></td>
                          <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-[10px] font-extrabold ${draft.status === "closed" ? "bg-[#F0F5F8] text-[#60758A]" : draft.status === "resolved" ? "bg-[#ECF8F7] text-[#087A6A]" : "bg-[#FFF5DC] text-[#A86B00]"}`}>{maintenanceStatusLabels[draft.status]}</span></td>
                          <td className="px-4 py-4"><div className="text-[10px] text-[#8AA0B6]">Thực tế</div><div className="mt-1 text-xs font-extrabold text-[#193B57]">{actualCostLabel}</div><div className="mt-1 text-[10px] text-[#8AA0B6]">Dự kiến: {estimatedCostLabel}</div></td>
                          <td className="px-5 py-4 text-right"><div className="flex justify-end gap-1.5"><button type="button" onClick={() => setHistoryTicket(ticket)} className="rounded-md border border-[#CDE5E5] p-2 text-[#087A6A] transition hover:bg-[#ECF8F7]" aria-label={`Xem lịch sử ${ticket.ticketCode}`} title="Xem lịch sử"><History size={13} /></button>{ticket.serviceChannel === "repair" && <button type="button" disabled={repairPdfTicketId === ticket.id} onClick={() => void previewRepairTicketPdf(ticket, asset)} className="rounded-md border border-[#C7DDF8] bg-[#EFF7FF] p-2 text-[#2666A8] transition hover:bg-[#EAF3FF] disabled:cursor-wait disabled:opacity-60" aria-label={`Xem trước PDF phiếu Sửa chữa ${ticket.ticketCode}`} title="PDF / In"><Printer size={13} /></button>}<button type="button" onClick={() => setExpandedTicketId((current) => current === ticket.id ? null : ticket.id)} className="inline-flex items-center gap-1 rounded-md bg-[#0F8C8C] px-2.5 py-2 text-[10px] font-extrabold text-white transition hover:bg-[#087A6A]" aria-expanded={isExpanded}><span>{isExpanded ? "Thu gọn" : "Cập nhật"}</span><ChevronDown size={13} className={isExpanded ? "rotate-180 transition-transform" : "transition-transform"} /></button></div></td>
                        </tr>
                        {isExpanded && <tr className="border-t border-[#DCEDEF] bg-[#F7FBFB]"><td colSpan={6} className="px-5 py-4"><div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.15fr_1.1fr_auto]"><div><label className="field-label">Người xử lý</label><SearchableSelect value={draft.assigneeUserId} onChange={(value) => updateDraft(ticket, { assigneeUserId: value })} disabled={!canEditTicket || updateMutation.isPending || employeesQuery.isLoading} placeholder="Chưa phân công" searchPlaceholder="Tìm người xử lý..." options={[{ value: "", label: "Chưa phân công" }, ...employees.map((employee) => ({ value: String(employee.id), label: `${employee.name || employee.email || `Nhân viên #${employee.id}`}${employee.isActive ? "" : " · Đã khóa"}`, searchText: employee.email || "" }))]} /></div><div><label className="field-label">Trạng thái</label><SearchableSelect value={draft.status} onChange={(value) => updateDraft(ticket, { status: value as TicketDraft["status"] })} disabled={!canEditTicket || updateMutation.isPending} searchPlaceholder="Tìm trạng thái..." options={Object.entries(maintenanceStatusLabels).map(([value, label]) => ({ value, label }))} /></div><div className="grid grid-cols-2 gap-3"><label className="field-label">Dự kiến<CurrencyInput disabled={!canEditTicket || updateMutation.isPending} value={draft.estimatedCost} onChange={(value) => updateDraft(ticket, { estimatedCost: value })} placeholder={canEditTicket ? "0" : "Chưa nhập"} aria-label="Chi phí dự kiến" showWords className="mt-1 h-9 !w-full text-xs" /></label><label className="field-label">Thực tế<CurrencyInput disabled={!canEditTicket || updateMutation.isPending} value={draft.actualCost} onChange={(value) => updateDraft(ticket, { actualCost: value })} placeholder={canEditTicket ? "0" : "Chưa nhập"} aria-label="Chi phí thực tế" showWords className="mt-1 h-9 !w-full text-xs" /></label></div><div><label className="field-label">Kết quả xử lý</label><textarea disabled={!canEditTicket || updateMutation.isPending} value={draft.resolution} onChange={(event) => updateDraft(ticket, { resolution: event.target.value })} placeholder="Nhập kết quả hoặc hướng xử lý..." className="mt-1 min-h-[74px] w-full resize-y rounded-md border border-[#DDE7F0] p-2 text-xs leading-5 text-[#193B57] outline-none focus:border-[#0F8C8C] disabled:cursor-not-allowed disabled:opacity-60" /></div><div className="flex min-w-[150px] flex-col justify-end gap-2"><div>{ticket.attachmentUrl ? <a href={ticket.attachmentUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#087A6A] underline" title={ticket.attachmentName || "Mở chứng từ"}>{ticket.attachmentName || "Mở chứng từ"}</a> : <span className="text-[10px] text-[#8AA0B6]">Chưa có chứng từ</span>}</div>{isAdmin && <label className={`inline-flex justify-center rounded-md border border-[#CDE5E5] px-2 py-1.5 text-[10px] font-bold ${canEditTicket ? "cursor-pointer text-[#087A6A] hover:bg-[#ECF8F7]" : "cursor-not-allowed text-[#8AA0B6] opacity-70"}`}><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" disabled={!canEditTicket || uploadAttachmentMutation.isPending} onChange={(event) => { uploadAttachment(ticket, event.target.files?.[0]); event.currentTarget.value = ""; }} />{uploadAttachmentMutation.isPending ? "Đang tải" : isClosed ? "Phiếu đã đóng" : "Tải chứng từ"}</label>}<button disabled={!canEditTicket || updateMutation.isPending} onClick={() => saveTicket(ticket)} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0F8C8C] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Save size={13} />{updateMutation.isPending ? "Đang lưu" : isClosed ? "Đã đóng" : "Lưu cập nhật"}</button></div></div></td></tr>}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              {!ticketsQuery.isLoading && filteredTickets.length === 0 && <ModuleEmptyState module="maintenance" title={`Chưa có phiếu ${serviceChannelTab === "all" ? "Bảo hành/Sửa chữa" : serviceChannelLabels[serviceChannelTab]}`} description="Khi có sự cố hoặc lịch xử lý mới, phiếu sẽ hiển thị tại đây để bạn theo dõi và xử lý." />}
              {filteredTickets.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7EEF3] px-5 py-4 text-xs text-[#8AA0B6]"><span>Trang <b className="text-[#60758A]">{maintenancePage}</b> / {maintenanceTotalPages}</span><div className="flex items-center gap-2"><button type="button" onClick={() => setMaintenancePage((page) => Math.max(1, page - 1))} disabled={maintenancePage === 1} className="rounded-md border border-[#DDE7F0] px-3 py-1.5 font-bold text-[#60758A] disabled:cursor-not-allowed disabled:opacity-40">‹</button><button type="button" onClick={() => setMaintenancePage((page) => Math.min(maintenanceTotalPages, page + 1))} disabled={maintenancePage === maintenanceTotalPages} className="rounded-md border border-[#DDE7F0] px-3 py-1.5 font-bold text-[#60758A] disabled:cursor-not-allowed disabled:opacity-40">›</button></div></div>}
            </div>
          )}
        </section>
        {historyTicket && <div className="fixed inset-0 z-[140] flex justify-end bg-[#102A43]/30 p-0 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryTicket(null); }}><aside className="motion-drawer-panel h-full w-full max-w-[480px] overflow-y-auto bg-white p-5 shadow-[-12px_0_32px_rgba(16,42,67,0.18)]" role="dialog" aria-modal="true" aria-label={`Chi tiết và lịch sử phiếu ${historyTicket.ticketCode}`}><div className="flex items-start justify-between gap-3 border-b border-[#E7EEF3] pb-4"><div><div className="font-mono text-xs font-extrabold text-[#0F8C8C]">{historyTicket.ticketCode}</div><h2 className="mt-1 text-base font-extrabold text-[#193B57]">Chi tiết phiếu · Lịch sử thay đổi</h2><p className="mt-1 text-xs text-[#71869A]">Theo dõi toàn bộ thao tác và cập nhật của phiếu bảo trì.</p></div><button type="button" onClick={() => setHistoryTicket(null)} className="grid h-8 w-8 place-items-center rounded-lg text-xl text-[#60758A] hover:bg-[#ECF8F7] hover:text-[#087A6A]" aria-label="Đóng lịch sử">×</button></div><div className="mt-5 space-y-3">{historyQuery.isLoading ? <div className="rounded-xl bg-[#F6FAFC] px-4 py-8 text-center text-xs font-semibold text-[#8AA0B6]">Đang tải lịch sử...</div> : historyQuery.isError ? <div className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] px-4 py-5 text-xs text-[#A86B00]">Không thể tải lịch sử phiếu. <button type="button" onClick={() => historyQuery.refetch()} className="font-bold underline">Thử lại</button></div> : historyEntries.length ? <>{visibleHistoryEntries.map((entry) => <div key={entry.id} className="relative rounded-xl border border-[#E7EEF3] bg-white p-4 shadow-[0_4px_14px_rgba(16,42,67,0.04)]"><div className="flex items-start justify-between gap-3"><div className="text-xs font-extrabold text-[#193B57]">{entry.summary || entry.action}</div><span className="shrink-0 text-[10px] font-semibold text-[#8AA0B6]">{new Date(entry.createdAt).toLocaleString("vi-VN")}</span></div><div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#60758A]"><span className="rounded-full bg-[#ECF8F7] px-2 py-1 font-bold text-[#087A6A]">{entry.action}</span><span>Thực hiện bởi: <b>{entry.actorName || "Hệ thống"}</b></span></div></div>)}{historyEntries.length > 0 && <div className="flex items-center justify-between border-t border-[#E7EEF3] pt-3"><span className="text-[10px] font-semibold text-[#8AA0B6]">Trang {historyPage}/{historyTotalPages} · {historyEntries.length} bản ghi</span><div className="flex gap-1"><button type="button" disabled={historyPage === 1} onClick={() => setHistoryPage((current) => Math.max(1, current - 1))} className="rounded-md border border-[#DDE7F0] px-2 py-1 text-[10px] font-bold text-[#60758A] disabled:cursor-not-allowed disabled:opacity-40">‹</button><button type="button" disabled={historyPage >= historyTotalPages} onClick={() => setHistoryPage((current) => Math.min(historyTotalPages, current + 1))} className="rounded-md border border-[#DDE7F0] px-2 py-1 text-[10px] font-bold text-[#60758A] disabled:cursor-not-allowed disabled:opacity-40">›</button></div></div>}</> : <div className="rounded-xl border border-dashed border-[#CDE5E5] bg-[#F8FCFC] px-4 py-8 text-center text-xs font-semibold text-[#8AA0B6]">Chưa có lịch sử thay đổi cho phiếu này.</div>}</div></aside></div>}
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

type AuditQrScanEntry = {
  id: string;
  code: string;
  name: string;
  status: "matched" | "added" | "duplicate" | "not_found" | "error";
  detail: string;
};

type AuditExcelImportItem = {
  id: number;
  assetCode: string;
  assetName: string;
  actualStatus: "available" | "assigned" | "maintenance" | "returned_to_vendor" | "retired" | "lost" | "damaged" | null;
  result: "pending" | "matched" | "missing" | "mismatch";
  note: string | null;
};

type AuditExcelImportPreview = {
  fileName: string;
  items: AuditExcelImportItem[];
  errors: string[];
  skippedRows: number;
};

type AuditImportSummary = {
  updated: number;
  matched: number;
  mismatches: number;
  missing: number;
};

const auditResultLabels = {
  pending: "Chưa kiểm",
  matched: "Khớp",
  missing: "Không tìm thấy",
  mismatch: "Chênh lệch",
} as const;

const auditImportStatusMap: Record<string, AuditExcelImportItem["actualStatus"]> = {
  "sẵn có": "available", "san co": "available", available: "available",
  "đang cấp phát": "assigned", "dang cap phat": "assigned", assigned: "assigned",
  "bảo trì": "maintenance", "bao tri": "maintenance", maintenance: "maintenance",
  "trả nhà cung cấp": "returned_to_vendor", "tra nha cung cap": "returned_to_vendor", returned_to_vendor: "returned_to_vendor",
  "ngừng sử dụng": "retired", "ngung su dung": "retired", retired: "retired",
  "thất lạc": "lost", "that lac": "lost", lost: "lost",
  "hư hỏng": "damaged", "hu hong": "damaged", damaged: "damaged",
  "": null, "chưa ghi nhận": null, "chua ghi nhan": null,
};

const auditImportResultMap: Record<string, AuditExcelImportItem["result"] | undefined> = {
  "chưa kiểm": "pending", "chua kiem": "pending", pending: "pending",
  "khớp": "matched", khop: "matched", matched: "matched",
  "chênh lệch": "mismatch", "chenh lech": "mismatch", mismatch: "mismatch",
  "thiếu": "missing", thieu: "missing", "không tìm thấy": "missing", "khong tim thay": "missing", missing: "missing",
};

const normalizedAuditImportValue = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("vi-VN");

const auditSessionStatusLabels = {
  draft: "Nháp",
  active: "Đang kiểm kê",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
} as const;

const auditAssetStatusLabels: Record<string, string> = {
  available: "Sẵn có",
  assigned: "Đang cấp phát",
  maintenance: "Bảo trì",
  returned_to_vendor: "Trả nhà cung cấp",
  retired: "Khấu hao/Thanh lý",
  lost: "Thất lạc",
  damaged: "Hư hỏng",
};

const auditAssetStatusLabel = (status: string | null | undefined) => status ? auditAssetStatusLabels[status] || status : "Chưa xác định";

export function AuditPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [name, setName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [auditRecurrenceDays, setAuditRecurrenceDays] = useState("");
  const [auditStatusFilter, setAuditStatusFilter] = useState("all");
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(() => {
    const sessionId = Number(new URLSearchParams(window.location.search).get("auditSession"));
    return Number.isInteger(sessionId) && sessionId > 0 ? sessionId : null;
  });
  const [assetId, setAssetId] = useState("");
  const [itemEdits, setItemEdits] = useState<Record<number, AuditItemDraft>>({});
  const [qrScanInput, setQrScanInput] = useState("");
  const [isQrScanOpen, setIsQrScanOpen] = useState(false);
  const [qrScanEntries, setQrScanEntries] = useState<AuditQrScanEntry[]>([]);
  const [isExportingDiscrepancy, setIsExportingDiscrepancy] = useState<"pdf" | "excel" | null>(null);
  const [isExportingFinalizedMinutes, setIsExportingFinalizedMinutes] = useState(false);
  const [isExportingFieldworkSheet, setIsExportingFieldworkSheet] = useState(false);
  const [isExportingTotalAssets, setIsExportingTotalAssets] = useState(false);
  const [auditResultFilter, setAuditResultFilter] = useState<"all" | AuditItemDraft["result"]>("all");
  const [auditActualStatusFilter, setAuditActualStatusFilter] = useState("all");
  const [auditAssetSearch, setAuditAssetSearch] = useState("");
  const [auditItemsPage, setAuditItemsPage] = useState(1);
  const [exportDepartmentId, setExportDepartmentId] = useState("all");
  const [exportCategoryId, setExportCategoryId] = useState("all");
  const [bulkSelectionIds, setBulkSelectionIds] = useState<number[]>([]);
  const [auditImportPreview, setAuditImportPreview] = useState<AuditExcelImportPreview | null>(null);
  const [auditImportPage, setAuditImportPage] = useState(1);
  const [lastAuditImportSummary, setLastAuditImportSummary] = useState<AuditImportSummary | null>(null);
  const [isAuditImportConfirmOpen, setIsAuditImportConfirmOpen] = useState(false);
  const [selectedAuditImportIds, setSelectedAuditImportIds] = useState<number[]>([]);
  const [bulkAuditImportNote, setBulkAuditImportNote] = useState("");
  const [isExportingAuditImportPreview, setIsExportingAuditImportPreview] = useState(false);
  const [auditItemToRemove, setAuditItemToRemove] = useState<number | null>(null);
  const [isDeleteDraftAuditOpen, setIsDeleteDraftAuditOpen] = useState(false);
  const auditImportInputRef = useRef<HTMLInputElement>(null);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);

  const openAuditSession = (sessionId: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "audit");
    url.searchParams.set("auditSession", String(sessionId));
    window.history.pushState({}, "", url);
    setSelectedSessionId(sessionId);
  };
  const closeAuditSession = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("auditSession");
    window.history.pushState({}, "", url);
    setSelectedSessionId(null);
  };

  const auditsQuery = trpc.audits.list.useQuery();
  const assetsQuery = trpc.assets.list.useQuery();
  const departmentsQuery = trpc.departments.list.useQuery();
  const assetCategoriesQuery = trpc.assetCategories.list.useQuery();
  const companySettingsQuery = trpc.company.get.useQuery(undefined, { enabled: isAdmin });
  const auditItemsQuery = trpc.audits.getItems.useQuery({ sessionId: selectedSessionId ?? 0 }, { enabled: Boolean(selectedSessionId) });
  const auditImportHistoryQuery = trpc.audits.importHistory.useQuery({ sessionId: selectedSessionId ?? 0 }, { enabled: Boolean(selectedSessionId) });
  const createSessionMutation = trpc.audits.create.useMutation({
    onSuccess: ({ id }) => {
      void auditsQuery.refetch();
      setName("");
      setScheduledDate("");
      setAuditRecurrenceDays("");
      openAuditSession(id);
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
  const importItemsMutation = trpc.audits.importItems.useMutation({
    onSuccess: ({ updated }, variables) => {
      void auditItemsQuery.refetch();
      setLastAuditImportSummary({
        updated,
        matched: variables.items.filter((item) => item.result === "matched").length,
        mismatches: variables.items.filter((item) => item.result === "mismatch").length,
        missing: variables.items.filter((item) => item.result === "missing").length,
      });
      setAuditImportPreview(null);
      setSelectedAuditImportIds([]);
      setBulkAuditImportNote("");
      if (auditImportInputRef.current) auditImportInputRef.current.value = "";
      toast.success(`Đã nhập file Excel và cập nhật ${updated} kết quả kiểm kê.`, { description: "Kết quả đã được đồng bộ vào danh sách kiểm kê." });
    },
    onError: (error) => toast.error(error.message || "Không thể nhập kết quả kiểm kê từ Excel."),
  });
  const removeAuditItemMutation = trpc.audits.removeItem.useMutation({
    onSuccess: () => { void auditItemsQuery.refetch(); setAuditItemToRemove(null); toast.success("Đã xóa tài sản khỏi đợt kiểm kê."); },
    onError: (error) => toast.error(error.message || "Không thể xóa tài sản khỏi đợt kiểm kê."),
  });
  const deleteDraftAuditMutation = trpc.audits.deleteDraft.useMutation({
    onSuccess: () => { void auditsQuery.refetch(); closeAuditSession(); setIsDeleteDraftAuditOpen(false); toast.success("Đã xóa đợt kiểm kê nháp."); },
    onError: (error) => toast.error(error.message || "Không thể xóa đợt kiểm kê nháp."),
  });
  const finalizeAuditMutation = trpc.audits.finalize.useMutation({
    onSuccess: () => {
      void Promise.all([auditsQuery.refetch(), auditItemsQuery.refetch(), auditImportHistoryQuery.refetch()]);
      toast.success("Đã chốt biên bản kiểm kê. Toàn bộ kết quả hiện đã được khóa.");
    },
    onError: (error) => toast.error(error.message || "Không thể chốt biên bản kiểm kê."),
  });

  const auditSessions = auditsQuery.data || [];
  const filteredAuditSessions = auditStatusFilter === "all" ? auditSessions : auditSessions.filter((audit) => audit.status === auditStatusFilter);
  const assets = assetsQuery.data || [];
  const auditItems = auditItemsQuery.data || [];
  const selectedAudit = auditSessions.find((audit) => audit.id === selectedSessionId);
  const isAuditLocked = selectedAudit?.status === "completed" || selectedAudit?.status === "cancelled";
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const auditableAssets = assets.filter((asset) => asset.status !== "returned_to_vendor" && asset.status !== "retired");
  const auditableAssetIds = new Set(auditableAssets.map((asset) => asset.id));
  // Đợt đã chốt là hồ sơ lịch sử, còn đợt mở chỉ hiển thị tài sản vẫn thuộc công ty.
  const auditItemsForCurrentSession = isAuditLocked ? auditItems : auditItems.filter((item) => auditableAssetIds.has(item.assetId));
  const alreadyAddedAssetIds = new Set(auditItems.map((item) => item.assetId));
  const availableAssets = auditableAssets.filter((asset) => !alreadyAddedAssetIds.has(asset.id));
  const selectableScopedAssets = availableAssets.filter((asset) => (exportDepartmentId === "all" || asset.departmentId === Number(exportDepartmentId)) && (exportCategoryId === "all" || asset.categoryId === Number(exportCategoryId)));
  const exportDepartmentOptions = [{ value: "all", label: "Tất cả Phòng ban" }, ...(departmentsQuery.data || []).map((department) => ({ value: String(department.id), label: department.name }))];
  const exportCategoryOptions = [{ value: "all", label: "Tất cả Phân loại" }, ...(assetCategoriesQuery.data || []).map((category) => ({ value: String(category.id), label: category.name }))];
  const scopedExportAssets = auditableAssets.filter((asset) => (exportDepartmentId === "all" || asset.departmentId === Number(exportDepartmentId)) && (exportCategoryId === "all" || asset.categoryId === Number(exportCategoryId)));
  const scopedAuditItems = auditItemsForCurrentSession.filter((item) => {
    const asset = assetById.get(item.assetId);
    if (!asset) return false;
    return (exportDepartmentId === "all" || asset.departmentId === Number(exportDepartmentId)) && (exportCategoryId === "all" || asset.categoryId === Number(exportCategoryId));
  });
  const auditImportChangeRows = (auditImportPreview?.items || []).map((item) => {
    const current = auditItems.find((auditItem) => auditItem.id === item.id);
    const currentActualStatus = current?.actualStatus || null;
    const currentResult = current?.result || "pending";
    const currentNote = current?.note || "";
    return {
      ...item,
      currentActualStatus,
      currentResult,
      currentNote,
      hasChange: currentActualStatus !== item.actualStatus || currentResult !== item.result || currentNote !== (item.note || ""),
    };
  });
  const auditImportPageCount = Math.max(1, Math.ceil(auditImportChangeRows.length / AUDIT_ITEMS_PAGE_SIZE));
  const activeAuditImportPage = Math.min(auditImportPage, auditImportPageCount);
  const pagedAuditImportRows = auditImportChangeRows.slice((activeAuditImportPage - 1) * AUDIT_ITEMS_PAGE_SIZE, activeAuditImportPage * AUDIT_ITEMS_PAGE_SIZE);
  const normalizedAuditAssetSearch = auditAssetSearch.trim().toLocaleLowerCase("vi-VN");
  const filteredAuditItems = scopedAuditItems.filter((item) => {
    const asset = assetById.get(item.assetId);
    const searchableText = [asset?.assetCode || "", asset?.name || "", asset?.serialNumber || ""].join(" ").toLocaleLowerCase("vi-VN");
    const matchesSearch = !normalizedAuditAssetSearch || searchableText.includes(normalizedAuditAssetSearch);
    const matchesActualStatus = auditActualStatusFilter === "all" || (auditActualStatusFilter === "unrecorded" ? !item.actualStatus : item.actualStatus === auditActualStatusFilter);
    const matchesResult = auditResultFilter === "all" || item.result === auditResultFilter;
    return matchesSearch && matchesActualStatus && matchesResult;
  });
  const filteredAuditSummary = {
    total: filteredAuditItems.length,
    matched: filteredAuditItems.filter((item) => item.result === "matched").length,
    mismatches: filteredAuditItems.filter((item) => item.result === "mismatch").length,
    missing: filteredAuditItems.filter((item) => item.result === "missing" || item.actualStatus === "lost").length,
  };
  const auditItemsPageCount = Math.max(1, Math.ceil(filteredAuditItems.length / AUDIT_ITEMS_PAGE_SIZE));
  const activeAuditItemsPage = Math.min(auditItemsPage, auditItemsPageCount);
  const pagedAuditItems = filteredAuditItems.slice((activeAuditItemsPage - 1) * AUDIT_ITEMS_PAGE_SIZE, activeAuditItemsPage * AUDIT_ITEMS_PAGE_SIZE);

  useEffect(() => setAuditItemsPage(1), [selectedSessionId, auditAssetSearch, auditActualStatusFilter, auditResultFilter, exportDepartmentId, exportCategoryId]);
  useEffect(() => setAuditImportPage((current) => Math.min(Math.max(1, current), auditImportPageCount)), [auditImportPageCount]);
  useEffect(() => setAuditItemsPage((current) => Math.min(Math.max(1, current), auditItemsPageCount)), [auditItemsPageCount]);

  useEffect(() => {
    const syncAuditSessionFromUrl = () => {
      const sessionId = Number(new URLSearchParams(window.location.search).get("auditSession"));
      setSelectedSessionId(Number.isInteger(sessionId) && sessionId > 0 ? sessionId : null);
    };
    window.addEventListener("popstate", syncAuditSessionFromUrl);
    return () => window.removeEventListener("popstate", syncAuditSessionFromUrl);
  }, []);

  const draftFor = (item: (typeof auditItems)[number]): AuditItemDraft => itemEdits[item.id] || {
    actualStatus: item.actualStatus || "",
    result: item.result,
    note: item.note || "",
  };

  const addScopedAssets = async () => {
    if (!selectedAudit || !selectableScopedAssets.length || addItemMutation.isPending) return;
    try {
      setBulkSelectionIds(selectableScopedAssets.map((asset) => asset.id));
      await Promise.all(selectableScopedAssets.map((asset) => addItemMutation.mutateAsync({ sessionId: selectedAudit.id, assetId: asset.id, expectedStatus: asset.status })));
      await auditItemsQuery.refetch();
      setBulkSelectionIds([]);
      toast.success(`Đã thêm ${selectableScopedAssets.length} tài sản theo bộ lọc vào danh sách kiểm kê.`);
    } catch (error) {
      setBulkSelectionIds([]);
      toast.error(error instanceof Error ? error.message : "Không thể thêm nhanh tài sản theo bộ lọc.");
    }
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
    total: auditItemsForCurrentSession.length,
    pending: auditItemsForCurrentSession.filter((item) => item.result === "pending").length,
    matched: auditItemsForCurrentSession.filter((item) => item.result === "matched").length,
    discrepancies: auditItemsForCurrentSession.filter((item) => item.result === "missing" || item.result === "mismatch").length,
  };
  const discrepancyItems = scopedAuditItems.filter((item) => item.result === "missing" || item.result === "mismatch");
  const finalizedDiscrepancyRows = auditItems.filter((item) => item.result === "missing" || item.result === "mismatch").map((item) => {
    const asset = assetById.get(item.assetId);
    return {
      assetCode: asset?.assetCode || `#${item.assetId}`,
      assetName: asset?.name || "Tài sản đã bị lưu trữ",
      expectedStatus: auditAssetStatusLabel(item.expectedStatus),
      actualStatus: auditAssetStatusLabel(item.actualStatus),
      result: auditResultLabels[item.result],
      note: item.note || "Không có",
    };
  });

  const appendQrScanEntry = (entry: Omit<AuditQrScanEntry, "id">) => {
    setQrScanEntries((current) => [{ ...entry, id: `${Date.now()}-${Math.random()}` }, ...current].slice(0, 12));
  };

  const scanAuditQr = async () => {
    if (!selectedAudit) return;
    const candidate = qrScanInput.trim().replace(/^ASSETMASTER\|/i, "");
    if (!candidate) { toast.error("Hãy quét hoặc nhập mã QR tài sản."); return; }
    const asset = assets.find((item) => item.qrToken === candidate || item.assetCode.toLowerCase() === candidate.toLowerCase());
    if (!asset) {
      appendQrScanEntry({ code: candidate, name: "Không xác định", status: "not_found", detail: "Không tìm thấy tài sản tương ứng." });
      setQrScanInput("");
      return;
    }
    if (asset.status === "returned_to_vendor") {
      appendQrScanEntry({ code: asset.assetCode, name: asset.name, status: "error", detail: "Tài sản đã trả nhà cung cấp, không thuộc phạm vi kiểm kê." });
      setQrScanInput("");
      return;
    }
    try {
      const existingItem = auditItems.find((item) => item.assetId === asset.id);
      if (existingItem) {
        const result = existingItem.expectedStatus === asset.status ? "matched" : "mismatch" as const;
        await recordItemMutation.mutateAsync({ id: existingItem.id, actualStatus: asset.status, result, note: existingItem.note || "Đã xác nhận bằng quét QR." });
        appendQrScanEntry({ code: asset.assetCode, name: asset.name, status: result === "matched" ? "matched" : "duplicate", detail: result === "matched" ? "Đã xác nhận khớp." : "Đã ghi nhận chênh lệch trạng thái." });
      } else {
        const created = await addItemMutation.mutateAsync({ sessionId: selectedAudit.id, assetId: asset.id, expectedStatus: asset.status });
        await recordItemMutation.mutateAsync({ id: created.id, actualStatus: asset.status, result: "matched", note: "Đã thêm và xác nhận bằng quét QR." });
        appendQrScanEntry({ code: asset.assetCode, name: asset.name, status: "added", detail: "Đã thêm và xác nhận khớp." });
      }
      await auditItemsQuery.refetch();
      setQrScanInput("");
    } catch (error) {
      appendQrScanEntry({ code: asset.assetCode, name: asset.name, status: "error", detail: error instanceof Error ? error.message : "Không thể ghi nhận mã QR." });
    }
  };

  const discrepancyRows = discrepancyItems.map((item) => {
    const asset = assetById.get(item.assetId);
    return {
      "Mã tài sản": asset?.assetCode || `#${item.assetId}`,
      "Tên tài sản": asset?.name || "Tài sản đã bị lưu trữ",
      "Trạng thái dự kiến": auditAssetStatusLabel(item.expectedStatus),
      "Trạng thái thực tế": auditAssetStatusLabel(item.actualStatus),
      "Kết quả": auditResultLabels[item.result],
      "Ghi chú": item.note || "",
      "Thời điểm ghi nhận": item.checkedAt ? new Date(item.checkedAt).toLocaleString("vi-VN") : "Chưa ghi nhận",
    };
  });

  const fieldworkRows = scopedAuditItems.map((item, index) => {
    const asset = assetById.get(item.assetId);
    return {
      "STT": index + 1,
      "Mã QR để quét": asset?.qrToken ? `ASSETMASTER|${asset.qrToken}` : asset?.assetCode || "",
      "Mã tài sản": asset?.assetCode || `#${item.assetId}`,
      "Tên tài sản": asset?.name || "Tài sản đã bị lưu trữ",
      "Serial / IMEI": asset?.serialNumber || "",
      "Vị trí hệ thống": asset?.location || "",
      "Người / đơn vị đang giữ": asset?.holderName || "",
      "Trạng thái hệ thống": auditAssetStatusLabel(item.expectedStatus || asset?.status),
      "Trạng thái thực tế": auditAssetStatusLabel(item.actualStatus) === "Chưa xác định" ? "" : auditAssetStatusLabel(item.actualStatus),
      "Kết quả kiểm kê": item.result === "pending" ? "" : auditResultLabels[item.result],
      "Hiện trạng thực tế": item.note || "",
      "Vị trí thực tế / người xác nhận": "",
      "Ghi chú kiểm kê": "",
      "Thời điểm kiểm kê": item.checkedAt ? new Date(item.checkedAt).toLocaleString("vi-VN") : "",
      "Người kiểm kê": "",
    };
  });

  const auditItemByAssetId = new Map(auditItems.map((item) => [item.assetId, item]));
  const totalAssetRows = scopedExportAssets.map((asset, index) => {
    const auditItem = auditItemByAssetId.get(asset.id);
    const department = departmentsQuery.data?.find((item) => item.id === asset.departmentId);
    return {
      "STT": index + 1,
      "Mã tài sản": asset.assetCode,
      "Tên tài sản": asset.name,
      "Phòng ban": department?.name || "Chưa gán",
      "Người giữ": asset.holderName || "Chưa cấp phát",
      "Trạng thái hệ thống": auditAssetStatusLabel(asset.status),
      "Tình trạng": asset.condition || "",
      "Vị trí": asset.location || "",
      "Serial / IMEI": asset.serialNumber || "",
      "Giá trị (VNĐ)": Number(asset.purchaseValue || 0),
      "Hạn bảo hành": asset.warrantyUntil ? new Date(asset.warrantyUntil).toLocaleDateString("vi-VN") : "",
      "Trạng thái thực tế": auditItem?.actualStatus ? auditAssetStatusLabel(auditItem.actualStatus) : auditItem ? "Chưa ghi nhận" : "Chưa đưa vào đợt kiểm kê",
      "Kết quả kiểm kê": auditItem ? auditResultLabels[auditItem.result] : "Chưa đưa vào đợt kiểm kê",
      "Ghi chú kiểm kê": auditItem?.note || "",
      "Thời điểm kiểm kê": auditItem?.checkedAt ? new Date(auditItem.checkedAt).toLocaleString("vi-VN") : "",
    };
  });

  const exportTotalAssetInventory = () => {
    if (!selectedAudit || !totalAssetRows.length) { toast.info("Chưa có tài sản để xuất."); return; }
    setIsExportingTotalAssets(true);
    const loadingToast = toast.loading("Đang tạo file tổng tài sản...");
    window.setTimeout(async () => {
      try {
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(totalAssetRows);
        sheet["!cols"] = [{ wch: 7 }, { wch: 18 }, { wch: 34 }, { wch: 22 }, { wch: 24 }, { wch: 20 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 38 }, { wch: 24 }];
        sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
        XLSX.utils.book_append_sheet(workbook, sheet, "Tổng tài sản");
        const summarySheet = XLSX.utils.aoa_to_sheet([
          ["TỔNG TÀI SẢN KÈM KẾT QUẢ KIỂM KÊ"],
          ["Đợt kiểm kê", selectedAudit.name],
          ["Mã đợt", selectedAudit.referenceCode],
          ["Phạm vi", `${exportDepartmentOptions.find((option) => option.value === exportDepartmentId)?.label || "Tất cả Phòng ban"} · ${exportCategoryOptions.find((option) => option.value === exportCategoryId)?.label || "Tất cả Phân loại"} · ${totalAssetRows.length} tài sản`],
          ["Ghi chú", "Hai cột Trạng thái thực tế và Kết quả kiểm kê phản ánh dữ liệu của đợt kiểm kê này; tài sản chưa đưa vào đợt được ghi rõ để tiện theo dõi."],
        ]);
        summarySheet["!cols"] = [{ wch: 24 }, { wch: 112 }];
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Thông tin xuất");
        await writeBrandedWorkbook(workbook, {
          documentTitle: "TỔNG TÀI SẢN KÈM KẾT QUẢ KIỂM KÊ",
          fileName: `assetmaster-tong-tai-san-${selectedAudit.referenceCode}.xlsx`,
          description: `Đợt ${selectedAudit.name} · ${totalAssetRows.length} tài sản theo phạm vi lọc hiện tại.`,
        });
        toast.success(`Đã xuất tổng ${totalAssetRows.length} tài sản kèm dữ liệu kiểm kê.`, { id: loadingToast });
      } catch (error) {
        console.error("[AuditPage] Total asset export failed", error);
        toast.error("Không thể xuất file tổng tài sản.", { id: loadingToast });
      } finally {
        setIsExportingTotalAssets(false);
      }
    }, 160);
  };

  const prepareAuditExcelImport = async (file: File) => {
    if (!selectedAudit) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("File Excel tối đa 8 MB."); return; }
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames.find((sheetName) => sheetName === "Danh sách kiểm kê") || workbook.SheetNames.find((sheetName) => sheetName !== "Thông tin doanh nghiệp") || workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("File Excel không có trang dữ liệu.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], { defval: "" });
      if (!rows.length) throw new Error("File Excel không có dòng dữ liệu.");
      const itemByAssetCode = new Map(auditItemsForCurrentSession.map((item) => {
        const asset = assetById.get(item.assetId);
        return [asset?.assetCode.trim().toLocaleLowerCase("vi-VN"), item] as const;
      }).filter((entry): entry is [string, (typeof auditItems)[number]] => Boolean(entry[0])));
      const parsedItems: AuditExcelImportItem[] = [];
      const errors: string[] = [];
      const importedItemIds = new Set<number>();
      let skippedRows = 0;
      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const assetCode = String(row["Mã tài sản"] ?? "").trim();
        if (!assetCode) { skippedRows += 1; return; }
        const auditItem = itemByAssetCode.get(assetCode.toLocaleLowerCase("vi-VN"));
        if (!auditItem) { errors.push(`Dòng ${rowNumber}: mã ${assetCode} không thuộc đợt kiểm kê này.`); return; }
        if (importedItemIds.has(auditItem.id)) { errors.push(`Dòng ${rowNumber}: mã ${assetCode} bị lặp trong file.`); return; }
        const actualStatusText = normalizedAuditImportValue(row["Trạng thái thực tế"]);
        if (actualStatusText && !(actualStatusText in auditImportStatusMap)) { errors.push(`Dòng ${rowNumber}: Trạng thái thực tế “${String(row["Trạng thái thực tế"])}” chưa hợp lệ.`); return; }
        const actualStatus = auditImportStatusMap[actualStatusText] ?? null;
        const resultText = normalizedAuditImportValue(row["Kết quả kiểm kê"] || row["Kết quả"]);
        if (resultText && !auditImportResultMap[resultText]) { errors.push(`Dòng ${rowNumber}: Kết quả kiểm kê “${String(row["Kết quả kiểm kê"] || row["Kết quả"])}” chưa hợp lệ.`); return; }
        const result = auditImportResultMap[resultText] || (actualStatus ? (auditItem.expectedStatus === actualStatus ? "matched" : "mismatch") : "pending");
        const note = String(row["Hiện trạng thực tế"] ?? row["Ghi chú kiểm kê"] ?? row["Ghi chú"] ?? "").trim().slice(0, 1000) || null;
        const asset = assetById.get(auditItem.assetId);
        parsedItems.push({ id: auditItem.id, assetCode, assetName: asset?.name || `Tài sản #${auditItem.assetId}`, actualStatus, result, note });
        importedItemIds.add(auditItem.id);
      });
      if (!parsedItems.length) { toast.error(errors[0] || "Không tìm thấy dòng hợp lệ để nhập."); return; }
      setAuditImportPreview({ fileName: file.name, items: parsedItems, errors: errors.slice(0, 8), skippedRows });
      setAuditImportPage(1);
      setSelectedAuditImportIds([]);
      setBulkAuditImportNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể đọc file Excel.");
    }
  };

  const exportAuditImportPreview = async () => {
    if (!selectedAudit || !auditImportPreview || !auditImportChangeRows.length) { toast.info("Chưa có danh sách preview để xuất."); return; }
    setIsExportingAuditImportPreview(true);
    const loadingToast = toast.loading("Đang tạo file preview import...");
    try {
      const workbook = XLSX.utils.book_new();
      const rows = auditImportChangeRows.map((row, index) => ({
        "STT": index + 1,
        "Mã tài sản": row.assetCode,
        "Tên tài sản": row.assetName,
        "Trạng thái thực tế hiện tại": auditAssetStatusLabel(row.currentActualStatus),
        "Trạng thái thực tế sẽ cập nhật": auditAssetStatusLabel(row.actualStatus),
        "Kết quả hiện tại": auditResultLabels[row.currentResult],
        "Kết quả sẽ cập nhật": auditResultLabels[row.result],
        "Ghi chú xử lý": row.note || "",
        "Có thay đổi": row.hasChange ? "Có" : "Không",
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = [{ wch: 7 }, { wch: 18 }, { wch: 34 }, { wch: 26 }, { wch: 28 }, { wch: 22 }, { wch: 24 }, { wch: 46 }, { wch: 14 }];
      sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(workbook, sheet, "Preview import");
      await writeBrandedWorkbook(workbook, { documentTitle: "PREVIEW CẬP NHẬT KIỂM KÊ", fileName: `assetmaster-preview-import-${selectedAudit.referenceCode}.xlsx`, description: `Đợt ${selectedAudit.name} · ${rows.length} dòng preview trước khi cập nhật.`, prepareWorkbook: (brandedWorkbook) => {
        const previewSheet = brandedWorkbook.getWorksheet("Preview import");
        if (!previewSheet) return;
        for (let rowIndex = 2; rowIndex <= previewSheet.rowCount; rowIndex += 1) {
          const row = previewSheet.getRow(rowIndex);
          const result = String(row.getCell(7).value || "");
          const status = String(row.getCell(5).value || "");
          const argb = result.includes("Chênh lệch") ? "FFFFF1D6" : result.includes("không tìm thấy") || status.includes("Thất lạc") ? "FFFFE3E8" : result.includes("Khớp") ? "FFE6F6F2" : "FFF7FAFC";
          row.eachCell((cell: any) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } }; });
        }
      } });
      toast.success("Đã tạo file preview import.", { id: loadingToast });
    } catch (error) {
      console.error("[AuditPage] Preview export failed", error);
      toast.error("Không thể xuất file preview import.", { id: loadingToast });
    } finally {
      setIsExportingAuditImportPreview(false);
    }
  };

  const exportFieldworkSheet = () => {
    if (!selectedAudit || !fieldworkRows.length) { toast.info("Đợt kiểm kê chưa có tài sản để xuất danh sách thực địa."); return; }
    setIsExportingFieldworkSheet(true);
    const loadingToast = toast.loading("Đang tạo danh sách kiểm kê thực địa...");
    window.setTimeout(async () => {
      try {
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(fieldworkRows);
        sheet["!cols"] = [{ wch: 7 }, { wch: 34 }, { wch: 18 }, { wch: 34 }, { wch: 20 }, { wch: 24 }, { wch: 28 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 38 }, { wch: 34 }, { wch: 38 }, { wch: 24 }, { wch: 22 }];
        sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
        XLSX.utils.book_append_sheet(workbook, sheet, "Danh sách kiểm kê");
        const guide = XLSX.utils.aoa_to_sheet([
          ["HƯỚNG DẪN KIỂM KÊ THỰC ĐỊA"],
          ["Đợt kiểm kê", selectedAudit.name],
          ["Mã đợt", selectedAudit.referenceCode],
          ["Cách sử dụng", "Quét cột Mã QR để quét hoặc đối chiếu Mã tài sản. Ghi rõ Hiện trạng thực tế, Vị trí thực tế / người xác nhận, Ghi chú kiểm kê, Thời điểm kiểm kê và Người kiểm kê."],
          ["Lưu ý", "Các cột hiện trạng và ghi chú có thể nhập trực tiếp trên Excel hoặc in ra để ghi tay, sau đó cập nhật kết quả vào hệ thống."],
          [],
          ["LỰA CHỌN HỢP LỆ - Trạng thái thực tế", "Chưa ghi nhận | Sẵn có | Đang cấp phát | Bảo trì | Trả nhà cung cấp | Ngừng sử dụng | Thất lạc | Hư hỏng"],
          ["LỰA CHỌN HỢP LỆ - Kết quả kiểm kê", "Chưa kiểm | Khớp | Chênh lệch | Không tìm thấy"],
        ]);
        guide["!cols"] = [{ wch: 24 }, { wch: 120 }];
        XLSX.utils.book_append_sheet(workbook, guide, "Hướng dẫn");
        await writeBrandedWorkbook(workbook, {
          documentTitle: "DANH SÁCH KIỂM KÊ THỰC ĐỊA",
          fileName: `assetmaster-danh-sach-kiem-ke-${selectedAudit.referenceCode}.xlsx`,
          description: `Đợt ${selectedAudit.name} · ${fieldworkRows.length} tài sản theo phạm vi lọc hiện tại.`,
          prepareWorkbook: (brandedWorkbook) => {
            const fieldworkSheet = brandedWorkbook.getWorksheet("Danh sách kiểm kê");
            if (!fieldworkSheet) return;
            const actualStatuses = '"Chưa ghi nhận,Sẵn có,Đang cấp phát,Bảo trì,Trả nhà cung cấp,Ngừng sử dụng,Thất lạc,Hư hỏng"';
            const auditResults = '"Chưa kiểm,Khớp,Chênh lệch,Không tìm thấy"';
            fieldworkSheet.getRow(1).eachCell((cell: any) => {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F3F5" } };
              cell.font = { bold: true, color: { argb: "FF193B57" } };
              cell.alignment = { vertical: "middle", wrapText: true };
            });
            for (let row = 2; row <= fieldworkRows.length + 1; row += 1) {
              fieldworkSheet.getCell(`I${row}`).dataValidation = { type: "list", allowBlank: true, formulae: [actualStatuses], showErrorMessage: true, errorTitle: "Giá trị không hợp lệ", error: "Chọn Trạng thái thực tế trong danh sách." };
              fieldworkSheet.getCell(`J${row}`).dataValidation = { type: "list", allowBlank: true, formulae: [auditResults], showErrorMessage: true, errorTitle: "Giá trị không hợp lệ", error: "Chọn Kết quả kiểm kê trong danh sách." };
            }
          },
        });
        toast.success(`Đã xuất ${fieldworkRows.length} tài sản để kiểm kê thực địa.`, { id: loadingToast });
      } catch (error) {
        console.error("[AuditPage] Fieldwork Excel export failed", error);
        toast.error("Không thể xuất danh sách kiểm kê thực địa.", { id: loadingToast });
      } finally {
        setIsExportingFieldworkSheet(false);
      }
    }, 160);
  };

  const exportDiscrepancyExcel = () => {
    if (!selectedAudit || !discrepancyRows.length) { toast.info("Đợt kiểm kê này chưa có chênh lệch để xuất."); return; }
    setIsExportingDiscrepancy("excel");
    const loadingToast = toast.loading("Đang tạo biên bản chênh lệch Excel...");
    window.setTimeout(async () => {
      try {
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(discrepancyRows);
        sheet["!cols"] = [{ wch: 18 }, { wch: 34 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 44 }, { wch: 24 }];
        XLSX.utils.book_append_sheet(workbook, sheet, "Chênh lệch kiểm kê");
        await writeBrandedWorkbook(workbook, {
          documentTitle: "BIÊN BẢN CHÊNH LỆCH KIỂM KÊ",
          fileName: `assetmaster-chenh-lech-${selectedAudit.referenceCode}.xlsx`,
          description: `Đợt ${selectedAudit.name} · ${discrepancyRows.length} chênh lệch theo phạm vi lọc hiện tại.`,
        });
        toast.success(`Đã xuất ${discrepancyRows.length} chênh lệch ra Excel.`, { id: loadingToast });
      } catch (error) {
        console.error("[AuditPage] Excel export failed", error);
        toast.error("Không thể xuất biên bản Excel.", { id: loadingToast });
      } finally {
        setIsExportingDiscrepancy(null);
      }
    }, 160);
  };

  const exportDiscrepancyPdf = async () => {
    if (!selectedAudit || !discrepancyRows.length) { toast.info("Đợt kiểm kê này chưa có chênh lệch để xuất."); return; }
    setIsExportingDiscrepancy("pdf");
    const loadingToast = toast.loading("Đang tạo biên bản chênh lệch PDF...");
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const fontResponse = await fetch(handoverPdfFontUrl);
      if (!fontResponse.ok) throw new Error("Không thể tải phông chữ tiếng Việt.");
      registerVietnamesePdfFont(doc, await fontResponse.arrayBuffer());
      const company = (companySettingsQuery.data || {}) as AuditCompanySettings;
      const logoDataUrl = company.logoUrl ? await loadAuditPdfImage(company.logoUrl).catch(() => undefined) : undefined;
      const left = 16;
      if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, auditPdfImageFormat(logoDataUrl), left, 10, 18, 18, undefined, "FAST"); } catch { /* Dùng phần chữ khi logo không nhúng được. */ }
      }
      doc.setTextColor(16, 42, 67);
      doc.setFontSize(13);
      doc.text(company.name || "Công ty quản lý tài sản", left + 24, 16);
      doc.setTextColor(96, 117, 138);
      doc.setFontSize(7);
      doc.text(`Địa chỉ: ${company.address || "Chưa cập nhật"} · MST: ${company.taxCode || "Chưa cập nhật"}`, left + 24, 22);
      doc.text(`Điện thoại: ${company.phone || "Chưa cập nhật"}${company.email ? ` · Email: ${company.email}` : ""}`, left + 24, 27);
      doc.setDrawColor(15, 140, 140);
      doc.line(left, 37, 194, 37);
      let y = 48;
      doc.setTextColor(16, 42, 67);
      doc.setFontSize(17);
      doc.text("BIÊN BẢN CHÊNH LỆCH KIỂM KÊ", left, y);
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(15, 140, 140);
      doc.text(selectedAudit.name, left, y);
      y += 6;
      doc.setTextColor(96, 117, 138);
      doc.setFontSize(8.5);
      doc.text(`${selectedAudit.referenceCode} · Xuất ngày ${new Date().toLocaleString("vi-VN")}`, left, y);
      y += 10;
      doc.setDrawColor(205, 229, 229);
      doc.line(left, y, 194, y);
      y += 7;
      discrepancyRows.forEach((row, index) => {
        const lines = [
          `${index + 1}. ${row["Tên tài sản"]} (${row["Mã tài sản"]})`,
          `Dự kiến: ${row["Trạng thái dự kiến"]} · Thực tế: ${row["Trạng thái thực tế"]} · Kết quả: ${row["Kết quả"]}`,
          `Ghi chú: ${row["Ghi chú"] || "Không có"}`,
        ].flatMap((line) => doc.splitTextToSize(line, 178));
        const height = lines.length * 5 + 6;
        if (y + height > 280) { doc.addPage(); y = 18; }
        doc.setFillColor(index % 2 ? 251 : 245, index % 2 ? 252 : 249, index % 2 ? 253 : 251);
        doc.roundedRect(left, y - 4, 178, height, 2, 2, "F");
        doc.setTextColor(25, 59, 87);
        doc.setFontSize(9);
        doc.text(lines, left + 4, y + 1);
        y += height + 3;
      });
      const watermark = await createPdfLogoWatermark(company.logoUrl).catch(() => null);
      applyPdfLogoWatermark(doc, watermark);
      openPdfPreview(doc, `assetmaster-chenh-lech-${selectedAudit.referenceCode}.pdf`, "BIÊN BẢN CHÊNH LỆCH KIỂM KÊ");
      toast.success(`Đã xuất ${discrepancyRows.length} chênh lệch ra PDF.`, { id: loadingToast });
    } catch (error) {
      console.error("[AuditPage] PDF export failed", error);
      toast.error(error instanceof Error ? error.message : "Không thể xuất biên bản PDF.", { id: loadingToast });
    } finally {
      setIsExportingDiscrepancy(null);
    }
  };

  const exportFinalizedAuditMinutes = async () => {
    if (!selectedAudit || selectedAudit.status !== "completed") { toast.info("Chỉ có thể xuất biên bản sau khi đợt kiểm kê đã chốt."); return; }
    setIsExportingFinalizedMinutes(true);
    const loadingToast = toast.loading("Đang tạo biên bản kiểm kê đã chốt...");
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const fontResponse = await fetch(handoverPdfFontUrl);
      if (!fontResponse.ok) throw new Error("Không thể tải phông chữ tiếng Việt.");
      registerVietnamesePdfFont(doc, await fontResponse.arrayBuffer());
      const company = (companySettingsQuery.data || {}) as AuditCompanySettings;
      const logoDataUrl = company.logoUrl ? await loadAuditPdfImage(company.logoUrl).catch(() => undefined) : undefined;
      const left = 16;
      const right = 194;
      const contentWidth = right - left;
      let y = 18;
      const ensureSpace = (height: number) => { if (y + height <= 276) return; doc.addPage(); y = 18; };
      const sectionTitle = (title: string) => { ensureSpace(12); doc.setTextColor(15, 140, 140); doc.setFontSize(10); doc.text(title, left, y); y += 5; doc.setDrawColor(205, 229, 229); doc.line(left, y, right, y); y += 6; };
      const detailLine = (label: string, value: string) => { const lines = doc.splitTextToSize(`${label}: ${value}`, contentWidth); ensureSpace(lines.length * 5 + 2); doc.setTextColor(25, 59, 87); doc.setFontSize(9); doc.text(lines, left, y); y += lines.length * 5 + 2; };

      if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, auditPdfImageFormat(logoDataUrl), left, y - 10, 18, 18, undefined, "FAST"); } catch { /* Logo lỗi định dạng sẽ dùng phần chữ thay thế. */ }
      } else {
        doc.setFillColor(15, 140, 140);
        doc.roundedRect(left, y - 10, 18, 18, 3, 3, "F");
        doc.setFillColor(16, 42, 67);
        doc.roundedRect(left + 3, y - 7, 12, 12, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.text("AM", left + 9, y + 1, { align: "center" });
      }
      doc.setTextColor(16, 42, 67);
      doc.setFontSize(15);
      doc.text(company.name || "Công ty quản lý tài sản", left + 24, y - 2);
      doc.setTextColor(96, 117, 138);
      doc.setFontSize(7.5);
      const companyLine = `Địa chỉ: ${company.address || "Chưa cập nhật"} · MST: ${company.taxCode || "Chưa cập nhật"}`;
      doc.text(doc.splitTextToSize(companyLine, contentWidth - 24), left + 24, y + 5);
      doc.text(`Điện thoại: ${company.phone || "Chưa cập nhật"}${company.email ? ` · Email: ${company.email}` : ""}`, left + 24, y + 10);
      doc.setDrawColor(15, 140, 140);
      doc.line(left, y + 22, right, y + 22);
      y += 35;
      doc.setTextColor(16, 42, 67);
      doc.setFontSize(17);
      doc.text("BIÊN BẢN KIỂM KÊ TÀI SẢN", left, y);
      y += 7;
      doc.setTextColor(15, 140, 140);
      doc.setFontSize(10);
      doc.text(selectedAudit.name, left, y);
      y += 6;
      doc.setTextColor(96, 117, 138);
      doc.setFontSize(8.5);
      doc.text(`${selectedAudit.referenceCode} · Đã chốt ${selectedAudit.completedAt ? new Date(selectedAudit.completedAt).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN")}`, left, y);
      y += 10;

      sectionTitle("I. THÔNG TIN BIÊN BẢN");
      detailLine("Tên đợt kiểm kê", selectedAudit.name);
      detailLine("Mã đợt", selectedAudit.referenceCode);
      detailLine("Thời điểm chốt", selectedAudit.completedAt ? new Date(selectedAudit.completedAt).toLocaleString("vi-VN") : "Đã chốt trên hệ thống");

      sectionTitle("II. TỔNG HỢP KẾT QUẢ");
      const totals = [`Tổng tài sản: ${summary.total}`, `Khớp: ${summary.matched}`, `Chênh lệch/thiếu: ${summary.discrepancies}`, `Chưa kiểm: ${summary.pending}`];
      doc.setFillColor(244, 251, 250);
      doc.roundedRect(left, y - 4, contentWidth, 17, 2, 2, "F");
      doc.setTextColor(25, 59, 87);
      doc.setFontSize(9);
      doc.text(totals.slice(0, 2).join("     "), left + 4, y + 1);
      doc.text(totals.slice(2).join("     "), left + 4, y + 8);
      y += 20;

      sectionTitle("III. DANH SÁCH CHÊNH LỆCH / THIẾU");
      if (!finalizedDiscrepancyRows.length) {
        detailLine("Kết quả", "Không phát hiện chênh lệch hoặc thiếu tài sản trong đợt kiểm kê này.");
      } else {
        finalizedDiscrepancyRows.forEach((row, index) => {
          const lines = [
            `${index + 1}. ${row.assetName} (${row.assetCode})`,
            `Dự kiến: ${row.expectedStatus} · Thực tế: ${row.actualStatus} · Kết quả: ${row.result}`,
            `Ghi chú: ${row.note}`,
          ].flatMap((line) => doc.splitTextToSize(line, contentWidth - 8));
          const height = lines.length * 4.6 + 8;
          ensureSpace(height + 3);
          doc.setFillColor(index % 2 ? 251 : 245, index % 2 ? 252 : 249, index % 2 ? 253 : 251);
          doc.roundedRect(left, y - 4, contentWidth, height, 2, 2, "F");
          doc.setTextColor(25, 59, 87);
          doc.setFontSize(8.5);
          doc.text(lines, left + 4, y + 1);
          y += height + 3;
        });
      }

      ensureSpace(58);
      y += 6;
      doc.setTextColor(96, 117, 138);
      doc.setFontSize(8.5);
      doc.text("Biên bản được lập từ dữ liệu đã chốt của đơn vị.", left, y);
      y += 8;
      const signatureColumns = [left + 25, left + contentWidth / 2, right - 25];
      const signatureLabels = ["NGƯỜI KIỂM KÊ", "ĐẠI DIỆN ĐƠN VỊ QUẢN LÝ", "NGƯỜI PHÊ DUYỆT"];
      doc.setTextColor(25, 59, 87);
      doc.setFontSize(8.5);
      signatureLabels.forEach((label, index) => doc.text(label, signatureColumns[index], y, { align: "center" }));
      y += 5;
      doc.setTextColor(96, 117, 138);
      doc.setFontSize(7.5);
      signatureColumns.forEach((column) => doc.text("(Ký, ghi rõ họ tên)", column, y, { align: "center" }));
      y += 25;
      signatureColumns.forEach((column) => doc.line(column - 21, y, column + 21, y));
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(221, 231, 240);
        doc.line(left, 286, right, 286);
        doc.setTextColor(112, 134, 154);
        doc.setFontSize(7.5);
        doc.text(`${company.name || "Đơn vị quản lý"} · ${selectedAudit.referenceCode}`, left, 291);
        doc.text(`Trang ${page}/${pageCount}`, right, 291, { align: "right" });
      }
      const watermark = await createPdfLogoWatermark(company.logoUrl).catch(() => null);
      applyPdfLogoWatermark(doc, watermark);
      openPdfPreview(doc, `assetmaster-bien-ban-kiem-ke-${selectedAudit.referenceCode}.pdf`, "BIÊN BẢN KIỂM KÊ ĐÃ CHỐT");
      toast.success("Đã xuất biên bản kiểm kê đã chốt ra PDF.", { id: loadingToast });
    } catch (error) {
      console.error("[AuditPage] Finalized audit minutes PDF export failed", error);
      toast.error(error instanceof Error ? error.message : "Không thể xuất biên bản kiểm kê PDF.", { id: loadingToast });
    } finally {
      setIsExportingFinalizedMinutes(false);
    }
  };

  return (
    <div className={shell}>
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ duration: 5000 }} />
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#0F8C8C]" /><EditableSectionLabel labelKey="audit-reconciliation" fallback="Đối chiếu kiểm kê" canEdit={isAdmin} /></div>
            <h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">{selectedAudit ? selectedAudit.name : "Kiểm kê tài sản"}</h1>
            <p className="mt-1 text-sm text-[#71869A]">{selectedAudit ? `${selectedAudit.referenceCode} · Đối chiếu trạng thái dự kiến với thực tế kiểm kê.` : "Lập đợt kiểm kê, đối chiếu trạng thái dự kiến với thực tế và xử lý chênh lệch theo từng tài sản."}</p>
          </div>
          {selectedAudit ? <button onClick={closeAuditSession} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#CDE5E5] bg-white px-4 py-2 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7]">← Danh sách đợt kiểm kê</button> : <div className="rounded-lg border border-[#CDE5E5] bg-[#ECF8F7] px-3 py-2 text-xs font-semibold text-[#087A6A]">{isAdmin ? "Bạn có thể tạo đợt và ghi nhận kết quả kiểm kê." : "Chỉ quản trị viên có thể ghi nhận kết quả kiểm kê."}</div>}
        </div>

        {!selectedAudit && <>
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
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-sm font-extrabold text-[#193B57]">Các đợt kiểm kê</h2><div className="flex items-center gap-2"><span className="text-xs font-bold text-[#60758A]">{filteredAuditSessions.length}/{auditSessions.length} đợt</span><SearchableSelect value={auditStatusFilter} onChange={setAuditStatusFilter} menuPortal className="w-[172px]" placeholder="Tất cả trạng thái" searchPlaceholder="Tìm trạng thái..." options={[{ value: "all", label: "Tất cả trạng thái" }, { value: "draft", label: "Nháp" }, { value: "active", label: "Đang kiểm kê" }, { value: "completed", label: "Hoàn tất" }, { value: "cancelled", label: "Đã hủy" }]} /></div></div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {auditsQuery.isLoading && <div className={`${card} col-span-full p-8 text-center text-sm text-[#71869A]`}>Đang tải các đợt kiểm kê...</div>}
              {!auditsQuery.isLoading && filteredAuditSessions.map((audit) => {
                const selected = selectedSessionId === audit.id;
                const tone = audit.status === "completed" ? "bg-[#E6F6F2] text-[#087A6A]" : audit.status === "cancelled" ? "bg-[#FDEDEE] text-[#B44545]" : audit.status === "active" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#F0F5F8] text-[#60758A]";
                return <button key={audit.id} onClick={() => openAuditSession(audit.id)} className={`${card} min-h-0 p-4 text-left transition hover:-translate-y-0.5 hover:border-[#8BCDC6] ${selected ? "ring-2 ring-[#0F8C8C]" : ""}`}><div className="flex items-start justify-between gap-3"><div className="font-mono text-[10px] font-bold text-[#0F8C8C]">{audit.referenceCode}</div><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${tone}`}>{auditSessionStatusLabels[audit.status]}</span></div><div className="mt-2 truncate text-sm font-extrabold text-[#193B57]">{audit.name}</div><div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-[#8AA0B6]"><span>Tạo ngày {new Date(audit.createdAt).toLocaleDateString("vi-VN")}</span><span className="font-bold text-[#087A6A]">Mở chi tiết →</span></div></button>;
              })}
              {!auditsQuery.isLoading && auditSessions.length === 0 && <div className={`${card} col-span-full p-10 text-center text-sm text-[#8AA0B6]`}>Chưa có đợt kiểm kê nào. Hãy tạo một đợt để bắt đầu đối chiếu tài sản.</div>}
              {!auditsQuery.isLoading && auditSessions.length > 0 && filteredAuditSessions.length === 0 && <div className={`${card} col-span-full p-10 text-center text-sm text-[#8AA0B6]`}>Không có đợt kiểm kê phù hợp với trạng thái đang chọn.</div>}
            </div>
          </section>
        )}
        </>}

        {selectedAudit && <section className={`relative z-0 mt-5 overflow-hidden ${card}`}>
          <div className="flex flex-col gap-4 border-b border-[#E7EEF3] p-5 lg:flex-row lg:items-end lg:justify-between">
            <div><div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0F8C8C]">Chi tiết kiểm kê</div><h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">{selectedAudit.name}</h2><p className="mt-1 text-xs text-[#71869A]">{selectedAudit.referenceCode} · Đối chiếu trạng thái hệ thống với thực tế kiểm kê.</p></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-[#F0F5F8] px-3 py-2 text-center"><div className="text-[10px] font-bold text-[#8AA0B6]">Tổng</div><div className="mt-1 font-display text-lg font-extrabold text-[#193B57]">{summary.total}</div></div>
              <div className="rounded-lg bg-[#FFF9EB] px-3 py-2 text-center"><div className="text-[10px] font-bold text-[#A86B00]">Chưa kiểm</div><div className="mt-1 font-display text-lg font-extrabold text-[#A86B00]">{summary.pending}</div></div>
              <div className="rounded-lg bg-[#ECF8F7] px-3 py-2 text-center"><div className="text-[10px] font-bold text-[#087A6A]">Khớp</div><div className="mt-1 font-display text-lg font-extrabold text-[#087A6A]">{summary.matched}</div></div>
              <div className="rounded-lg bg-[#FDEDEE] px-3 py-2 text-center"><div className="text-[10px] font-bold text-[#B44545]">Chênh lệch</div><div className="mt-1 font-display text-lg font-extrabold text-[#B44545]">{summary.discrepancies}</div></div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">{selectedAudit.status === "draft" && <button type="button" disabled={!isAdmin || deleteDraftAuditMutation.isPending} onClick={() => setIsDeleteDraftAuditOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#F3C4C4] bg-white px-3 py-2 text-xs font-bold text-[#B44545] hover:bg-[#FDEDEE] disabled:cursor-not-allowed disabled:opacity-60"><Trash2 size={15} />Xóa đợt nháp</button>}<button disabled={!isAdmin || isAuditLocked} onClick={() => setIsQrScanOpen((current) => !current)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-60"><QrCode size={15} />{isQrScanOpen ? "Ẩn quét QR" : "Quét QR hàng loạt"}</button><button disabled={!discrepancyRows.length || isExportingDiscrepancy !== null} onClick={exportDiscrepancyExcel} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#D7E5F5] bg-white px-3 py-2 text-xs font-bold text-[#2666A8] transition hover:bg-[#EAF3FF] disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} />{isExportingDiscrepancy === "excel" ? "Đang xuất..." : "Xuất Excel"}</button><button disabled={!discrepancyRows.length || isExportingDiscrepancy !== null} onClick={exportDiscrepancyPdf} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#102A43] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#193B57] disabled:cursor-not-allowed disabled:opacity-60"><FileText size={15} />{isExportingDiscrepancy === "pdf" ? "Đang xuất..." : "Xuất PDF"}</button></div>
          </div>

          <div className="flex flex-col gap-2 border-b border-[#E7EEF3] bg-[#FBFCFD] px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-[#71869A]">{isAuditLocked ? "Kết quả đã được chốt; thao tác ghi nhận, quét QR và nhập Excel đã khóa." : summary.pending > 0 ? `Còn ${summary.pending} tài sản chưa kiểm, cần hoàn tất trước khi chốt biên bản.` : "Tất cả tài sản đã có kết quả, sẵn sàng chốt biên bản."}</div>{isAuditLocked ? <span className="inline-flex w-fit items-center rounded-full bg-[#E6F6F2] px-3 py-1.5 text-xs font-extrabold text-[#087A6A]">Đã chốt · Dữ liệu khóa</span> : <button type="button" disabled={!isAdmin || summary.pending > 0 || finalizeAuditMutation.isPending} onClick={() => setIsFinalizeDialogOpen(true)} className="inline-flex min-h-10 w-fit items-center justify-center rounded-lg bg-[#102A43] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#193B57] disabled:cursor-not-allowed disabled:opacity-60">{finalizeAuditMutation.isPending ? "Đang chốt..." : "Chốt biên bản"}</button>}</div>

          {selectedAudit.status === "completed" && <div className="flex justify-end border-b border-[#E7EEF3] bg-[#F4FBFA] px-5 py-3"><button type="button" disabled={isExportingFinalizedMinutes} onClick={() => void exportFinalizedAuditMinutes()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#8BCDC6] bg-white px-4 py-2 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-60"><FileText size={15} />{isExportingFinalizedMinutes ? "Đang tạo biên bản..." : "Biên bản đã chốt (PDF)"}</button></div>}

          <div aria-disabled={isAuditLocked} className={isAuditLocked ? "pointer-events-none select-none opacity-60" : ""}>

          {isQrScanOpen && <div className="border-b border-[#CDE5E5] bg-[#F4FBFA] p-4 sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]"><QrCode size={14} />Quét QR liên tiếp</div><p className="mt-1 text-xs leading-5 text-[#60758A]">Dùng máy quét QR hoặc dán mã. Mỗi lần Enter sẽ tự thêm tài sản mới hoặc xác nhận tài sản đã có trong đợt.</p></div><span className="w-fit rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#087A6A] ring-1 ring-inset ring-[#CDE5E5]">{qrScanEntries.length} lượt gần nhất</span></div><div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"><input autoFocus value={qrScanInput} onChange={(event) => setQrScanInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void scanAuditQr(); } }} placeholder="Quét hoặc nhập ASSETMASTER|token / mã tài sản..." className="field-input font-mono" disabled={isAuditLocked || addItemMutation.isPending || recordItemMutation.isPending} /><button onClick={() => void scanAuditQr()} disabled={isAuditLocked || !qrScanInput.trim() || addItemMutation.isPending || recordItemMutation.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-5 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><QrCode size={15} />{addItemMutation.isPending || recordItemMutation.isPending ? "Đang ghi nhận..." : "Ghi nhận QR"}</button></div>{qrScanEntries.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{qrScanEntries.map((entry) => <div key={entry.id} className={`rounded-lg border px-3 py-2 text-xs ${entry.status === "matched" || entry.status === "added" ? "border-[#B8E9DD] bg-white text-[#087A6A]" : entry.status === "not_found" || entry.status === "error" ? "border-[#F3C4C4] bg-[#FFF8F8] text-[#B44545]" : "border-[#F2D596] bg-[#FFFDF7] text-[#A86B00]"}`}><div className="font-mono text-[10px] font-extrabold">{entry.code}</div><div className="mt-0.5 truncate font-bold">{entry.name}</div><div className="mt-1 text-[10px]">{entry.detail}</div></div>)}</div>}</div>}

          <div className="relative z-20 border-b border-[#E7EEF3] bg-[#FBFCFD] p-4 sm:p-5"><div className="mb-3 rounded-xl border border-[#DDEBEA] bg-[#F4FBFA] p-3"><div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]">Chọn nhanh theo phạm vi</div><div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"> <SearchableSelect value={exportDepartmentId} onChange={setExportDepartmentId} menuPortal className="min-w-0 bg-white" placeholder="Tất cả Phòng ban" searchPlaceholder="Tìm Phòng ban..." options={exportDepartmentOptions} /><SearchableSelect value={exportCategoryId} onChange={setExportCategoryId} menuPortal className="min-w-0 bg-white" placeholder="Tất cả Phân loại" searchPlaceholder="Tìm Phân loại..." options={exportCategoryOptions} /><button type="button" disabled={!isAdmin || !selectableScopedAssets.length || addItemMutation.isPending || isAuditLocked} onClick={() => void addScopedAssets()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Plus size={15} />{bulkSelectionIds.length ? `Đang thêm ${bulkSelectionIds.length}...` : `Thêm ${selectableScopedAssets.length} tài sản`}</button></div><p className="mt-2 text-[11px] text-[#4B8884]">{selectableScopedAssets.length ? `${selectableScopedAssets.length} tài sản chưa có trong đợt phù hợp với phạm vi đang chọn.` : "Không còn tài sản mới phù hợp với phạm vi đang chọn."} {assets.length > auditableAssets.length ? `${assets.length - auditableAssets.length} tài sản Trả nhà cung cấp đã được loại trừ khỏi phạm vi kiểm kê.` : ""} Sau khi thêm, danh sách kiểm kê nằm ngay bên dưới.</p></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><SearchableSelect value={assetId} onChange={setAssetId} menuPortal disabled={!isAdmin || assetsQuery.isLoading || addItemMutation.isPending} className="w-full sm:max-w-[520px]" placeholder="Chọn tài sản cần kiểm kê" searchPlaceholder="Tìm mã, tên hoặc trạng thái..." options={[{ value: "", label: "Chọn tài sản cần kiểm kê" }, ...availableAssets.map((asset) => ({ value: String(asset.id), label: `${asset.assetCode} · ${asset.name} · ${auditAssetStatusLabel(asset.status)}`, searchText: `${asset.assetCode} ${asset.status} ${auditAssetStatusLabel(asset.status)}` }))]} /><button disabled={!isAdmin || !assetId || addItemMutation.isPending} onClick={() => { const asset = auditableAssets.find((candidate) => candidate.id === Number(assetId)); if (!asset) { toast.error("Chọn một tài sản hợp lệ trong phạm vi kiểm kê."); return; } addItemMutation.mutate({ sessionId: selectedAudit.id, assetId: asset.id, expectedStatus: asset.status }); }} className="min-h-11 shrink-0 rounded-lg bg-[#0F8C8C] px-5 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60">{addItemMutation.isPending ? "Đang thêm" : "Thêm tài sản"}</button><button disabled={!fieldworkRows.length || isExportingFieldworkSheet} onClick={exportFieldworkSheet} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#8BCDC6] bg-[#ECF8F7] px-4 py-2 text-xs font-bold text-[#087A6A] transition hover:bg-[#DDF3F0] disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} />{isExportingFieldworkSheet ? "Đang tạo..." : "Danh sách kiểm kê"}</button><button type="button" disabled={!isAdmin || importItemsMutation.isPending} onClick={() => auditImportInputRef.current?.click()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#C7DDF8] bg-white px-4 py-2 text-xs font-bold text-[#2666A8] transition hover:bg-[#EAF3FF] disabled:cursor-not-allowed disabled:opacity-60"><Upload size={15} />Nhập file đã kiểm kê</button></div>{availableAssets.length === 0 && !assetsQuery.isLoading && <p className="mt-2 text-xs text-[#8AA0B6]">Tất cả tài sản đủ điều kiện đã được thêm vào đợt kiểm kê này.</p>}</div>

          <div className="relative z-10 border-b border-[#E7EEF3] bg-white p-4 sm:p-5"><div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_160px_auto]"><label className="flex min-h-[2.45rem] items-center gap-2 rounded-[0.55rem] border border-[#DDE7F0] bg-white px-3 text-[#8AA0B6] transition focus-within:border-[#0F8C8C] focus-within:shadow-[0_0_0_3px_rgba(15,140,140,0.11)]">
              <Search size={14} className="shrink-0" aria-hidden="true" />
              <input value={auditAssetSearch} onChange={(event) => setAuditAssetSearch(event.target.value)} placeholder="Tìm mã, tên hoặc serial tài sản..." className="min-w-0 flex-1 border-0 bg-transparent py-2 text-xs font-semibold text-[#193B57] outline-none placeholder:font-medium placeholder:text-[#A8B8C5]" />
            </label><SearchableSelect value={auditActualStatusFilter} onChange={setAuditActualStatusFilter} menuPortal className="min-w-0" placeholder="Tất cả trạng thái" searchPlaceholder="Tìm trạng thái..." options={[{ value: "all", label: "Tất cả trạng thái" }, { value: "unrecorded", label: "Chưa ghi nhận" }, { value: "available", label: "Sẵn có" }, { value: "assigned", label: "Đang cấp phát" }, { value: "maintenance", label: "Bảo trì" }, { value: "returned_to_vendor", label: "Trả nhà cung cấp" }, { value: "retired", label: "Ngừng sử dụng" }, { value: "lost", label: "Thất lạc" }, { value: "damaged", label: "Hư hỏng" }]} /><SearchableSelect value={auditResultFilter} onChange={(value) => setAuditResultFilter(value as typeof auditResultFilter)} menuPortal className="min-w-0" placeholder="Tất cả kết quả" searchPlaceholder="Tìm kết quả kiểm kê..." options={[{ value: "all", label: "Tất cả kết quả" }, { value: "matched", label: "Khớp" }, { value: "mismatch", label: "Chênh lệch" }, { value: "missing", label: "Thiếu / không tìm thấy" }, { value: "pending", label: "Chưa kiểm" }]} /><input ref={auditImportInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void prepareAuditExcelImport(file); }} /></div><p className="mt-2 text-[11px] leading-5 text-[#71869A]">Lọc theo kết quả để theo dõi danh sách. Phòng ban và Phân loại được áp dụng đồng thời cho bảng và các file Excel xuất ra.</p>{lastAuditImportSummary && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[#CDE5E5] bg-[#F4FBFA] px-3 py-2 text-[11px] font-semibold text-[#4B8884]"><span className="font-extrabold text-[#087A6A]">Kết quả import gần nhất</span><span>Đã cập nhật: <b className="text-[#193B57]">{lastAuditImportSummary.updated}</b></span><span>Khớp: <b className="text-[#087A6A]">{lastAuditImportSummary.matched}</b></span><span>Chênh lệch: <b className="text-[#A86B00]">{lastAuditImportSummary.mismatches}</b></span><span>Không tìm thấy: <b className="text-[#B44545]">{lastAuditImportSummary.missing}</b></span></div>}{auditImportPreview && <div className="mt-3 rounded-xl border border-[#B8E9DD] bg-[#F4FBFA] p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-extrabold text-[#087A6A]">Sẵn sàng cập nhật từ {auditImportPreview.fileName}</div><p className="mt-1 text-[11px] text-[#4B8884]">{auditImportPreview.items.length} dòng hợp lệ{auditImportPreview.skippedRows ? ` · ${auditImportPreview.skippedRows} dòng trống được bỏ qua` : ""}{auditImportPreview.errors.length ? ` · ${auditImportPreview.errors.length} lỗi cần xem` : ""}.</p></div><div className="flex gap-2"><button type="button" onClick={() => { setAuditImportPreview(null); setSelectedAuditImportIds([]); setBulkAuditImportNote(""); if (auditImportInputRef.current) auditImportInputRef.current.value = ""; }} className="min-h-9 rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Hủy</button><button type="button" disabled={isExportingAuditImportPreview} onClick={() => void exportAuditImportPreview()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#C7DDF8] bg-white px-3 text-xs font-bold text-[#2666A8] hover:bg-[#EAF3FF] disabled:cursor-not-allowed disabled:opacity-60"><Download size={14} />{isExportingAuditImportPreview ? "Đang xuất..." : "Xuất Excel preview"}</button><button type="button" disabled={importItemsMutation.isPending} onClick={() => setIsAuditImportConfirmOpen(true)} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#0F8C8C] px-3 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Upload size={14} />Xem lại và xác nhận</button></div></div><div className="mt-3 flex flex-col gap-2 rounded-lg border border-[#CDE5E5] bg-white p-3 lg:flex-row lg:items-end"><label className="flex items-center gap-2 text-xs font-bold text-[#193B57]"><input type="checkbox" checked={auditImportChangeRows.length > 0 && selectedAuditImportIds.length === auditImportChangeRows.length} onChange={(event) => setSelectedAuditImportIds(event.target.checked ? auditImportChangeRows.map((row) => row.id) : [])} className="h-4 w-4 rounded border-[#8BCDC6] text-[#0F8C8C]" />Chọn tất cả ({selectedAuditImportIds.length}/{auditImportChangeRows.length})</label><textarea value={bulkAuditImportNote} onChange={(event) => setBulkAuditImportNote(event.target.value)} placeholder="Ghi chú xử lý chung cho các tài sản đã chọn..." className="min-h-10 flex-1 resize-y rounded-md border border-[#DDE7F0] px-3 py-2 text-xs text-[#193B57] outline-none focus:border-[#0F8C8C]" /><button type="button" disabled={!selectedAuditImportIds.length || !bulkAuditImportNote.trim()} onClick={() => { const note = bulkAuditImportNote.trim(); setAuditImportPreview((current) => current ? { ...current, items: current.items.map((item) => selectedAuditImportIds.includes(item.id) ? { ...item, note } : item) } : current); setBulkAuditImportNote(""); setSelectedAuditImportIds([]); }} className="min-h-10 rounded-lg bg-[#0F8C8C] px-4 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60">Áp dụng ghi chú</button><button type="button" disabled={!selectedAuditImportIds.length && !bulkAuditImportNote} onClick={() => { setSelectedAuditImportIds([]); setBulkAuditImportNote(""); }} className="min-h-10 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-60">Xóa chọn</button></div><div className="mt-3 overflow-x-auto rounded-lg border border-[#DDE7F0] bg-white"><table className="min-w-[840px] w-full text-left text-[11px]"><thead className="bg-[#F7FAFC] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#71869A]"><tr><th className="px-3 py-2"><span className="sr-only">Chọn</span></th><th className="px-3 py-2">Tài sản</th><th className="px-3 py-2">Trạng thái thực tế</th><th className="px-3 py-2">Kết quả</th><th className="px-3 py-2">Ghi chú (có thể chỉnh sửa)</th></tr></thead><tbody>{pagedAuditImportRows.map((row) => <tr key={row.id} className={row.hasChange ? "border-t border-[#F2D596] bg-[#FFF9EB]" : "border-t border-[#EDF2F5] bg-white"}><td className="px-3 py-2 align-top"><input type="checkbox" checked={selectedAuditImportIds.includes(row.id)} onChange={(event) => setSelectedAuditImportIds((current) => event.target.checked ? [...new Set([...current, row.id])] : current.filter((id) => id !== row.id))} className="mt-1 h-4 w-4 rounded border-[#8BCDC6] text-[#0F8C8C]" aria-label={`Chọn `} /></td><td className="px-3 py-2"><div className="font-bold text-[#193B57]">{row.assetName}</div><div className="font-mono text-[10px] text-[#0F8C8C]">{row.assetCode}</div></td><td className="px-3 py-2 text-[#527089]"><span className="block text-[10px] text-[#8AA0B6]">{auditAssetStatusLabel(row.currentActualStatus)} →</span><span className="font-semibold text-[#193B57]">{auditAssetStatusLabel(row.actualStatus)}</span></td><td className="px-3 py-2 text-[#527089]"><span className="block text-[10px] text-[#8AA0B6]">{auditResultLabels[row.currentResult]} →</span><span className="font-semibold text-[#193B57]">{auditResultLabels[row.result]}</span></td><td className="px-3 py-2"><textarea value={row.note || ""} onChange={(event) => setAuditImportPreview((current) => current ? { ...current, items: current.items.map((item) => item.id === row.id ? { ...item, note: event.target.value } : item) } : current)} placeholder="Bổ sung ghi chú trước khi cập nhật..." className="min-h-14 w-full resize-y rounded-md border border-[#DDE7F0] p-2 text-[11px] text-[#193B57] outline-none focus:border-[#0F8C8C]" /></td></tr>)}</tbody></table></div>{auditImportChangeRows.length > 0 && <div className="mt-2 flex flex-col gap-2 border-t border-[#E7EEF3] pt-2 text-[11px] text-[#60758A] sm:flex-row sm:items-center sm:justify-between"><span>Hiển thị {(activeAuditImportPage - 1) * AUDIT_ITEMS_PAGE_SIZE + 1}–{Math.min(activeAuditImportPage * AUDIT_ITEMS_PAGE_SIZE, auditImportChangeRows.length)} / {auditImportChangeRows.length} dòng</span><div className="flex items-center gap-2"><button type="button" aria-label="Trang preview import trước" disabled={activeAuditImportPage <= 1} onClick={() => setAuditImportPage((page) => Math.max(1, page - 1))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#DDE7F0] bg-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /></button><span className="min-w-[64px] text-center font-bold text-[#193B57]">{activeAuditImportPage}/{auditImportPageCount}</span><button type="button" aria-label="Trang preview import sau" disabled={activeAuditImportPage >= auditImportPageCount} onClick={() => setAuditImportPage((page) => Math.min(auditImportPageCount, page + 1))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#DDE7F0] bg-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={14} /></button></div></div>}{auditImportPreview.errors.length > 0 && <div className="mt-2 rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2 text-[11px] leading-5 text-[#A86B00]">{auditImportPreview.errors.map((error) => <div key={error}>• {error}</div>)}</div>}</div>}</div>

          <div className="grid grid-cols-2 gap-2 border-b border-[#E7EEF3] bg-[#FBFCFD] p-4 sm:grid-cols-4 sm:px-5">
            <div className="rounded-lg border border-[#E0E7ED] bg-white px-3 py-2"><div className="text-[10px] font-bold text-[#71869A]">Tổng theo bộ lọc</div><div className="mt-1 text-lg font-extrabold text-[#193B57]">{filteredAuditSummary.total}</div></div>
            <div className="rounded-lg border border-[#B8E9DD] bg-[#ECF8F7] px-3 py-2"><div className="text-[10px] font-bold text-[#087A6A]">Khớp</div><div className="mt-1 text-lg font-extrabold text-[#087A6A]">{filteredAuditSummary.matched}</div></div>
            <div className="rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2"><div className="text-[10px] font-bold text-[#A86B00]">Chênh lệch</div><div className="mt-1 text-lg font-extrabold text-[#A86B00]">{filteredAuditSummary.mismatches}</div></div>
            <div className="rounded-lg border border-[#F3C4C4] bg-[#FFF1F3] px-3 py-2"><div className="text-[10px] font-bold text-[#B44545]">Thất lạc / không tìm thấy</div><div className="mt-1 text-lg font-extrabold text-[#B44545]">{filteredAuditSummary.missing}</div></div>
          </div>

          {auditItemsQuery.isError ? <div className="m-5 rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-4 text-sm"><div className="flex items-center gap-2 font-bold text-[#A86B00]"><AlertTriangle size={16} />Không thể tải chi tiết kiểm kê</div><p className="mt-1 text-xs text-[#71869A]">{auditItemsQuery.error.message || "Vui lòng thử lại."}</p><button onClick={() => auditItemsQuery.refetch()} className="mt-3 rounded-lg border border-[#F2D596] px-3 py-2 text-xs font-bold text-[#A86B00] hover:bg-white">Thử lại</button></div> : <div className="mobile-table-scroll overflow-x-auto md:overflow-hidden"><table className="w-full min-w-[1080px] text-left text-xs"><thead className="bg-[#F1F3F5] text-[10px] uppercase tracking-[.12em] text-[#526779]"><tr><th className="px-5 py-3">Tài sản</th><th className="px-4 py-3">Trạng thái dự kiến</th><th className="px-4 py-3">Trạng thái thực tế</th><th className="px-4 py-3">Kết quả</th><th className="px-4 py-3">Ghi chú / lịch sử</th><th className="px-5 py-3 text-right">Lưu</th></tr></thead><tbody>{auditItemsQuery.isLoading && <tr><td colSpan={6}><ModalTableSkeleton rows={5} columns={6} /></td></tr>}{!auditItemsQuery.isLoading && pagedAuditItems.map((item) => { const asset = assetById.get(item.assetId); const draft = draftFor(item); const isDiscrepancy = draft.result === "missing" || draft.result === "mismatch"; const badgeTone = draft.result === "matched" ? "bg-[#E6F6F2] text-[#087A6A]" : isDiscrepancy ? "bg-[#FDEDEE] text-[#B44545]" : "bg-[#FFF5DC] text-[#A86B00]"; return <tr key={item.id} className={`border-t border-[#EDF2F5] align-top ${draft.result === "missing" ? "bg-[#FFF1F3] ring-1 ring-inset ring-[#F3B5BD]" : isDiscrepancy ? "bg-[#FFF9EB] ring-1 ring-inset ring-[#F2D596]" : ""}`}><td className="px-5 py-4"><div className="font-bold text-[#193B57]">{asset?.name || `Tài sản #${item.assetId}`}</div><div className="mt-1 font-mono text-[10px] text-[#0F8C8C]">{asset?.assetCode || "Tài sản đã bị lưu trữ"}</div><div className="mt-1 text-[10px] text-[#8AA0B6]">Trạng thái hệ thống: {auditAssetStatusLabel(asset?.status)}</div></td><td className="px-4 py-4"><span className="rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]">{auditAssetStatusLabel(item.expectedStatus)}</span></td><td className="px-4 py-4"><SearchableSelect value={draft.actualStatus} onChange={(value) => updateDraft(item, { actualStatus: value })} disabled={!isAdmin || recordItemMutation.isPending} className="min-w-[185px]" placeholder="Chưa ghi nhận" searchPlaceholder="Tìm trạng thái thực tế..." options={[{ value: "", label: "Chưa ghi nhận" }, { value: "available", label: "Sẵn có" }, { value: "assigned", label: "Đang cấp phát" }, { value: "maintenance", label: "Bảo trì" }, { value: "retired", label: "Ngừng sử dụng" }, { value: "lost", label: "Thất lạc" }, { value: "damaged", label: "Hư hỏng" }]} /></td><td className="px-4 py-4"><SearchableSelect value={draft.result} onChange={(value) => updateDraft(item, { result: value as AuditItemDraft["result"] })} disabled={!isAdmin || recordItemMutation.isPending} className="min-w-[155px]" searchPlaceholder="Tìm kết quả..." options={[{ value: "pending", label: "Chưa kiểm" }, { value: "matched", label: "Khớp" }, { value: "mismatch", label: "Chênh lệch" }, { value: "missing", label: "Không tìm thấy" }]} /><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-extrabold ${badgeTone}`}>{auditResultLabels[draft.result]}</span></td><td className="px-4 py-4">{isDiscrepancy && <div className="mb-2 flex items-center gap-1 text-[10px] font-bold text-[#B44545]"><AlertTriangle size={12} />Bổ sung ghi chú xử lý</div>}<textarea disabled={!isAdmin || recordItemMutation.isPending} value={draft.note} onChange={(event) => updateDraft(item, { note: event.target.value })} placeholder="Mô tả hiện trạng, vị trí hoặc lý do chênh lệch..." className="min-h-[70px] w-[250px] resize-y rounded-md border border-[#DDE7F0] p-2 text-xs leading-5 text-[#193B57] outline-none focus:border-[#0F8C8C] disabled:cursor-not-allowed disabled:opacity-60" />{item.checkedAt && <div className="mt-2 flex items-center gap-1 text-[10px] text-[#8AA0B6]"><CheckCircle2 size={11} />Ghi nhận {new Date(item.checkedAt).toLocaleString("vi-VN")}</div>}</td><td className="px-5 py-4 text-right"><div className="flex flex-col items-end gap-2"><button disabled={!isAdmin || recordItemMutation.isPending} onClick={() => recordItem(item)} className="inline-flex items-center gap-1.5 rounded-md bg-[#0F8C8C] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Save size={13} />{recordItemMutation.isPending ? "Đang lưu" : "Lưu kết quả"}</button><button type="button" disabled={!isAdmin || removeAuditItemMutation.isPending} onClick={() => setAuditItemToRemove(item.id)} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B44545] hover:underline disabled:cursor-not-allowed disabled:opacity-60"><Trash2 size={12} />Xóa khỏi đợt</button><button disabled={!isAdmin || recordItemMutation.isPending} onClick={() => updateDraft(item, { actualStatus: "", result: "missing", note: draft.note || "Không tìm thấy tại vị trí kiểm kê." })} className="text-[10px] font-bold text-[#B44545] hover:underline disabled:cursor-not-allowed disabled:opacity-60">Đánh dấu thất lạc</button></div></td></tr>; })}</tbody></table>{!auditItemsQuery.isLoading && filteredAuditItems.length > 0 && <div className="flex flex-col gap-3 border-t border-[#E7EEF3] bg-[#FBFCFD] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs font-semibold text-[#60758A]">Hiển thị {(activeAuditItemsPage - 1) * AUDIT_ITEMS_PAGE_SIZE + 1}–{Math.min(activeAuditItemsPage * AUDIT_ITEMS_PAGE_SIZE, filteredAuditItems.length)} / {filteredAuditItems.length} tài sản</div><div className="flex items-center gap-2"><button type="button" aria-label="Trang trước" disabled={activeAuditItemsPage <= 1} onClick={() => setAuditItemsPage((page) => Math.max(1, page - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#DDE7F0] bg-white text-[#60758A] transition hover:border-[#8BCDC6] hover:text-[#087A6A] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button><span className="min-w-[82px] text-center text-xs font-bold text-[#193B57]">Trang {activeAuditItemsPage}/{auditItemsPageCount}</span><button type="button" aria-label="Trang sau" disabled={activeAuditItemsPage >= auditItemsPageCount} onClick={() => setAuditItemsPage((page) => Math.min(auditItemsPageCount, page + 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#DDE7F0] bg-white text-[#60758A] transition hover:border-[#8BCDC6] hover:text-[#087A6A] disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button></div></div>}{!auditItemsQuery.isLoading && auditItems.length === 0 && <ModuleEmptyState module="audit" title="Chưa có tài sản trong đợt kiểm kê" description="Hãy chọn tài sản để bắt đầu đối chiếu và ghi nhận kết quả kiểm kê." />}{!auditItemsQuery.isLoading && auditItems.length > 0 && filteredAuditItems.length === 0 && <ModuleEmptyState module="audit" title="Không có tài sản phù hợp" description="Hãy thay đổi bộ lọc kết quả, Phòng ban hoặc Phân loại để xem thêm dữ liệu." />}</div>}
          </div>
          <section className="border-t border-[#E7EEF3] bg-[#FBFCFD] px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-extrabold text-[#193B57]"><History size={15} className="text-[#2666A8]" />Lịch sử nhập Excel</div><span className="rounded-full bg-[#EAF3FF] px-2.5 py-1 text-[10px] font-extrabold text-[#2666A8]">{auditImportHistoryQuery.data?.length || 0} lần</span></div>{auditImportHistoryQuery.isLoading ? <p className="mt-2 text-xs text-[#71869A]">Đang tải lịch sử nhập Excel...</p> : auditImportHistoryQuery.isError ? <button onClick={() => auditImportHistoryQuery.refetch()} className="mt-2 text-xs font-bold text-[#B44545] underline">Không thể tải lịch sử. Thử lại</button> : auditImportHistoryQuery.data?.length ? <div className="mt-3 space-y-2">{auditImportHistoryQuery.data.map((entry) => <div key={entry.id} className="flex flex-col gap-1 rounded-lg border border-[#E7EEF3] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs font-semibold text-[#193B57]">{entry.summary || "Nhập Excel kiểm kê"}</div><div className="text-[10px] text-[#71869A]">{entry.actorName || "Quản trị viên"} · {new Date(entry.createdAt).toLocaleString("vi-VN")}</div></div>)}</div> : <p className="mt-2 text-xs text-[#8AA0B6]">Chưa có lần nhập Excel nào cho đợt kiểm kê này.</p>}</section>
        </section>}
        {selectedAudit && <AlertDialog open={isAuditImportConfirmOpen} onOpenChange={setIsAuditImportConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận cập nhật từ Excel?</AlertDialogTitle><AlertDialogDescription>Hệ thống sẽ cập nhật {auditImportChangeRows.filter((row) => row.hasChange).length} thay đổi theo file đã chọn. Hãy kiểm tra bảng preview và ghi chú trước khi xác nhận; thao tác này sẽ ghi đè kết quả hiện có của các tài sản tương ứng.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={importItemsMutation.isPending}>Quay lại chỉnh sửa</AlertDialogCancel><AlertDialogAction disabled={!auditImportPreview || importItemsMutation.isPending} onClick={(event) => { event.preventDefault(); if (!auditImportPreview) return; importItemsMutation.mutate({ sessionId: selectedAudit.id, items: auditImportPreview.items.map(({ id, actualStatus, result, note }) => ({ id, actualStatus, result, note })) }); setIsAuditImportConfirmOpen(false); }} className="bg-[#0F8C8C] text-white hover:bg-[#087A6A]">{importItemsMutation.isPending ? "Đang cập nhật..." : "Xác nhận cập nhật"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}{selectedAudit && <AlertDialog open={auditItemToRemove !== null} onOpenChange={(open) => { if (!open) setAuditItemToRemove(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa tài sản khỏi đợt kiểm kê?</AlertDialogTitle><AlertDialogDescription>Tài sản sẽ được gỡ khỏi danh sách của đợt này. Kết quả kiểm kê đã nhập cho tài sản đó cũng sẽ bị xóa; tài sản gốc trong hệ thống không bị ảnh hưởng.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={removeAuditItemMutation.isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={auditItemToRemove === null || removeAuditItemMutation.isPending} onClick={(event) => { event.preventDefault(); if (auditItemToRemove !== null) removeAuditItemMutation.mutate({ id: auditItemToRemove }); }} className="bg-[#B44545] text-white hover:bg-[#933737]">{removeAuditItemMutation.isPending ? "Đang xóa..." : "Xóa khỏi đợt"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}{selectedAudit && <AlertDialog open={isDeleteDraftAuditOpen} onOpenChange={setIsDeleteDraftAuditOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa đợt kiểm kê nháp?</AlertDialogTitle><AlertDialogDescription>Thao tác này sẽ xóa vĩnh viễn đợt nháp cùng toàn bộ tài sản đang có trong danh sách. Chỉ đợt ở trạng thái nháp mới có thể xóa.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleteDraftAuditMutation.isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={deleteDraftAuditMutation.isPending} onClick={(event) => { event.preventDefault(); deleteDraftAuditMutation.mutate({ sessionId: selectedAudit.id }); }} className="bg-[#B44545] text-white hover:bg-[#933737]">{deleteDraftAuditMutation.isPending ? "Đang xóa..." : "Xóa đợt nháp"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}{selectedAudit && <AlertDialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Chốt biên bản kiểm kê?</AlertDialogTitle><AlertDialogDescription>Toàn bộ {summary.total} kết quả đã ghi nhận sẽ bị khóa. Sau khi chốt, bạn không thể thêm tài sản, quét QR, nhập Excel hoặc sửa kết quả; dữ liệu vẫn được lưu và có thể xem lại.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={finalizeAuditMutation.isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={finalizeAuditMutation.isPending} onClick={() => finalizeAuditMutation.mutate({ sessionId: selectedAudit.id })} className="bg-[#102A43] text-white hover:bg-[#193B57]">{finalizeAuditMutation.isPending ? "Đang chốt..." : "Chốt và khóa kết quả"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
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
  const exportExcel = async () => {
    const departmentName = departmentId === "all" ? "Tất cả phòng ban" : departments.data?.find((department) => department.id === Number(departmentId))?.name || "Chưa gán";
    const rows = selectedAssets.map((asset) => ({
      "Mã tài sản": asset.assetCode,
      "Tên tài sản": asset.name,
      "Phòng ban": departments.data?.find((department) => department.id === asset.departmentId)?.name || "Chưa gán",
      "Người giữ": asset.holderName || "Chưa cấp phát",
      "Trạng thái": asset.status,
      "Tình trạng": asset.condition,
      "Vị trí": asset.location || "",
      "Serial/IMEI": asset.serialNumber || "",
      "Giá trị (VNĐ)": Number(asset.purchaseValue || 0),
      "Hạn bảo hành": asset.warrantyUntil ? new Date(asset.warrantyUntil).toLocaleDateString("vi-VN") : "",
    }));
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 16 }, { wch: 34 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, sheet, "Tài sản");
    await writeBrandedWorkbook(workbook, {
      documentTitle: "BÁO CÁO TÀI SẢN THEO PHÒNG BAN",
      fileName: `assetmaster-${departmentName.replace(/[^a-zA-Z0-9]/g, "-")}.xlsx`,
      description: `Phòng ban: ${departmentName} · ${rows.length} tài sản.`,
    });
  };
  return <div className={shell}><div className="mx-auto max-w-[1500px]"><div className="mb-7"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2666A8]"><span className="h-1.5 w-1.5 rounded-full bg-[#2666A8]" />Live management data</div><h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">Báo cáo vận hành</h1><p className="mt-1 text-sm text-[#71869A]">Tổng hợp chỉ số, xuất dữ liệu phòng ban và tra cứu lịch sử thao tác.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <div key={metric.label} className={`${card} p-5`}><FileBarChart size={19} className="text-[#2666A8]" /><div className="mt-5 text-xs font-semibold text-[#7890A5]">{metric.label}</div><div className="mt-1 font-display text-3xl font-extrabold text-[#102A43]">{metric.value}</div></div>)}</div><section className={`mt-5 ${card} p-5`}><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><Download size={16} className="text-[#087A6A]" />Xuất tài sản theo phòng ban</div><p className="mt-1 text-xs text-[#71869A]">Tệp Excel gồm thông tin định danh, người giữ, trạng thái và giá trị tài sản.</p></div><div className="flex flex-col gap-2 sm:flex-row"><select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} disabled={!isAdmin || departments.isLoading} className="field-input min-w-[210px]"><option value="all">Tất cả phòng ban</option>{departments.data?.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><button onClick={exportExcel} disabled={!isAdmin || selectedAssets.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} />Xuất Excel ({selectedAssets.length})</button></div></div>{!isAdmin && <p className="mt-3 text-xs text-[#A86B00]">Chỉ quản trị viên có thể xuất báo cáo theo phòng ban và xem nhật ký chi tiết.</p>}</section>{isAdmin && <section className={`mt-5 overflow-hidden ${card}`}><div className="border-b border-[#E7EEF3] px-5 py-4"><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><History size={16} className="text-[#2666A8]" />Nhật ký hoạt động</div><p className="mt-1 text-xs text-[#71869A]">Theo dõi các thay đổi tài sản, bàn giao, bảo trì, kiểm kê và quản trị tài khoản.</p><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_190px]"><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-[#8AA0B6]" /><input value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} placeholder="Tìm theo người thực hiện, nội dung hoặc thao tác..." className="field-input pl-9" /></div><select value={activityType} onChange={(event) => setActivityType(event.target.value)} className="field-input"><option value="all">Tất cả đối tượng</option>{[...new Set((activities.data || []).map((item) => item.entityType))].map((type) => <option key={type} value={type}>{type}</option>)}</select></div></div><div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-[#FBFCFD] text-[10px] uppercase tracking-[.12em] text-[#8AA0B6]"><tr><th className="px-5 py-3">Thời gian</th><th className="px-4 py-3">Người thực hiện</th><th className="px-4 py-3">Đối tượng</th><th className="px-4 py-3">Thao tác</th><th className="px-5 py-3">Chi tiết</th></tr></thead><tbody>{activities.isLoading && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#71869A]">Đang tải nhật ký...</td></tr>}{!activities.isLoading && filteredActivities.map((item) => <tr key={item.id} className="border-t border-[#EDF2F5]"><td className="px-5 py-3 text-[#60758A]">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="px-4 py-3 font-semibold text-[#193B57]">{item.actorName || "Hệ thống"}</td><td className="px-4 py-3"><span className="rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]">{item.entityType} #{item.entityId}</span></td><td className="px-4 py-3 font-mono text-[10px] text-[#0F8C8C]">{item.action}</td><td className="px-5 py-3 text-[#60758A]">{item.summary || "—"}</td></tr>)}{!activities.isLoading && filteredActivities.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#8AA0B6]">Không có nhật ký phù hợp.</td></tr>}</tbody></table></div></section>}</div></div>;
}
