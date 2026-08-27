import { type FormEvent, useState } from "react";
import { Building2, ChevronRight, KeyRound, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const defaultBrand = { name: "AssetMaster", websiteTitle: "Enterprise OS", loginGreeting: "Quản lý tài sản, theo đúng vai trò của bạn." };

export function LoginGateway({ onLogin }: { onLogin: () => void }) {
  const brandQuery = trpc.company.publicBrand.useQuery();
  const directoryQuery = trpc.directory.publicStatus.useQuery();
  const localLogin = trpc.auth.localLogin.useMutation();
  const directoryLogin = trpc.auth.directoryLogin.useMutation();
  const [mode, setMode] = useState<"directory" | "local">("directory");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const brand = brandQuery.data;
  const companyName = brand?.name?.trim() || defaultBrand.name;
  const websiteTitle = brand?.websiteTitle?.trim() || defaultBrand.websiteTitle;
  const loginGreeting = brand?.loginGreeting?.trim() || defaultBrand.loginGreeting;
  const loginBackgroundUrl = brand?.loginBackgroundUrl || "";
  const loginBackgroundOverlay = brand?.loginBackgroundOverlay === "dark" ? "dark" : "light";
  const logoUrl = brand?.logoUrl || "/manus-storage/assetmaster-logo_f5d79b06.png";
  const loginSurfaceStyle = loginBackgroundUrl ? { backgroundImage: `${loginBackgroundOverlay === "dark" ? "linear-gradient(120deg, rgba(16,42,67,.84), rgba(16,42,67,.48))" : "linear-gradient(120deg, rgba(244,247,251,.87), rgba(244,247,251,.52))"}, url(${loginBackgroundUrl})` } : undefined;
  const selfHosted = directoryQuery.data?.selfHosted === true;
  const directoryEnabled = directoryQuery.data?.enabled === true;
  const isSubmitting = localLogin.isPending || directoryLogin.isPending;

  const completeLogin = () => {
    setPassword("");
    window.location.assign("/");
  };
  const submitSelfHostedLogin = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    if (mode === "local") localLogin.mutate({ email, password }, { onSuccess: completeLogin, onError: (error) => toast.error(error.message || "Không thể đăng nhập quản trị viên.") });
    else directoryLogin.mutate({ email, password }, { onSuccess: completeLogin, onError: (error) => toast.error(error.message || "Không thể xác thực Directory.") });
  };

  return <main style={loginSurfaceStyle} className="relative grid min-h-screen overflow-hidden bg-[#F4F7FB] bg-cover bg-center px-5 py-8 lg:grid-cols-[1.1fr_.9fr] lg:p-8">
    <div className="pointer-events-none absolute -left-24 top-[-150px] h-[420px] w-[420px] rounded-full bg-[#BDE7E2]/60 blur-3xl" />
    <div className="pointer-events-none absolute bottom-[-180px] right-[-140px] h-[460px] w-[460px] rounded-full bg-[#D7E7F8]/75 blur-3xl" />
    <section className="relative z-10 flex flex-col justify-between rounded-3xl bg-[#102A43]/95 p-7 text-white shadow-[0_22px_60px_rgba(16,42,67,.2)] backdrop-blur-[2px] sm:p-10">
      <div><div className="flex items-start gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center"><img src={logoUrl} alt={`Logo ${companyName}`} className="h-12 w-12 object-contain" /></div><div className="min-w-0 pt-0.5"><div className="font-display text-2xl font-extrabold leading-tight tracking-[-.04em] sm:text-[27px]">{companyName}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[.15em] text-[#A5C3D2]">{websiteTitle}</div></div></div><div className="mt-16 max-w-xl"><div className="inline-flex items-center gap-2 rounded-full border border-[#3C637C] bg-[#173A56] px-3 py-1.5 text-[11px] font-bold text-[#BDF1E8]"><ShieldCheck size={14} />Không gian làm việc an toàn</div><h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-[-.055em] sm:text-5xl">{loginGreeting}</h1><p className="mt-5 max-w-md text-sm leading-7 text-[#B5C8D5]">Quản trị viên điều hành toàn bộ vòng đời tài sản. Nhân viên theo dõi hồ sơ và thiết bị đang được cấp phát cho mình.</p></div></div><div className="mt-12 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-[#294F6A] bg-[#173A56]/75 p-4"><div className="text-xs font-extrabold text-[#BDF1E8]">Quản trị viên</div><p className="mt-2 text-[11px] leading-5 text-[#A5C3D2]">Tài khoản bootstrap cục bộ luôn có mặt để vận hành khẩn cấp.</p></div><div className="rounded-2xl border border-[#294F6A] bg-[#173A56]/75 p-4"><div className="text-xs font-extrabold text-[#BDF1E8]">Nhân viên</div><p className="mt-2 text-[11px] leading-5 text-[#A5C3D2]">Xác thực trực tiếp bằng email và mật khẩu Active Directory qua LDAPS.</p></div></div></section>
    <section className="relative z-10 flex items-center justify-center py-10 lg:py-0"><div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-7 shadow-[0_22px_60px_rgba(16,42,67,.12)] backdrop-blur-sm sm:p-9"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E6F6F2] text-[#0F8C8C]">{selfHosted ? <Building2 size={21} /> : <LockKeyhole size={21} />}</div><div className="mt-6"><div className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#0F8C8C]">Đăng nhập {companyName}</div><h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-.045em] text-[#102A43]">Chào mừng trở lại</h2><p className="mt-3 text-sm leading-6 text-[#71869A]">{selfHosted ? "Dùng email nội bộ để xác thực Directory, hoặc tài khoản Admin cục bộ khi cần khôi phục quản trị." : "Đăng nhập bằng tài khoản tổ chức. Hệ thống sẽ tự nhận diện vai trò và mở đúng dashboard của bạn."}</p></div>{selfHosted ? <form onSubmit={submitSelfHostedLogin} className="mt-6"><div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F1F5F7] p-1"><button type="button" onClick={() => setMode("directory")} className={`rounded-lg px-3 py-2 text-xs font-extrabold transition ${mode === "directory" ? "bg-white text-[#087A6A] shadow-sm" : "text-[#71869A] hover:text-[#193B57]"}`}><Building2 className="mr-1.5 inline" size={14} />Email nội bộ</button><button type="button" onClick={() => setMode("local")} className={`rounded-lg px-3 py-2 text-xs font-extrabold transition ${mode === "local" ? "bg-white text-[#193B57] shadow-sm" : "text-[#71869A] hover:text-[#193B57]"}`}><KeyRound className="mr-1.5 inline" size={14} />Admin cục bộ</button></div><div className="mt-5 space-y-3"><label className="block text-[11px] font-extrabold text-[#527089]">Email{mode === "directory" && <span className="ml-1 font-medium text-[#8AA0B6]">nội bộ</span>}<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-[#D7E3EB] bg-white px-3 text-sm font-medium text-[#193B57] outline-none transition focus:border-[#0F8C8C] focus:ring-2 focus:ring-[#E6F6F2]" placeholder="ten@congty.vn" /></label><label className="block text-[11px] font-extrabold text-[#527089]">Mật khẩu<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-[#D7E3EB] bg-white px-3 text-sm font-medium text-[#193B57] outline-none transition focus:border-[#0F8C8C] focus:ring-2 focus:ring-[#E6F6F2]" placeholder="Nhập mật khẩu" /></label></div>{mode === "directory" && !directoryEnabled && <p className="mt-3 rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2 text-[11px] leading-5 text-[#8F5A00]">LDAPS chưa kích hoạt. Vui lòng đăng nhập Admin cục bộ để hoàn tất kiểm tra kết nối trong Cài đặt hệ thống.</p>}<button type="submit" disabled={isSubmitting || (mode === "directory" && !directoryEnabled)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F8C8C] px-4 py-3.5 text-sm font-extrabold text-white shadow-[0_9px_18px_rgba(15,140,140,.22)] transition hover:-translate-y-0.5 hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[.97]">{isSubmitting && <Loader2 className="animate-spin" size={17} />}{mode === "directory" ? "Đăng nhập email nội bộ" : "Đăng nhập quản trị viên"}<ChevronRight size={18} /></button></form> : <><button onClick={onLogin} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F8C8C] px-4 py-3.5 text-sm font-extrabold text-white shadow-[0_9px_18px_rgba(15,140,140,.22)] transition hover:-translate-y-0.5 hover:bg-[#087A6A] active:scale-[.97]">Đăng nhập để tiếp tục <ChevronRight size={18} /></button></>}<p className="mt-5 text-center text-[11px] leading-5 text-[#8AA0B6]">Nếu tài khoản đã bị khóa hoặc không thuộc nhóm được phép, vui lòng liên hệ quản trị viên để được hỗ trợ.</p></div></section>
  </main>;
}
