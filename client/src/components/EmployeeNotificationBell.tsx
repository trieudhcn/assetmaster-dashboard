import {
  Bell,
  Box,
  Check,
  CheckCheck,
  Clock3,
  PackageCheck,
  PackagePlus,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

type EmployeeNotification = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  kind: "asset" | "return" | "supply";
  target:
    | { type: "activeAssets" }
    | { type: "returnedAssets" }
    | { type: "supplyRequest"; requestId: number };
};

type EmployeeNotificationBellProps = {
  userKey: string;
  onOpenActiveAssets: () => void;
  onOpenReturnedAssets: () => void;
  onOpenSupplyRequest: (requestId: number) => void;
};

const recentNotificationWindow = 30 * 24 * 60 * 60 * 1000;

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function EmployeeNotificationBell({
  userKey,
  onOpenActiveAssets,
  onOpenReturnedAssets,
  onOpenSupplyRequest,
}: EmployeeNotificationBellProps) {
  const historyQuery = trpc.employees.myAssetHistory.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const requestsQuery = trpc.supplies.myRequests.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const storageKey = `assetmaster-user-read-notification-ids:${userKey}`;
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const notifications = useMemo<EmployeeNotification[]>(() => {
    const cutoff = Date.now() - recentNotificationWindow;
    const assetNotifications = (historyQuery.data || []).flatMap(item => {
      const events: EmployeeNotification[] = [];
      if (item.status === "active") {
        const createdAt = asDate(item.handedOverAt || item.updatedAt);
        if (createdAt && createdAt.getTime() >= cutoff)
          events.push({
            id: `employee-handover-${item.id}-active-${createdAt.getTime()}`,
            title: `${item.assetCode} đã được cấp phát`,
            description: `${item.assetName} · Phiếu ${item.referenceCode}.`,
            createdAt,
            kind: "asset",
            target: { type: "activeAssets" },
          });
      }
      if (item.status === "returned") {
        const createdAt = asDate(item.returnedAt || item.updatedAt);
        if (createdAt && createdAt.getTime() >= cutoff)
          events.push({
            id: `employee-handover-${item.id}-returned-${createdAt.getTime()}`,
            title: `${item.assetCode} đã hoàn trả`,
            description: `${item.assetName} đã được ghi nhận trong lịch sử hoàn trả.`,
            createdAt,
            kind: "return",
            target: { type: "returnedAssets" },
          });
      } else if (
        item.returnRequestStatus === "rejected" &&
        item.returnRequestResolvedAt
      ) {
        const createdAt = asDate(item.returnRequestResolvedAt);
        if (createdAt && createdAt.getTime() >= cutoff)
          events.push({
            id: `employee-return-${item.id}-rejected-${createdAt.getTime()}`,
            title: `Yêu cầu hoàn trả ${item.assetCode} bị từ chối`,
            description:
              item.returnRequestResolution ||
              "Xem phản hồi và bổ sung giải trình trên portal.",
            createdAt,
            kind: "return",
            target: { type: "activeAssets" },
          });
      }
      return events;
    });

    const supplyNotifications = (requestsQuery.data || []).flatMap(request => {
      if (
        request.status !== "fulfilled" &&
        request.status !== "partially_fulfilled" &&
        request.status !== "rejected"
      )
        return [];
      const createdAt = asDate(request.reviewedAt || request.updatedAt);
      if (!createdAt || createdAt.getTime() < cutoff) return [];
      const statusCopy =
        request.status === "fulfilled"
          ? {
              title: `${request.requestCode} đã được cấp phụ kiện`,
              description: "Yêu cầu đã được cấp đủ và tạo phiếu cấp phát.",
            }
          : request.status === "partially_fulfilled"
            ? {
                title: `${request.requestCode} đã được cấp một phần`,
                description:
                  "Một phần số lượng yêu cầu đã được duyệt và cấp phát.",
              }
            : {
                title: `${request.requestCode} đã bị từ chối`,
                description:
                  request.reviewNote ||
                  "Quản trị viên đã từ chối yêu cầu cấp phụ kiện.",
              };
      return [
        {
          id: `employee-supply-request-${request.id}-${request.status}-${createdAt.getTime()}`,
          ...statusCopy,
          createdAt,
          kind: "supply" as const,
          target: {
            type: "supplyRequest" as const,
            requestId: request.id,
          },
        },
      ];
    });

    return [...assetNotifications, ...supplyNotifications]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 20);
  }, [historyQuery.data, requestsQuery.data]);

  const unread = notifications.filter(item => !readIds.includes(item.id));

  const persistReadIds = (next: string[]) => {
    setReadIds(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const markRead = (id: string) => {
    if (readIds.includes(id)) return;
    persistReadIds([...readIds, id]);
  };
  const markAllRead = () => {
    persistReadIds(Array.from(new Set([...readIds, ...unread.map(item => item.id)])));
  };
  const openTarget = (notification: EmployeeNotification) => {
    markRead(notification.id);
    setOpen(false);
    if (notification.target.type === "activeAssets") onOpenActiveAssets();
    else if (notification.target.type === "returnedAssets")
      onOpenReturnedAssets();
    else onOpenSupplyRequest(notification.target.requestId);
  };

  return (
    <div ref={rootRef} className="relative z-40">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-[#DDE7F0] bg-white text-[#60758A] transition hover:bg-[#F7FAFC]"
        aria-label="Thông báo của bạn"
        aria-expanded={open}
      >
        <Bell size={17} />
        {unread.length > 0 ? (
          <span
            className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#F0A516] px-1 text-[9px] font-extrabold leading-none text-[#102A43] ring-2 ring-white"
            aria-label={`${unread.length} thông báo chưa đọc`}
          >
            {unread.length > 99 ? "99+" : unread.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] w-[min(330px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#DDE7F0] bg-white shadow-[0_18px_42px_rgba(16,42,67,.18)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#E7EEF3] px-4 py-3">
            <div>
              <div className="text-xs font-extrabold text-[#193B57]">
                Thông báo của bạn
              </div>
              <div className="mt-0.5 text-[10px] text-[#8AA0B6]">
                {unread.length
                  ? `${unread.length} thông báo chưa đọc`
                  : "Chưa có thông báo mới"}
              </div>
            </div>
            <button
              type="button"
              aria-label="Đánh dấu tất cả đã đọc"
              disabled={!unread.length}
              onClick={markAllRead}
              className="grid h-7 w-7 place-items-center rounded-md text-[#087A6A] transition hover:bg-[#E6F6F2] disabled:text-[#9BAEC0]"
            >
              <CheckCheck size={16} />
            </button>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2">
            {unread.length ? (
              unread.map(notification => {
                const Icon =
                  notification.kind === "asset"
                    ? Box
                    : notification.kind === "return"
                      ? RotateCcw
                      : notification.title.includes("từ chối")
                        ? PackagePlus
                        : PackageCheck;
                return (
                  <article
                    key={notification.id}
                    className="flex gap-3 rounded-lg bg-[#F2FAF8] p-3"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#0F8C8C]">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-[#193B57]">
                        {notification.title}
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-[#71869A]">
                        {notification.description}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-[#8AA0B6]">
                        <Clock3 size={11} />
                        {notification.createdAt.toLocaleString("vi-VN")}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openTarget(notification)}
                          className="text-[10px] font-extrabold text-[#2666A8] hover:text-[#1E5084]"
                        >
                          Xem chi tiết →
                        </button>
                        <button
                          type="button"
                          onClick={() => markRead(notification.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#087A6A]"
                        >
                          <Check size={11} />
                          Đã đọc
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <div className="text-xs font-extrabold text-[#193B57]">
                  Chưa có thông báo mới
                </div>
                <p className="mt-1 text-[11px] leading-5 text-[#71869A]">
                  Thông tin cấp phát và xử lý yêu cầu sẽ xuất hiện tại đây.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
