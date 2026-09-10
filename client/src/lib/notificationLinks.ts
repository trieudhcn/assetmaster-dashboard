export type NotificationTarget =
  | { type: "asset"; assetCode: string }
  | { type: "handover"; handoverId: number }
  | { type: "supplyRequest"; requestId: number };

export function getNotificationTargetLabel(target: NotificationTarget) {
  if (target.type === "asset") return "Mở tài sản";
  if (target.type === "handover") return "Mở phiếu bàn giao";
  return "Mở yêu cầu cấp phát";
}
