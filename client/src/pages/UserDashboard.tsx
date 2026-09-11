import { Box, CircleHelp, CircleUserRound, LogOut, PackagePlus, Send, ShieldCheck, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { UserHelpDialog } from "./HelpCenter";
import { EmployeeSupplyRequests } from "@/components/EmployeeSupplyRequests";
import { EmployeeNotificationBell } from "@/components/EmployeeNotificationBell";
import { EmployeeAssetPanel } from "@/components/EmployeeAssetPanel";
import { EmployeeSupplyHoldingsPanel } from "@/components/EmployeeSupplyHoldingsPanel";

type CurrentUser = { name: string | null; email: string | null; role: "user" | "admin"; isActive: boolean; lastSignedIn: Date | string };
type CompanyBrand = { name: string; websiteTitle: string; logoUrl: string; brandColor: string };

export function UserDashboard({ user, onLogout, companyInfo }: { user: CurrentUser; onLogout: () => Promise<void>; companyInfo: CompanyBrand }) {
  const historyQuery = trpc.employees.myAssetHistory.useQuery(undefined, { refetchInterval: 30_000 });
  const supplyHistoryQuery = trpc.employees.mySupplyHistory.useQuery(undefined, { refetchInterval: 30_000 });
  const companyQuery = trpc.company.get.useQuery();
  const [returnTarget, setReturnTarget] = useState<{ id: number; assetName: string; assetCode: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [supplyRequestOpen, setSupplyRequestOpen] = useState(false);
  const [assetTab, setAssetTab] = useState<"holding" | "returned">("holding");
  const utils = trpc.useUtils();
  const requestReturn = trpc.handovers.requestReturn.useMutation({
    onSuccess: () => { void utils.employees.myAssetHistory.invalidate(); setReturnTarget(null); toast.success("Đã gửi yêu cầu hoàn trả cho quản trị viên."); },
    onError: (error) => toast.error(error.message || "Không thể gửi yêu cầu hoàn trả."),
  });
  const submitReturnFollowUp = trpc.handovers.submitReturnFollowUp.useMutation({
    onSuccess: () => { void utils.employees.myAssetHistory.invalidate(); toast.success("Đã gửi giải trình cho quản trị viên."); },
    onError: (error) => toast.error(error.message || "Không thể gửi giải trình."),
  });
  const history = historyQuery.data || [];
  const supplyHistory = supplyHistoryQuery.data || [];
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

  return <main className="min-h-screen bg-[#F4F7FB] text-[#102A43]"><header className="border-b border-[#DFE9F0] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0F8C8C] text-white shadow-[0_7px_16px_rgba(15,140,140,.22)]"><Box size={20} /></div><div><div className="font-display text-lg font-extrabold tracking-[-.04em] text-[#102A43]">Asset<span className="text-[#0F8C8C]">Master</span></div><div className="text-[10px] font-bold uppercase tracking-[.13em] text-[#8AA0B6]">Cổng nhân viên</div></div></div><div className="flex flex-wrap items-center justify-end gap-2"><EmployeeNotificationBell key={user.email || user.name || "current-user"} userKey={user.email || user.name || "current-user"} onOpenActiveAssets={() => { setAssetTab("holding"); window.setTimeout(() => scrollToSection("employee-assets"), 0); }} onOpenReturnedAssets={() => { setAssetTab("returned"); window.setTimeout(() => scrollToSection("employee-assets"), 0); }} onOpenSupplyRequest={openSupplyRequestFromNotification} /><button onClick={() => setHelpOpen(true)} className="flex items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7]"><CircleHelp size={15} />Hướng dẫn sử dụng</button><button type="button" aria-expanded={supplyRequestOpen} aria-controls="employee-supply-request-panel" onClick={() => setSupplyRequestOpen(value => !value)} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-3 py-2 text-xs font-bold text-white shadow-[0_6px_14px_rgba(15,140,140,.2)] transition hover:bg-[#087A6A]"><PackagePlus size={15} />{supplyRequestOpen ? "Đóng yêu cầu" : "Yêu cầu phụ kiện"}</button><button onClick={() => { void onLogout(); }} className="flex items-center gap-2 rounded-lg border border-[#DDE7F0] px-3 py-2 text-xs font-bold text-[#60758A] transition hover:bg-[#F7FAFC]"><LogOut size={15} />Đăng xuất</button></div></div></header><div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">{supplyRequestOpen ? <div id="employee-supply-request-panel"><EmployeeSupplyRequests /></div> : null}<div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl bg-[#102A43] p-6 text-white shadow-[0_18px_42px_rgba(16,42,67,.16)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.15em] text-[#5ED3C8]"><ShieldCheck size={14} />Tài khoản nhân viên</div><h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">Chào, {user.name || "bạn"}</h1><p className="mt-3 max-w-lg text-sm leading-6 text-[#B5C8D5]">Theo dõi thiết bị đang được cấp phát, tiến độ yêu cầu hoàn trả và lịch sử bàn giao của bạn.</p></div><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#DCEFEF] text-sm font-extrabold text-[#087A6A]">{initials || "AM"}</div></div><div className="mt-8 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#BDF1E8]">Tài khoản đang hoạt động</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#DCEAF5]">Nhân viên</span></div></section><section className="rounded-2xl border border-[#DFE9F0] bg-white p-6 shadow-[0_8px_24px_rgba(16,42,67,.045)]"><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><CircleUserRound size={17} className="text-[#2666A8]" />Thông tin của bạn</div><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9BAEC0]">Họ và tên</dt><dd className="mt-1 font-bold text-[#193B57]">{user.name || "Chưa cập nhật"}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9BAEC0]">Email</dt><dd className="mt-1 break-all font-semibold text-[#60758A]">{user.email || "Chưa cập nhật"}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9BAEC0]">Lần đăng nhập gần nhất</dt><dd className="mt-1 font-semibold text-[#60758A]">{signedInAt}</dd></div></dl></section></div><EmployeeAssetPanel history={history} isLoading={historyQuery.isLoading} isError={historyQuery.isError} activeTab={assetTab} onTabChange={setAssetTab} onRetry={() => void historyQuery.refetch()} onRequestReturn={setReturnTarget} /><EmployeeSupplyHoldingsPanel history={supplyHistory} isLoading={supplyHistoryQuery.isLoading} isError={supplyHistoryQuery.isError} onRetry={() => void supplyHistoryQuery.refetch()} /></div>{returnTarget ? <ReturnRequestDialog asset={returnTarget} pending={requestReturn.isPending} onClose={() => setReturnTarget(null)} onSubmit={(note) => requestReturn.mutate({ id: returnTarget.id, note: note || null })} /> : null}<UserHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} /></main>;
}

function ReturnRequestDialog({ asset, pending, onClose, onSubmit }: { asset: { assetName: string; assetCode: string }; pending: boolean; onClose: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState("");
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102A43]/45 px-4 py-6 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-[#DDE7F0] bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Yêu cầu hoàn trả</div><h2 className="mt-2 font-display text-xl font-extrabold text-[#102A43]">Gửi yêu cầu cho quản trị viên</h2></div><button onClick={onClose} disabled={pending} className="rounded-lg p-2 text-[#71869A] hover:bg-[#F0F5F8]"><X size={17} /></button></div><div className="mt-5 rounded-xl bg-[#F4FBFA] p-3 text-sm"><div className="font-bold text-[#193B57]">{asset.assetName}</div><div className="mt-1 font-mono text-[11px] font-bold text-[#087A6A]">{asset.assetCode}</div></div><label className="mt-5 block text-xs font-bold text-[#60758A]">Ghi chú cho quản trị viên <span className="font-normal text-[#9BAEC0]">(không bắt buộc)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: Tôi có thể bàn giao lại thiết bị vào chiều thứ Sáu." className="field-input mt-2 min-h-[100px] resize-y" maxLength={1000} /></label><div className="mt-5 flex justify-end gap-2"><button onClick={onClose} disabled={pending} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Hủy</button><button onClick={() => onSubmit(note.trim())} disabled={pending} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:opacity-50"><Send size={14} />{pending ? "Đang gửi..." : "Gửi yêu cầu"}</button></div></div></div>;
}
