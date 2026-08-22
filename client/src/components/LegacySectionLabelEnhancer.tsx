import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/_core/hooks/useAuth";
import { EditableSectionLabel } from "@/components/EditableSectionLabel";

const legacyLabels = [
  { source: "Asset registry", labelKey: "asset-registry", fallback: "Danh mục tài sản" },
  { source: "Assignment operations", labelKey: "assignment-operations", fallback: "Quản lý bàn giao" },
  { source: "Service operations", labelKey: "service-operations", fallback: "Vận hành bảo trì" },
  { source: "Live management data", labelKey: "live-management-data", fallback: "Dữ liệu quản trị trực tiếp" },
  { source: "Workforce allocation", labelKey: "workforce-allocation", fallback: "Phân bổ nhân sự" },
  { source: "Procurement directory", labelKey: "procurement-directory", fallback: "Danh mục nhà cung cấp" },
  { source: "Brand settings", labelKey: "brand-settings", fallback: "Thiết lập thương hiệu" },
] as const;

type LabelHost = (typeof legacyLabels)[number] & { host: HTMLSpanElement };

export function LegacySectionLabelEnhancer() {
  const { user } = useAuth();
  const [hosts, setHosts] = useState<LabelHost[]>([]);
  const canEdit = user?.role === "admin";

  useLayoutEffect(() => {
    let frame = 0;
    const findHosts = () => {
      const found = new Map<string, LabelHost>();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let textNode: Text | null;
      while ((textNode = walker.nextNode() as Text | null)) {
        const match = legacyLabels.find((item) => item.source === textNode?.nodeValue?.trim());
        if (!match || !textNode.parentNode || textNode.parentElement?.closest("[data-editable-label-host]")) continue;
        const host = document.createElement("span");
        host.dataset.editableLabelHost = match.labelKey;
        textNode.parentNode.replaceChild(host, textNode);
        found.set(match.labelKey, { ...match, host });
      }
      if (!found.size) return;
      setHosts((current) => {
        const next = [...found.values()];
        const merged = new Map(current.map((item) => [item.labelKey, item]));
        next.forEach((item) => merged.set(item.labelKey, item));
        const resolved = [...merged.values()];
        return resolved.length === current.length && resolved.every((item, index) => item.labelKey === current[index]?.labelKey && item.host === current[index]?.host) ? current : resolved;
      });
    };
    const queueFindHosts = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(findHosts);
    };
    queueFindHosts();
    const observer = new MutationObserver(queueFindHosts);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  return <>{hosts.map(({ labelKey, fallback, host }) => createPortal(<EditableSectionLabel labelKey={labelKey} fallback={fallback} canEdit={canEdit} />, host, labelKey))}</>;
}
