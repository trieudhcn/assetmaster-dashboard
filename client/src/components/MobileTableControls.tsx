import { useEffect } from "react";

const storagePrefix = "assetmaster:mobile-table-columns:";

export function MobileTableControls() {
  useEffect(() => {
    const setupControls = () => {
      document.querySelectorAll<HTMLElement>(".mobile-table-scroll").forEach((container) => {
        if (container.dataset.mobileColumnControls === "ready") return;
        const table = container.querySelector<HTMLTableElement>("table");
        const headerCells = table ? Array.from(table.querySelectorAll<HTMLTableCellElement>("thead tr:first-child > th")) : [];
        if (!table || headerCells.length < 4) return;

        container.dataset.mobileColumnControls = "ready";
        const labels = headerCells.slice(1).map((cell, index) => cell.textContent?.trim() || `Cột ${index + 2}`);
        const storageKey = `${storagePrefix}${labels.join("|")}`;
        const hiddenColumns = new Set<number>(JSON.parse(sessionStorage.getItem(storageKey) || "[]"));
        const controls = document.createElement("details");
        controls.className = "mobile-column-controls";
        controls.setAttribute("aria-label", "Tùy chọn cột hiển thị");
        const summary = document.createElement("summary");
        summary.textContent = "Cột";
        const panel = document.createElement("div");
        panel.className = "mobile-column-controls-panel";

        const applyColumn = (columnIndex: number, hidden: boolean) => {
          table.querySelectorAll("tr").forEach((row) => row.children.item(columnIndex)?.classList.toggle("mobile-column-hidden", hidden));
        };

        labels.forEach((label, offset) => {
          const columnIndex = offset + 1;
          const option = document.createElement("label");
          option.className = "mobile-column-option";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = !hiddenColumns.has(columnIndex);
          checkbox.setAttribute("aria-label", `Hiển thị cột ${label}`);
          checkbox.addEventListener("change", () => {
            const hidden = !checkbox.checked;
            if (hidden) hiddenColumns.add(columnIndex); else hiddenColumns.delete(columnIndex);
            sessionStorage.setItem(storageKey, JSON.stringify([...hiddenColumns]));
            applyColumn(columnIndex, hidden);
          });
          option.append(checkbox, document.createTextNode(label));
          panel.append(option);
          applyColumn(columnIndex, hiddenColumns.has(columnIndex));
        });

        const resetButton = document.createElement("button");
        resetButton.type = "button";
        resetButton.className = "mobile-column-reset";
        resetButton.textContent = "Khôi phục mặc định";
        resetButton.addEventListener("click", () => {
          hiddenColumns.clear();
          sessionStorage.removeItem(storageKey);
          panel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox, offset) => {
            checkbox.checked = true;
            applyColumn(offset + 1, false);
          });
        });
        panel.append(resetButton);

        controls.append(summary, panel);
        container.prepend(controls);
      });
    };

    setupControls();
    const observer = new MutationObserver(setupControls);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
