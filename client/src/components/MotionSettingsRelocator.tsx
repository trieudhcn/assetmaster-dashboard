import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";

function MotionSettingsControl() {
  const [enabled, setEnabled] = useState(() => typeof window === "undefined" ? true : window.localStorage.getItem("assetmaster-motion") !== "off");
  const toggleMotion = () => {
    setEnabled((current) => {
      const next = !current;
      document.documentElement.dataset.motion = next ? "on" : "off";
      window.localStorage.setItem("assetmaster-motion", next ? "on" : "off");
      return next;
    });
  };

  return <section className="mt-5 flex flex-col gap-4 rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EAF3FF] text-[#2666A8]"><Sparkles size={18} /></div><div><h3 className="text-sm font-extrabold text-[#193B57]">Hiệu ứng chuyển động</h3><p className="mt-1 text-xs text-[#71869A]">Bật hoặc tắt hiệu ứng cho menu, hộp thoại, panel trượt và trạng thái tải dữ liệu.</p></div></div><button type="button" role="switch" aria-checked={enabled} onClick={toggleMotion} className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-2 text-xs font-bold transition sm:self-auto ${enabled ? "border-[#9ADBD3] bg-[#ECF8F7] text-[#087A6A]" : "border-[#DDE7F0] bg-[#F7FAFC] text-[#71869A]"}`}><span className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-[#0F8C8C]" : "bg-[#A8B8C5]"}`} />{enabled ? "Đang bật" : "Đang tắt"}</button></section>;
}

export function MotionSettingsRelocator() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    let frame = 0;
    const placeControl = () => {
      const source = [...document.querySelectorAll<HTMLElement>("section.mb-5")].find((section) => section.textContent?.includes("Hiệu ứng chuyển động") && section.textContent?.includes("Bật hoặc tắt animation"));
      if (source) source.style.display = "none";
      const enhancedBrandSection = [...document.querySelectorAll<HTMLElement>("section")].find((section) => section.textContent?.includes("Nhận diện mở rộng") && section.textContent?.includes("Watermark PDF"));
      if (!enhancedBrandSection) return;
      let nextHost = enhancedBrandSection.querySelector<HTMLDivElement>("[data-motion-settings-host]");
      if (!nextHost) {
        nextHost = document.createElement("div");
        nextHost.dataset.motionSettingsHost = "true";
        enhancedBrandSection.appendChild(nextHost);
      }
      setHost((current) => current === nextHost ? current : nextHost);
    };
    const queuePlacement = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(placeControl); };
    queuePlacement();
    const observer = new MutationObserver(queuePlacement);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  return host ? createPortal(<MotionSettingsControl />, host, "motion-settings-control") : null;
}
