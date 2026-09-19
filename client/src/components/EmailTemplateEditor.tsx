import { useMemo, useState } from "react";
import { Building2, Eye, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/SearchableSelect";
import { trpc } from "@/lib/trpc";

export type EmailTemplateOverride = {
  subject?: string;
  title?: string;
  intro?: string;
  actionLabel?: string;
};

export type EmailTemplateDesign = {
  brandName: string;
  brandColor: string;
  logoUrl: string;
  footerText: string;
  templateOverrides: Record<string, EmailTemplateOverride>;
};

type TemplateField = keyof EmailTemplateOverride;

export function EmailTemplateEditor({
  design,
  applicationUrl,
  companyBrand,
  onChange,
}: {
  design: EmailTemplateDesign;
  applicationUrl: string;
  companyBrand?: { name?: string | null; brandColor?: string | null; logoUrl?: string | null } | null;
  onChange: (next: EmailTemplateDesign) => void;
}) {
  const templatesQuery = trpc.emailNotifications.templates.useQuery();
  const [selectedKey, setSelectedKey] = useState("handover_activated");
  const [activeField, setActiveField] = useState<TemplateField>("subject");
  const previewMutation = trpc.emailNotifications.preview.useMutation({
    onError: error => toast.error(error.message || "Không thể tạo bản xem trước."),
  });
  const templates = templatesQuery.data || [];
  const selected = templates.find(item => item.key === selectedKey) || templates[0];
  const override = design.templateOverrides[selectedKey] || {};
  const effective = selected
    ? {
        subject: override.subject ?? selected.defaults.subject,
        title: override.title ?? selected.defaults.title,
        intro: override.intro ?? selected.defaults.intro,
        actionLabel: override.actionLabel ?? selected.defaults.actionLabel,
      }
    : { subject: "", title: "", intro: "", actionLabel: "" };
  const customized = Boolean(Object.keys(override).length);

  const options = useMemo(
    () => templates.map(item => ({ value: item.key, label: item.label })),
    [templates]
  );

  const updateDesign = <K extends keyof EmailTemplateDesign>(
    key: K,
    value: EmailTemplateDesign[K]
  ) => onChange({ ...design, [key]: value });

  const updateTemplate = (field: TemplateField, value: string) =>
    updateDesign("templateOverrides", {
      ...design.templateOverrides,
      [selectedKey]: { ...override, [field]: value },
    });

  const resetTemplate = () => {
    const next = { ...design.templateOverrides };
    delete next[selectedKey];
    updateDesign("templateOverrides", next);
    toast.success("Đã khôi phục nội dung mặc định của mẫu.");
  };

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    const current = effective[activeField] || "";
    updateTemplate(activeField, `${current}${current.endsWith(" ") || !current ? "" : " "}${token}`);
  };

  const preview = () =>
    previewMutation.mutate({
      templateKey: selectedKey as (typeof templates)[number]["key"],
      brandName: design.brandName,
      brandColor: design.brandColor,
      logoUrl: design.logoUrl || null,
      footerText: design.footerText,
      applicationUrl: applicationUrl || null,
      templateOverrides: design.templateOverrides,
    });

  const useCompanyBrand = () => {
    if (!companyBrand) return;
    onChange({
      ...design,
      brandName: companyBrand.name?.trim() || "AssetMaster",
      brandColor: companyBrand.brandColor || "#0F8C8C",
      logoUrl: companyBrand.logoUrl || "",
    });
    toast.success("Đã lấy tên, màu và logo từ thương hiệu công ty.");
  };

  return (
    <section className="rounded-xl border border-[#D8E5EE] bg-[#FBFDFE] p-4 sm:p-5 lg:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#193B57]">
            <Sparkles size={16} className="text-[#0F8C8C]" /> Template và thương hiệu email
          </div>
          <p className="mt-1 text-[11px] leading-5 text-[#71869A]">
            Nội dung được escape và render phía server. Các biến trong ngoặc kép được thay bằng dữ liệu thật khi tạo email.
          </p>
        </div>
        <button type="button" onClick={useCompanyBrand} disabled={!companyBrand} className="filter-action shrink-0">
          <Building2 size={14} /> Dùng thương hiệu công ty
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,.9fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="field-label">Tên thương hiệu</span>
              <input className="field-input" value={design.brandName} maxLength={160} onChange={event => updateDesign("brandName", event.target.value)} />
            </label>
            <label>
              <span className="field-label">Màu thương hiệu</span>
              <div className="flex gap-2">
                <input type="color" className="h-10 w-12 rounded-lg border border-[#D7E3EB] bg-white p-1" value={design.brandColor} onChange={event => updateDesign("brandColor", event.target.value.toUpperCase())} />
                <input className="field-input" value={design.brandColor} maxLength={7} onChange={event => updateDesign("brandColor", event.target.value.toUpperCase())} />
              </div>
            </label>
            <label className="sm:col-span-2">
              <span className="field-label">Logo email</span>
              <input className="field-input" value={design.logoUrl} onChange={event => updateDesign("logoUrl", event.target.value)} placeholder="Dùng logo công ty hoặc URL HTTPS" />
              <span className="mt-1 block text-[10px] leading-4 text-[#8AA0B6]">Logo nội bộ cần URL AssetMaster để chuyển thành liên kết tuyệt đối trong email.</span>
            </label>
            <label className="sm:col-span-2">
              <span className="field-label">Chân email</span>
              <textarea className="field-input min-h-[72px] resize-y" value={design.footerText} maxLength={500} onChange={event => updateDesign("footerText", event.target.value)} />
            </label>
          </div>

          <div className="rounded-xl border border-[#E0E9EF] bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <label className="min-w-0 flex-1">
                <span className="field-label">Loại thông báo</span>
                <SearchableSelect value={selectedKey} onChange={setSelectedKey} options={options} placeholder="Chọn template" searchPlaceholder="Tìm template..." loading={templatesQuery.isLoading} />
              </label>
              <button type="button" onClick={resetTemplate} disabled={!customized} className="filter-action h-10 shrink-0">
                <RotateCcw size={14} /> Khôi phục mẫu
              </button>
            </div>

            {selected ? (
              <>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.variables.map(variable => (
                    <button key={variable.key} type="button" onClick={() => insertVariable(variable.key)} title={`${variable.label}: ${variable.sample}`} className="rounded-full border border-[#CDE5E5] bg-[#F4FBFA] px-2 py-1 font-mono text-[10px] font-bold text-[#087A6A]">
                      {`{{${variable.key}}}`}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-[#8AA0B6]">Chọn trường cần sửa rồi bấm biến để chèn.</p>
                <p className="mt-1 text-[10px] text-[#8AA0B6]">Các trường chưa sửa tiếp tục dùng nội dung mặc định theo trạng thái nghiệp vụ thực tế.</p>
                <div className="mt-3 grid gap-3">
                  <TemplateField label="Tiêu đề email" value={effective.subject} maxLength={500} onFocus={() => setActiveField("subject")} onChange={value => updateTemplate("subject", value)} />
                  <TemplateField label="Tiêu đề trong nội dung" value={effective.title} maxLength={200} onFocus={() => setActiveField("title")} onChange={value => updateTemplate("title", value)} />
                  <label>
                    <span className="field-label">Đoạn giới thiệu</span>
                    <textarea className="field-input min-h-[92px] resize-y" value={effective.intro} maxLength={1200} onFocus={() => setActiveField("intro")} onChange={event => updateTemplate("intro", event.target.value)} />
                  </label>
                  <TemplateField label="Nhãn nút hành động" value={effective.actionLabel} maxLength={100} onFocus={() => setActiveField("actionLabel")} onChange={value => updateTemplate("actionLabel", value)} />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-[#D8E5EE] bg-white p-3">
          <div className="flex items-center justify-between gap-2 border-b border-[#E7EEF3] pb-3">
            <div>
              <div className="text-xs font-extrabold text-[#193B57]">Bản xem trước thực tế</div>
              <div className="mt-0.5 max-w-[280px] truncate text-[10px] text-[#8AA0B6]">
                {previewMutation.data?.subject || "Chưa tạo preview"}
              </div>
            </div>
            <button type="button" onClick={preview} disabled={!selected || previewMutation.isPending} className="primary-action shrink-0">
              <Eye size={14} /> {previewMutation.isPending ? "Đang tạo..." : "Xem trước"}
            </button>
          </div>
          {previewMutation.data ? (
            <iframe title="Bản xem trước template email" sandbox="" srcDoc={previewMutation.data.htmlBody} className="mt-3 h-[610px] w-full rounded-lg border border-[#E7EEF3] bg-[#F4F7F9]" />
          ) : (
            <div className="mt-3 grid h-[610px] place-items-center rounded-lg border border-dashed border-[#DDE7F0] bg-[#F8FAFC] px-6 text-center text-xs leading-5 text-[#8AA0B6]">
              Chọn mẫu, điều chỉnh nội dung rồi bấm “Xem trước”. Preview sử dụng cùng renderer với email được đưa vào outbox.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TemplateField({ label, value, maxLength, onFocus, onChange }: { label: string; value: string; maxLength: number; onFocus: () => void; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input className="field-input" value={value} maxLength={maxLength} onFocus={onFocus} onChange={event => onChange(event.target.value)} />
    </label>
  );
}
