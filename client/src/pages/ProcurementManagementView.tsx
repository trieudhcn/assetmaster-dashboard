import { useEffect, useState } from "react";
import { FileText, ReceiptText, Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PurchaseContractManagementView } from "./PurchaseContractManagementView";
import { PurchaseInvoiceManagementView } from "./PurchaseInvoiceManagementView";

type ProcurementSection = "contracts" | "invoices";

function sectionFromUrl(): ProcurementSection {
  return new URLSearchParams(window.location.search).get("view") === "invoices" ? "invoices" : "contracts";
}

export function ProcurementManagementView() {
  const [section, setSection] = useState<ProcurementSection>(sectionFromUrl);
  const [sharedQuery, setSharedQuery] = useState("");
  const contractsQuery = trpc.purchaseContracts.list.useQuery();
  const invoicesQuery = trpc.purchaseInvoices.list.useQuery();
  useEffect(() => {
    const syncSection = () => setSection(sectionFromUrl());
    window.addEventListener("popstate", syncSection);
    return () => window.removeEventListener("popstate", syncSection);
  }, []);
  const selectSection = (next: ProcurementSection) => {
    setSection(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState({}, "", url);
  };
  const counts = { contracts: contractsQuery.data?.length || 0, invoices: invoicesQuery.data?.length || 0 };
  const placeholder = section === "contracts" ? "Tìm số, tên Hợp đồng hoặc Nhà cung cấp..." : "Tìm số, ký hiệu Hóa đơn hoặc Nhà cung cấp...";
  return <><div className="border-b border-[#DDE7F0] bg-white px-4 py-3 shadow-[0_3px_12px_rgba(16,42,67,0.035)] sm:px-6 lg:px-9"><div className="mx-auto flex max-w-[1500px] flex-col gap-2 lg:flex-row lg:items-center"><div className="flex min-w-0 items-center gap-2 overflow-x-auto"><span className="mr-1 shrink-0 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7890A5]">Hợp đồng & Hóa đơn</span><button type="button" onClick={() => selectSection("contracts")} aria-pressed={section === "contracts"} className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[11px] font-extrabold transition ${section === "contracts" ? "bg-[#E6F6F2] text-[#087A6A] shadow-[inset_0_0_0_1px_#8BCDC6]" : "text-[#60758A] hover:bg-[#F5F8FA]"}`}><FileText size={15} />Hợp đồng <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px]">{counts.contracts}</span></button><button type="button" onClick={() => selectSection("invoices")} aria-pressed={section === "invoices"} className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[11px] font-extrabold transition ${section === "invoices" ? "bg-[#EAF3FF] text-[#2666A8] shadow-[inset_0_0_0_1px_#B8D6F5]" : "text-[#60758A] hover:bg-[#F5F8FA]"}`}><ReceiptText size={15} />Hóa đơn <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px]">{counts.invoices}</span></button></div><div className="relative min-w-0 flex-1 lg:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA0B6]" size={15} /><input value={sharedQuery} onChange={(event) => setSharedQuery(event.target.value)} className="field-input h-9 !min-h-9 !py-2 !pl-9 pr-9 text-[11px]" placeholder={placeholder} aria-label="Tìm kiếm chung Hợp đồng và Hóa đơn" />{sharedQuery && <button type="button" onClick={() => setSharedQuery("")} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-[#71869A] transition hover:bg-[#EEF5F7] hover:text-[#193B57]" aria-label="Xóa tìm kiếm chung"><X size={14} /></button>}</div></div></div>{section === "contracts" ? <PurchaseContractManagementView sharedQuery={sharedQuery} /> : <PurchaseInvoiceManagementView sharedQuery={sharedQuery} />}</>;
}
