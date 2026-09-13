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
    expect(entraPanel).toContain('guide="entra"');
    expect(directoryPanel).toContain('guide="ldaps"');
    expect(entraPanel).not.toContain("github.com");
    expect(directoryPanel).not.toContain("github.com");
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
