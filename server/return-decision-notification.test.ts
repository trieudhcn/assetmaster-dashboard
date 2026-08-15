import { describe, expect, it } from "vitest";
import { getReturnDecisionNotification } from "../client/src/lib/returnDecisionNotification";

describe("Return decision notification", () => {
  it("creates an approval notification with the returned asset name", () => {
    expect(getReturnDecisionNotification("approved", "Laptop Dell")).toMatchObject({ title: "Yêu cầu hoàn trả đã được duyệt", description: "Laptop Dell đã được xác nhận hoàn trả.", tone: "success" });
  });

  it("creates a rejection notification with the returned asset name", () => {
    expect(getReturnDecisionNotification("rejected", "Laptop Dell")).toMatchObject({ title: "Yêu cầu hoàn trả bị từ chối", tone: "error" });
  });
});
