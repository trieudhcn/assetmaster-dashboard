import {
  BookOpenText,
  ChevronRight,
  Cloud,
  List,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import {
  type ComponentProps,
  isValidElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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


type GuideSection = {
  id: string;
  label: string;
};

const COPY_STATUS_RESET_MS = 1800;

function reactNodeText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(reactNodeText).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(value)) {
    return reactNodeText(value.props.children);
  }
  return "";
}

function cleanGuideHeading(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();
}

function guideSectionId(label: string): string {
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `guide-section-${slug || "section"}`;
}

function getGuideSections(content: string): GuideSection[] {
  return Array.from(content.matchAll(/^##\s+(.+)$/gm), (match) => {
    const label = cleanGuideHeading(match[1]);
    return { id: guideSectionId(label), label };
  });
}

function getGuideCodeBlocks(content: string): string[] {
  const fencePattern = new RegExp(
    "^```([^\\n]*)\\n([\\s\\S]*?)^```$",
    "gm"
  );

  return Array.from(content.matchAll(fencePattern))
    .filter((match) => match[1].trim().toLowerCase() !== "mermaid")
    .map((match) => match[2].replace(/\n$/, ""));
}

async function writeGuideClipboard(value: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Tiếp tục bằng phương án dự phòng cho trình duyệt/mạng nội bộ.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Không thể sao chép vào clipboard.");
    }
  } finally {
    textarea.remove();
  }
}

const guideMarkdownComponents: NonNullable<
  ComponentProps<typeof Streamdown>["components"]
> = {
  h2: ({ children, node: _node, ...props }) => {
    const label = reactNodeText(children);
    return (
      <h2
        {...props}
        id={guideSectionId(label)}
        tabIndex={-1}
        data-guide-section-heading
      >
        {children}
      </h2>
    );
  },
};

function GuideTableOfContents({
  sections,
  activeSection,
  onSelect,
  onCollapse,
  collapsible = false,
}: {
  sections: GuideSection[];
  activeSection: string | null;
  onSelect: (section: GuideSection) => void;
  onCollapse?: () => void;
  collapsible?: boolean;
}) {
  const links = (
    <div className="space-y-1.5">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSelect(section)}
          aria-current={activeSection === section.id ? "location" : undefined}
          className={`group flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold leading-4 transition focus:outline-none focus:ring-2 focus:ring-[#9FCACA] ${
            activeSection === section.id
              ? "bg-[#E6F6F2] text-[#087A6A]"
              : "text-[#60758A] hover:bg-[#F0F5F8] hover:text-[#193B57]"
          }`}
        >
          <ChevronRight
            size={13}
            className="mt-0.5 shrink-0 transition group-hover:translate-x-0.5"
            aria-hidden="true"
          />
          <span>{section.label}</span>
        </button>
      ))}
    </div>
  );

  if (collapsible) {
    return (
      <details
        data-guide-toc
        className="mb-4 rounded-xl border border-[#D7E5ED] bg-white p-3 lg:hidden"
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-extrabold text-[#193B57]">
          <List size={15} className="text-[#0F8C8C]" aria-hidden="true" />
          Mục lục hướng dẫn
        </summary>
        <div className="mt-3 border-t border-[#E7EEF3] pt-3">{links}</div>
      </details>
    );
  }

  return (
    <nav
      id="configuration-guide-toc"
      data-guide-toc
      aria-label="Mục lục hướng dẫn cấu hình"
      className="sticky top-0 hidden max-h-[calc(100dvh-12rem)] overflow-y-auto rounded-xl border border-[#D7E5ED] bg-white p-3 lg:block"
    >
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-[#E7EEF3] pb-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-[#193B57]">
          <List size={15} className="text-[#0F8C8C]" aria-hidden="true" />
          Mục lục
        </div>
        <button
          type="button"
          data-guide-toc-collapse
          onClick={onCollapse}
          aria-label="Thu gọn mục lục"
          aria-controls="configuration-guide-toc"
          aria-expanded="true"
          title="Thu gọn mục lục"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#D7E5ED] bg-[#F7FAFC] text-[#60758A] transition hover:border-[#9FCACA] hover:bg-[#E6F6F2] hover:text-[#087A6A] focus:outline-none focus:ring-2 focus:ring-[#9FCACA]"
        >
          <PanelLeftClose size={15} aria-hidden="true" />
        </button>
      </div>
      {links}
    </nav>
  );
}

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const copyResetTimersRef = useRef(new Map<HTMLElement, number>());
  const sections = useMemo(
    () => getGuideSections(detail.content),
    [detail.content]
  );
  const codeBlocks = useMemo(
    () => getGuideCodeBlocks(detail.content),
    [detail.content]
  );
  const [activeSection, setActiveSection] = useState<string | null>(
    sections[0]?.id ?? null
  );
  const [isTocCollapsed, setIsTocCollapsed] = useState(false);

  useEffect(() => {
    setActiveSection(sections[0]?.id ?? null);
  }, [guide, sections]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      const article = articleRef.current;
      if (!article) return;

      article
        .querySelectorAll<HTMLElement>(
          'code[data-streamdown="inline-code"]'
        )
        .forEach((inlineCode) => {
          const value = inlineCode.textContent?.trim() ?? "";
          if (!value) return;
          inlineCode.tabIndex = 0;
          inlineCode.setAttribute("role", "button");
          inlineCode.setAttribute("data-guide-inline-copy", "");
          inlineCode.setAttribute("data-guide-copy-value", value);
          inlineCode.setAttribute(
            "aria-label",
            `Sao chép giá trị ${value}`
          );
          inlineCode.title = "Nhấn để sao chép giá trị cấu hình";
        });

      article
        .querySelectorAll<HTMLElement>("[data-code-block-header]")
        .forEach((header, index) => {
          const buttons = header.querySelectorAll<HTMLButtonElement>("button");
          const copyButton = buttons.item(buttons.length - 1);
          const value = codeBlocks[index];
          if (!copyButton || !value) return;
          copyButton.setAttribute("data-guide-code-copy", "");
          copyButton.setAttribute("data-guide-copy-value", value);
          copyButton.setAttribute("aria-label", "Sao chép câu lệnh");
          copyButton.title = "Sao chép câu lệnh";
        });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [codeBlocks, guide, open]);

  useEffect(
    () => () => {
      copyResetTimersRef.current.forEach((timer) =>
        window.clearTimeout(timer)
      );
      copyResetTimersRef.current.clear();
    },
    []
  );

  const markCopyStatus = (
    element: HTMLElement,
    status: "copied" | "error"
  ) => {
    const previousTimer = copyResetTimersRef.current.get(element);
    if (previousTimer) window.clearTimeout(previousTimer);

    element.setAttribute("data-copy-status", status);
    element.setAttribute(
      "aria-label",
      status === "copied" ? "Đã sao chép" : "Không thể sao chép"
    );

    const timer = window.setTimeout(() => {
      element.removeAttribute("data-copy-status");
      element.setAttribute(
        "aria-label",
        element.hasAttribute("data-guide-code-copy")
          ? "Sao chép câu lệnh"
          : `Sao chép giá trị ${
              element.getAttribute("data-guide-copy-value") ?? ""
            }`
      );
      copyResetTimersRef.current.delete(element);
    }, COPY_STATUS_RESET_MS);

    copyResetTimersRef.current.set(element, timer);
  };

  const copyFromTarget = async (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    const copyTarget = target.closest<HTMLElement>(
      "[data-guide-code-copy], [data-guide-inline-copy]"
    );
    if (!copyTarget || !articleRef.current?.contains(copyTarget)) {
      return false;
    }

    const value = copyTarget.getAttribute("data-guide-copy-value") ?? "";
    if (!value) return true;

    try {
      await writeGuideClipboard(value);
      markCopyStatus(copyTarget, "copied");
    } catch {
      markCopyStatus(copyTarget, "error");
    }
    return true;
  };

  const handleCopyClick = (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("[data-guide-code-copy], [data-guide-inline-copy]")
    ) {
      event.preventDefault();
      event.stopPropagation();
      void copyFromTarget(target);
    }
  };

  const handleCopyKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("[data-guide-inline-copy]")
    ) {
      event.preventDefault();
      event.stopPropagation();
      void copyFromTarget(target);
    }
  };

  const scrollToSection = (section: GuideSection) => {
    const heading = articleRef.current?.querySelector<HTMLElement>(
      `#${section.id}`
    );
    if (!heading) return;

    heading.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    heading.focus({ preventScroll: true });
    setActiveSection(section.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        data-configuration-guide-dialog={guide}
        className="!fixed !inset-0 !top-0 !left-0 !z-[140] !h-dvh !w-full !max-w-none !translate-x-0 !translate-y-0 flex flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none sm:!max-w-none"
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

        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#F8FAFC] px-4 py-5 sm:px-7 sm:py-6">
          <div className="mb-4 rounded-xl border border-[#CDE5E5] bg-[#F2FBF8] px-4 py-3 text-xs leading-5 text-[#526779]">
            Tài liệu này đã được đóng gói trong AssetMaster và có thể xem trong
            mạng nội bộ mà không cần đăng nhập hoặc truy cập GitHub.
          </div>
          <div
            data-guide-toc-layout
            data-toc-collapsed={isTocCollapsed ? "true" : "false"}
            className={`grid items-start gap-4 lg:gap-5 ${
              isTocCollapsed
                ? "lg:grid-cols-1"
                : "lg:grid-cols-[15rem_minmax(0,1fr)]"
            }`}
          >
            {!isTocCollapsed && (
              <GuideTableOfContents
                sections={sections}
                activeSection={activeSection}
                onSelect={scrollToSection}
                onCollapse={() => setIsTocCollapsed(true)}
              />
            )}
            <div className="min-w-0">
              {isTocCollapsed && (
                <div className="mb-4 hidden lg:flex">
                  <button
                    type="button"
                    data-guide-toc-expand
                    onClick={() => setIsTocCollapsed(false)}
                    aria-label="Mở mục lục"
                    aria-controls="configuration-guide-toc"
                    aria-expanded="false"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#C9DDE8] bg-white px-3 py-2 text-xs font-extrabold text-[#193B57] shadow-[0_3px_10px_rgba(16,42,67,.06)] transition hover:border-[#9FCACA] hover:bg-[#E6F6F2] hover:text-[#087A6A] focus:outline-none focus:ring-2 focus:ring-[#9FCACA]"
                  >
                    <PanelLeftOpen size={15} aria-hidden="true" />
                    Mở mục lục
                  </button>
                </div>
              )}
              <GuideTableOfContents
                sections={sections}
                activeSection={activeSection}
                onSelect={scrollToSection}
                collapsible
              />
              <article
                ref={articleRef}
                onClickCapture={handleCopyClick}
                onKeyDownCapture={handleCopyKeyDown}
                className="configuration-guide-markdown rounded-xl border border-[#DFE9F0] bg-white px-4 py-5 shadow-[0_6px_20px_rgba(16,42,67,.04)] sm:px-7"
              >
                <Streamdown
                  components={guideMarkdownComponents}
                  controls={{ code: true, table: true, mermaid: true }}
                >
                  {detail.content}
                </Streamdown>
              </article>
            </div>
          </div>
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
