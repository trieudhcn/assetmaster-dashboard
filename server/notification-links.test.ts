import { describe, expect, it } from "vitest";
import {
  getNotificationDestination,
  getNotificationTargetLabel,
} from "../client/src/lib/notificationLinks";

describe("Notification links", () => {
  it("routes an asset notification to the asset catalog", () => {
    const target = { type: "asset" as const, assetCode: "TS-00024" };
    expect(getNotificationTargetLabel(target)).toBe("Mở tài sản");
    expect(getNotificationDestination(target)).toEqual({
      navigationLabel: "Danh mục tài sản",
    });
  });

  it("routes a handover notification to handover and allocation", () => {
    const target = { type: "handover" as const, handoverId: 42 };
    expect(getNotificationTargetLabel(target)).toBe("Mở phiếu bàn giao");
    expect(getNotificationDestination(target)).toEqual({
      navigationLabel: "Bàn giao & Cấp phát",
      storageEntry: {
        key: "assetmaster-open-handover-id",
        value: "42",
      },
    });
  });

  it("routes a supply request notification to supplies", () => {
    const target = { type: "supplyRequest" as const, requestId: 24 };
    expect(getNotificationTargetLabel(target)).toBe("Mở yêu cầu cấp phát");
    expect(getNotificationDestination(target)).toEqual({
      navigationLabel: "Phụ kiện",
      storageEntry: {
        key: "assetmaster-open-supply-request-id",
        value: "24",
      },
    });
  });

  it("routes a maintenance ticket notification to maintenance", () => {
    const target = { type: "maintenance" as const, ticketId: 18 };
    expect(getNotificationTargetLabel(target)).toBe(
      "Mở Bảo hành/Sửa chữa"
    );
    expect(getNotificationDestination(target)).toEqual({
      navigationLabel: "Bảo hành & Sửa chữa",
      storageEntry: {
        key: "assetmaster-open-maintenance-ticket-id",
        value: "18",
      },
    });
  });

  it("routes an asset maintenance notification to its maintenance record", () => {
    expect(
      getNotificationDestination({
        type: "maintenance",
        assetCode: "TS-00024",
      })
    ).toEqual({
      navigationLabel: "Bảo hành & Sửa chữa",
      storageEntry: {
        key: "assetmaster-open-maintenance-asset-code",
        value: "TS-00024",
      },
    });
  });
});
