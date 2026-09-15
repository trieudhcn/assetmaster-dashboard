import { ArrowDown, ArrowRight, CheckCircle2, History, Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";

type GuideReference = { guideKey: string; title: string };
type GuideVersion = {
  id: number;
  guideKey: string;
  title: string;
  description: string;
  steps: unknown;
  changedByName?: string | null;
  createdAt: Date | string;
};
type DiffToken = { value: string; kind: "same" | "added" | "removed" };

const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const tokenize = (value: string) => value.match(/\s+|[^\s]+/g) || [];

function diffTokens(previous: string, current: string): DiffToken[] {
  const before = tokenize(previous);
  const after = tokenize(current);
  const matrix = Array.from({ length: before.length + 1 }, () => Array<number>(after.length + 1).fill(0));
  for (let beforeIndex = before.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = after.length - 1; afterIndex >= 0; afterIndex -= 1) {
      matrix[beforeIndex][afterIndex] = before[beforeIndex] === after[afterIndex]
        ? matrix[beforeIndex + 1][afterIndex + 1] + 1
        : Math.max(matrix[beforeIndex + 1][afterIndex], matrix[beforeIndex][afterIndex + 1]);
    }
  }
  const tokens: DiffToken[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;
  while (beforeIndex < before.length && afterIndex < after.length) {
    if (before[beforeIndex] === after[afterIndex]) {
      tokens.push({ value: after[afterIndex], kind: "same" });
      beforeIndex += 1;
      afterIndex += 1;
    } else if (matrix[beforeIndex + 1][afterIndex] >= matrix[beforeIndex][afterIndex + 1]) {
      tokens.push({ value: before[beforeIndex], kind: "removed" });
      beforeIndex += 1;
    } else {
      tokens.push({ value: after[afterIndex], kind: "added" });
      afterIndex += 1;
    }
  }
  while (beforeIndex < before.length) tokens.push({ value: before[beforeIndex++], kind: "removed" });
  while (afterIndex < after.length) tokens.push({ value: after[afterIndex++], kind: "added" });
  return tokens;
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function InlineDiff({ previous, current, className = "" }: { previous: string; current: string; className?: string }) {
  const tokens = useMemo(() => diffTokens(previous, current), [previous, current]);
  const addedCount = tokens.filter((token) => token.kind === "added" && token.value.trim()).length;
  const removedCount = tokens.filter((token) => token.kind === "removed" && token.value.trim()).length;
  return <div className={className}><p className="leading-6 text-[#526A7E]">{tokens.map((token, index) => token.kind === "added" ? <mark key={index} className="rounded bg-[#DDF6E9] px-0.5 font-semibold text-[#157347]">{token.value}</mark> : token.kind === "removed" ? <del key={index} className="rounded bg-[#FFE2E2] px-0.5 text-[#B42318] decoration-[#B42318]">{token.value}</del> : <span key={index}>{token.value}</span>)}</p>{(addedCount || removedCount) ? <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold"><span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8EF] px-2 py-1 text-[#157347]"><Plus size={11} />{addedCount} phần thêm</span><span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0F0] px-2 py-1 text-[#B42318]"><Minus size={11} />{removedCount} phần bỏ</span></div> : <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#71869A]"><CheckCircle2 size={12} />Không thay đổi</div>}</div>;
}

function StepChanges({ previous, current }: { previous: string[]; current: string[] }) {
  const maximum = Math.max(previous.length, current.length);
  if (!maximum) return null;
  return <ol className="space-y-2.5">{Array.from({ length: maximum }, (_, index) => {
    const before = previous[index] || "";
    const after = current[index] || "";
    const changed = before !== after;
    return <li key={`${before}-${after}-${index}`} className={`rounded-lg border p-3 ${changed ? "border-[#DDE7F0] bg-white" : "border-transparent bg-[#F7FAFC]"}`}><div className="mb-1.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]"><span className="grid h-4 w-4 place-items-center rounded-full bg-[#F0F5F8] text-[9px] text-[#527089]">{index + 1}</span>{!before ? <span className="text-[#157347]">Bước mới</span> : !after ? <span className="text-[#B42318]">Bước đã bỏ</span> : changed ? <span className="text-[#A86B00]">Bước thay đổi</span> : <span>Không đổi</span>}</div>{changed ? <InlineDiff previous={before} current={after} /> : <p className="text-xs leading-5 text-[#60758A]">{after}</p>}</li>;
  })}</ol>;
}

function VersionCard({ version, previousVersion, sequence }: { version: GuideVersion; previousVersion?: GuideVersion; sequence: number }) {
  const previousSteps = previousVersion && isStringList(previousVersion.steps) ? previousVersion.steps : [];
  const currentSteps = isStringList(version.steps) ? version.steps : [];
  const isInitialVersion = !previousVersion;
  return <article className="overflow-hidden rounded-xl border border-[#DDE7F0] bg-white shadow-[0_6px_18px_rgba(16,42,67,.035)]"><div className="flex flex-col gap-3 border-b border-[#EDF2F5] bg-[#FBFDFE] p-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]"><span>Phiên bản {sequence}</span>{isInitialVersion ? <span className="rounded-full bg-[#EEF4FF] px-2 py-0.5 text-[#3B73B9]">Bản đầu tiên</span> : <span className="rounded-full bg-[#FFF5DC] px-2 py-0.5 text-[#A86B00]">So với phiên bản trước</span>}</div><p className="mt-1.5 text-xs font-semibold text-[#60758A]">Thay đổi bởi {version.changedByName || "Quản trị viên"}</p></div><time className="text-xs font-semibold text-[#71869A]">{formatDate(version.createdAt)}</time></div>{isInitialVersion ? <div className="space-y-4 p-4"><section><div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8AA0B6]">Tiêu đề</div><h3 className="mt-1 text-sm font-extrabold text-[#193B57]">{version.title}</h3></section><section><div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8AA0B6]">Mô tả</div><p className="mt-1 text-xs leading-6 text-[#60758A]">{version.description}</p></section><section><div className="mb-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8AA0B6]">Các bước</div><StepChanges previous={[]} current={currentSteps} /></section></div> : <div className="space-y-4 p-4"><section><div className="mb-1.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8AA0B6]">Tiêu đề <ArrowRight size={12} className="text-[#0F8C8C]" /></div><InlineDiff previous={previousVersion.title} current={version.title} className="text-sm font-extrabold" /></section><section><div className="mb-1.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8AA0B6]">Mô tả <ArrowRight size={12} className="text-[#0F8C8C]" /></div><InlineDiff previous={previousVersion.description} current={version.description} className="text-xs" /></section><section><div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#8AA0B6]">Các bước <ArrowDown size={12} className="text-[#0F8C8C]" /></div><StepChanges previous={previousSteps} current={currentSteps} /></section></div>}</article>;
}

export function GuideVersionDiffDialog({ guide, onClose }: { guide: GuideReference; onClose: () => void }) {
  const versionsQuery = trpc.help.versions.useQuery({ guideKey: guide.guideKey });
  const versions = (versionsQuery.data || []) as GuideVersion[];
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [onClose]);
  return <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#102A43]/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="guide-diff-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="max-h-full w-full max-w-4xl overflow-hidden rounded-2xl border border-[#DFE9F0] bg-white shadow-2xl"><header className="assetmaster-modal-header flex shrink-0 items-start justify-between gap-4 border-b border-[#E7EEF3] px-5 pt-4 pb-5 sm:px-6"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]"><History size={14} />Theo dõi nội dung</div><h2 id="guide-diff-title" className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Lịch sử phiên bản & so sánh</h2><p className="mt-1 text-xs text-[#71869A]">{guide.title} · <span className="text-[#157347]">xanh lá</span> là nội dung thêm, <span className="text-[#B42318]">đỏ gạch ngang</span> là nội dung bỏ.</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-[#71869A] transition hover:bg-[#F0F5F8]" aria-label="Đóng lịch sử phiên bản"><X size={17} /></button></header><div className="max-h-[70vh] overflow-y-auto bg-[#F7FAFC] p-5 sm:p-6">{versionsQuery.isLoading ? <div className="grid min-h-[180px] place-items-center text-sm text-[#71869A]">Đang tải lịch sử phiên bản...</div> : !versions.length ? <div className="rounded-xl border border-dashed border-[#C9D5DF] bg-white px-6 py-10 text-center"><History size={22} className="mx-auto text-[#8AA0B6]" /><p className="mt-3 text-sm font-extrabold text-[#193B57]">Chưa có phiên bản đã lưu</p><p className="mt-1 text-xs text-[#71869A]">Lịch sử sẽ được tạo từ lần quản trị viên lưu hướng dẫn tiếp theo.</p></div> : <div className="space-y-4">{versions.map((version, index) => <VersionCard key={version.id} version={version} previousVersion={versions[index + 1]} sequence={versions.length - index} />)}</div>}</div></div></div>;
}
