import {
  Building2,
  FolderCog,
  GripVertical,
  Network,
  Palette,
  ServerCog,
  ShieldCheck,
  Tags,
} from "lucide-react";

type SettingLink = {
  href: string;
  label: string;
  icon: typeof Palette;
  event?: string;
};

const settingLinks: readonly SettingLink[] = [
  { href: "#settings-brand", label: "Thương hiệu", icon: Palette },
  { href: "#settings-directory", label: "Directory", icon: Network },
  {
    href: "#self-hosted-service-status",
    label: "Hạ tầng",
    icon: ServerCog,
    event: "assetmaster:open-self-hosted-service-status",
  },
  {
    href: "#self-hosted-file-storage",
    label: "Kho tệp",
    icon: FolderCog,
    event: "assetmaster:open-self-hosted-file-storage",
  },
  {
    href: "#self-hosted-backup-recovery",
    label: "Sao lưu",
    icon: ShieldCheck,
    event: "assetmaster:open-self-hosted-backup-recovery",
  },
  { href: "#settings-branches", label: "Chi nhánh", icon: Building2 },
  { href: "#settings-menu", label: "Thứ tự menu", icon: GripVertical },
  { href: "#settings-enhancements", label: "Nhận diện", icon: Tags },
] as const;

function SettingLinks({
  compact = false,
  rail = false,
}: {
  compact?: boolean;
  rail?: boolean;
}) {
  const className = rail
    ? "grid h-9 w-9 place-items-center rounded-lg text-[#527089] transition hover:bg-[#F4FBFA] hover:text-[#087A6A] focus:bg-[#F4FBFA] focus:text-[#087A6A]"
    : compact
      ? "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#DDE7F0] bg-white px-3 py-2 text-[11px] font-bold text-[#527089] transition hover:border-[#8BCDC6] hover:bg-[#F4FBFA] hover:text-[#087A6A]"
      : "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#527089] transition hover:bg-[#F4FBFA] hover:text-[#087A6A]";
  return (
    <>
      {settingLinks.map(({ href, label, icon: Icon, event }) => {
        const eventName =
          event ||
          (href === "#settings-directory"
            ? "assetmaster:open-directory-settings"
            : null);
        return eventName ? (
          <button
            key={href}
            type="button"
            title={
              href === "#settings-directory"
                ? "Mở cấu hình Directory"
                : `Mở ${label}`
            }
            aria-label={
              href === "#settings-directory"
                ? "Mở cấu hình Directory LDAP/AD"
                : `Mở ${label}`
            }
            onClick={() => window.dispatchEvent(new Event(eventName))}
            className={className}
          >
            <Icon size={14} />
            {rail ? <span className="sr-only">{label}</span> : label}
          </button>
        ) : (
          <a
            key={href}
            href={href}
            title={label}
            aria-label={`Đi đến ${label}`}
            className={className}
          >
            <Icon size={14} />
            {rail ? <span className="sr-only">{label}</span> : label}
          </a>
        );
      })}
    </>
  );
}

export function SettingsQuickNav() {
  return (
    <>
      <nav
        data-settings-quick-nav
        className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-[1100px] gap-2 overflow-x-auto pb-1 xl:hidden"
        aria-label="Điều hướng nhanh Cài đặt"
      >
        <SettingLinks compact />
      </nav>
      <aside
        className="fixed right-1 top-24 z-10 hidden w-11 rounded-xl border border-[#DFE9F0] bg-white/95 p-1 shadow-[0_12px_28px_rgba(16,42,67,.09)] backdrop-blur xl:block"
        aria-label="Điều hướng nhanh Cài đặt"
      >
        <div className="flex flex-col items-center gap-1">
          <SettingLinks rail />
        </div>
      </aside>
    </>
  );
}
