import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Database,
  Loader2,
  Network,
  RefreshCw,
  ServerCog,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type ServiceState = "ready" | "unavailable" | "not_configured";
type LdapsStepState = "waiting" | "active" | "done" | "error";

const initialLdapsSteps: Array<{ label: string; state: LdapsStepState }> = [
  { label: "TLS và CA", state: "waiting" },
  { label: "Tài khoản bind", state: "waiting" },
  { label: "Users Base DN", state: "waiting" },
];

const stateMeta: Record<
  ServiceState,
  { label: string; tone: string; iconTone: string }
> = {
  ready: {
    label: "Sẵn sàng",
    tone: "border-[#B8E3DA] bg-[#F2FCF9] text-[#087A6A]",
    iconTone: "bg-[#E6F6F2] text-[#087A6A]",
  },
  unavailable: {
    label: "Không kết nối",
    tone: "border-[#F3C7C7] bg-[#FFF6F6] text-[#B44545]",
    iconTone: "bg-[#FFF0F0] text-[#B44545]",
  },
  not_configured: {
    label: "Chưa cấu hình",
    tone: "border-[#F2D596] bg-[#FFF9EB] text-[#9A6800]",
    iconTone: "bg-[#FFF5DC] text-[#A86B00]",
  },
};

function ServiceCard({
  name,
  description,
  status,
  latencyMs,
  message,
}: {
  name: string;
  description: string;
  status: ServiceState;
  latencyMs: number | null;
  message: string;
}) {
  const meta = stateMeta[status];
  const Icon = status === "ready" ? CheckCircle2 : CircleAlert;

  return (
    <div className={`rounded-xl border p-4 ${meta.tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.iconTone}`}
          >
            <Database size={17} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold">{name}</div>
            <p className="mt-0.5 text-[10px] font-medium opacity-80">
              {description}
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/75 px-2 py-1 text-[10px] font-extrabold">
          <Icon size={12} />
          {meta.label}
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-5">{message}</p>
      {latencyMs !== null ? (
        <div className="mt-2 text-[10px] font-bold opacity-80">
          Phản hồi {latencyMs} ms
        </div>
      ) : null}
    </div>
  );
}

export function SelfHostedServiceStatusPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const healthQuery = trpc.selfHostedHealth.status.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const directoryQuery = trpc.directory.get.useQuery(undefined, {
    enabled: isAdmin && healthQuery.data?.selfHosted === true,
  });
  const utils = trpc.useUtils();
  const [ldapsSteps, setLdapsSteps] = useState(initialLdapsSteps);
  const [ldapsMessage, setLdapsMessage] = useState<string | null>(null);
  const testLdapsMutation = trpc.directory.test.useMutation({
    onMutate: () => {
      setLdapsMessage(null);
      setLdapsSteps([
        { label: "TLS và CA", state: "active" },
        { label: "Tài khoản bind", state: "waiting" },
        { label: "Users Base DN", state: "waiting" },
      ]);
    },
    onSuccess: result => {
      setLdapsSteps(
        initialLdapsSteps.map(step => ({ ...step, state: "done" }))
      );
      setLdapsMessage(result.message);
      void utils.directory.get.invalidate();
      void utils.directory.audit.invalidate();
    },
    onError: error => {
      setLdapsSteps([
        { label: "Không hoàn tất kiểm tra LDAPS", state: "error" },
      ]);
      setLdapsMessage(error.message || "Không thể kiểm tra LDAPS đã lưu.");
      void utils.directory.get.invalidate();
      void utils.directory.audit.invalidate();
    },
  });

  if (!isAdmin || (healthQuery.isSuccess && !healthQuery.data.selfHosted))
    return null;

  return (
    <section
      id="self-hosted-service-status"
      className="mx-auto mt-5 max-w-[1000px] px-4 sm:px-6 lg:px-9"
    >
      <div className="rounded-xl border border-[#D7E6EA] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EAF3FF] text-[#2666A8]">
              <ServerCog size={19} />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#2666A8]">
                Self-hosted monitoring
              </div>
              <h2 className="mt-1 font-display text-base font-extrabold text-[#102A43]">
                Trạng thái hạ tầng
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#71869A]">
                Kiểm tra an toàn MySQL và Redis; không hiển thị host, password
                hoặc Docker secret.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void healthQuery.refetch()}
            disabled={healthQuery.isFetching}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-extrabold text-[#087A6A] transition hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={healthQuery.isFetching ? "animate-spin" : ""}
              size={15}
            />
            Làm mới
          </button>
        </div>
        {healthQuery.isLoading ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="h-32 animate-pulse rounded-xl bg-[#F3F7F9]" />
            <div className="h-32 animate-pulse rounded-xl bg-[#F3F7F9]" />
          </div>
        ) : healthQuery.isError ? (
          <div
            role="alert"
            className="mt-5 flex gap-2 rounded-xl border border-[#F3C7C7] bg-[#FFF6F6] p-3 text-xs leading-5 text-[#B44545]"
          >
            <CircleAlert className="mt-0.5 shrink-0" size={16} />
            Không thể đọc trạng thái dịch vụ. Hãy làm mới hoặc xem log
            container.
          </div>
        ) : healthQuery.data?.selfHosted ? (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ServiceCard
                name="MySQL"
                description="Dữ liệu nghiệp vụ, audit và session"
                status={healthQuery.data.mysql.status}
                latencyMs={healthQuery.data.mysql.latencyMs}
                message={healthQuery.data.mysql.message}
              />
              <ServiceCard
                name="Redis"
                description="Cache/queue sẵn sàng cho runtime"
                status={healthQuery.data.redis.status}
                latencyMs={healthQuery.data.redis.latencyMs}
                message={healthQuery.data.redis.message}
              />
            </div>
            <section className="mt-4 rounded-xl border border-[#DCE7F0] bg-[#FBFDFF] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F1ECFF] text-[#6841C6]">
                    <Network size={17} />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#193B57]">
                      Kiểm tra LDAPS đã lưu
                    </div>
                    <p className="mt-0.5 text-[10px] leading-4 text-[#71869A]">
                      Xác minh TLS/CA, Docker secret bind và Users Base DN. Mật
                      khẩu không được gửi về trình duyệt.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => testLdapsMutation.mutate()}
                  disabled={!directoryQuery.data || testLdapsMutation.isPending}
                  title={
                    directoryQuery.data
                      ? undefined
                      : "Cần lưu cấu hình Directory trước khi kiểm tra"
                  }
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#D5C8F3] bg-white px-3 text-xs font-extrabold text-[#6841C6] transition hover:bg-[#F5F1FF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {testLdapsMutation.isPending ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Network size={14} />
                  )}
                  {testLdapsMutation.isPending
                    ? "Đang kiểm tra…"
                    : "Kiểm tra LDAPS"}
                </button>
              </div>
              {!directoryQuery.data && !directoryQuery.isLoading ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2 text-[11px] leading-5 text-[#8F5A00]">
                  <span>Chưa có cấu hình Directory được lưu để kiểm tra.</span>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new Event("assetmaster:open-directory-settings")
                      )
                    }
                    className="font-extrabold text-[#6841C6] hover:text-[#4F2EA4]"
                  >
                    Mở cấu hình Directory
                  </button>
                </div>
              ) : null}
              {ldapsSteps.some(step => step.state !== "waiting") ? (
                <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                  {ldapsSteps.map(step => {
                    const active = step.state === "active";
                    const done = step.state === "done";
                    const error = step.state === "error";
                    return (
                      <li
                        key={step.label}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[10px] font-bold ${
                          active
                            ? "border-[#C9DDF5] bg-[#F4F9FF] text-[#2666A8]"
                            : done
                              ? "border-[#B8E3DA] bg-[#F2FCF9] text-[#087A6A]"
                              : error
                                ? "border-[#F3C7C7] bg-[#FFF6F6] text-[#B44545]"
                                : "border-[#E7EEF3] bg-white text-[#71869A]"
                        }`}
                      >
                        {active ? (
                          <Loader2 className="animate-spin" size={12} />
                        ) : done ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <CircleAlert size={12} />
                        )}
                        {step.label}
                      </li>
                    );
                  })}
                </ol>
              ) : null}
              {ldapsMessage ? (
                <p
                  className={`mt-3 rounded-lg px-3 py-2 text-[11px] leading-5 ${
                    testLdapsMutation.isError
                      ? "bg-[#FFF6F6] text-[#B44545]"
                      : "bg-[#F2FCF9] text-[#087A6A]"
                  }`}
                >
                  {ldapsMessage}
                </p>
              ) : null}
            </section>
            <div className="mt-4 flex items-center gap-2 border-t border-[#E7EEF3] pt-4 text-[10px] font-semibold text-[#8AA0B6]">
              <Activity size={13} className="text-[#0F8C8C]" />
              Tự làm mới mỗi 30 giây khi đang mở trang Cài đặt.
            </div>
          </>
        ) : (
          <div className="mt-5 flex items-center gap-2 text-xs text-[#71869A]">
            <Loader2 className="animate-spin" size={15} />
            Đang kiểm tra chế độ triển khai…
          </div>
        )}
      </div>
    </section>
  );
}
