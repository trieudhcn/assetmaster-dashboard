import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("modal presentation contract", () => {
  it("renders action tooltip from a body-level portal rather than a clipping pseudo-element", () => {
    const tooltipComponent = readProjectFile("client/src/components/FloatingActionTooltip.tsx");
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(tooltipComponent).toContain("createPortal");
    expect(tooltipComponent).toContain("document.body");
    expect(home).toContain("<FloatingActionTooltip />");
  });

  it("keeps the modal shell clipped while assigning vertical scrolling to its content", () => {
    const stylesheet = readProjectFile("client/src/index.css");

    expect(stylesheet).toContain("overflow: hidden");
    expect(stylesheet).toContain("overflow-y: auto");
    expect(stylesheet).toContain("overscroll-behavior: contain");
    expect(stylesheet).toContain("scrollbar-gutter: stable");
  });
});
