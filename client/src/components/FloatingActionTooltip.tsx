import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipState = {
  label: string;
  left: number;
  top: number;
  placement: "top" | "bottom";
};

function getTooltipTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>(".icon-action-tooltip[data-tooltip]");
}

export function FloatingActionTooltip() {
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const positionTooltip = (target: HTMLElement) => {
    const label = target.dataset.tooltip?.trim();
    if (!label) return;
    const rect = target.getBoundingClientRect();
    const placement = rect.top < 68 ? "bottom" : "top";
    const horizontalPadding = 10;
    setTooltip({
      label,
      left: Math.min(window.innerWidth - horizontalPadding, Math.max(horizontalPadding, rect.left + rect.width / 2)),
      top: placement === "top" ? rect.top - 8 : rect.bottom + 8,
      placement,
    });
  };

  useEffect(() => {
    const show = (event: Event) => {
      const target = getTooltipTarget(event.target);
      if (!target || target.matches(":disabled")) return;
      activeTargetRef.current = target;
      positionTooltip(target);
    };
    const hide = (event: Event) => {
      const target = getTooltipTarget(event.target);
      const nextTarget = (event as MouseEvent | FocusEvent).relatedTarget;
      const remainsInsideTarget = nextTarget instanceof Node && target?.contains(nextTarget);
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
