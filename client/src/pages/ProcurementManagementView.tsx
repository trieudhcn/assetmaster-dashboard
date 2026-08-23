import { useEffect, useState } from "react";
import { FileText, ReceiptText } from "lucide-react";
import { PurchaseContractManagementView } from "./PurchaseContractManagementView";
import { PurchaseInvoiceManagementView } from "./PurchaseInvoiceManagementView";

type ProcurementSection = "contracts" | "invoices";

function sectionFromUrl(): ProcurementSection {
  return new URLSearchParams(window.location.search).get("view") === "invoices" ? "invoices" : "contracts";
}

export function ProcurementManagementView() {
  const [section, setSection] = useState<ProcurementSection>(sectionFromUrl);
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
  return <><div className="border-b border-[#DDE7F0] bg-white px-4 pt-4 shadow-[0_3px_12px_rgba(16,42,67,0.035)] sm:px-6 lg:px-9"><div className="mx-auto flex max-w-[1500px] items-center gap-2 overflow-x-auto"><span className="mr-1 shrink-0 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7890A5]">Hợp đồng & Hóa đơn</span><button type="button" onClick={() => selectSection("contracts")} aria-pressed={section === "contracts"} className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[11px] font-extrabold transition ${section === "contracts" ? "bg-[#E6F6F2] text-[#087A6A] shadow-[inset_0_0_0_1px_#8BCDC6]" : "text-[#60758A] hover:bg-[#F5F8FA]"}`}><FileText size={15} />Hợp đồng</button><button type="button" onClick={() => selectSection("invoices")} aria-pressed={section === "invoices"} className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[11px] font-extrabold transition ${section === "invoices" ? "bg-[#EAF3FF] text-[#2666A8] shadow-[inset_0_0_0_1px_#B8D6F5]" : "text-[#60758A] hover:bg-[#F5F8FA]"}`}><ReceiptText size={15} />Hóa đơn</button></div></div>{section === "contracts" ? <PurchaseContractManagementView /> : <PurchaseInvoiceManagementView />}</>;
}
