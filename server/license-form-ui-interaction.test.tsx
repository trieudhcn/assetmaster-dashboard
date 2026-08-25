/* @vitest-environment happy-dom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LicenseDocumentControls, LicenseDuplicatePortal } from "../client/src/pages/LicensesServicesManagementView";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../client/src/components/ui/dialog";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("tương tác form Bản quyền", () => {
  it("hiển thị tệp đính kèm, nhận tệp người dùng chọn và gỡ tài liệu đã lưu", () => {
    const onSelectFile = vi.fn();
    const onRemove = vi.fn();
    const host = document.createElement("div");
    container = host;
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<LicenseDocumentControls licenseId={71} documents={[{ id: 18, fileName: "gia-han.pdf", url: "/manus-storage/license/gia-han.pdf", documentType: "renewal" }]} documentType="contract" pending={null} isBusy={false} onDocumentTypeChange={vi.fn()} onSelectFile={onSelectFile} onClearPending={vi.fn()} onUpload={vi.fn()} onRemove={onRemove} />));

    expect(host.querySelector("[data-license-document-controls]")?.textContent).toContain("Tệp đính kèm");
    expect(host.textContent).toContain("gia-han.pdf");
    const file = new File(["document"], "hop-dong.pdf", { type: "application/pdf" });
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { value: [file] });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onSelectFile).toHaveBeenCalledWith(file);
    act(() => (host.querySelector<HTMLButtonElement>('[aria-label="Gỡ gia-han.pdf"]')!).click());
    expect(onRemove).toHaveBeenCalledWith(18);
  });

  it("đặt nút nhân bản vào form cập nhật và gọi đúng callback", () => {
    const onDuplicate = vi.fn();
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => { callback(0); return 1; };
    const host = document.createElement("div");
    container = host;
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<div data-licenses-services-dialog="license"><form><LicenseDuplicatePortal isOpen onDuplicate={onDuplicate} /></form></div>));

    const duplicateButton = host.querySelector<HTMLButtonElement>("button")!;
    expect(duplicateButton.textContent).toContain("Nhân bản Bản quyền");
    act(() => duplicateButton.click());
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    window.requestAnimationFrame = originalRaf;
  });

  it("render panel Bản quyền tách khung cố định, body cuộn dọc và footer thao tác", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<Dialog open><DialogContent data-licenses-services-dialog="license"><DialogHeader><DialogTitle>Thêm Bản quyền</DialogTitle><DialogDescription>Mô tả</DialogDescription></DialogHeader><form><input aria-label="Mã bản quyền" /><div className="flex justify-end"><button type="button">Hủy</button><button type="submit">Lưu</button></div></form></DialogContent></Dialog>));

    const dialog = document.querySelector<HTMLElement>('[data-licenses-services-dialog="license"]')!;
    const panel = dialog.querySelector<HTMLElement>(':scope > .license-service-dialog-panel')!;
    const form = panel.querySelector<HTMLFormElement>("form")!;
    expect(panel.className).toContain("overflow-hidden");
    expect(form.querySelector(".flex.justify-end")?.textContent).toContain("Lưu");
    const styles = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    expect(styles).toContain('[data-licenses-services-dialog="license"] form {');
    expect(styles).toContain("overflow-y: auto !important");
    expect(styles).toContain("position: sticky");
    expect(styles).toContain("overflow: hidden !important");
  });
});
