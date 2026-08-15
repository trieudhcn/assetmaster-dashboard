export type NotificationTarget =
  | { type: "asset"; assetCode: string }
  | { type: "handover"; handoverId: number };

export function getNotificationTargetLabel(target: NotificationTarget) {
  return target.type === "asset" ? "Mở tài sản" : "Mở phiếu bàn giao";
}
