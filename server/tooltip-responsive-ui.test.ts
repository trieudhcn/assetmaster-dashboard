import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("responsive tooltip presentation", () => {
  it("keeps visual action tooltips short while preserving accessible action labels", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");
    const linkedAssets = readProjectFile("client/src/components/InvoiceLinkedAssetQuickLinks.tsx");

    expect(home).toContain("const compactTooltipLabel");
    expect(home).toContain("normalized.length <= 48");
    expect(home).toContain('"button, a, span[title], div[title], td[title], dd[title]"');
    expect(home).toContain("const nativeTitle = element.getAttribute(\"title\")?.trim()");
    expect(home).toContain("nativeTitle || (sourceLabel");
    expect(linkedAssets).toContain('const tooltip = "Mở chi tiết tài sản"');
    expect(linkedAssets).toContain("aria-label={`Mở chi tiết Tài sản ${asset.assetCode}: ${asset.name}`}");
  });

  it("prevents hover tooltips from overflowing or appearing on touch-only devices", () => {
    const tooltip = readProjectFile("client/src/components/FloatingActionTooltip.tsx");
    const css = readProjectFile("client/src/index.css");

    expect(tooltip).toContain('matchMedia("(hover: hover) and (pointer: fine)")');
    expect(tooltip).toContain('closest<HTMLElement>("[data-tooltip]")');
    expect(tooltip).toContain("if (!canDisplayHoverTooltip()) return");
    expect(tooltip).toContain("tooltipHalfWidth");
    expect(css).toContain("max-width: min(18rem, calc(100vw - 1.5rem))");
    expect(css).toContain("-webkit-line-clamp: 2");
    expect(css).toContain("@media (hover: none), (pointer: coarse)");
  });
});
