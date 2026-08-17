import { useEffect, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type EditableSectionLabelProps = {
  labelKey: string;
  fallback: string;
  canEdit: boolean;
  className?: string;
};

export function EditableSectionLabel({ labelKey, fallback, canEdit, className = "" }: EditableSectionLabelProps) {
  const utils = trpc.useUtils();
  const labelsQuery = trpc.uiLabels.list.useQuery();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fallback);
  const inputRef = useRef<HTMLInputElement>(null);
  const value = labelsQuery.data?.find((label) => label.labelKey === labelKey)?.value || fallback;
  const saveLabel = trpc.uiLabels.save.useMutation({
    onSuccess: async () => {
      await utils.uiLabels.list.invalidate();
      setEditing(false);
      toast.success("Đã cập nhật nhãn giao diện.");
    },
    onError: (error) => toast.error(error.message || "Không thể cập nhật nhãn giao diện."),
  });

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const save = () => {
    const nextValue = draft.trim();
    if (nextValue.length < 2 || nextValue.length > 120) {
      toast.error("Nhãn cần có từ 2 đến 120 ký tự.");
      inputRef.current?.focus();
      return;
    }
    if (nextValue === value) {
      setEditing(false);
      return;
    }
    saveLabel.mutate({ labelKey, value: nextValue });
  };

  if (editing) {
    return <span className={`inline-flex max-w-full items-center gap-1 rounded-md border border-[#7FC9C1] bg-white px-1.5 py-0.5 shadow-sm ${className}`}>
      <input ref={inputRef} value={draft} maxLength={120} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); save(); } if (event.key === "Escape") { event.preventDefault(); cancel(); } }} onBlur={() => { if (!saveLabel.isPending) save(); }} className="min-w-[120px] max-w-[220px] bg-transparent text-inherit outline-none" aria-label="Nội dung nhãn giao diện" />
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={save} disabled={saveLabel.isPending} className="grid h-5 w-5 place-items-center rounded text-[#087A6A] hover:bg-[#E6F6F2] disabled:opacity-50" aria-label="Lưu nhãn"><Check size={13} /></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={cancel} disabled={saveLabel.isPending} className="grid h-5 w-5 place-items-center rounded text-[#71869A] hover:bg-[#F0F5F8] disabled:opacity-50" aria-label="Hủy chỉnh sửa nhãn"><X size={13} /></button>
    </span>;
  }

  return <span onDoubleClick={() => { if (canEdit) setEditing(true); }} title={canEdit ? "Nhấp đúp để chỉnh sửa" : undefined} className={`${className} ${canEdit ? "cursor-text rounded-sm outline-none transition hover:bg-[#E6F6F2] hover:px-1 focus-visible:ring-2 focus-visible:ring-[#0F8C8C]" : ""}`} tabIndex={canEdit ? 0 : undefined} onKeyDown={(event) => { if (canEdit && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setEditing(true); } }}>{value}{canEdit && <Pencil aria-hidden="true" size={11} className="ml-1 inline-block align-[-1px] opacity-0 transition group-hover:opacity-100" />}</span>;
}
