import { Box, CalendarDays, CheckCircle2, CircleHelp, CircleUserRound, Clock3, History, LogOut, PackageCheck, PackagePlus, RotateCcw, Send, ShieldCheck, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getReturnDecisionNotification } from "@/lib/returnDecisionNotification";
import { UserHelpDialog } from "./HelpCenter";
import { EmployeeSupplyRequests } from "@/components/EmployeeSupplyRequests";
import { EmployeeNotificationBell } from "@/components/EmployeeNotificationBell";

type CurrentUser = { name: string | null; email: string | null; role: "user" | "admin"; isActive: boolean; lastSignedIn: Date | string };
type CompanyBrand = { name: string; websiteTitle: string; logoUrl: string; brandColor: string };

const handoverStatus = { active: "Đang giữ", pending_signature: "Chờ ký", returned: "Đã hoàn trả", draft: "Bản nháp", cancelled: "Đã hủy" } as const;
const returnRequestPresentation = {
  none: { label: "Đã hoàn trả", className: "bg-[#EAF3FF] text-[#2666A8]" },
  pending: { label: "Đang chờ duyệt", className: "bg-[#FFF5DC] text-[#A86B00]" },
  approved: { label: "Đã duyệt hoàn trả", className: "bg-[#E6F6F2] text-[#087A6A]" },
  rejected: { label: "Bị từ chối", className: "bg-[#FDEDEE] text-[#B44545]" },
} as const;

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa cập nhật";
}

function ReturnRequestStatus({ status, resolution }: { status: "none" | "pending" | "approved" | "rejected"; resolution?: string | null }) {
  const presentation = returnRequestPresentation[status];
  return <div className="min-w-0"><span className={`inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${presentation.className}`}>{presentation.label}</span>{resolution ? <p className="mt-1.5 text-[11px] leading-5 text-[#71869A]">Phản hồi: {resolution}</p> : null}</div>;
}

export function UserDashboard({ user, onLogout, companyInfo }: { user: CurrentUser; onLogout: () => Promise<void>; companyInfo: CompanyBrand }) {
  const historyQuery = trpc.employees.myAssetHistory.useQuery(undefined, { refetchInterval: 30_000 });
  const supplyHistoryQuery = trpc.employees.mySupplyHistory.useQuery(undefined, { refetchInterval: 30_000 });
  const companyQuery = trpc.company.get.useQuery();
  const notificationPreferencesQuery = trpc.notifications.preferences.useQuery();
  const [returnTarget, setReturnTarget] = useState<{ id: number; assetName: string; assetCode: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [supplyRequestOpen, setSupplyRequestOpen] = useState(false);
  const lastReturnDecisionKey = useRef<string | null>(null);
  const utils = trpc.useUtils();
  const requestReturn = trpc.handovers.requestReturn.useMutation({
    onSuccess: () => { void utils.employees.myAssetHistory.invalidate(); setReturnTarget(null); toast.success("Đã gửi yêu cầu hoàn trả cho quản trị viên."); },
    onError: (error) => toast.error(error.message || "Không thể gửi yêu cầu hoàn trả."),
  });
  const submitReturnFollowUp = trpc.handovers.submitReturnFollowUp.useMutation({
    onSuccess: () => { void utils.employees.myAssetHistory.invalidate(); toast.success("Đã gửi giải trình cho quản trị viên."); },
    onError: (error) => toast.error(error.message || "Không thể gửi giải trình."),
  });
  const markReturnResultSeen = trpc.handovers.markReturnResultSeen.useMutation({
    onSuccess: () => { void utils.employees.myAssetHistory.invalidate(); },
    onError: (error) => toast.error(error.message || "Không thể xác nhận thông báo đã xem."),
  });
  const history = historyQuery.data || [];
  const supplyHistory = supplyHistoryQuery.data || [];
  const activeAssets = history.filter((item) => item.status === "active");
  const returnedAssets = history.filter((item) => item.status === "returned");
  const latestResolvedReturn = history.filter((item) => (item.returnRequestStatus === "approved" || item.returnRequestStatus === "rejected") && item.returnRequestResolvedAt && !item.returnResultSeenAt).sort((left, right) => new Date(right.returnRequestResolvedAt!).getTime() - new Date(left.returnRequestResolvedAt!).getTime())[0];
  const rejectedReturns = history.filter((item) => item.returnRequestStatus === "rejected");
  const initials = (user.name || user.email || "AM").split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
  const signedInAt = user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString("vi-VN") : "Chưa cập nhật";
  const activeCompanyInfo = {
    name: companyQuery.data?.name || companyInfo.name,
    websiteTitle: companyQuery.data?.websiteTitle || companyInfo.websiteTitle,
    logoUrl: companyQuery.data?.logoUrl || companyInfo.logoUrl,
    brandColor: companyQuery.data?.brandColor || companyInfo.brandColor,
  };

  useEffect(() => {
    const identity = document.querySelector<HTMLElement>("main > header > div > div:first-child");
    if (!identity || identity.children.length < 2) return;
    const logo = identity.children[0] as HTMLElement;
    const labels = identity.children[1] as HTMLElement;
    logo.style.backgroundColor = activeCompanyInfo.logoUrl ? "#F0F5F8" : activeCompanyInfo.brandColor || "#0F8C8C";
    logo.replaceChildren();
    if (activeCompanyInfo.logoUrl) {
      const image = document.createElement("img");
      image.src = activeCompanyInfo.logoUrl;
      image.alt = `Logo ${activeCompanyInfo.name || activeCompanyInfo.websiteTitle}`;
      image.className = "h-full w-full object-contain p-1.5";
      logo.appendChild(image);
    } else {
      logo.textContent = "▣";
      logo.classList.add("text-lg", "font-extrabold");
    }
    const title = labels.children[0] as HTMLElement | undefined;
    const subtitle = labels.children[1] as HTMLElement | undefined;
    if (title) { title.textContent = activeCompanyInfo.websiteTitle || "AssetMaster"; title.title = activeCompanyInfo.websiteTitle || "AssetMaster"; }
    if (subtitle) { subtitle.textContent = activeCompanyInfo.name || "Cổng nhân viên"; subtitle.title = activeCompanyInfo.name || "Cổng nhân viên"; }
  });

  useEffect(() => {
    document.getElementById("assetmaster-return-decision-notice")?.remove();
    if (notificationPreferencesQuery.data?.returnRequestEnabled === false || !latestResolvedReturn?.returnRequestResolvedAt) return;
    const resolvedAt = new Date(latestResolvedReturn.returnRequestResolvedAt).getTime();
    if (Number.isNaN(resolvedAt) || Date.now() - resolvedAt > 7 * 24 * 60 * 60 * 1000) return;
    const decision = latestResolvedReturn.returnRequestStatus === "approved" ? "approved" : "rejected";
    const decisionNotification = getReturnDecisionNotification(decision, latestResolvedReturn.assetName);
    const decisionKey = `${latestResolvedReturn.id}-${decision}-${resolvedAt}`;
    if (lastReturnDecisionKey.current !== decisionKey) {
      if (decisionNotification.tone === "success") toast.success(decisionNotification.title, { description: `${decisionNotification.description} Cập nhật lúc ${new Date(resolvedAt).toLocaleString("vi-VN")}.` });
      else toast.error(decisionNotification.title, { description: `${decisionNotification.description} Cập nhật lúc ${new Date(resolvedAt).toLocaleString("vi-VN")}.` });
      lastReturnDecisionKey.current = decisionKey;
    }
    const content = document.querySelector("main > div");
    if (!content) return;
    const approved = decision === "approved";
    const notice = document.createElement("aside");
    notice.id = "assetmaster-return-decision-notice";
    notice.className = `mb-5 flex items-start gap-3 rounded-xl border p-4 shadow-[0_8px_24px_rgba(16,42,67,.05)] ${approved ? "border-[#B8E9DD] bg-[#ECF8F7]" : "border-[#F2B7B7] bg-[#FDEDEE]"}`;
    const icon = document.createElement("div");
    icon.className = `grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-extrabold ${approved ? "bg-white text-[#087A6A]" : "bg-white text-[#B44545]"}`;
    icon.textContent = approved ? "✓" : "!";
    const copy = document.createElement("div");
    const title = document.createElement("div");
    title.className = approved ? "text-sm font-extrabold text-[#087A6A]" : "text-sm font-extrabold text-[#B44545]";
    title.textContent = decisionNotification.title;
    const detail = document.createElement("p");
    detail.className = "mt-1 text-xs leading-5 text-[#60758A]";
    detail.textContent = `${decisionNotification.description} Cập nhật lúc ${new Date(resolvedAt).toLocaleString("vi-VN")}. Xem chi tiết trong tài sản đang giữ hoặc Lịch sử hoàn trả.`;
    const actions = document.createElement("div");
    actions.className = "mt-3";
    const seenButton = document.createElement("button");
    seenButton.type = "button";
    seenButton.className = approved ? "rounded-md border border-[#9DDACF] bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#087A6A] hover:bg-[#F7FFFD]" : "rounded-md border border-[#F0B6B6] bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#B44545] hover:bg-[#FFF8F8]";
    seenButton.textContent = "Đã xem";
    seenButton.onclick = () => markReturnResultSeen.mutate({ id: latestResolvedReturn.id });
    actions.appendChild(seenButton);
    copy.append(title, detail, actions);
    notice.append(icon, copy);
    content.prepend(notice);
    return () => notice.remove();
  }, [latestResolvedReturn?.id, latestResolvedReturn?.returnRequestStatus, latestResolvedReturn?.returnRequestResolvedAt, latestResolvedReturn?.assetName, notificationPreferencesQuery.data?.returnRequestEnabled, markReturnResultSeen]);

  useEffect(() => {
    document.getElementById("assetmaster-return-follow-up")?.remove();
    const pendingFollowUps = rejectedReturns.filter((item) => !item.returnFollowUpAt);
    if (!pendingFollowUps.length) return;
    const content = document.querySelector("main > div");
    if (!content) return;
    const section = document.createElement("section");
    section.id = "assetmaster-return-follow-up";
    section.className = "mb-5 rounded-xl border border-[#F2B7B7] bg-[#FFF8F8] p-4 shadow-[0_8px_24px_rgba(16,42,67,.05)]";
    const heading = document.createElement("div");
    heading.className = "text-sm font-extrabold text-[#B44545]";
    heading.textContent = "Yêu cầu hoàn trả cần giải trình";
    const description = document.createElement("p");
    description.className = "mt-1 text-xs leading-5 text-[#71869A]";
    description.textContent = "Bổ sung thông tin để quản trị viên xem xét lại yêu cầu hoàn trả bị từ chối.";
    section.append(heading, description);
    pendingFollowUps.forEach((item) => {
      const card = document.createElement("div");
      card.className = "mt-3 rounded-lg border border-[#F5D1D1] bg-white p-3";
      card.innerHTML = `<div class="text-xs font-extrabold text-[#193B57]">${item.assetName}</div><div class="mt-1 text-[11px] text-[#71869A]">Phản hồi quản trị viên: ${item.returnRequestResolution || "Chưa có ghi chú"}</div>`;
      const input = document.createElement("textarea");
      input.className = "field-input mt-3 min-h-[76px] resize-y";
      input.maxLength = 1000;
      input.placeholder = "Nhập phản hồi hoặc giải trình của bạn...";
      const submit = document.createElement("button");
      submit.type = "button";
      submit.className = "mt-2 rounded-lg bg-[#B44545] px-3 py-2 text-[11px] font-extrabold text-white hover:bg-[#933737]";
      submit.textContent = "Gửi giải trình";
      submit.onclick = () => {
        const note = input.value.trim();
        if (note.length < 3) { toast.error("Vui lòng nhập giải trình tối thiểu 3 ký tự."); return; }
        submitReturnFollowUp.mutate({ id: item.id, note });
      };
      card.append(input, submit);
      section.appendChild(card);
    });
    content.prepend(section);
    return () => section.remove();
  }, [rejectedReturns, submitReturnFollowUp]);

  const scrollToSection = (sectionId: string) => {
    window.requestAnimationFrame(() =>
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };
  const openSupplyRequestFromNotification = (requestId: number) => {
    sessionStorage.setItem(
      "assetmaster-open-employee-supply-request-id",
      String(requestId)
    );
    setSupplyRequestOpen(true);
    window.setTimeout(
      () => scrollToSection("employee-supply-request-panel"),
      0
    );
  };

  return <main className="min-h-screen bg-[#F4F7FB] text-[#102A43]"><header className="border-b border-[#DFE9F0] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0F8C8C] text-white shadow-[0_7px_16px_rgba(15,140,140,.22)]"><Box size={20} /></div><div><div className="font-display text-lg font-extrabold tracking-[-.04em] text-[#102A43]">Asset<span className="text-[#0F8C8C]">Master</span></div><div className="text-[10px] font-bold uppercase tracking-[.13em] text-[#8AA0B6]">Cổng nhân viên</div></div></div><div className="flex flex-wrap items-center justify-end gap-2"><EmployeeNotificationBell key={user.email || user.name || "current-user"} userKey={user.email || user.name || "current-user"} onOpenActiveAssets={() => scrollToSection("employee-active-assets")} onOpenReturnedAssets={() => scrollToSection("employee-returned-assets")} onOpenSupplyRequest={openSupplyRequestFromNotification} /><button onClick={() => setHelpOpen(true)} className="flex items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7]"><CircleHelp size={15} />Hướng dẫn sử dụng</button><button type="button" aria-expanded={supplyRequestOpen} aria-controls="employee-supply-request-panel" onClick={() => setSupplyRequestOpen(value => !value)} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-3 py-2 text-xs font-bold text-white shadow-[0_6px_14px_rgba(15,140,140,.2)] transition hover:bg-[#087A6A]"><PackagePlus size={15} />{supplyRequestOpen ? "Đóng yêu cầu" : "Yêu cầu phụ kiện"}</button><button onClick={() => { void onLogout(); }} className="flex items-center gap-2 rounded-lg border border-[#DDE7F0] px-3 py-2 text-xs font-bold text-[#60758A] transition hover:bg-[#F7FAFC]"><LogOut size={15} />Đăng xuất</button></div></div></header><div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">{supplyRequestOpen ? <div id="employee-supply-request-panel"><EmployeeSupplyRequests /></div> : null}<div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl bg-[#102A43] p-6 text-white shadow-[0_18px_42px_rgba(16,42,67,.16)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.15em] text-[#5ED3C8]"><ShieldCheck size={14} />Tài khoản nhân viên</div><h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">Chào, {user.name || "bạn"}</h1><p className="mt-3 max-w-lg text-sm leading-6 text-[#B5C8D5]">Theo dõi thiết bị đang được cấp phát, tiến độ yêu cầu hoàn trả và lịch sử bàn giao của bạn.</p></div><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#DCEFEF] text-sm font-extrabold text-[#087A6A]">{initials || "AM"}</div></div><div className="mt-8 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#BDF1E8]">Tài khoản đang hoạt động</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#DCEAF5]">Nhân viên</span></div></section><section className="rounded-2xl border border-[#DFE9F0] bg-white p-6 shadow-[0_8px_24px_rgba(16,42,67,.045)]"><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><CircleUserRound size={17} className="text-[#2666A8]" />Thông tin của bạn</div><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9BAEC0]">Họ và tên</dt><dd className="mt-1 font-bold text-[#193B57]">{user.name || "Chưa cập nhật"}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9BAEC0]">Email</dt><dd className="mt-1 break-all font-semibold text-[#60758A]">{user.email || "Chưa cập nhật"}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9BAEC0]">Lần đăng nhập gần nhất</dt><dd className="mt-1 font-semibold text-[#60758A]">{signedInAt}</dd></div></dl></section></div><section id="employee-active-assets" className="mt-6 scroll-mt-6 overflow-hidden rounded-2xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,.045)]"><div className="flex flex-col justify-between gap-4 border-b border-[#E7EEF3] px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div><div className="flex items-center gap-2 text-base font-extrabold text-[#193B57]"><PackageCheck size={18} className="text-[#0F8C8C]" />Tài sản bạn đang giữ</div><p className="mt-1 text-xs text-[#71869A]">Mỗi tài sản hiển thị rõ ngày nhận, hạn dự kiến và trạng thái yêu cầu hoàn trả.</p></div><div className="rounded-xl bg-[#E6F6F2] px-3 py-2 text-center"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#4B8884]">Đang giữ</div><div className="mt-0.5 font-display text-xl font-extrabold text-[#087A6A]">{activeAssets.length}</div></div></div>{historyQuery.isLoading ? <div className="px-6 py-14 text-center text-sm text-[#71869A]">Đang tải tài sản được cấp phát...</div> : historyQuery.isError ? <div className="px-6 py-14 text-center"><div className="text-sm font-bold text-[#B44545]">Không thể tải tài sản của bạn.</div><button onClick={() => void historyQuery.refetch()} className="mt-3 rounded-lg border border-[#F2B7B7] px-3 py-2 text-xs font-bold text-[#B44545] hover:bg-[#FDEDEE]">Thử lại</button></div> : activeAssets.length ? <div className="divide-y divide-[#EDF2F5]">{activeAssets.map((item) => <article key={item.id} className="flex flex-col gap-4 px-5 py-5 sm:px-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E6F6F2] text-[#0F8C8C]"><Box size={18} /></div><div className="min-w-0"><div className="truncate text-sm font-extrabold text-[#193B57]">{item.assetName}</div><div className="mt-1 font-mono text-[11px] font-bold text-[#0F8C8C]">{item.assetCode} · {item.referenceCode}</div></div></div><span className="self-start rounded-full bg-[#E6F6F2] px-2.5 py-1.5 text-[10px] font-extrabold text-[#087A6A] sm:self-auto">{handoverStatus[item.status]}</span></div><div className="grid gap-3 rounded-xl bg-[#F7FAFC] p-3 text-xs text-[#60758A] sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div className="flex items-center gap-1.5"><CalendarDays size={14} className="text-[#0F8C8C]" /><span>Ngày nhận: <b className="text-[#193B57]">{formatDate(item.handedOverAt)}</b></span></div><div className="flex items-center gap-1.5"><Clock3 size={14} className="text-[#A86B00]" /><span>Hạn dự kiến: <b className="text-[#193B57]">{item.dueBackAt ? formatDate(item.dueBackAt) : "Chưa thiết lập"}</b></span></div>{item.returnRequestStatus === "pending" ? <ReturnRequestStatus status="pending" resolution={item.returnRequestResolution} /> : <button onClick={() => setReturnTarget({ id: item.id, assetName: item.assetName, assetCode: item.assetCode })} className="flex items-center justify-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-[11px] font-extrabold text-[#087A6A] transition hover:bg-[#ECF8F7]"><RotateCcw size={14} />Yêu cầu hoàn trả</button>}</div>{item.returnRequestStatus === "rejected" ? <div className="mt-1"><ReturnRequestStatus status="rejected" resolution={item.returnRequestResolution} /></div> : null}</article>)}</div> : <div className="px-6 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><PackageCheck size={20} /></div><div className="mt-4 text-sm font-extrabold text-[#193B57]">Bạn chưa được cấp phát tài sản nào</div><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#71869A]">Khi có thiết bị được bàn giao, thông tin sẽ xuất hiện tại đây.</p></div>}</section><UserSupplyHistorySection history={supplyHistory} isLoading={supplyHistoryQuery.isLoading} isError={supplyHistoryQuery.isError} onRetry={() => void supplyHistoryQuery.refetch()} /><section id="employee-returned-assets" className="mt-6 scroll-mt-6 overflow-hidden rounded-2xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,.045)]"><div className="flex items-center justify-between gap-4 border-b border-[#E7EEF3] px-5 py-5 sm:px-6"><div><div className="flex items-center gap-2 text-base font-extrabold text-[#193B57]"><History size={18} className="text-[#2666A8]" />Lịch sử hoàn trả</div><p className="mt-1 text-xs text-[#71869A]">Các thiết bị đã được quản trị viên xác nhận hoàn trả thành công.</p></div><div className="rounded-xl bg-[#EAF3FF] px-3 py-2 text-center"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#4A79A9]">Đã trả</div><div className="mt-0.5 font-display text-xl font-extrabold text-[#2666A8]">{returnedAssets.length}</div></div></div>{historyQuery.isLoading ? <div className="px-6 py-10 text-center text-sm text-[#71869A]">Đang tải lịch sử hoàn trả...</div> : returnedAssets.length ? <div className="divide-y divide-[#EDF2F5]">{returnedAssets.map((item) => <article key={item.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EAF3FF] text-[#2666A8]"><CheckCircle2 size={18} /></div><div className="min-w-0"><div className="truncate text-sm font-extrabold text-[#193B57]">{item.assetName}</div><div className="mt-1 font-mono text-[11px] font-bold text-[#2666A8]">{item.assetCode} · {item.referenceCode}</div><div className="mt-2 text-xs text-[#71869A]">Ngày trả: <b className="text-[#193B57]">{formatDate(item.returnedAt)}</b> · Tình trạng ghi nhận: <b className="text-[#193B57]">{item.conditionIn || "Chưa cập nhật"}</b></div></div></div><div className="self-start sm:self-auto"><ReturnRequestStatus status={item.returnRequestStatus === "approved" ? "approved" : "none"} resolution={item.returnRequestResolution} /></div></article>)}</div> : <div className="px-6 py-12 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><History size={19} /></div><div className="mt-3 text-sm font-extrabold text-[#193B57]">Chưa có tài sản hoàn trả</div><p className="mt-1 text-xs text-[#71869A]">Lịch sử sẽ xuất hiện sau khi quản trị viên duyệt hoàn trả.</p></div>}</section></div>{returnTarget ? <ReturnRequestDialog asset={returnTarget} pending={requestReturn.isPending} onClose={() => setReturnTarget(null)} onSubmit={(note) => requestReturn.mutate({ id: returnTarget.id, note: note || null })} /> : null}<UserHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} /></main>;
}

function UserSupplyHistorySection({ history, isLoading, isError, onRetry }: { history: Array<any>; isLoading: boolean; isError: boolean; onRetry: () => void }) {
  const grouped = new Map<string, any>();
  history.forEach((entry) => {
    const outstanding = Math.max(0, Number(entry.issuedQuantity || 0) - Number(entry.returnedQuantity || 0));
    if (!outstanding) return;
    const key = `${entry.source || "issue-slip"}-${entry.issueSlipId}`;
    const group = grouped.get(key) || { ...entry, key, items: [] };
    group.items.push({ ...entry, outstanding });
    grouped.set(key, group);
  });
  const slips = Array.from(grouped.values());
  return <section className="mt-6 overflow-hidden rounded-2xl border border-[#CDE5E5] bg-white shadow-[0_8px_24px_rgba(16,42,67,.045)]"><div className="flex flex-col justify-between gap-4 border-b border-[#DCEDEA] px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div><div className="flex items-center gap-2 text-base font-extrabold text-[#193B57]"><PackageCheck size={18} className="text-[#0F8C8C]" />Phụ kiện đã cấp cho bạn</div><p className="mt-1 text-xs text-[#71869A]">Các phụ kiện bạn đang giữ từ phiếu cấp phát hoặc biên bản bàn giao.</p></div><div className="rounded-xl bg-[#E6F6F2] px-3 py-2 text-center"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#4B8884]">Đang giữ</div><div className="mt-0.5 font-display text-xl font-extrabold text-[#087A6A]">{slips.reduce((total, slip) => total + slip.items.length, 0)}</div></div></div>{isLoading ? <div className="px-6 py-12 text-center text-sm text-[#71869A]">Đang tải phụ kiện được cấp...</div> : isError ? <div className="px-6 py-12 text-center"><div className="text-sm font-bold text-[#B44545]">Không thể tải phụ kiện đã cấp.</div><button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-[#F2B7B7] px-3 py-2 text-xs font-bold text-[#B44545] hover:bg-[#FDEDEE]">Thử lại</button></div> : slips.length ? <div className="divide-y divide-[#EDF2F5]">{slips.map((slip) => <article key={slip.key} className="px-5 py-5 sm:px-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-extrabold text-[#193B57]">{slip.referenceCode}</div><div className="mt-1 text-[11px] text-[#71869A]">{slip.source === "handover" ? "Bàn giao ngày" : "Cấp phát ngày"} {formatDate(slip.issuedAt)}</div></div><span className="w-fit rounded-full bg-[#E6F6F2] px-2.5 py-1.5 text-[10px] font-extrabold text-[#087A6A]">Đang giữ</span></div><div className="mt-3 space-y-2">{slip.items.map((item: any) => <div key={`${slip.key}-${item.supplyCode}`} className="flex items-start justify-between gap-4 rounded-xl bg-[#F7FAFC] p-3 text-xs"><div className="min-w-0"><div className="font-extrabold text-[#193B57]">{item.supplyName}</div><div className="mt-1 font-mono text-[10px] font-bold text-[#0F8C8C]">{item.supplyCode}</div></div><div className="shrink-0 text-right text-[#60758A]">Còn <b className="text-[#087A6A]">{item.outstanding}</b> {item.unit}<div className="mt-1 text-[10px] text-[#8AA0B6]">Đã cấp {item.issuedQuantity} · Đã trả {item.returnedQuantity}</div></div></div>)}</div></article>)}</div> : <div className="px-6 py-12 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><PackageCheck size={19} /></div><div className="mt-3 text-sm font-extrabold text-[#193B57]">Bạn chưa được cấp phụ kiện nào</div><p className="mt-1 text-xs text-[#71869A]">Khi có phụ kiện được cấp hoặc bàn giao, thông tin sẽ xuất hiện tại đây.</p></div>}</section>;
}

function ReturnRequestDialog({ asset, pending, onClose, onSubmit }: { asset: { assetName: string; assetCode: string }; pending: boolean; onClose: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState("");
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102A43]/45 px-4 py-6 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-[#DDE7F0] bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Yêu cầu hoàn trả</div><h2 className="mt-2 font-display text-xl font-extrabold text-[#102A43]">Gửi yêu cầu cho quản trị viên</h2></div><button onClick={onClose} disabled={pending} className="rounded-lg p-2 text-[#71869A] hover:bg-[#F0F5F8]"><X size={17} /></button></div><div className="mt-5 rounded-xl bg-[#F4FBFA] p-3 text-sm"><div className="font-bold text-[#193B57]">{asset.assetName}</div><div className="mt-1 font-mono text-[11px] font-bold text-[#087A6A]">{asset.assetCode}</div></div><label className="mt-5 block text-xs font-bold text-[#60758A]">Ghi chú cho quản trị viên <span className="font-normal text-[#9BAEC0]">(không bắt buộc)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: Tôi có thể bàn giao lại thiết bị vào chiều thứ Sáu." className="field-input mt-2 min-h-[100px] resize-y" maxLength={1000} /></label><div className="mt-5 flex justify-end gap-2"><button onClick={onClose} disabled={pending} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Hủy</button><button onClick={() => onSubmit(note.trim())} disabled={pending} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:opacity-50"><Send size={14} />{pending ? "Đang gửi..." : "Gửi yêu cầu"}</button></div></div></div>;
}
