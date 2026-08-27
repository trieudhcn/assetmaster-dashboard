import { type LucideIcon, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type SelfHostedSettingsPanelFrameProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  actions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

export function useHiddenSelfHostedSettingsPanel(
  id: string,
  eventName: string
) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const openPanel = () => {
      setIsVisible(true);
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() =>
          document
            .getElementById(id)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        )
      );
    };
    window.addEventListener(eventName, openPanel);
    return () => window.removeEventListener(eventName, openPanel);
  }, [eventName, id]);

  return { isVisible, hide: () => setIsVisible(false) };
}

export function HiddenSelfHostedSettingsAnchor({ id }: { id: string }) {
  return <div id={id} data-self-hosted-settings-anchor aria-hidden="true" />;
}

export function SelfHostedSettingsPanelFrame({
  id,
  eyebrow,
  title,
  description,
  icon: Icon,
  iconClassName,
  actions,
  onClose,
  children,
}: SelfHostedSettingsPanelFrameProps) {
  return (
    <section
      id={id}
      data-self-hosted-settings-panel
      className="mx-auto mt-5 w-[calc(100%-2rem)] max-w-[1100px] rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,.045)]"
    >
      <header className="flex flex-col gap-4 border-b border-[#DDECEB] bg-[linear-gradient(120deg,#F6FCFB_0%,#FFFFFF_72%)] px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconClassName}`}
            >
              <Icon size={19} />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#0F8C8C]">
                {eyebrow}
              </div>
              <h2 className="mt-0.5 font-display text-xl font-extrabold tracking-[-.035em] text-[#102A43]">
                {title}
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-xs leading-5 text-[#60758A]">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#DDE7F0] bg-white text-[#71869A] transition hover:bg-[#F4F7F9] hover:text-[#193B57]"
            aria-label={`Ẩn ${title}`}
            title={`Ẩn ${title}`}
          >
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
