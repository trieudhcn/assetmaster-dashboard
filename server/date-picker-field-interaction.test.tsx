/* @vitest-environment happy-dom */
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { DatePickerField } from "../client/src/components/DatePickerField";

let root: Root | null = null;
let container: HTMLDivElement | null = null;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function DatePickerHarness() {
  const [value, setValue] = useState("");
  return <DatePickerField value={value} onChange={setValue} className="form-input" aria-label="Ngày ký Hợp đồng" />;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  document.querySelectorAll("[data-radix-popper-content-wrapper]").forEach((element) => element.remove());
  root = null;
  container = null;
});

describe("DatePickerField", () => {
  it("mở lịch AssetMaster khi bấm trực tiếp trigger có biểu tượng lịch", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<DatePickerHarness />));

    const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="Mở lịch: Ngày ký Hợp đồng"]');
    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain("Chọn ngày");

    await act(async () => {
      trigger?.click();
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain("Lịch AssetMaster");
    expect(document.body.textContent).toContain("Chọn ngày cần áp dụng");

    const day = document.body.querySelector<HTMLButtonElement>("button[data-day]");
    expect(day).not.toBeNull();
    await act(async () => {
      day?.click();
      await Promise.resolve();
    });

    expect(trigger?.textContent).not.toContain("Chọn ngày");
    expect(document.body.textContent).not.toContain("Lịch AssetMaster");
  });

  it("chọn nhanh ngày hiện tại bằng nút Hôm nay", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<DatePickerHarness />));

    const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="Mở lịch: Ngày ký Hợp đồng"]')!;
    await act(async () => {
      trigger.click();
      await Promise.resolve();
    });

    const todayButton = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === "Hôm nay");
    expect(todayButton).toBeTruthy();
    await act(async () => {
      todayButton?.click();
      await Promise.resolve();
    });

    expect(trigger.textContent).toContain(new Date().toLocaleDateString("vi-VN"));
    expect(document.body.textContent).not.toContain("Lịch AssetMaster");
  });

});
