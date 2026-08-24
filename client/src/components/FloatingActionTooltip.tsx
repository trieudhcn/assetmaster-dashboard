import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipState = {
  label: string;
  left: number;
  top: number;
  placement: "top" | "bottom";
};

const canDisplayHoverTooltip = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function getTooltipTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>("[data-tooltip]");
}

export function FloatingActionTooltip() {
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const pendingTargetRef = useRef<HTMLElement | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const positionTooltip = (target: HTMLElement) => {
    const label = target.dataset.tooltip?.trim();
    if (!label) return;
    const rect = target.getBoundingClientRect();
    const placement = rect.top < 76 ? "bottom" : "top";
    const horizontalPadding = 12;
    const tooltipHalfWidth = Math.min(144, Math.max(0, (window.innerWidth - horizontalPadding * 2) / 2));
    const minCenter = horizontalPadding + tooltipHalfWidth;
    const maxCenter = window.innerWidth - horizontalPadding - tooltipHalfWidth;
    setTooltip({
      label,
      left: Math.min(maxCenter, Math.max(minCenter, rect.left + rect.width / 2)),
      top: placement === "top" ? rect.top - 8 : rect.bottom + 8,
      placement,
    });
  };

  useEffect(() => {
    const clearPendingTooltip = () => {
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
      pendingTargetRef.current = null;
    };
    const revealTooltip = (target: HTMLElement) => {
      clearPendingTooltip();
      activeTargetRef.current = target;
      positionTooltip(target);
    };
    const show = (event: Event) => {
      if (!canDisplayHoverTooltip()) return;
      const target = getTooltipTarget(event.target);
      if (!target || target.matches(":disabled")) return;
      if (event.type === "focusin") {
        revealTooltip(target);
        return;
      }
      if (pendingTargetRef.current === target || activeTargetRef.current === target) return;
      clearPendingTooltip();
      pendingTargetRef.current = target;
      showTimerRef.current = window.setTimeout(() => {
        if (pendingTargetRef.current === target) revealTooltip(target);
      }, 280);
    };
    const hide = (event: Event) => {
      const target = getTooltipTarget(event.target);
      const nextTarget = (event as MouseEvent | FocusEvent).relatedTarget;
      const remainsInsideTarget = nextTarget instanceof Node && target?.contains(nextTarget);
      if (target && pendingTargetRef.current === target && !remainsInsideTarget) clearPendingTooltip();
      if (target && activeTargetRef.current === target && !remainsInsideTarget) {
        activeTargetRef.current = null;
        setTooltip(null);
      }
    };
    const reposition = () => {
      if (activeTargetRef.current) positionTooltip(activeTargetRef.current);
    };

    document.addEventListener("pointerover", show);
    document.addEventListener("focusin", show);
    document.addEventListener("pointerout", hide);
    document.addEventListener("focusout", hide);
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerover", show);
      document.removeEventListener("focusin", show);
      document.removeEventListener("pointerout", hide);
      document.removeEventListener("focusout", hide);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
      clearPendingTooltip();
    };
  }, []);

  if (!tooltip) return null;
  return createPortal(
    <div
      role="tooltip"
      className={`floating-action-tooltip floating-action-tooltip--${tooltip.placement}`}
      style={{ left: tooltip.left, top: tooltip.top }}
    >
      {tooltip.label}
    </div>,
    document.body,
  );
}
