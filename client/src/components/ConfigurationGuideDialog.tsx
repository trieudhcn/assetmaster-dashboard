import { BookOpenText, Cloud, Network, X } from "lucide-react";
import { Streamdown } from "streamdown";
import {
  entraGuideMarkdown,
  ldapsGuideMarkdown,
} from "virtual:assetmaster-configuration-guides";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConfigurationGuideKind = "entra" | "ldaps";

const guideDetails = {
  entra: {
    eyebrow: "Xác thực đám mây",
    title: "Hướng dẫn Microsoft Entra ID & Graph",
    description:
      "Cấu hình App Registration, App Roles, Microsoft Graph, Client Secret, kiểm tra kết nối và đồng bộ hồ sơ.",
    content: entraGuideMarkdown,
    icon: Cloud,
    tone: "text-[#2666A8] bg-[#EAF3FF]",
  },
  ldaps: {
    eyebrow: "Xác thực nội bộ",
    title: "Hướng dẫn LDAPS & Active Directory",
    description:
      "Cấu hình chứng chỉ CA, bind account, Docker secret, DN, nhóm quyền, kiểm tra kết nối và rollback.",
    content: ldapsGuideMarkdown,
    icon: Network,
    tone: "text-[#087A6A] bg-[#E6F6F2]",
  },
} satisfies Record<
  ConfigurationGuideKind,
  {
    eyebrow: string;
    title: string;
    description: string;
    content: string;
    icon: typeof Cloud;
    tone: string;
  }
>;

export function ConfigurationGuideDialog({
  guide,
  open,
  onOpenChange,
}: {
  guide: ConfigurationGuideKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = guideDetails[guide];
  const GuideIcon = detail.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        data-configuration-guide-dialog={guide}
        className="!fixed !z-[140] flex h-[min(92dvh,900px)] w-[calc(100vw-1.5rem)] max-w-5xl grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border-[#C9DDE8] bg-white p-0 shadow-[0_28px_80px_rgba(16,42,67,.28)]"
      >
        <header className="assetmaster-modal-header flex shrink-0 items-start justify-between gap-4 border-b border-[#DDE7F0] bg-[linear-gradient(120deg,#F6FAFD_0%,#FFFFFF_76%)] px-5 pt-5 pb-6 sm:px-7">
          <DialogHeader className="min-w-0 flex-1 text-left">
            <div className="flex items-start gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${detail.tone}`}
              >
                <GuideIcon size={20} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#60758A]">
                  <BookOpenText size={13} />
                  {detail.eyebrow}
                </div>
                <DialogTitle className="mt-1 font-display text-xl font-extrabold tracking-[-.03em] text-[#102A43]">
                  {detail.title}
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-3xl text-xs leading-5 text-[#60758A]">
                  {detail.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#DDE7F0] bg-white text-[#60758A] transition hover:bg-[#F0F5F8] hover:text-[#193B57] focus:outline-none focus:ring-2 focus:ring-[#C9DDE8]"
            aria-label="Đóng hướng dẫn cấu hình"
          >
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto bg-[#F8FAFC] px-4 py-5 sm:px-7 sm:py-6">
          <div className="mb-4 rounded-xl border border-[#CDE5E5] bg-[#F2FBF8] px-4 py-3 text-xs leading-5 text-[#526779]">
            Tài liệu này đã được đóng gói trong AssetMaster và có thể xem trong
            mạng nội bộ mà không cần đăng nhập hoặc truy cập GitHub.
          </div>
          <article className="configuration-guide-markdown rounded-xl border border-[#DFE9F0] bg-white px-4 py-5 shadow-[0_6px_20px_rgba(16,42,67,.04)] sm:px-7">
            <Streamdown>{detail.content}</Streamdown>
          </article>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#DDE7F0] bg-white px-5 py-4 sm:px-7">
          <p className="text-[10px] leading-4 text-[#8AA0B6]">
            Nội dung đi cùng phiên bản ứng dụng đang chạy.
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-[#193B57] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#8AA0B6]"
          >
            Đóng hướng dẫn
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
