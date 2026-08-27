import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Database,
  KeyRound,
  Loader2,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type SetupForm = {
  setupToken: string;
  websiteName: string;
  websiteUrl: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
  databaseHost: string;
  databasePort: string;
  databaseName: string;
  databaseUsername: string;
  databasePassword: string;
};

type SetupStep = 1 | 2 | 3;

const defaultForm: SetupForm = {
  setupToken: new URLSearchParams(window.location.search).get("token") || "",
  websiteName: "AssetMaster",
  websiteUrl: window.location.origin,
  adminName: "Quản trị viên",
  adminEmail: "",
  adminPassword: "",
  confirmPassword: "",
  databaseHost: "mysql",
  databasePort: "3306",
  databaseName: "assetmaster",
  databaseUsername: "assetmaster",
  databasePassword: "",
};

const steps = [
  {
    number: 1,
    label: "Website & Admin",
    description: "Tên hiển thị và tài khoản break-glass.",
  },
  {
    number: 2,
    label: "MySQL",
    description: "Kết nối database và kiểm tra schema.",
  },
  {
    number: 3,
    label: "Rà soát",
    description: "Xác nhận trước khi khởi tạo hệ thống.",
  },
] as const;

const initializationSteps = [
  "Xác thực mã cài đặt và kiểm tra điều kiện khởi tạo.",
  "Kiểm tra database, tạo schema nếu cần và chạy migration versioned.",
  "Tạo tài khoản Quản trị viên bootstrap với mật khẩu Argon2id.",
];

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 text-[11px] font-extrabold text-[#526779]">
      <span>{label}</span>
      {children}
      {help ? (
        <span className="mt-1 block text-[10px] font-medium leading-4 text-[#8AA0B6]">
          {help}
        </span>
      ) : null}
    </label>
  );
}

function StepProgress({ step }: { step: SetupStep }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Tiến trình cài đặt">
      {steps.map((item, index) => (
        <li key={item.number} className="relative min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${step > item.number ? "bg-[#0F8C8C] text-white" : step === item.number ? "bg-[#E6F6F2] text-[#087A6A] ring-2 ring-[#A8DCD5]" : "bg-[#F0F5F8] text-[#8AA0B6]"}`}
            >
              {step > item.number ? "✓" : item.number}
            </span>
            {index < steps.length - 1 ? (
              <span
                className={`h-0.5 flex-1 ${step > item.number ? "bg-[#0F8C8C]" : "bg-[#DDE7F0]"}`}
              />
            ) : null}
          </div>
          <p
            className={`mt-2 text-[10px] font-extrabold leading-4 ${step === item.number ? "text-[#193B57]" : "text-[#8AA0B6]"}`}
          >
            {item.label}
          </p>
        </li>
      ))}
    </ol>
  );
}

function SetupPageLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F4F7FB] p-6">
      <section className="w-full max-w-md rounded-3xl border border-[#D7E6EA] bg-white p-8 text-center shadow-[0_20px_60px_rgba(16,42,67,.12)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#E6F6F2] text-[#087A6A]">
          <Loader2 className="animate-spin" size={25} />
        </div>
        <h1 className="mt-5 font-display text-xl font-extrabold text-[#102A43]">
          Đang kiểm tra môi trường cài đặt
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#71869A]">
          AssetMaster đang xác định trạng thái self-hosted và database hiện có.
          Không có thay đổi nào được thực hiện ở bước này.
        </p>
        <div className="mt-5 space-y-2 text-left">
          <div className="h-2 animate-pulse rounded-full bg-[#EAF3F4]" />
          <div className="h-2 w-4/5 animate-pulse rounded-full bg-[#EAF3F4]" />
          <div className="h-2 w-3/5 animate-pulse rounded-full bg-[#EAF3F4]" />
        </div>
      </section>
    </main>
  );
}

export default function SetupInstaller() {
  const statusQuery = trpc.setup.status.useQuery();
  const checkDatabase = trpc.setup.checkDatabase.useMutation();
  const initialize = trpc.setup.initialize.useMutation();
  const [step, setStep] = useState<SetupStep>(1);
  const [form, setForm] = useState<SetupForm>(defaultForm);
  const [databaseMessage, setDatabaseMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);
  const [formError, setFormError] = useState("");
  const update = <K extends keyof SetupForm>(key: K, value: SetupForm[K]) => {
    setFormError("");
    if (
      [
        "databaseHost",
        "databasePort",
        "databaseName",
        "databaseUsername",
        "databasePassword",
        "setupToken",
      ].includes(key)
    )
      setDatabaseMessage(null);
    setForm(current => ({ ...current, [key]: value }));
  };
  const database = useMemo(
    () => ({
      host: form.databaseHost,
      port: Number(form.databasePort),
      databaseName: form.databaseName,
      username: form.databaseUsername,
      password: form.databasePassword,
    }),
    [
      form.databaseHost,
      form.databasePort,
      form.databaseName,
      form.databasePassword,
      form.databaseUsername,
    ]
  );
  const websiteStepValid = Boolean(
    form.websiteName.trim() &&
      form.adminName.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail) &&
      form.adminPassword.length >= 12 &&
      form.adminPassword === form.confirmPassword
  );
  const databaseStepValid = Boolean(
    form.setupToken &&
      form.databaseHost &&
      form.databasePort &&
      form.databaseName &&
      form.databaseUsername &&
      form.databasePassword &&
      databaseMessage?.success
  );
  const isWorking = checkDatabase.isPending || initialize.isPending;

  const validateWebsiteStep = () => {
    if (
      !form.websiteName.trim() ||
      !form.adminName.trim() ||
      !form.adminEmail.trim()
    )
      return "Hãy nhập tên website và thông tin Quản trị viên.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail))
      return "Email Quản trị viên không hợp lệ.";
    if (form.adminPassword.length < 12)
      return "Mật khẩu Quản trị viên cần ít nhất 12 ký tự.";
    if (form.adminPassword !== form.confirmPassword)
      return "Xác nhận mật khẩu Quản trị viên chưa khớp.";
    return null;
  };

  const next = () => {
    const error = validateWebsiteStep();
    if (step === 1 && error) return setFormError(error);
    if (step === 2 && !databaseStepValid)
      return setFormError("Hãy kiểm tra MySQL thành công trước khi tiếp tục.");
    setFormError("");
    setStep(current => Math.min(3, current + 1) as SetupStep);
  };

  const checkConnection = () => {
    if (
      !form.setupToken ||
      !form.databaseHost ||
      !form.databasePort ||
      !form.databaseName ||
      !form.databaseUsername ||
      !form.databasePassword
    ) {
      setDatabaseMessage({
        success: false,
        text: "Nhập mã cài đặt và đầy đủ thông tin MySQL trước khi kiểm tra.",
      });
      return;
    }
    checkDatabase.mutate(
      { setupToken: form.setupToken, database },
      {
        onSuccess: result => {
          setDatabaseMessage({ success: result.success, text: result.message });
          if (!result.success) setFormError("");
        },
        onError: error =>
          setDatabaseMessage({
            success: false,
            text: error.message || "Không thể kiểm tra MySQL.",
          }),
      }
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const error = validateWebsiteStep();
    if (error) {
      setFormError(error);
      setStep(1);
      return;
    }
    if (!databaseStepValid) {
      setFormError("Hãy kiểm tra MySQL thành công trước khi khởi tạo.");
      setStep(2);
      return;
    }
    initialize.mutate(
      {
        setupToken: form.setupToken,
        websiteName: form.websiteName,
        websiteUrl: form.websiteUrl,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        database,
      },
      {
        onSuccess: () => {
          window.history.replaceState({}, "", "/");
          window.location.assign("/");
        },
        onError: error =>
          setFormError(error.message || "Không thể hoàn tất cài đặt."),
      }
    );
  };

  if (statusQuery.isLoading) return <SetupPageLoading />;
  if (!statusQuery.data?.selfHosted)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F4F7FB] p-6">
        <section className="w-full max-w-lg rounded-3xl border border-[#F2D596] bg-white p-8 text-center shadow-[0_20px_60px_rgba(16,42,67,.12)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FFF9EB] text-[#A86B00]">
            <LockKeyhole size={24} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold text-[#102A43]">
            Installer chỉ dùng cho self-hosted
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#71869A]">
            Bản đang chạy được quản lý không cho phép khởi tạo database hoặc tài
            khoản cục bộ từ trang này.
          </p>
        </section>
      </main>
    );
  if (statusQuery.data.installed)
    return (
      <main className="grid min-h-screen place-items-center bg-[#F4F7FB] p-6">
        <section className="w-full max-w-lg rounded-3xl border border-[#CDE5E5] bg-white p-8 text-center shadow-[0_20px_60px_rgba(16,42,67,.12)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#E6F6F2] text-[#087A6A]">
            <CheckCircle2 size={26} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold text-[#102A43]">
            AssetMaster đã được cài đặt
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#71869A]">
            Vì lý do an toàn, wizard không thể chạy lại. Hãy đăng nhập bằng tài
            khoản Quản trị viên.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex rounded-xl bg-[#0F8C8C] px-5 py-3 text-sm font-extrabold text-white"
          >
            Đến trang đăng nhập
          </a>
        </section>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:py-10">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-[#D7E6EA] bg-white shadow-[0_24px_70px_rgba(16,42,67,.13)] lg:grid-cols-[.72fr_1.28fr]">
        <aside className="relative overflow-hidden bg-[#102A43] p-7 text-white sm:p-9">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#0F8C8C]/30 blur-3xl" />
          <div className="relative">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1B5C68] text-[#BDF1E8]">
              <ServerCog size={23} />
            </div>
            <div className="mt-8 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#79D2C6]">
              Thiết lập lần đầu
            </div>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-[-.04em]">
              Khởi tạo AssetMaster nội bộ
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#B5C8D5]">
              Hoàn thành ba bước để tạo dữ liệu nền tảng và tài khoản quản trị
              đầu tiên.
            </p>
            <div className="mt-7 rounded-xl border border-[#31566F] bg-[#163B56]/80 p-4">
              <div className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#79D2C6]">
                Trước khi bắt đầu
              </div>
              <ul className="mt-3 space-y-2 text-[11px] leading-5 text-[#C6D7E0]">
                <li>• Giữ mã cài đặt và password MySQL trong Docker secret.</li>
                <li>• Xác nhận MySQL đã healthy trong `docker compose ps`.</li>
                <li>• Cấu hình LDAPS sau khi đăng nhập Admin bootstrap.</li>
              </ul>
            </div>
            <div className="mt-6 space-y-3">
              {steps.map(item => (
                <div
                  key={item.number}
                  className={`flex gap-3 rounded-xl p-3 ${step === item.number ? "bg-[#1B5263]" : ""}`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${step > item.number ? "bg-[#0F8C8C]" : step === item.number ? "bg-white text-[#087A6A]" : "border border-[#527C8F] text-[#B5C8D5]"}`}
                  >
                    {step > item.number ? "✓" : item.number}
                  </span>
                  <div>
                    <b className="text-xs">{item.label}</b>
                    <p className="mt-0.5 text-[10px] leading-4 text-[#A5C3D2]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
        <section className="p-5 sm:p-8 lg:p-10">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]">
              <ShieldCheck size={19} />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#0F8C8C]">
                Bước {step}/3
              </div>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-[#102A43]">
                {step === 1
                  ? "Website và Quản trị viên"
                  : step === 2
                    ? "Kết nối MySQL"
                    : "Rà soát và khởi tạo"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#71869A]">
                {step === 1
                  ? "Tài khoản này dùng cho quản trị khẩn cấp; nhân viên sẽ dùng LDAPS sau khi cấu hình."
                  : step === 2
                    ? "Kiểm tra MySQL trước khi khởi tạo; Redis được Docker Compose theo dõi sau khi đăng nhập."
                    : "Xác nhận lần cuối. Mật khẩu không được hiển thị hoặc lưu ở trình duyệt sau khi hoàn tất."}
              </p>
            </div>
          </div>
          <div className="mt-7">
            <StepProgress step={step} />
          </div>
          <form onSubmit={submit} className="mt-7">
            {step === 1 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tên website">
                  <input
                    value={form.websiteName}
                    onChange={event =>
                      update("websiteName", event.target.value)
                    }
                    className="setup-input mt-1.5"
                    required
                  />
                </Field>
                <Field
                  label="URL nội bộ"
                  help="Ví dụ: https://assetmaster.noibo.local"
                >
                  <input
                    value={form.websiteUrl}
                    onChange={event => update("websiteUrl", event.target.value)}
                    className="setup-input mt-1.5"
                  />
                </Field>
                <Field label="Tên Quản trị viên">
                  <input
                    value={form.adminName}
                    onChange={event => update("adminName", event.target.value)}
                    className="setup-input mt-1.5"
                    required
                  />
                </Field>
                <Field label="Email Quản trị viên">
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={event => update("adminEmail", event.target.value)}
                    placeholder="admin@congty.vn"
                    className="setup-input mt-1.5"
                    required
                  />
                </Field>
                <Field
                  label="Mật khẩu Quản trị viên"
                  help="Tối thiểu 12 ký tự; chỉ lưu Argon2id hash."
                >
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={form.adminPassword}
                    onChange={event =>
                      update("adminPassword", event.target.value)
                    }
                    className="setup-input mt-1.5"
                    required
                  />
                </Field>
                <Field label="Xác nhận mật khẩu">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={event =>
                      update("confirmPassword", event.target.value)
                    }
                    className="setup-input mt-1.5"
                    required
                  />
                </Field>
              </div>
            ) : null}
            {step === 2 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Máy chủ MySQL">
                  <input
                    autoFocus
                    value={form.databaseHost}
                    onChange={event =>
                      update("databaseHost", event.target.value)
                    }
                    className="setup-input mt-1.5"
                    required
                  />
                </Field>
                <Field label="Cổng">
                  <input
                    inputMode="numeric"
                    value={form.databasePort}
                    onChange={event =>
                      update(
                        "databasePort",
                        event.target.value.replace(/\D/g, "")
                      )
                    }
                    className="setup-input mt-1.5"
                    required
                  />
                </Field>
                <Field label="Tên database">
                  <input
                    value={form.databaseName}
                    onChange={event =>
                      update("databaseName", event.target.value)
                    }
                    className="setup-input mt-1.5"
                    required
                  />
                </Field>
                <Field label="Tài khoản MySQL">
                  <input
                    value={form.databaseUsername}
                    onChange={event =>
                      update("databaseUsername", event.target.value)
                    }
                    className="setup-input mt-1.5"
                    required
                  />
                </Field>
                <Field
                  label="Mật khẩu MySQL"
                  help="Docker Compose: dùng mysql_app_password.txt."
                >
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={form.databasePassword}
                    onChange={event =>
                      update("databasePassword", event.target.value)
                    }
                    className="setup-input mt-1.5"
                    required
                  />
                </Field>
                <Field
                  label="Mã cài đặt"
                  help="Khớp Docker secret setup_token.txt."
                >
                  <input
                    type="password"
                    autoComplete="one-time-code"
                    value={form.setupToken}
                    onChange={event => update("setupToken", event.target.value)}
                    className="setup-input mt-1.5"
                    required
                  />
                </Field>
                <div className="sm:col-span-2 rounded-xl border border-[#E0E9EF] bg-[#FBFCFD] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold text-[#193B57]">
                        Xác minh MySQL trước khi tiếp tục
                      </h3>
                      <p className="mt-1 text-[11px] leading-5 text-[#71869A]">
                        Hệ thống chỉ cho phép khởi tạo sau khi kiểm tra kết nối
                        thành công. Không kiểm tra Redis ở đây vì Redis được
                        Compose khởi động độc lập.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={checkConnection}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CDE5E5] bg-white px-4 py-2.5 text-xs font-extrabold text-[#087A6A] hover:bg-[#ECF8F7] disabled:opacity-50"
                    >
                      {checkDatabase.isPending ? (
                        <Loader2 className="animate-spin" size={15} />
                      ) : (
                        <Database size={15} />
                      )}
                      {checkDatabase.isPending
                        ? "Đang kiểm tra…"
                        : "Kiểm tra MySQL"}
                    </button>
                  </div>
                  {databaseMessage ? (
                    <div
                      className={`mt-3 flex gap-2 rounded-lg border p-3 text-[11px] leading-5 ${databaseMessage.success ? "border-[#B8E3DA] bg-[#F2FCF9] text-[#087A6A]" : "border-[#F3C7C7] bg-[#FFF6F6] text-[#B44545]"}`}
                    >
                      {databaseMessage.success ? (
                        <CheckCircle2 className="mt-0.5 shrink-0" size={15} />
                      ) : (
                        <CircleAlert className="mt-0.5 shrink-0" size={15} />
                      )}
                      <span>{databaseMessage.text}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {step === 3 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#CDE5E5] bg-[#F6FCFB] p-4">
                  <h3 className="text-xs font-extrabold text-[#193B57]">
                    Thông tin sẽ được khởi tạo
                  </h3>
                  <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-[#71869A]">Website</dt>
                      <dd className="mt-1 font-bold text-[#193B57]">
                        {form.websiteName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71869A]">URL nội bộ</dt>
                      <dd className="mt-1 break-all font-bold text-[#193B57]">
                        {form.websiteUrl || "Chưa khai báo"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71869A]">Admin bootstrap</dt>
                      <dd className="mt-1 font-bold text-[#193B57]">
                        {form.adminName} · {form.adminEmail}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71869A]">Database</dt>
                      <dd className="mt-1 font-bold text-[#193B57]">
                        {form.databaseHost}:{form.databasePort}/
                        {form.databaseName}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-3 text-[11px] leading-5 text-[#8F5A00]">
                  <b>Lưu ý:</b> thao tác tạo database/schema, chạy migration và
                  tạo Admin chỉ được hoàn tất một lần.
                </div>
                {initialize.isPending ? (
                  <div
                    role="status"
                    className="rounded-xl border border-[#B8E3DA] bg-[#F2FCF9] p-4"
                  >
                    <div className="flex gap-3">
                      <Loader2
                        className="mt-0.5 shrink-0 animate-spin text-[#087A6A]"
                        size={18}
                      />
                      <div>
                        <div className="text-xs font-extrabold text-[#087A6A]">
                          Đang cấu hình hệ thống
                        </div>
                        <p className="mt-1 text-[11px] leading-5 text-[#4B8884]">
                          Không đóng trang hoặc tải lại trình duyệt. Máy chủ
                          đang thực hiện chuỗi thao tác sau:
                        </p>
                        <ol className="mt-3 space-y-2">
                          {initializationSteps.map((item, index) => (
                            <li
                              key={item}
                              className="flex gap-2 text-[11px] leading-5 text-[#356B67]"
                            >
                              <span
                                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${index === 0 ? "bg-[#0F8C8C] text-white" : "bg-[#DDF1EE] text-[#087A6A]"}`}
                              >
                                {index === 0 ? (
                                  <Loader2 className="animate-spin" size={11} />
                                ) : (
                                  index + 1
                                )}
                              </span>
                              {item}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#DDE7F0] bg-[#FBFCFD] p-4">
                    <h3 className="text-xs font-extrabold text-[#193B57]">
                      Các bước máy chủ sẽ thực hiện
                    </h3>
                    <ol className="mt-3 space-y-2">
                      {initializationSteps.map((item, index) => (
                        <li
                          key={item}
                          className="flex gap-2 text-[11px] leading-5 text-[#60758A]"
                        >
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#EEF5F8] text-[10px] font-extrabold text-[#527089]">
                            {index + 1}
                          </span>
                          {item}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : null}
            {formError ? (
              <div
                role="alert"
                className="mt-5 flex gap-2 rounded-xl border border-[#F3C7C7] bg-[#FFF6F6] p-3 text-xs leading-5 text-[#B44545]"
              >
                <CircleAlert className="mt-0.5 shrink-0" size={16} />
                {formError}
              </div>
            ) : null}
            <div className="mt-7 flex items-center justify-between border-t border-[#E7EEF3] pt-5">
              {step > 1 ? (
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => {
                    setFormError("");
                    setStep(current => Math.max(1, current - 1) as SetupStep);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#DDE7F0] bg-white px-4 py-2.5 text-xs font-extrabold text-[#60758A] hover:bg-[#F7FAFC]"
                >
                  <ArrowLeft size={15} />
                  Quay lại
                </button>
              ) : (
                <span />
              )}
              {step < 3 ? (
                <button
                  type="button"
                  disabled={isWorking || (step === 1 && !websiteStepValid)}
                  onClick={next}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0F8C8C] px-4 py-2.5 text-xs font-extrabold text-white shadow-[0_8px_18px_rgba(15,140,140,.2)] hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tiếp tục
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isWorking || !databaseStepValid}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0F8C8C] px-4 py-2.5 text-xs font-extrabold text-white shadow-[0_8px_18px_rgba(15,140,140,.2)] hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {initialize.isPending ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : (
                    <KeyRound size={15} />
                  )}
                  {initialize.isPending
                    ? "Đang cấu hình hệ thống…"
                    : "Khởi tạo hệ thống"}
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
