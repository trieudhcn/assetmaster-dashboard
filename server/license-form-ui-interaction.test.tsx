/* @vitest-environment happy-dom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LicenseDocumentControls, LicenseDuplicatePortal, StandardDropdown, TechnologyContractPortal, technologyLinkPayload } from "../client/src/pages/LicensesServicesManagementView";
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

function TechnologyLinkedFormHarness({ dialog, onSubmit }: { dialog: "license" | "service"; onSubmit: (payload: { technologyVendorId: number | null; technologyVendorContractId: number | null }) => void }) {
  const [vendorId, setVendorId] = React.useState("");
  const [contractId, setContractId] = React.useState("");
  const vendorOptions = [{ value: "", label: "Chưa chọn" }, { value: "7", label: "Nhà cung cấp Cloud" }, { value: "8", label: "Nhà cung cấp khác" }];
  const contracts = [{ id: 21, contractCode: "HDCN-021", title: "Microsoft 365", technologyVendorId: 7, status: "active" }, { id: 22, contractCode: "HDCN-022", title: "Hợp đồng khác", technologyVendorId: 8, status: "active" }];
  return <><div data-licenses-services-dialog={dialog}><form onSubmit={(event) => { event.preventDefault(); onSubmit(technologyLinkPayload(vendorId, contractId)); }}><label><span>Nhà cung cấp Công nghệ</span><StandardDropdown value={vendorId} onChange={(value) => { setVendorId(value); setContractId(""); }} options={vendorOptions} placeholder="Chưa chọn" searchPlaceholder="Tìm nhà cung cấp..." /></label><button type="submit">Lưu</button></form></div><TechnologyContractPortal isOpen dialog={dialog} vendorId={vendorId} value={contractId} onChange={setContractId} isLoading={false} contracts={contracts} /></>;
}

describe("tương tác form Bản quyền", () => {
  it("hiển thị tệp đính kèm, nhận tệp người dùng chọn và gỡ tài liệu đã lưu", () => {
    const onSelectFile = vi.fn();
    const onRemove = vi.fn();
    const onDocumentTypeChange = vi.fn();
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => { callback(0); return 1; };
    const host = document.createElement("div");
    container = host;
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<LicenseDocumentControls licenseId={71} documents={[{ id: 18, fileName: "gia-han.pdf", url: "/manus-storage/license/gia-han.pdf", documentType: "renewal" }]} documentType="contract" pending={null} isBusy={false} onDocumentTypeChange={onDocumentTypeChange} onSelectFile={onSelectFile} onClearPending={vi.fn()} onUpload={vi.fn()} onRemove={onRemove} />));

    expect(host.querySelector("[data-license-document-controls]")?.textContent).toContain("Tệp đính kèm");
    expect(host.textContent).toContain("gia-han.pdf");
    const file = new File(["document"], "hop-dong.pdf", { type: "application/pdf" });
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { value: [file] });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onSelectFile).toHaveBeenCalledWith(file);
    act(() => (host.querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]')!).click());
    const renewalOption = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((button) => button.textContent?.includes("Tài liệu gia hạn"));
    expect(renewalOption).toBeTruthy();
    act(() => renewalOption?.click());
    expect(onDocumentTypeChange).toHaveBeenCalledWith("renewal");
    act(() => (host.querySelector<HTMLButtonElement>('[aria-label="Gỡ gia-han.pdf"]')!).click());
    expect(onRemove).toHaveBeenCalledWith(18);
    window.requestAnimationFrame = originalRaf;
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

  it("mở và chọn Tài sản/Nhân sự bằng dropdown chuẩn của dialog cấp phát", () => {
    const onAssetChange = vi.fn();
    const onEmployeeChange = vi.fn();
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => { callback(0); return 1; };
    const host = document.createElement("div");
    container = host;
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<div><StandardDropdown value="" onChange={onAssetChange} options={[{ value: "", label: "Chưa gán tài sản" }, { value: "31", label: "TS-031 · Laptop cấp phát" }]} placeholder="Chưa gán tài sản" searchPlaceholder="Tìm mã hoặc tên Tài sản..." /><StandardDropdown value="" onChange={onEmployeeChange} options={[{ value: "", label: "Chưa gán nhân sự" }, { value: "12", label: "Nguyễn Minh An" }]} placeholder="Chưa gán nhân sự" searchPlaceholder="Tìm Nhân sự..." /></div>));

    const triggers = host.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="listbox"]');
    expect(triggers).toHaveLength(2);
    act(() => triggers[0].click());
    const assetOption = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((button) => button.textContent?.includes("TS-031"));
    expect(assetOption).toBeTruthy();
    act(() => assetOption?.click());
    expect(onAssetChange).toHaveBeenCalledWith("31");
    act(() => triggers[1].click());
    const employeeOption = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((button) => button.textContent?.includes("Nguyễn Minh An"));
    expect(employeeOption).toBeTruthy();
    act(() => employeeOption?.click());
    expect(onEmployeeChange).toHaveBeenCalledWith("12");
    window.requestAnimationFrame = originalRaf;
  });

  it("đặt menu dropdown vào lớp modal và vẫn chọn được option", () => {
    const onChange = vi.fn();
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => { callback(0); return 1; };
    const host = document.createElement("div");
    container = host;
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<Dialog open><DialogContent data-licenses-services-dialog="license"><DialogHeader><DialogTitle>Thêm Bản quyền</DialogTitle><DialogDescription>Mô tả</DialogDescription></DialogHeader><StandardDropdown value="subscription" onChange={onChange} options={[{ value: "subscription", label: "Thuê bao" }, { value: "perpetual", label: "Vĩnh viễn" }]} placeholder="Chọn mô hình" searchPlaceholder="Tìm mô hình..." /></DialogContent></Dialog>));

    act(() => (document.querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]')!).click());
    const modal = document.querySelector<HTMLElement>('[data-licenses-services-dialog="license"]')!;
    const option = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((button) => button.textContent?.includes("Vĩnh viễn"));
    expect(option?.closest('[data-licenses-services-dialog="license"]')).toBe(modal);
    act(() => option?.click());
    expect(onChange).toHaveBeenCalledWith("perpetual");
    window.requestAnimationFrame = originalRaf;
  });

  it("đặt menu dropdown Dịch vụ trong lớp modal và vẫn chọn được option", () => {
    const onChange = vi.fn();
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => { callback(0); return 1; };
    const host = document.createElement("div");
    container = host;
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<Dialog open><DialogContent data-licenses-services-dialog="service"><DialogHeader><DialogTitle>Thêm Dịch vụ</DialogTitle><DialogDescription>Mô tả</DialogDescription></DialogHeader><StandardDropdown value="annual" onChange={onChange} options={[{ value: "monthly", label: "Hàng tháng" }, { value: "annual", label: "Hàng năm" }]} placeholder="Chọn chu kỳ" searchPlaceholder="Tìm chu kỳ..." /></DialogContent></Dialog>));

    act(() => (document.querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]')!).click());
    const modal = document.querySelector<HTMLElement>('[data-licenses-services-dialog="service"]')!;
    const option = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((button) => button.textContent?.includes("Hàng tháng"));
    expect(option?.closest('[data-licenses-services-dialog="service"]')).toBe(modal);
    act(() => option?.click());
    expect(onChange).toHaveBeenCalledWith("monthly");
    window.requestAnimationFrame = originalRaf;
  });

  it("lọc và chọn đúng Hợp đồng Công nghệ theo Nhà cung cấp trong form", () => {
    const onChange = vi.fn();
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => { callback(0); return 1; };
    const host = document.createElement("div");
    container = host;
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<><div data-licenses-services-dialog="license"><form /></div><TechnologyContractPortal isOpen dialog="license" vendorId="7" value="" onChange={onChange} isLoading={false} contracts={[{ id: 21, contractCode: "HDCN-021", title: "Microsoft 365", technologyVendorId: 7, status: "active" }, { id: 22, contractCode: "HDCN-022", title: "Hợp đồng khác", technologyVendorId: 8, status: "active" }]} /></>));

    const trigger = document.querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]')!;
    act(() => trigger.click());
    expect(document.body.textContent).toContain("HDCN-021 · Microsoft 365");
    expect(document.body.textContent).not.toContain("HDCN-022 · Hợp đồng khác");
    const option = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((button) => button.textContent?.includes("HDCN-021"));
    act(() => option?.click());
    expect(onChange).toHaveBeenCalledWith("21");
    window.requestAnimationFrame = originalRaf;
  });

  it("tạo payload liên kết Công nghệ đúng cho form Bản quyền và Dịch vụ", () => {
    expect(technologyLinkPayload("7", "21")).toEqual({ technologyVendorId: 7, technologyVendorContractId: 21 });
    expect(technologyLinkPayload("", "")).toEqual({ technologyVendorId: null, technologyVendorContractId: null });
  });

  it.each(["license", "service"] as const)("chọn Nhà cung cấp, lọc Hợp đồng và submit đúng liên kết trong form %s", (dialog) => {
    const onSubmit = vi.fn();
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => { callback(0); return 1; };
    const host = document.createElement("div");
    container = host;
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<TechnologyLinkedFormHarness dialog={dialog} onSubmit={onSubmit} />));

    const triggers = () => Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="listbox"]'));
    const modal = document.querySelector<HTMLElement>(`[data-licenses-services-dialog="${dialog}"]`)!;
    expect(modal.textContent).toContain("Nhà cung cấp Công nghệ");
    act(() => triggers()[0].click());
    const vendorOption = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((button) => button.textContent?.includes("Nhà cung cấp Cloud"));
    act(() => vendorOption?.click());
    expect(modal.textContent).toContain("Hợp đồng Công nghệ");
    expect(triggers()[1].closest(`[data-licenses-services-dialog="${dialog}"]`)).toBe(modal);
    act(() => triggers()[1].click());
    expect(document.body.textContent).toContain("HDCN-021 · Microsoft 365");
    expect(document.body.textContent).not.toContain("HDCN-022 · Hợp đồng khác");
    const contractOption = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((button) => button.textContent?.includes("HDCN-021"));
    act(() => contractOption?.click());
    act(() => document.querySelector<HTMLFormElement>(`[data-licenses-services-dialog="${dialog}"] form`)?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(onSubmit).toHaveBeenCalledWith({ technologyVendorId: 7, technologyVendorContractId: 21 });
    window.requestAnimationFrame = originalRaf;
  });

  it.each(["license", "service"] as const)("giữ nguyên panel, form và footer modal %s khi chèn vùng Hợp đồng Công nghệ", (dialogKind) => {
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => { callback(0); return 1; };
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const dialog = <Dialog open><DialogContent data-licenses-services-dialog={dialogKind}><DialogHeader><DialogTitle>{dialogKind === "license" ? "Thêm Bản quyền" : "Thêm Dịch vụ"}</DialogTitle><DialogDescription>Mô tả</DialogDescription></DialogHeader><form><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="form-button-secondary">Hủy</button><button type="submit" className="form-button-primary">Lưu</button></div></form></DialogContent></Dialog>;
    act(() => root?.render(dialog));
    act(() => root?.render(<>{dialog}<TechnologyContractPortal isOpen dialog={dialogKind} vendorId="7" value="" onChange={vi.fn()} isLoading={false} contracts={[{ id: 21, contractCode: "HDCN-021", title: "Microsoft 365", technologyVendorId: 7, status: "active" }]} /></>));

    const modal = document.querySelector<HTMLElement>(`[data-licenses-services-dialog="${dialogKind}"]`)!;
    const panel = modal.querySelector<HTMLElement>(":scope > .license-service-dialog-panel")!;
    const form = panel.querySelector<HTMLFormElement>("form")!;
    expect(panel.className).toContain("overflow-hidden");
    expect(form.textContent).toContain("Hợp đồng Công nghệ");
    expect(form.querySelector(".form-button-secondary")?.textContent).toContain("Hủy");
    expect(form.querySelector(".form-button-primary")?.textContent).toContain("Lưu");
    window.requestAnimationFrame = originalRaf;
  });

  it("render panel Bản quyền có body cuộn dọc và footer nằm cuối nội dung", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<Dialog open><DialogContent data-licenses-services-dialog="license"><DialogHeader><DialogTitle>Thêm Bản quyền</DialogTitle><DialogDescription>Mô tả</DialogDescription></DialogHeader><form><input aria-label="Mã bản quyền" /><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="form-button-secondary">Hủy</button><button type="submit" className="form-button-primary">Lưu bản quyền</button></div></form></DialogContent></Dialog>));

    const dialog = document.querySelector<HTMLElement>('[data-licenses-services-dialog="license"]')!;
    const panel = dialog.querySelector<HTMLElement>(':scope > .license-service-dialog-panel')!;
    const form = panel.querySelector<HTMLFormElement>("form")!;
    expect(panel.className).toContain("overflow-hidden");
    const footer = form.querySelector<HTMLElement>(".flex.justify-end")!;
    expect(footer.textContent).toContain("Hủy");
    expect(footer.textContent).toContain("Lưu bản quyền");
    expect(footer.querySelector(".form-button-secondary")).not.toBeNull();
    expect(footer.querySelector(".form-button-primary")).not.toBeNull();
    const styles = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    expect(styles).toContain('[data-licenses-services-dialog="license"] form,');
    expect(styles).toContain("overflow-y: auto !important");
    expect(styles).toContain("height: 0;");
    expect(styles).toContain("place-items: center !important");
    expect(styles).toContain("position: static");
    expect(styles).toContain("overflow: hidden !important");
    expect(styles).toContain("margin: 1rem 0 0 !important");
    expect(styles).toContain("min-width: 5.4rem");
    const view = readFileSync(resolve(process.cwd(), "client/src/pages/LicensesServicesManagementView.tsx"), "utf8");
    expect(view).toContain('className="form-button-secondary">Hủy</button><button type="submit"');
    expect(view).toContain('className="form-button-primary">{createLicense.isPending || updateLicense.isPending ? "Đang lưu..." : "Lưu bản quyền"}');
  });

  it("render Dịch vụ bằng cùng panel, nhãn trường và footer chuẩn", () => {
    const host = document.createElement("div");
    container = host;
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<Dialog open><DialogContent data-licenses-services-dialog="service"><DialogHeader><DialogTitle>Thêm dịch vụ</DialogTitle><DialogDescription>Mô tả</DialogDescription></DialogHeader><form><label><span className="field-label">Mã dịch vụ</span><input className="form-input" /></label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="form-button-secondary">Hủy</button><button type="submit" className="form-button-primary">Lưu dịch vụ</button></div></form></DialogContent></Dialog>));

    const dialog = document.querySelector<HTMLElement>('[data-licenses-services-dialog="service"]')!;
    const panel = dialog.querySelector<HTMLElement>(":scope > .license-service-dialog-panel")!;
    const form = panel.querySelector<HTMLFormElement>("form")!;
    expect(panel.className).toContain("overflow-hidden");
    expect(form.querySelector(".field-label")?.textContent).toContain("Mã dịch vụ");
    expect(form.querySelector(".form-input")).not.toBeNull();
    expect(form.querySelector(".form-button-secondary")?.textContent).toContain("Hủy");
    expect(form.querySelector(".form-button-primary")?.textContent).toContain("Lưu dịch vụ");
    const styles = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    expect(styles).toContain('[data-licenses-services-dialog="service"] form,\n[data-licenses-services-dialog="technology"] form {');
    const view = readFileSync(resolve(process.cwd(), "client/src/pages/LicensesServicesManagementView.tsx"), "utf8");
    expect(view).toContain('<DialogContent data-licenses-services-dialog="service">');
  });

  it("render Công nghệ bằng panel căn giữa, body cuộn và footer chuẩn", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<Dialog open><DialogContent data-licenses-services-dialog="technology"><DialogHeader><DialogTitle>Thêm Nhà cung cấp Công nghệ</DialogTitle><DialogDescription>Mô tả</DialogDescription></DialogHeader><form><label><span className="field-label">Tên nhà cung cấp</span><input className="form-input" /></label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="form-button-secondary">Hủy</button><button type="submit" className="form-button-primary">Lưu nhà cung cấp</button></div></form></DialogContent></Dialog>));

    const dialog = document.querySelector<HTMLElement>('[data-licenses-services-dialog="technology"]')!;
    const panel = dialog.querySelector<HTMLElement>(":scope > .license-service-dialog-panel")!;
    const form = panel.querySelector<HTMLFormElement>("form")!;
    expect(panel.className).toContain("overflow-hidden");
    expect(form.querySelector(".field-label")?.textContent).toContain("Tên nhà cung cấp");
    expect(form.querySelector(".form-button-secondary")?.textContent).toContain("Hủy");
    expect(form.querySelector(".form-button-primary")?.textContent).toContain("Lưu nhà cung cấp");
    const styles = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    expect(styles).toContain('[data-licenses-services-dialog="technology"] {');
    expect(styles).toContain('[data-licenses-services-dialog="technology"] form {');
  });

  it("đóng modal Công nghệ khi click ngoài panel", () => {
    function TechnologyDialogHarness() {
      const [open, setOpen] = React.useState(true);
      return <Dialog open={open} onOpenChange={setOpen}><DialogContent data-licenses-services-dialog="technology"><DialogHeader><DialogTitle>Thêm Hợp đồng Công nghệ</DialogTitle><DialogDescription>Mô tả</DialogDescription></DialogHeader><form><input aria-label="Mã hợp đồng" className="form-input" /></form></DialogContent></Dialog>;
    }

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<TechnologyDialogHarness />));

    const modal = document.querySelector<HTMLElement>('[data-licenses-services-dialog="technology"]')!;
    const panel = modal.querySelector<HTMLElement>(":scope > .technology-dialog-panel")!;
    act(() => panel.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true })));
    expect(document.querySelector('[data-licenses-services-dialog="technology"]')).not.toBeNull();

    act(() => modal.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
    expect(document.querySelector('[data-licenses-services-dialog="technology"]')).toBeNull();
  });
});
