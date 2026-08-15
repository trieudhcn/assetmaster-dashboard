import { describe, expect, it } from "vitest";
import { getNotificationTargetLabel } from "../client/src/lib/notificationLinks";

describe("Notification links", () => {
  it("uses the correct destination label for an asset notification", () => {
    expect(getNotificationTargetLabel({ type: "asset", assetCode: "TS-00024" })).toBe("Mở tài sản");
  });

  it("uses the correct destination label for a handover notification", () => {
    expect(getNotificationTargetLabel({ type: "handover", handoverId: 42 })).toBe("Mở phiếu bàn giao");
  });
});
