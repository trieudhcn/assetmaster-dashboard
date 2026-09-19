import { useEffect } from "react";

export const exportPreviewOpeningEvent = "assetmaster:export-preview-opening";
export const exportPreviewOpenDelayMs = 200;

export function useCloseOnExportPreview(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const handleExportPreviewOpening = () => onClose();
    window.addEventListener(exportPreviewOpeningEvent, handleExportPreviewOpening);
    return () => window.removeEventListener(exportPreviewOpeningEvent, handleExportPreviewOpening);
  }, [isOpen, onClose]);
}
