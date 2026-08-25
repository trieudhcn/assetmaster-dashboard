// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MenuOrderSettings } from "../client/src/components/MenuOrderSettings";

const labels = ["Tổng quan", "Danh mục tài sản", "Phân loại tài sản", "Nhà cung cấp & Hãng", "Hợp đồng & Hóa đơn", "Bản quyền & Dịch vụ", "Phụ kiện", "Bàn giao & Cấp phát", "Bảo hành & Sửa chữa", "Phòng Ban & Bộ Phận", "Quản lý nhân viên", "Khấu hao & Thanh lý", "Kiểm kê", "Báo Cáo"];
let root: Root | null = null;
let container: HTMLDivElement | null = null;

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("tương tác kéo-thả thứ tự menu", () => {
  it("gọi onReorder với đủ 14 mục khi kéo Báo Cáo vào giữa danh sách", () => {
    const onReorder = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(<MenuOrderSettings items={labels.map((label) => ({ label }))} onMove={vi.fn()} onReorder={onReorder} onReset={vi.fn()} />);
    });

    const [source, target] = [container.querySelectorAll("li")[13], container.querySelectorAll("li")[5]];
    const transfer = new DataTransfer();
    const dispatchDragEvent = (element: Element, type: "dragstart" | "dragover" | "drop") => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", { value: transfer });
      element.dispatchEvent(event);
    };
    act(() => {
      dispatchDragEvent(source, "dragstart");
    });
    act(() => {
      dispatchDragEvent(target, "dragover");
      dispatchDragEvent(target, "drop");
    });

    const reordered = onReorder.mock.calls[0]?.[0] as string[];
    expect(reordered).toHaveLength(14);
    expect(reordered[5]).toBe("Báo Cáo");
    expect(reordered).toContain("Bản quyền & Dịch vụ");
  });
});
