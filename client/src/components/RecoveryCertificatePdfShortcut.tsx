import { useEffect, useRef } from "react";

const CERTIFICATE_ROW_PATTERN = /^(.*)\s·\s(TH-\d{6}-\d{3})$/;

/**
 * Keeps the TH certificate actionable in the legacy handover table without
 * duplicating its PDF composition logic. The shortcut opens the row's existing
 * detail view, then activates the recovery-PDF action already used there.
 */
export function RecoveryCertificatePdfShortcut() {
  const pendingCertificateRef = useRef<string | null>(null);

  useEffect(() => {
    let frame = 0;

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
        button.textContent = certificateNumber;
        button.className =
          "ml-1 inline-flex rounded px-1 py-0.5 font-mono text-[11px] font-extrabold text-[#8F5A00] underline decoration-[#E6B861] decoration-dotted underline-offset-2 transition hover:bg-[#FFF5DC] hover:text-[#A86B00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8C8C]";

        codeCell.replaceChildren(document.createTextNode(`${handoverCode} · `), button);
      });
    };

    const openPendingPreview = () => {
      if (!pendingCertificateRef.current) return;
      const pdfButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.includes("Biên bản thu hồi / In PDF")
      );
      if (!pdfButton) return;
      pendingCertificateRef.current = null;
      pdfButton.click();
    };

    const synchronize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        enhanceCertificateCells();
        openPendingPreview();
      });
    };

    const handleShortcut = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const shortcut = target?.closest<HTMLButtonElement>("[data-recovery-certificate-shortcut]");
      if (!shortcut) return;

      event.preventDefault();
      event.stopPropagation();
      const detailButton = shortcut.closest("tr")?.querySelector<HTMLButtonElement>('button[aria-label="Xem biên bản"]');
      if (!detailButton) return;
      pendingCertificateRef.current = shortcut.dataset.recoveryCertificateShortcut || null;
      detailButton.click();
      synchronize();
    };

    synchronize();
    const observer = new MutationObserver(synchronize);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener("click", handleShortcut, true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("click", handleShortcut, true);
    };
  }, []);

  return null;
}
