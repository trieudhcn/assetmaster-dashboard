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
    expect(tooltipComponent).toContain("}, 280)");
    expect(home).toContain("<FloatingActionTooltip />");
  });

  it("keeps the modal shell clipped while assigning vertical scrolling to its content", () => {
    const stylesheet = readProjectFile("client/src/index.css");

    expect(stylesheet).toContain(".floating-action-tooltip {\n  position: fixed;");
    expect(stylesheet).toContain("overflow: hidden");
    expect(stylesheet).toContain("overflow-y: auto");
    expect(stylesheet).toContain("overscroll-behavior: contain");
    expect(stylesheet).toContain("scrollbar-gutter: stable");
    expect(stylesheet).toContain("@media (hover: none), (pointer: coarse)");
    expect(stylesheet).toContain("min-width: 2.5rem");
  });

  it("keeps category creator inputs stable and only confirms close after a real form change", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain("const [formDirty, setFormDirty] = useState(false)");
    expect(home).toContain("if (!isDetail && formDirty)");
    expect(home).toContain("const categoryDraftRef = useRef");
    expect(home).toContain("categoryDraftRef.current = { ...categoryDraftRef.current, name: nameInput.value }");
    expect(home).not.toContain("data-purchase-date-icon");
  });
});
