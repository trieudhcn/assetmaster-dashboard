import { useEffect } from "react";

const SEARCH_PLACEHOLDER_PATTERN = /tìm|tra cứu|search/i;

function setReactInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Applies an accessible quick-clear control to every conventional search input
 * rendered by legacy and newly added management modules. SearchableSelect owns
 * its own control, so inputs inside its listbox are intentionally excluded.
 */
export function SearchClearAffordance() {
  useEffect(() => {
    const bindings = new Map<
      HTMLInputElement,
      { button: HTMLButtonElement; sync: () => void; originalPadding: string }
    >();

    const isSearchInput = (input: HTMLInputElement) => {
      const placeholder = input.placeholder.trim();
      return (
        input.type !== "hidden" &&
        SEARCH_PLACEHOLDER_PATTERN.test(placeholder) &&
        input.dataset.searchClearManaged !== "true" &&
        !input.closest('[role="listbox"]')
      );
    };

    const attachToInput = (input: HTMLInputElement) => {
      if (!isSearchInput(input) || bindings.has(input)) return;
      const host = input.parentElement;
      if (!host) return;

      if (input.placeholder === "Tìm mã phiếu, tài sản...") {
        input.placeholder = "Tìm mã phiếu, mã thu hồi...";
        input.setAttribute("aria-label", "Tìm mã phiếu hoặc mã biên bản thu hồi");
      }

      const originalPadding = input.style.paddingRight;
      input.style.paddingRight = "2.5rem";
      if (getComputedStyle(host).position === "static") {
        host.style.position = "relative";
      }

      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "Xóa nhanh nội dung tìm kiếm");
      button.title = "Xóa từ khóa";
      button.textContent = "×";
      button.className =
        "assetmaster-search-clear absolute right-2 top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-base leading-none text-[#8AA0B6] transition hover:bg-[#E8F7F5] hover:text-[#087A6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8C8C]";

      const sync = () => {
        button.hidden = input.value.length === 0;
        button.style.display = input.value.length === 0 ? "none" : "grid";
      };
      button.addEventListener("click", () => {
        if (!input.value) return;
        setReactInputValue(input, "");
        input.focus();
        sync();
      });
      input.addEventListener("input", sync);
      input.addEventListener("change", sync);
      host.appendChild(button);
      sync();
      bindings.set(input, { button, sync, originalPadding });
    };

    const attachAll = () => {
      document
        .querySelectorAll<HTMLInputElement>("input[placeholder]")
        .forEach(attachToInput);
    };
    const syncAll = () => bindings.forEach(({ sync }) => sync());

    attachAll();
    const observer = new MutationObserver(attachAll);
    observer.observe(document.body, { childList: true, subtree: true });
    const syncAfterClick = () => requestAnimationFrame(syncAll);
    document.addEventListener("input", syncAll, true);
    document.addEventListener("change", syncAll, true);
    document.addEventListener("click", syncAfterClick, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", syncAll, true);
      document.removeEventListener("change", syncAll, true);
      document.removeEventListener("click", syncAfterClick, true);
      bindings.forEach(({ button, originalPadding }, input) => {
        input.style.paddingRight = originalPadding;
        button.remove();
      });
      bindings.clear();
    };
  }, []);

  return null;
}
