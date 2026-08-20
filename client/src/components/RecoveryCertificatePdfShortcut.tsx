import { useEffect } from "react";

const CERTIFICATE_ROW_PATTERN = /^(.*)\s·\s(TH-\d{6}-\d{3})$/;

/**
 * Keeps the TH certificate actionable in the legacy handover table without
 * duplicating its PDF composition logic. The shortcut opens the row's existing
 * detail view, then activates the recovery-PDF action already used there.
 */
export function RecoveryCertificatePdfShortcut() {
  useEffect(() => {
    let frame = 0;
    let preparingCertificate: string | null = null;

    const enhanceCertificateCells = () => {
      document.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
        const codeCell = row.querySelector<HTMLTableCellElement>("td:first-child");
        if (!codeCell || codeCell.querySelector("[data-recovery-certificate-shortcut]")) return;

        const matched = codeCell.textContent?.trim().match(CERTIFICATE_ROW_PATTERN);
        if (!matched) return;

        const [, handoverCode, certificateNumber] = matched;
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.recoveryCertificateShortcut = certificateNumber;
        button.setAttribute("aria-label", `Mở xem trước biên bản thu hồi ${certificateNumber}`);
        button.title = "Mở nhanh bản xem trước PDF";
        const icon = document.createElement("span");
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "PDF";
        icon.className = "rounded bg-[#F4D79B] px-1 py-0.5 text-[8px] font-black tracking-wide text-[#7A4B00]";
        const label = document.createElement("span");
        label.dataset.recoveryCertificateLabel = "true";
        label.textContent = certificateNumber;
        button.append(icon, label);
        button.className =
          "ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-mono text-[11px] font-extrabold text-[#8F5A00] underline decoration-[#E6B861] decoration-dotted underline-offset-2 transition hover:bg-[#FFF5DC] hover:text-[#A86B00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8C8C] disabled:cursor-wait disabled:opacity-70";

        codeCell.replaceChildren(document.createTextNode(`${handoverCode} · `), button);
      });
    };

    const synchronize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        enhanceCertificateCells();
      });
    };

    const handleShortcut = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const shortcut = target?.closest<HTMLButtonElement>("[data-recovery-certificate-shortcut]");
      if (!shortcut) return;

      event.preventDefault();
      event.stopPropagation();
      if (preparingCertificate || shortcut.disabled) return;
      const detailButton = shortcut.closest("tr")?.querySelector<HTMLButtonElement>('button[aria-label="Xem biên bản"]');
      if (!detailButton) return;
      const certificate = shortcut.dataset.recoveryCertificateShortcut || "";
      preparingCertificate = certificate;
      shortcut.disabled = true;
      shortcut.title = "Đang chuẩn bị PDF...";
      shortcut.setAttribute("aria-label", `Đang chuẩn bị PDF cho biên bản thu hồi ${certificate}`);
      const label = shortcut.querySelector<HTMLElement>("[data-recovery-certificate-label]");
      if (label) label.textContent = "Đang chuẩn bị PDF...";
      sessionStorage.setItem(
        "assetmaster-open-recovery-pdf-certificate",
        certificate
      );
      detailButton.click();
    };

    const restoreShortcut = (event: Event) => {
      const detail = (event as CustomEvent<{ certificate?: string; success?: boolean }>).detail;
      const certificate = detail?.certificate;
      if (!certificate) return;
      preparingCertificate = null;
      const shortcut = document.querySelector<HTMLButtonElement>(`[data-recovery-certificate-shortcut="${certificate}"]`);
      if (!shortcut) return;
      shortcut.disabled = false;
      shortcut.title = detail.success ? "Mở nhanh bản xem trước PDF" : "Không thể mở PDF. Nhấn để thử lại.";
      shortcut.setAttribute("aria-label", `Mở xem trước biên bản thu hồi ${certificate}`);
      const label = shortcut.querySelector<HTMLElement>("[data-recovery-certificate-label]");
      if (label) label.textContent = certificate;
    };

    synchronize();
    const observer = new MutationObserver(synchronize);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener("click", handleShortcut, true);
    window.addEventListener("assetmaster-recovery-pdf-preparation-complete", restoreShortcut);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("click", handleShortcut, true);
      window.removeEventListener("assetmaster-recovery-pdf-preparation-complete", restoreShortcut);
    };
  }, []);

  return null;
}
