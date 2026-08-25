/* @vitest-environment happy-dom */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  documentsUseQuery: vi.fn(),
  uploadUseMutation: vi.fn(),
  removeUseMutation: vi.fn(),
  mutateAsync: vi.fn(),
  removeMutate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ technologyVendorContracts: { documents: { invalidate: mocks.invalidate } } }),
    technologyVendorContracts: {
      documents: { useQuery: mocks.documentsUseQuery },
      uploadDocument: { useMutation: mocks.uploadUseMutation },
      removeDocument: { useMutation: mocks.removeUseMutation },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError, info: mocks.toastInfo } }));

import { ContractDocuments } from "../client/src/components/TechnologyVendorDirectoryPanel";

let root: Root | null = null;
let container: HTMLDivElement | null = null;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.documentsUseQuery.mockReturnValue({ data: [], isLoading: false });
  mocks.uploadUseMutation.mockReturnValue({ mutateAsync: mocks.mutateAsync });
  mocks.removeUseMutation.mockReturnValue({ mutate: mocks.removeMutate });
});

describe("tài liệu Hợp đồng Công nghệ tải nhiều tệp", () => {
  it("khóa chọn tệp cho tới khi Hợp đồng được lưu", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<ContractDocuments contractId={null} />));

    expect(container.querySelector<HTMLInputElement>('input[type="file"]')?.disabled).toBe(true);
    expect(container.textContent).toContain("Lưu Hợp đồng để bắt đầu đính kèm tài liệu.");
  });

  it("chọn nhiều tệp, hiển thị trạng thái từng tệp và giữ kiểm tra loại tệp", async () => {
    mocks.mutateAsync.mockResolvedValueOnce({ id: 1 }).mockRejectedValueOnce(new Error("S3 không phản hồi"));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<ContractDocuments contractId={61} />));

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const pdf = new File(["pdf"], "hop-dong.pdf", { type: "application/pdf" });
    const image = new File(["image"], "phu-luc.png", { type: "image/png" });
    const unsupported = new File(["text"], "ghi-chu.txt", { type: "text/plain" });
    Object.defineProperty(input, "files", { configurable: true, value: [pdf, image, unsupported] });

    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await vi.waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(2));
    });

    expect(mocks.mutateAsync).toHaveBeenNthCalledWith(1, expect.objectContaining({ technologyVendorContractId: 61, fileName: "hop-dong.pdf", contentType: "application/pdf" }));
    expect(mocks.mutateAsync).toHaveBeenNthCalledWith(2, expect.objectContaining({ technologyVendorContractId: 61, fileName: "phu-luc.png", contentType: "image/png" }));
    expect(mocks.invalidate).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("hop-dong.pdf");
    expect(container.textContent).toContain("Đã tải lên.");
    expect(container.textContent).toContain("phu-luc.png");
    expect(container.textContent).toContain("S3 không phản hồi");
    expect(container.textContent).toContain("ghi-chu.txt");
    expect(container.textContent).toContain("Chỉ nhận PDF, PNG hoặc JPG tối đa 5 MB.");
    expect(input.disabled).toBe(false);
  });

  it("khóa input trong khi một tệp đang tải", async () => {
    let resolveUpload: ((value: { id: number }) => void) | undefined;
    mocks.mutateAsync.mockImplementation(() => new Promise((resolve) => { resolveUpload = resolve; }));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<ContractDocuments contractId={61} />));

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { configurable: true, value: [new File(["pdf"], "dang-tai.pdf", { type: "application/pdf" })] });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    await vi.waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    expect(input.disabled).toBe(true);
    expect(container.textContent).toContain("Đang tải...");

    await act(async () => {
      resolveUpload?.({ id: 2 });
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(container?.querySelector<HTMLInputElement>('input[type="file"]')?.disabled).toBe(false));
    expect(container.textContent).toContain("Đã tải lên.");
  });
});
