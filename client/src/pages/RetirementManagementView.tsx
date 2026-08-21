import { useEffect, useMemo, useState } from "react";
import { ArchiveRestore, Download, FileBarChart as FileBarChart3, FileText, Landmark } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatVnd } from "@/lib/formatters";
import { writeBrandedWorkbook } from "@/lib/brandedWorkbook";
import { openRetirementPdf } from "@/lib/retirementPdf";
import { SearchableSelect } from "@/components/SearchableSelect";
import { RetirementCertificateManager } from "@/components/RetirementCertificateManager";

type ExportAction = "excel" | "pdf" | null;

export function RetirementManagementView() {
  const [year, setYear] = useState("all");
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<number>>(() => new Set());
  const [exporting, setExporting] = useState<ExportAction>(null);
  const assetsQuery = trpc.assets.list.useQuery();
  const certificatesQuery = trpc.retirementCertificates.list.useQuery();
  const companyQuery = trpc.company.get.useQuery();
  const assets = assetsQuery.data || [];
  const certificates = certificatesQuery.data || [];
  const retiredAssets = useMemo(() => assets.filter((asset) => {
    if (asset.status !== "retired") return false;
    if (year === "all") return true;
    return Boolean(asset.retiredAt && String(new Date(asset.retiredAt).getFullYear()) === year);
  }), [assets, year]);
  const yearOptions = useMemo(() => [...new Set(assets.filter((asset) => asset.status === "retired" && asset.retiredAt).map((asset) => new Date(asset.retiredAt!).getFullYear()).filter(Number.isFinite))].sort((left, right) => right - left), [assets]);
  const certificateGroups = useMemo(() => {
    const groups = new Map<string, { key: string; referenceCode: string; retiredAt: Date | string | number | null; assets: typeof retiredAssets }>();
    retiredAssets.forEach((asset) => {
      const key = asset.retirementCertificateNumber || `asset-${asset.id}`;
      const current = groups.get(key) || { key, referenceCode: asset.retirementCertificateNumber || "Chưa cấp số", retiredAt: asset.retiredAt || null, assets: [] };
      current.assets.push(asset);
      if (!current.retiredAt && asset.retiredAt) current.retiredAt = asset.retiredAt;
      groups.set(key, current);
    });
    return [...groups.values()].sort((left, right) => right.referenceCode.localeCompare(left.referenceCode));
  }, [retiredAssets]);
  const totalPurchaseValue = retiredAssets.reduce((total, asset) => total + Number(asset.purchaseValue || 0), 0);
  const salvageValueByAssetId = useMemo(() => {
    const values = new Map<number, number>();
    certificates.filter((certificate) => certificate.status !== "draft").forEach((certificate) => certificate.items.forEach((item) => values.set(item.assetId, Number(item.salvageValue || 0))));
    return values;
  }, [certificates]);
  const totalSalvageValue = retiredAssets.reduce((total, asset) => total + (salvageValueByAssetId.get(asset.id) || 0), 0);
  const selectedAssets = retiredAssets.filter((asset) => selectedAssetIds.has(asset.id));
  const allSelected = retiredAssets.length > 0 && selectedAssets.length === retiredAssets.length;
  const certificatesByStatus = useMemo(() => ({
    draft: certificates.filter((certificate) => certificate.status === "draft").length,
    signed: certificates.filter((certificate) => certificate.status === "awaiting_signed_copy").length,
    closed: certificates.filter((certificate) => certificate.status === "closed").length,
  }), [certificates]);
  const yearlySummary = useMemo(() => {
    const totals = new Map<string, { year: string; assetCount: number; salvageValue: number; certificateCount: number }>();
    certificateGroups.forEach((group) => {
      const yearLabel = group.retiredAt ? String(new Date(group.retiredAt).getFullYear()) : "Chưa ghi nhận";
      const current = totals.get(yearLabel) || { year: yearLabel, assetCount: 0, salvageValue: 0, certificateCount: 0 };
      current.assetCount += group.assets.length;
      current.salvageValue += group.assets.reduce((total, asset) => total + (salvageValueByAssetId.get(asset.id) || 0), 0);
      current.certificateCount += 1;
      totals.set(yearLabel, current);
    });
    return [...totals.values()].sort((left, right) => right.year.localeCompare(left.year));
  }, [certificateGroups, salvageValueByAssetId]);

  useEffect(() => {
    const eligibleIds = new Set(retiredAssets.map((asset) => asset.id));
    setSelectedAssetIds((current) => new Set([...current].filter((id) => eligibleIds.has(id))));
  }, [retiredAssets]);

  const toggleGroup = (assetIds: number[]) => {
    setSelectedAssetIds((current) => {
      const next = new Set(current);
      const groupIsSelected = assetIds.every((id) => next.has(id));
      assetIds.forEach((id) => groupIsSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const exportExcel = () => {
    if (!certificateGroups.length || exporting) return;
    setExporting("excel");
    const loadingToast = toast.loading("Đang tạo danh sách biên bản thanh lý...");
    window.setTimeout(() => { void (async () => {
      try {
        const rows = certificateGroups.map((group) => ({
          "Số biên bản thanh lý": group.referenceCode,
          "Số tài sản": group.assets.length,
          "Mã tài sản": group.assets.map((asset) => asset.assetCode).join("\n"),
          "Tên tài sản": group.assets.map((asset) => asset.name).join("\n"),
          "Ngày thanh lý": group.retiredAt ? new Date(group.retiredAt).toLocaleDateString("vi-VN") : "",
          "Lý do thanh lý": [...new Set(group.assets.map((asset) => asset.retirementReason || "").filter(Boolean))].join("\n"),
          "Tổng nguyên giá (VNĐ)": group.assets.reduce((total, asset) => total + Number(asset.purchaseValue || 0), 0),
          "Serial/IMEI": group.assets.map((asset) => asset.serialNumber || "—").join("\n"),
          "Chứng từ đính kèm": [...new Set(group.assets.map((asset) => asset.retirementAttachmentName || "Không đính kèm"))].join("\n"),
          "Ghi chú": group.assets.map((asset) => asset.note || "").filter(Boolean).join("\n"),
        }));
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(rows);
        sheet["!cols"] = [{ wch: 23 }, { wch: 12 }, { wch: 18 }, { wch: 38 }, { wch: 16 }, { wch: 42 }, { wch: 22 }, { wch: 22 }, { wch: 30 }, { wch: 32 }];
        XLSX.utils.book_append_sheet(workbook, sheet, "Biên bản thanh lý");
        await writeBrandedWorkbook(workbook, {
          documentTitle: "DANH SÁCH BIÊN BẢN KHẤU HAO / THANH LÝ",
          fileName: `assetmaster-danh-sach-thanh-ly-${year === "all" ? "tat-ca-nam" : year}.xlsx`,
          description: `Danh sách ${rows.length} biên bản thanh lý, gồm đầy đủ tài sản, ngày/lý do thanh lý và chứng từ đính kèm theo năm đã chọn.`,
        });
        toast.success(`Đã xuất ${rows.length} biên bản thanh lý.`, { id: loadingToast });
      } catch (error) {
        console.error(error);
        toast.error("Không thể xuất danh sách biên bản thanh lý.", { id: loadingToast });
      } finally {
        setExporting(null);
      }
    })(); }, 180);
  };

  const previewCombinedPdf = async () => {
    if (!selectedAssets.length || exporting) return;
    setExporting("pdf");
    const loadingToast = toast.loading("Đang tạo PDF gộp biên bản thanh lý...");
    try {
      await openRetirementPdf(selectedAssets.map((asset) => ({
        code: asset.assetCode,
        name: asset.name,
        purchaseDate: asset.purchaseDate,
        value: asset.purchaseValue,
        serial: asset.serialNumber,
        retiredAt: asset.retiredAt,
        retirementReason: asset.retirementReason,
        retirementCertificateNumber: asset.retirementCertificateNumber,
        retirementAttachmentName: asset.retirementAttachmentName,
        note: asset.note,
      })), companyQuery.data || {}, `assetmaster-bien-ban-thanh-ly-${year === "all" ? "tong-hop" : year}.pdf`, `Biên bản thanh lý gộp (${selectedAssets.length} tài sản)`);
      toast.success(`Đã mở PDF gộp ${selectedAssets.length} tài sản.`, { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error("Không thể tạo PDF gộp biên bản thanh lý.", { id: loadingToast });
    } finally {
      setExporting(null);
    }
  };

  return <main className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]">
    <header className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#A86B00]"><span className="h-1.5 w-1.5 rounded-full bg-[#E59B24]" />Vòng đời kết thúc</div><h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">Khấu hao/Thanh lý</h1><p className="mt-1 text-sm text-[#71869A]">Lập biên bản, cập nhật giá trị thu hồi, lưu chứng từ ký tay và theo dõi báo cáo thanh lý tập trung.</p></div><div className="grid grid-cols-3 gap-2"><StatusMetric label="Nháp" value={certificatesByStatus.draft} tone="amber" /><StatusMetric label="Đã ký" value={certificatesByStatus.signed} tone="blue" /><StatusMetric label="Đã đóng" value={certificatesByStatus.closed} tone="teal" /></div></header>

    <section className="rounded-xl border border-[#E7D9B9] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,0.045)] sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-extrabold text-[#8F5A00]"><Landmark size={17} />Tổng quan thanh lý</div><p className="mt-1 text-xs text-[#71869A]">Theo dõi nguyên giá và giá trị thanh lý đã ghi nhận theo năm.</p></div><div className="w-full sm:w-52"><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[.1em] text-[#8A7140]">Năm thanh lý</label><SearchableSelect value={year} onChange={setYear} options={[{ value: "all", label: "Tất cả năm" }, ...yearOptions.map((item) => ({ value: String(item), label: `Năm ${item}` }))]} placeholder="Tất cả năm" searchPlaceholder="Tìm năm thanh lý..." /></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><OverviewMetric label="Biên bản trong phạm vi" value={certificateGroups.length} icon={FileText} tone="amber" /><OverviewMetric label="Tài sản đã thanh lý" value={retiredAssets.length} icon={ArchiveRestore} tone="blue" /><OverviewMetric label="Tổng nguyên giá" value={`${formatVnd(totalPurchaseValue)} VNĐ`} icon={Landmark} tone="navy" /><OverviewMetric label="Tổng giá trị thanh lý" value={`${formatVnd(totalSalvageValue)} VNĐ`} icon={Landmark} tone="teal" /></div>{yearlySummary.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{yearlySummary.map((item) => <div key={item.year} className="rounded-lg border border-[#F0DFC0] bg-[#FFFDF7] px-3 py-2.5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#A86B00]">Năm {item.year}</span><span className="text-[10px] font-bold text-[#8A7140]">{item.certificateCount} biên bản</span></div><div className="mt-1.5 text-sm font-extrabold text-[#193B57]">{formatVnd(item.salvageValue)} VNĐ</div><div className="mt-1 text-[10px] text-[#71869A]">Giá trị thanh lý đã ghi nhận · {item.assetCount} tài sản</div></div>)}</div>}</section>

    <section className="mt-5 rounded-xl border border-[#E7D9B9] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,0.045)] sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-extrabold text-[#8F5A00]"><Download size={16} />Báo cáo & xuất dữ liệu thanh lý</div><p className="mt-1 max-w-3xl text-xs text-[#71869A]">Mỗi mã TL được gộp thành một dòng. Chọn một biên bản để chọn toàn bộ tài sản thuộc biên bản đó và mở PDF gộp.</p></div><div className="rounded-lg bg-[#FFF7E3] px-3 py-2 text-right"><div className="text-[9px] font-extrabold uppercase tracking-[.08em] text-[#A86B00]">Tổng nguyên giá</div><div className="mt-1 text-sm font-extrabold text-[#8F5A00]">{formatVnd(totalPurchaseValue)} VNĐ</div></div></div><div className="mt-4 rounded-xl border border-[#F0DFC0] bg-[#FFFDF7] p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="inline-flex items-center gap-2 text-xs font-bold text-[#5E470D]"><input type="checkbox" checked={allSelected} disabled={!certificateGroups.length} onChange={() => setSelectedAssetIds(allSelected ? new Set() : new Set(retiredAssets.map((asset) => asset.id)))} className="h-4 w-4 rounded border-[#D6B86E] accent-[#A86B00]" />Chọn tất cả trong phạm vi lọc</label><div className="text-xs text-[#8A7140]">Đã chọn <b className="text-[#8F5A00]">{selectedAssets.length}/{retiredAssets.length} tài sản</b> · {certificateGroups.length} biên bản</div></div>{certificateGroups.length ? <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-[#F0DFC0] bg-white"><table className="w-full min-w-[640px] text-left text-xs"><thead className="sticky top-0 bg-[#FFF7E3] text-[10px] uppercase tracking-[.08em] text-[#8A7140]"><tr><th className="w-12 px-3 py-2.5 text-center">Chọn</th><th className="px-3 py-2.5">Số biên bản</th><th className="px-3 py-2.5">Tài sản trong biên bản</th><th className="px-3 py-2.5">Ngày thanh lý</th></tr></thead><tbody>{certificateGroups.map((group) => { const groupSelected = group.assets.every((asset) => selectedAssetIds.has(asset.id)); return <tr key={group.key} className="border-t border-[#F6EBD4] hover:bg-[#FFFCF5]"><td className="px-3 py-2.5 text-center"><input type="checkbox" checked={groupSelected} onChange={() => toggleGroup(group.assets.map((asset) => asset.id))} className="h-4 w-4 rounded border-[#D6B86E] accent-[#A86B00]" aria-label={`Chọn biên bản ${group.referenceCode}`} /></td><td className="px-3 py-2.5 font-mono font-bold text-[#8F5A00]">{group.referenceCode}</td><td className="px-3 py-2.5"><div className="font-bold text-[#193B57]">{group.assets.length} tài sản</div><div className="mt-0.5 flex flex-wrap gap-1 font-mono text-[10px] text-[#8AA0B6]">{group.assets.slice(0, 4).map((asset) => <span key={asset.id} title={asset.name}>{asset.assetCode}</span>)}{group.assets.length > 4 && <span>+{group.assets.length - 4}</span>}</div></td><td className="px-3 py-2.5 text-[#60758A]">{group.retiredAt ? new Date(group.retiredAt).toLocaleDateString("vi-VN") : "Chưa ghi nhận"}</td></tr>; })}</tbody></table></div> : <p className="mt-3 rounded-lg border border-dashed border-[#E7D9B9] bg-white px-3 py-4 text-center text-xs text-[#8A7140]">Chưa có tài sản Khấu hao/Thanh lý trong năm đã chọn.</p>}<div className="mt-3 flex flex-col justify-end gap-2 border-t border-[#F0DFC0] pt-3 sm:flex-row"><button type="button" onClick={exportExcel} disabled={!certificateGroups.length || exporting !== null} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7D9B9] bg-[#FFF7E3] px-4 py-2.5 text-xs font-bold text-[#8F5A00] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} className={exporting === "excel" ? "animate-pulse" : ""} />{exporting === "excel" ? "Đang xuất Excel..." : `Xuất Excel (${certificateGroups.length} biên bản)`}</button><button type="button" onClick={() => void previewCombinedPdf()} disabled={!selectedAssets.length || exporting !== null} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8F5A00] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#774A00] disabled:cursor-not-allowed disabled:opacity-60"><FileBarChart3 size={15} className={exporting === "pdf" ? "animate-pulse" : ""} />{exporting === "pdf" ? "Đang tạo PDF..." : `Xem trước PDF gộp (${selectedAssets.length} tài sản)`}</button></div></div></section>

    <div className="mt-5"><RetirementCertificateManager /></div>
  </div></main>;
}

function StatusMetric({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "teal" }) {
  const tones = { amber: "border-[#F0DFC0] bg-[#FFF7E3] text-[#8F5A00]", blue: "border-[#D9E8F3] bg-[#F8FCFF] text-[#2666A8]", teal: "border-[#CDE5E5] bg-[#F4FBFA] text-[#087A6A]" };
  return <div className={`rounded-lg border px-3 py-2 text-center ${tones[tone]}`}><div className="text-[9px] font-extrabold uppercase tracking-[.08em]">{label}</div><div className="mt-1 text-lg font-extrabold">{value}</div></div>;
}

function OverviewMetric({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: typeof Landmark; tone: "amber" | "blue" | "navy" | "teal" }) {
  const tones = { amber: "bg-[#FFF7E3] text-[#A86B00]", blue: "bg-[#EAF3FF] text-[#2666A8]", navy: "bg-[#EAF0F7] text-[#193B57]", teal: "bg-[#E6F6F2] text-[#087A6A]" };
  return <div className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] p-3"><div className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}><Icon size={16} /></div><div className="mt-3 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]">{label}</div><div className="mt-1 text-sm font-extrabold text-[#193B57]">{value}</div></div>;
}
