import { useEffect, useRef, useState } from "react";
import { Building2, CheckCircle2, Copy, ImageUp, LoaderCircle, Moon, Sun, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export type CompanyBrandInfo = {
  name: string;
  address: string;
  taxCode: string;
  phone: string;
  email: string;
  websiteUrl: string;
  hideWebsiteOnInternalPdf: boolean;
  websiteTitle: string;
  logoUrl: string;
  brandColor: string;
  faviconUrl: string;
  loginBackgroundUrl: string;
  loginGreeting: string;
  loginBackgroundOverlay: "light" | "dark";
};

export function CompanyBrandSettings({ companyInfo, onSave }: { companyInfo: CompanyBrandInfo; onSave: (next: CompanyBrandInfo) => void }) {
  const [draft, setDraft] = useState(companyInfo);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const uploadLogo = trpc.company.uploadLogo.useMutation({ onError: (error) => toast.error(error.message || "Không thể tải logo.") });
  const uploadLoginBackground = trpc.company.uploadLoginBackground.useMutation({ onError: (error) => toast.error(error.message || "Không thể tải ảnh nền đăng nhập.") });

  useEffect(() => setDraft(companyInfo), [companyInfo]);

  const update = <Key extends keyof CompanyBrandInfo>(key: Key, value: CompanyBrandInfo[Key]) => setDraft((current) => ({ ...current, [key]: value }));
  const readUpload = (file: File, onComplete: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => onComplete(String(reader.result));
    reader.onerror = () => toast.error("Không thể đọc tệp ảnh.");
    reader.readAsDataURL(file);
  };
  const normalizeLogo = async (file: File) => {
    const sourceUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("Không thể xử lý logo."));
        nextImage.src = sourceUrl;
      });
      const source = document.createElement("canvas");
      source.width = image.naturalWidth;
      source.height = image.naturalHeight;
      const sourceContext = source.getContext("2d", { willReadFrequently: true });
      if (!sourceContext) throw new Error("Không thể xử lý logo.");
      sourceContext.drawImage(image, 0, 0);
      const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
      let left = source.width;
      let top = source.height;
      let right = 0;
      let bottom = 0;
      for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
        if (pixels[(y * source.width + x) * 4 + 3] > 12) {
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
      }
      const hasVisiblePixels = right >= left && bottom >= top;
      const crop = hasVisiblePixels ? { left, top, width: right - left + 1, height: bottom - top + 1 } : { left: 0, top: 0, width: source.width, height: source.height };
      const output = document.createElement("canvas");
      output.width = 512;
      output.height = 512;
      const outputContext = output.getContext("2d");
      if (!outputContext) throw new Error("Không thể xử lý logo.");
      outputContext.imageSmoothingEnabled = true;
      outputContext.imageSmoothingQuality = "high";
      const available = 448;
      const scale = Math.min(available / crop.width, available / crop.height);
      const width = crop.width * scale;
      const height = crop.height * scale;
      outputContext.drawImage(source, crop.left, crop.top, crop.width, crop.height, (512 - width) / 2, (512 - height) / 2, width, height);
      return output.toDataURL("image/webp", 0.92);
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  };
  const chooseLogo = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast.error("Logo chỉ hỗ trợ PNG, JPG, WebP và tối đa 2 MB.");
      return;
    }
    void normalizeLogo(file).then((dataUrl) => uploadLogo.mutate({ fileName: `${file.name.replace(/\.[^.]+$/, "") || "logo"}.webp`, contentType: "image/webp", dataUrl }, { onSuccess: ({ url }) => { update("logoUrl", url); toast.success("Đã căn giữa logo theo tỷ lệ chuẩn. Hãy lưu cài đặt để áp dụng."); } })).catch(() => toast.error("Không thể căn chỉnh logo. Vui lòng chọn ảnh khác."));
  };
  const chooseBackground = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh nền chỉ hỗ trợ PNG, JPG, WebP và tối đa 5 MB.");
      return;
    }
    readUpload(file, (dataUrl) => uploadLoginBackground.mutate({ fileName: file.name, contentType: file.type as "image/png" | "image/jpeg" | "image/webp", dataUrl }, { onSuccess: ({ url }) => { update("loginBackgroundUrl", url); toast.success("Đã tải ảnh nền. Hãy lưu cài đặt để áp dụng."); } }));
  };
  const copyContact = async (value: string, label: string) => {
    const content = value.trim();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`Đã sao chép ${label}.`);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.setAttribute("readonly", "");
      textarea.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (copied) toast.success(`Đã sao chép ${label}.`);
      else toast.error(`Không thể sao chép ${label}.`);
    }
  };
  const save = () => {
    if (!draft.name.trim() || !draft.websiteTitle.trim()) {
      toast.error("Vui lòng nhập tên công ty và tiêu đề website.");
      return;
    }
    onSave({ ...draft, loginGreeting: draft.loginGreeting.trim() });
  };

  const copyButton = (value: string, label: string) => <button type="button" disabled={!value.trim()} onClick={() => { void copyContact(value, label); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#60758A] transition hover:bg-[#ECF8F7] hover:text-[#087A6A] disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Sao chép ${label}`} title={`Sao chép ${label}`}><Copy size={15} /></button>;

  return <div id="settings-brand" data-system-settings-brand className="min-h-screen w-full bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8">
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-7">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />Thiết lập thương hiệu</div>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Cài đặt thương hiệu</h1>
        <p className="mt-1.5 text-sm text-[#71869A]">Thiết lập nhận diện công ty, website và trải nghiệm đăng nhập.</p>
      </div>
      <section className="rounded-xl border border-[#DFE9F0] bg-white p-6 shadow-[0_8px_24px_rgba(16,42,67,.045)]">
        <div className="flex items-start gap-3 border-b border-[#E7EEF3] pb-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E6F6F2] text-[#0F8C8C]"><Building2 size={19} /></div>
          <div><h2 className="font-display text-base font-extrabold text-[#102A43]">Thông tin công ty</h2><p className="mt-1 text-xs text-[#8AA0B6]">Các thông tin này được dùng cho website, đăng nhập và biên bản bàn giao.</p></div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div><label className="field-label">Tên công ty <span className="text-[#0F8C8C]">*</span></label><input value={draft.name} onChange={(event) => update("name", event.target.value)} className="field-input" /></div>
          <div><label className="field-label">Tiêu đề website <span className="text-[#0F8C8C]">*</span></label><input value={draft.websiteTitle} onChange={(event) => update("websiteTitle", event.target.value)} placeholder="Hệ thống Quản lý Tài sản" className="field-input" /><p className="mt-1 text-[11px] text-[#8AA0B6]">Hiển thị trên tab trình duyệt và khu vực nhận diện đăng nhập.</p></div>
          <div className="order-first">
            <label className="field-label">Logo công ty</label>
            <div className="flex min-h-11 items-center gap-3 rounded-lg border border-dashed border-[#9ADBD3] bg-[#F8FCFB] px-3 py-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center">{draft.logoUrl ? <img src={draft.logoUrl} alt="Logo công ty" className="h-9 w-9 object-contain" /> : <ImageUp size={17} className="text-[#60758A]" />}</div>
              <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-extrabold text-[#193B57]">PNG, JPG hoặc WebP · tối đa 2 MB</div><button disabled={uploadLogo.isPending} onClick={() => logoInputRef.current?.click()} className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-[#8BCDC6] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#087A6A] disabled:opacity-50">{uploadLogo.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Upload size={13} />}{uploadLogo.isPending ? "Đang căn chỉnh..." : "Chọn logo"}</button><input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { chooseLogo(event.target.files?.[0]); event.currentTarget.value = ""; }} /></div>
            </div>
          </div>
          <div className="order-first"><label className="field-label">Hiển thị Website</label><label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[#D7E8E6] bg-[#F8FCFB] px-3 py-2.5 transition hover:border-[#8BCDC6]"><input type="checkbox" checked={draft.hideWebsiteOnInternalPdf} onChange={(event) => update("hideWebsiteOnInternalPdf", event.target.checked)} className="h-4 w-4 rounded border-[#8BCDC6] text-[#0F8C8C] focus:ring-[#0F8C8C]" /><span><span className="block text-[11px] font-extrabold text-[#193B57]">Ẩn Website trên mẫu nội bộ</span><span className="mt-0.5 block text-[10px] text-[#71869A]">Email vẫn hiển thị trên tài liệu xuất.</span></span></label></div>
          <div><label className="field-label">Mã số thuế</label><div className="relative"><input value={draft.taxCode} onChange={(event) => update("taxCode", event.target.value)} className="field-input pr-10" />{copyButton(draft.taxCode, "Mã số thuế")}</div></div>
          <div className="contents">
            <div><label className="field-label">Số điện thoại</label><div className="relative"><input value={draft.phone} onChange={(event) => update("phone", event.target.value)} className="field-input pr-10" />{copyButton(draft.phone, "Số điện thoại")}</div></div>
            <div><label className="field-label">Email công ty</label><div className="relative"><input type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} placeholder="contact@company.vn" className="field-input pr-10" />{copyButton(draft.email, "Email công ty")}</div></div>
          </div>
          <div>
            <label className="field-label">Website công ty</label>
            <input type="url" value={draft.websiteUrl} onChange={(event) => update("websiteUrl", event.target.value)} placeholder="https://congty.vn" className="field-input" />
            <p className="mt-1 text-[11px] text-[#8AA0B6]">Hiển thị trong các tài liệu xuất, trừ khi bạn bật tùy chọn mẫu nội bộ.</p>
          </div>
          <div><label className="field-label">Địa chỉ</label><div className="relative"><textarea value={draft.address} onChange={(event) => update("address", event.target.value)} className="field-input min-h-11 resize-y pr-10" /><button type="button" disabled={!draft.address.trim()} onClick={() => { void copyContact(draft.address, "Địa chỉ"); }} className="absolute right-2 top-2 rounded-md p-1.5 text-[#60758A] transition hover:bg-[#ECF8F7] hover:text-[#087A6A] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Sao chép Địa chỉ" title="Sao chép Địa chỉ"><Copy size={15} /></button></div></div>
        </div>
        <div className="mt-6 flex justify-end border-t border-[#E7EEF3] pt-4"><button onClick={save} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#087A6A]"><CheckCircle2 size={15} />Lưu cài đặt thương hiệu</button></div>
      </section>
      <section className="mt-5 rounded-xl border border-[#DFE9F0] bg-white p-6 shadow-[0_8px_24px_rgba(16,42,67,.045)]">
        <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF3FF] text-[#2666A8]"><ImageUp size={19} /></div><div><h2 className="font-display text-base font-extrabold text-[#102A43]">Nhận diện màn hình đăng nhập</h2><p className="mt-1 text-xs text-[#8AA0B6]">Tùy chỉnh ảnh nền, lớp phủ và câu chào nổi bật trước khi người dùng đăng nhập.</p></div></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.18fr_.82fr]">
          <div className="overflow-hidden rounded-xl border border-dashed border-[#9ADBD3] bg-[#F8FCFB]"><div className="relative h-44 bg-[#102A43] bg-cover bg-center" style={draft.loginBackgroundUrl ? { backgroundImage: `${draft.loginBackgroundOverlay === "dark" ? "linear-gradient(90deg, rgba(16,42,67,.84), rgba(16,42,67,.52))" : "linear-gradient(90deg, rgba(244,247,251,.78), rgba(244,247,251,.28))"}, url(${draft.loginBackgroundUrl})` } : undefined}><div className={`absolute inset-x-4 bottom-4 text-xs font-bold ${draft.loginBackgroundOverlay === "dark" ? "text-white" : "text-[#102A43]"}`}>{draft.loginBackgroundUrl ? "Ảnh nền đăng nhập đang được chọn" : "Chưa có ảnh nền tùy chỉnh"}</div></div><div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-extrabold text-[#193B57]">Ảnh nền đăng nhập</div><p className="mt-1 text-[11px] leading-5 text-[#71869A]">PNG, JPG hoặc WebP · tối đa 5 MB.</p></div><div className="flex shrink-0 gap-2"><button disabled={uploadLoginBackground.isPending} onClick={() => backgroundInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#8BCDC6] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] disabled:opacity-50">{uploadLoginBackground.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}{uploadLoginBackground.isPending ? "Đang tải..." : "Tải ảnh nền"}</button>{draft.loginBackgroundUrl ? <button type="button" onClick={() => { update("loginBackgroundUrl", ""); toast.success("Đã gỡ ảnh nền. Hãy lưu cài đặt để áp dụng nền mặc định."); }} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#F2C7C7] bg-white px-3 py-2 text-xs font-bold text-[#B44545]"><X size={14} />Gỡ ảnh nền</button> : null}</div><input ref={backgroundInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { chooseBackground(event.target.files?.[0]); event.currentTarget.value = ""; }} /></div></div>
          <div className="space-y-4"><div><label className="field-label">Lớp phủ ảnh nền</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => update("loginBackgroundOverlay", "light")} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold transition ${draft.loginBackgroundOverlay === "light" ? "border-[#8BCDC6] bg-[#ECF8F7] text-[#087A6A]" : "border-[#DDE7F0] bg-white text-[#60758A]"}`}><Sun size={15} />Sáng</button><button type="button" onClick={() => update("loginBackgroundOverlay", "dark")} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold transition ${draft.loginBackgroundOverlay === "dark" ? "border-[#294F6A] bg-[#173A56] text-white" : "border-[#DDE7F0] bg-white text-[#60758A]"}`}><Moon size={15} />Tối</button></div></div><div><label className="field-label">Câu chào màn hình đăng nhập</label><textarea value={draft.loginGreeting} maxLength={300} onChange={(event) => update("loginGreeting", event.target.value)} placeholder="Quản lý tài sản, theo đúng vai trò của bạn." className="field-input min-h-[132px] resize-y" /><div className="mt-1 flex justify-between text-[11px] text-[#8AA0B6]"><span>Hiển thị ở phần nổi bật của màn hình đăng nhập.</span><span>{draft.loginGreeting.length}/300</span></div></div></div>
        </div>
      </section>
    </div>
  </div>;
}
