import { type FormEvent, useEffect, useState } from "react";
import { Building2, ChevronRight, CircleAlert, KeyRound, Loader2, LockKeyhole, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const defaultBrand = { name: "AssetMaster", websiteTitle: "Enterprise OS", loginGreeting: "Quản lý tài sản, theo đúng vai trò của bạn." };
type LoginIssue = { title: string; description: string; steps: string[] };

function directoryIssue(error: unknown): LoginIssue {
  const message = error instanceof Error ? error.message : "";
  if (/chưa được kích hoạt/i.test(message)) return { title: "LDAPS chưa sẵn sàng", description: "Xác thực email nội bộ chưa được kích hoạt trên máy chủ này.", steps: ["Đăng nhập bằng Admin cục bộ.", "Vào Cài đặt hệ thống → Directory LDAP/AD.", "Kiểm tra kết nối thành công rồi mới kích hoạt LDAPS."] };
  if (/certificate|chứng chỉ|TLS/i.test(message)) return { title: "Không thể xác thực chứng chỉ LDAPS", description: "Máy chủ không thể thiết lập kênh TLS tin cậy với Active Directory.", steps: ["Kiểm tra FQDN LDAPS khớp chứng chỉ của Domain Controller.", "Cài CA doanh nghiệp vào trust store hoặc khai báo CA public PEM.", "Liên hệ đội quản trị AD nếu chứng chỉ hết hạn."] };
  if (/kết nối|connect|timeout|socket/i.test(message)) return { title: "Không thể kết nối Active Directory", description: "Máy chủ AssetMaster chưa liên lạc được với dịch vụ LDAPS.", steps: ["Kiểm tra dịch vụ AD/LDAPS và FQDN máy chủ.", "Kiểm tra firewall chỉ cho phép TCP 636 từ AssetMaster.", "Thử lại sau khi đội hạ tầng xử lý kết nối."] };
  if (/giới hạn/i.test(message)) return { title: "Đăng nhập đang được giới hạn tạm thời", description: "Hệ thống tạm khóa các lần thử lặp để bảo vệ tài khoản.", steps: ["Đợi 15 phút rồi thử lại.", "Không chia sẻ mật khẩu hoặc gửi mật khẩu cho quản trị viên.", "Liên hệ Admin nếu vẫn không đăng nhập được."] };
  if (/chưa thuộc nhóm|nhóm được phép/i.test(message)) return { title: "Tài khoản chưa có quyền truy cập", description: "Email đã được nhận diện nhưng chưa thuộc nhóm AssetMaster được cấp quyền.", steps: ["Liên hệ Admin AssetMaster để kiểm tra nhóm AD.", "Admin đối chiếu nhóm User hoặc Admin trong Cài đặt Directory.", "Thử lại sau khi nhóm được đồng bộ."] };
  return { title: "Không thể xác thực email nội bộ", description: "Hãy kiểm tra email/mật khẩu hoặc liên hệ Quản trị viên nếu tài khoản bị khóa, bị vô hiệu hóa hoặc chưa được cấp quyền.", steps: ["Nhập đúng email nội bộ được công ty cấp.", "Kiểm tra phím Caps Lock và thử lại một lần.", "Không đặt lại mật khẩu tại AssetMaster; việc này do Active Directory quản lý."] };
}

export function LoginGateway({ onLogin }: { onLogin: () => void }) {
  const brandQuery = trpc.company.publicBrand.useQuery();
  const directoryQuery = trpc.directory.publicStatus.useQuery();
  const localLogin = trpc.auth.localLogin.useMutation();
  const directoryLogin = trpc.auth.directoryLogin.useMutation();
  const [mode, setMode] = useState<"directory" | "local">("directory");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [issue, setIssue] = useState<LoginIssue | null>(null);
  const brand = brandQuery.data;
  const companyName = brand?.name?.trim() || defaultBrand.name;
  const websiteTitle = brand?.websiteTitle?.trim() || defaultBrand.websiteTitle;
  const loginGreeting = brand?.loginGreeting?.trim() || defaultBrand.loginGreeting;
  const loginBackgroundUrl = brand?.loginBackgroundUrl || "";
  const loginBackgroundOverlay = brand?.loginBackgroundOverlay === "dark" ? "dark" : "light";
  const brandColor = /^#[0-9a-fA-F]{6}$/.test(brand?.brandColor || "") ? brand!.brandColor! : "#0F8C8C";
  const logoUrl = brand?.logoUrl || "/manus-storage/assetmaster-logo_f5d79b06.png";
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => setLogoFailed(false), [logoUrl]);
  useEffect(() => {
    document.documentElement.style.setProperty("--assetmaster-brand", brandColor);
  }, [brandColor]);
  const loginSurfaceStyle = loginBackgroundUrl
    ? { backgroundImage: `url(${JSON.stringify(loginBackgroundUrl)})` }
    : undefined;
  const selfHosted = directoryQuery.data?.selfHosted === true;
  const directoryEnabled = directoryQuery.data?.enabled === true;
  const isSubmitting = localLogin.isPending || directoryLogin.isPending;

  const completeLogin = () => { setPassword(""); window.location.assign("/"); };
  const switchMode = (next: "directory" | "local") => { setMode(next); setIssue(null); setPassword(""); };
  const submitSelfHostedLogin = (event: FormEvent) => {
    event.preventDefault();
    setIssue(null);
    if (!email.trim() || !password) return;
    if (mode === "local") {
      localLogin.mutate({ email, password }, { onSuccess: completeLogin, onError: (error) => { setIssue({ title: "Không thể đăng nhập quản trị viên", description: "Email hoặc mật khẩu Admin bootstrap không đúng.", steps: ["Kiểm tra lại email đã tạo trong /setup.", "Thử lại sau 15 phút nếu đã nhập sai nhiều lần.", "Liên hệ đội vận hành nếu cần khôi phục tài khoản break-glass."] }); toast.error(error.message || "Không thể đăng nhập quản trị viên."); } });
      return;
    }
    directoryLogin.mutate({ email, password }, { onSuccess: completeLogin, onError: (error) => { const nextIssue = directoryIssue(error); setIssue(nextIssue); toast.error(nextIssue.title); } });
  };

  return <main style={loginSurfaceStyle} data-login-background-overlay={loginBackgroundOverlay} className="relative grid min-h-screen overflow-hidden bg-[#F4F7FB] bg-cover bg-center px-5 py-8 lg:grid-cols-[1.1fr_.9fr] lg:p-8">
    {loginBackgroundUrl ? <div aria-hidden="true" className={`pointer-events-none absolute inset-0 transition-colors ${loginBackgroundOverlay === "dark" ? "bg-[#102A43]/75" : "bg-white/55"}`} /> : null}
    <div className="pointer-events-none absolute -left-24 top-[-150px] h-[420px] w-[420px] rounded-full bg-[#BDE7E2]/60 blur-3xl" />
    <div className="pointer-events-none absolute bottom-[-180px] right-[-140px] h-[460px] w-[460px] rounded-full bg-[#D7E7F8]/75 blur-3xl" />
    <section className="relative z-10 flex flex-col justify-between rounded-3xl bg-[#102A43]/95 p-7 text-white shadow-[0_22px_60px_rgba(16,42,67,.2)] backdrop-blur-[2px] sm:p-10">
      <div><div className="flex items-start gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center">{logoFailed ? <Building2 aria-label={`Logo dự phòng ${companyName}`} className="h-8 w-8 text-[#BDF1E8]" /> : <img src={logoUrl} alt={`Logo ${companyName}`} className="h-12 w-12 object-contain" onError={() => setLogoFailed(true)} />}</div><div className="min-w-0 pt-0.5"><div className="font-display text-2xl font-extrabold leading-tight tracking-[-.04em] sm:text-[27px]">{companyName}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[.15em] text-[#A5C3D2]">{websiteTitle}</div></div></div><div className="mt-16 max-w-xl"><div className="inline-flex items-center gap-2 rounded-full border border-[#3C637C] bg-[#173A56] px-3 py-1.5 text-[11px] font-bold text-[#BDF1E8]"><ShieldCheck size={14} />Không gian làm việc an toàn</div><h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-[-.055em] sm:text-5xl">{loginGreeting}</h1><p className="mt-5 max-w-md text-sm leading-7 text-[#B5C8D5]">Quản trị viên điều hành toàn bộ vòng đời tài sản. Nhân viên theo dõi hồ sơ và thiết bị đang được cấp phát cho mình.</p></div></div><div className="mt-12 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-[#294F6A] bg-[#173A56]/75 p-4"><div className="text-xs font-extrabold text-[#BDF1E8]">Quản trị viên</div><p className="mt-2 text-[11px] leading-5 text-[#A5C3D2]">Tài khoản bootstrap cục bộ luôn có mặt để vận hành khẩn cấp.</p></div><div className="rounded-2xl border border-[#294F6A] bg-[#173A56]/75 p-4"><div className="text-xs font-extrabold text-[#BDF1E8]">Nhân viên</div><p className="mt-2 text-[11px] leading-5 text-[#A5C3D2]">Xác thực trực tiếp bằng email và mật khẩu Active Directory qua LDAPS.</p></div></div></section>
    <section className="relative z-10 flex items-center justify-center py-10 lg:py-0"><div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-7 shadow-[0_22px_60px_rgba(16,42,67,.12)] backdrop-blur-sm sm:p-9"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E6F6F2] text-[#0F8C8C]">{selfHosted ? <Building2 size={21} /> : <LockKeyhole size={21} />}</div><div className="mt-6"><div className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#0F8C8C]">Đăng nhập {companyName}</div><h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-.045em] text-[#102A43]">Chào mừng trở lại</h2><p className="mt-3 text-sm leading-6 text-[#71869A]">{selfHosted ? "Dùng email nội bộ để xác thực Directory, hoặc tài khoản Admin cục bộ khi cần khôi phục quản trị." : "Đăng nhập bằng tài khoản tổ chức. Hệ thống sẽ tự nhận diện vai trò và mở đúng dashboard của bạn."}</p></div>{selfHosted ? <form onSubmit={submitSelfHostedLogin} className="mt-6"><div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F1F5F7] p-1"><button type="button" onClick={() => switchMode("directory")} className={`rounded-lg px-3 py-2 text-xs font-extrabold transition ${mode === "directory" ? "bg-white text-[#087A6A] shadow-sm" : "text-[#71869A] hover:text-[#193B57]"}`}><Building2 className="mr-1.5 inline" size={14} />Email nội bộ</button><button type="button" onClick={() => switchMode("local")} className={`rounded-lg px-3 py-2 text-xs font-extrabold transition ${mode === "local" ? "bg-white text-[#193B57] shadow-sm" : "text-[#71869A] hover:text-[#193B57]"}`}><KeyRound className="mr-1.5 inline" size={14} />Admin cục bộ</button></div><div className="mt-5 space-y-3"><label className="block text-[11px] font-extrabold text-[#527089]">Email{mode === "directory" && <span className="ml-1 font-medium text-[#8AA0B6]">nội bộ</span>}<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-[#D7E3EB] bg-white px-3 text-sm font-medium text-[#193B57] outline-none transition focus:border-[#0F8C8C] focus:ring-2 focus:ring-[#E6F6F2]" placeholder="ten@congty.vn" /></label><label className="block text-[11px] font-extrabold text-[#527089]">Mật khẩu<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-[#D7E3EB] bg-white px-3 text-sm font-medium text-[#193B57] outline-none transition focus:border-[#0F8C8C] focus:ring-2 focus:ring-[#E6F6F2]" placeholder="Nhập mật khẩu" /></label></div>{mode === "directory" && !directoryEnabled && <p className="mt-3 rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2 text-[11px] leading-5 text-[#8F5A00]">LDAPS chưa kích hoạt. Vui lòng đăng nhập Admin cục bộ để hoàn tất kiểm tra kết nối trong Cài đặt hệ thống.</p>}{issue && <aside role="alert" className="mt-4 rounded-xl border border-[#F2B18B] bg-[#FFF7F2] p-3.5 text-[#9E3F12]"><div className="flex items-start gap-2"><CircleAlert className="mt-0.5 shrink-0" size={17} /><div><h3 className="text-xs font-extrabold">{issue.title}</h3><p className="mt-1 text-[11px] leading-5">{issue.description}</p></div></div><div className="mt-3 border-t border-[#F4D5C3] pt-3"><div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.1em]"><Wrench size={13} />Cách xử lý</div><ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[11px] leading-5">{issue.steps.map((step) => <li key={step}>{step}</li>)}</ol></div></aside>}<button type="submit" disabled={isSubmitting || (mode === "directory" && !directoryEnabled)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F8C8C] px-4 py-3.5 text-sm font-extrabold text-white shadow-[0_9px_18px_rgba(15,140,140,.22)] transition hover:-translate-y-0.5 hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[.97]">{isSubmitting && <Loader2 className="animate-spin" size={17} />}{mode === "directory" ? "Đăng nhập email nội bộ" : "Đăng nhập quản trị viên"}<ChevronRight size={18} /></button></form> : <button onClick={onLogin} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F8C8C] px-4 py-3.5 text-sm font-extrabold text-white shadow-[0_9px_18px_rgba(15,140,140,.22)] transition hover:-translate-y-0.5 hover:bg-[#087A6A] active:scale-[.97]">Đăng nhập để tiếp tục <ChevronRight size={18} /></button>}<p className="mt-5 text-center text-[11px] leading-5 text-[#8AA0B6]">Nếu tài khoản đã bị khóa hoặc không thuộc nhóm được phép, vui lòng liên hệ quản trị viên để được hỗ trợ.</p></div></section>
  </main>;
}
