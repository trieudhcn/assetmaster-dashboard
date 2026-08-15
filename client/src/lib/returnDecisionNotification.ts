export type ReturnDecisionStatus = "approved" | "rejected";

export function getReturnDecisionNotification(status: ReturnDecisionStatus, assetName: string) {
  const approved = status === "approved";
  return {
    title: approved ? "Yêu cầu hoàn trả đã được duyệt" : "Yêu cầu hoàn trả bị từ chối",
    description: approved ? `${assetName} đã được xác nhận hoàn trả.` : `Quản trị viên chưa thể duyệt yêu cầu hoàn trả ${assetName}.`,
    tone: approved ? "success" as const : "error" as const,
  };
}
