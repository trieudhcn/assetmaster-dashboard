export type NotificationTarget =
  | { type: "asset"; assetCode: string }
  | { type: "handover"; handoverId: number }
  | { type: "supplyRequest"; requestId: number }
  | { type: "supplyReturnRequest"; requestId: number }
  | {
      type: "maintenance";
      ticketId?: number;
      assetCode?: string;
    };

export type NotificationDestination = {
  navigationLabel:
    | "Danh mục tài sản"
    | "Bàn giao & Cấp phát"
    | "Phụ kiện"
    | "Bảo hành & Sửa chữa";
  storageEntry?: {
    key: string;
    value: string;
  };
};

export function getNotificationTargetLabel(target: NotificationTarget) {
  if (target.type === "asset") return "Mở tài sản";
  if (target.type === "handover") return "Mở phiếu bàn giao";
  if (target.type === "maintenance") return "Mở Bảo hành/Sửa chữa";
  if (target.type === "supplyReturnRequest")
    return "Mở yêu cầu hoàn trả";
  return "Mở yêu cầu cấp phát";
}

export function getNotificationDestination(
  target: NotificationTarget
): NotificationDestination {
  if (target.type === "asset")
    return { navigationLabel: "Danh mục tài sản" };
  if (target.type === "handover")
    return {
      navigationLabel: "Bàn giao & Cấp phát",
      storageEntry: {
        key: "assetmaster-open-handover-id",
        value: String(target.handoverId),
      },
    };
  if (target.type === "supplyRequest")
    return {
      navigationLabel: "Phụ kiện",
      storageEntry: {
        key: "assetmaster-open-supply-request-id",
        value: String(target.requestId),
      },
    };
  if (target.type === "supplyReturnRequest")
    return {
      navigationLabel: "Phụ kiện",
      storageEntry: {
        key: "assetmaster-open-supply-return-request-id",
        value: String(target.requestId),
      },
    };
  if (target.ticketId)
    return {
      navigationLabel: "Bảo hành & Sửa chữa",
      storageEntry: {
        key: "assetmaster-open-maintenance-ticket-id",
        value: String(target.ticketId),
      },
    };
  if (target.assetCode)
    return {
      navigationLabel: "Bảo hành & Sửa chữa",
      storageEntry: {
        key: "assetmaster-open-maintenance-asset-code",
        value: target.assetCode,
      },
    };
  return { navigationLabel: "Bảo hành & Sửa chữa" };
}
