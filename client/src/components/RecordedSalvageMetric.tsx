import { Landmark, Wrench } from "lucide-react";
import { formatVnd } from "@/lib/formatters";

export type RecordedSalvageSummary = {
  yearLabel: string;
  assetCount: number;
  certificateCount: number;
  salvageValue: number;
};

export type RetirementServiceCostSummary = {
  yearLabel: string;
  warrantyCost: number;
  repairCost: number;
};

export function RecordedSalvageMetric({ summary, empty }: { summary: RecordedSalvageSummary; empty: boolean }) {
  return <div className="rounded-lg border border-[#B7D8D4] bg-[#F4FBFA] p-3" data-retirement-recorded-salvage><div className="flex items-start justify-between gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#E6F6F2] text-[#087A6A]"><Landmark size={16} /></div><span className="rounded-full bg-white px-2 py-1 text-[9px] font-extrabold text-[#087A6A]">{empty ? "Không có dữ liệu" : summary.yearLabel}</span></div><div className="mt-3 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#4C7E76]">Giá trị thanh lý đã ghi nhận</div><div className="mt-1 text-sm font-extrabold text-[#087A6A]">{empty ? "—" : `${formatVnd(summary.salvageValue)} VNĐ`}</div><div className="mt-1 text-[10px] text-[#4C7E76]">{empty ? "Chưa có tài sản trong phạm vi năm đang chọn." : `${summary.certificateCount} biên bản · ${summary.assetCount} tài sản`}</div></div>;
}

export function RetirementServiceCostMetric({ summary, empty }: { summary: RetirementServiceCostSummary; empty: boolean }) {
  const totalCost = summary.warrantyCost + summary.repairCost;
  return <div className="rounded-lg border border-[#E7D9B9] bg-[#FFFDF7] p-3" data-retirement-service-cost><div className="flex items-start justify-between gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#FFF2D3] text-[#A86B00]"><Wrench size={16} /></div><span className="rounded-full bg-white px-2 py-1 text-[9px] font-extrabold text-[#A86B00]">{empty ? "Không có dữ liệu" : summary.yearLabel}</span></div><div className="mt-3 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#8A7140]">Tổng chi phí Bảo hành & Sửa chữa</div><div className="mt-1 text-sm font-extrabold text-[#8F5A00]">{empty ? "—" : `${formatVnd(totalCost)} VNĐ`}</div><div className="mt-1 text-[10px] text-[#8A7140]">{empty ? "Chưa có tài sản trong phạm vi năm đang chọn." : totalCost > 0 ? `BH ${formatVnd(summary.warrantyCost)} VNĐ · SC ${formatVnd(summary.repairCost)} VNĐ` : "Chưa phát sinh chi phí trong phạm vi này."}</div></div>;
}
