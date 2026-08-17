import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const editableLabels = [
  { key: "dashboard-operations", defaultValue: "Asset Operations" },
  { key: "asset-registry", defaultValue: "Asset Registry" },
  { key: "asset-taxonomy", defaultValue: "Asset Taxonomy" },
  { key: "workforce-allocation", defaultValue: "Workforce allocation" },
  { key: "organization-structure", defaultValue: "Organization structure" },
  { key: "vendor-brand-directory", defaultValue: "Vendor & brand directory" },
  { key: "maintenance-control", defaultValue: "Maintenance control" },
  { key: "audit-control", defaultValue: "Audit control" },
  { key: "reporting-center", defaultValue: "Reporting center" },
  { key: "handover-workflow", defaultValue: "Handover workflow" },
  { key: "knowledge-base", defaultValue: "Knowledge base" },
  { key: "brand-settings", defaultValue: "Brand settings" },
] as const;

type EditableLabelKey = (typeof editableLabels)[number]["key"];

export function EditableSectionLabelManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const labelsQuery = trpc.uiLabels.list.useQuery(undefined, { enabled: Boolean(user) });
  const saveLabel = trpc.uiLabels.save.useMutation({
    onSuccess: async () => {
      await utils.uiLabels.list.invalidate();
      toast.success("Đã cập nhật nhãn giao diện.");
    },
    onError: (error) => toast.error(error.message || "Không thể cập nhật nhãn giao diện."),
  });

  useEffect(() => {
    const values = new Map<string, string>((labelsQuery.data || []).map((label) => [label.labelKey, label.value]));
    const labelsByDefault = new Map(editableLabels.map((label) => [label.defaultValue.toLocaleLowerCase("en-US"), label]));
    const abortController = new AbortController();

    const applyEditor = (element: HTMLElement, definition: { key: EditableLabelKey; defaultValue: string }) => {
      const currentValue = values.get(definition.key) || definition.defaultValue;
      if (element.dataset.uiLabelEditing !== "true") element.textContent = currentValue;
      element.dataset.uiLabelKey = definition.key;
      element.dataset.uiLabelDefault = definition.defaultValue;
      if (!isAdmin || element.dataset.uiLabelReady === "true") return;
      element.dataset.uiLabelReady = "true";
      element.classList.add("editable-section-label");
      element.setAttribute("title", "Nhấp đúp để chỉnh sửa nhãn");
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", `Chỉnh sửa nhãn ${currentValue}`);

      const startEditing = () => {
        if (element.dataset.uiLabelEditing === "true") return;
        element.dataset.uiLabelEditing = "true";
        const original = values.get(definition.key) || definition.defaultValue;
        const input = document.createElement("input");
        input.value = original;
        input.maxLength = 255;
        input.className = "editable-section-label-input";
        input.setAttribute("aria-label", `Nhập nhãn ${definition.defaultValue}`);
        element.replaceChildren(input);
        input.focus();
        input.select();
        let completed = false;
        const finish = (shouldSave: boolean) => {
          if (completed) return;
          completed = true;
          const next = input.value.trim();
          element.dataset.uiLabelEditing = "false";
          if (!shouldSave || !next || next === original) {
            element.textContent = original;
            return;
          }
          element.textContent = next;
          saveLabel.mutate({ labelKey: definition.key, value: next });
        };
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") { event.preventDefault(); finish(true); }
          if (event.key === "Escape") { event.preventDefault(); finish(false); }
        });
        input.addEventListener("blur", () => finish(true));
      };
      element.addEventListener("dblclick", startEditing, { signal: abortController.signal });
      element.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); startEditing(); } }, { signal: abortController.signal });
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-ui-label-key]").forEach((element) => {
        const definition = editableLabels.find((label) => label.key === element.dataset.uiLabelKey);
        if (definition) applyEditor(element, definition);
      });
      document.querySelectorAll<HTMLElement>("div, span").forEach((element) => {
        if (element.dataset.uiLabelKey || element.dataset.uiLabelEditing === "true" || element.querySelector("[data-ui-label-key]")) return;
        const definition = labelsByDefault.get((element.textContent || "").trim().toLocaleLowerCase("en-US"));
        if (!definition) return;
        const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()));
        if (!textNode) return;
        if (element.children.length) {
          const labelText = document.createElement("span");
          labelText.textContent = textNode.textContent?.trim() || definition.defaultValue;
          textNode.replaceWith(labelText);
          applyEditor(labelText, definition);
          return;
        }
        applyEditor(element, definition);
      });
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { abortController.abort(); observer.disconnect(); };
  }, [isAdmin, labelsQuery.data, saveLabel]);

  return null;
}
