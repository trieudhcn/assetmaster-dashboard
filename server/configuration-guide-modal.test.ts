import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("in-app configuration guides and modal layout", () => {
  it("bundles both guides into AssetMaster without a GitHub dependency", () => {
    const vite = source("vite.config.ts");
    const dialog = source(
      "client/src/components/ConfigurationGuideDialog.tsx"
    );
    const entraPanel = source(
      "client/src/components/EntraSettingsPanel.tsx"
    );
    const directoryPanel = source(
      "client/src/components/DirectorySettingsPanel.tsx"
    );

    expect(vite).toContain("virtual:assetmaster-configuration-guides");
    expect(vite).toContain("huong-dan-entra-id-microsoft-graph.md");
    expect(vite).toContain(
      "docker-desktop-ldaps-ad-windows-server-2022.md"
    );
    expect(dialog).toContain('import { Streamdown } from "streamdown"');
    expect(dialog).toContain("không cần đăng nhập hoặc truy cập GitHub");
    expect(dialog).toContain("data-configuration-guide-dialog");
    expect(dialog).toContain("max-w-5xl flex-col gap-0");
    expect(dialog).toContain(
      "min-h-0 flex-1 overflow-y-auto overscroll-contain"
    );
    expect(dialog).not.toContain(
      "grid-rows-[auto_minmax(0,1fr)_auto]"
    );
    expect(dialog).toContain(
      "!inset-0 !top-0 !left-0 !z-[140] !h-dvh !w-full !max-w-none"
    );
    expect(dialog).toContain(
      "!translate-x-0 !translate-y-0 flex flex-col"
    );
    expect(dialog).toContain(
      "overflow-x-hidden overflow-y-auto overscroll-contain"
    );
    expect(dialog).toContain(
      "rounded-none border-0 bg-white p-0 shadow-none"
    );
    expect(dialog).toContain("sm:!max-w-none");
    expect(dialog).not.toContain("max-w-5xl");
    expect(dialog).not.toContain("h-[min(92dvh,900px)]");
    expect(entraPanel).toContain('guide="entra"');
    expect(directoryPanel).toContain('guide="ldaps"');
    expect(entraPanel).not.toContain("github.com");
    expect(directoryPanel).not.toContain("github.com");
  });

  it("adds clickable guide navigation and copy controls", () => {
    const dialog = source(
      "client/src/components/ConfigurationGuideDialog.tsx"
    );
    const styles = source("client/src/index.css");
    const entraGuide = source(
      "docs/huong-dan-entra-id-microsoft-graph.md"
    );
    const ldapsGuide = source(
      "docs/docker-desktop-ldaps-ad-windows-server-2022.md"
    );

    expect(dialog).toContain("getGuideSections");
    expect(dialog).toContain("data-guide-toc");
    expect(dialog).toContain("scrollToSection");
    expect(dialog).toContain("data-guide-section-heading");
    expect(dialog).toContain("data-guide-code-copy");
    expect(dialog).toContain("data-guide-inline-copy");
    expect(dialog).toContain("navigator.clipboard.writeText");
    expect(dialog).toContain('document.execCommand("copy")');
    expect(dialog).toContain("Đã sao chép");
    expect(dialog).toContain(
      "controls={{ code: true, table: true, mermaid: true }}"
    );
    expect(styles).toContain(
      '[data-guide-code-copy][data-copy-status="copied"]'
    );
    expect(styles).toContain(
      'code[data-guide-inline-copy][data-copy-status="copied"]'
    );
    expect(entraGuide.match(/^##\s+/gm)?.length).toBeGreaterThan(10);
    expect(ldapsGuide.match(/^##\s+/gm)?.length).toBeGreaterThan(10);
    expect(entraGuide).toContain("```powershell");
    expect(ldapsGuide).toContain("```powershell");
  });

  it("keeps modal descriptions clear of body dividers across modal groups", () => {
    const styles = source("client/src/index.css");
    const sharedDialog = source("client/src/components/ui/dialog.tsx");
    const modalSources = [
      "client/src/pages/Home.tsx",
      "client/src/components/AssetImportModal.tsx",
      "client/src/components/ActiveDirectoryPreviewDialog.tsx",
      "client/src/components/GuideVersionDiffDialog.tsx",
      "client/src/components/ImportHistoryDrawer.tsx",
      "client/src/components/QuickServiceTicketPreview.tsx",
      "client/src/components/RetirementCertificateManager.tsx",
      "client/src/components/SupplyIssueSlipManager.tsx",
      "client/src/pages/LicensesServicesManagementView.tsx",
      "client/src/pages/OperationsModules.tsx",
      "client/src/pages/SuppliesInventoryView.tsx",
    ];

    expect(styles).toContain(".assetmaster-modal-header p");
    expect(styles).toContain("padding-bottom: 0.25rem");
    expect(styles).toContain("line-height: 1.25rem");
    expect(sharedDialog).toContain(
      "flex min-w-0 shrink-0 flex-col gap-2"
    );
    expect(sharedDialog).toContain(
      "text-muted-foreground text-sm leading-5"
    );
    for (const path of modalSources) {
      expect(source(path), path).toContain("assetmaster-modal-header");
    }
    expect(source("client/src/pages/Home.tsx")).toContain(
      "assetmaster-modal-header flex shrink-0 items-start justify-between"
    );
  });
});
