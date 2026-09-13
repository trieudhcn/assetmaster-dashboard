import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("public login brand assets", () => {
  const routers = readFileSync(resolve(import.meta.dirname, "routers.ts"), "utf8");
  const sharedStorage = readFileSync(resolve(import.meta.dirname, "localSharedStorage.ts"), "utf8");
  const loginGateway = readFileSync(resolve(import.meta.dirname, "../client/src/pages/LoginGateway.tsx"), "utf8");

  it("maps self-hosted logo and background files to public brand-only routes", () => {
    expect(routers).toContain('company.logoUrl?.startsWith("/api/files/")');
    expect(routers).toContain('"/api/public-brand/logo"');
    expect(routers).toContain('company.loginBackgroundUrl?.startsWith("/api/files/")');
    expect(routers).toContain('"/api/public-brand/login-background"');
  });

  it("serves only the currently configured brand files without opening shared storage", () => {
    expect(sharedStorage).toContain('app.get("/api/public-brand/:asset"');
    expect(sharedStorage).toContain("const company = await getCompany()");
    expect(sharedStorage).toContain('configuredUrl?.startsWith("/api/files/")');
    expect(sharedStorage).toContain('configuredUrl.slice("/api/files/".length)');
    expect(sharedStorage).toContain('app.get("/api/files/*"');
    expect(sharedStorage).toContain("const user = await getSelfHostedUser(req)");
    expect(sharedStorage).toContain('error: "authentication_required"');
  });

  it("previews, saves and renders the selected background overlay explicitly", () => {
    const brandSettings = readFileSync(resolve(import.meta.dirname, "../client/src/components/CompanyBrandSettings.tsx"), "utf8");

    expect(brandSettings).toContain("data-login-background-preview");
    expect(brandSettings).toContain('data-overlay={draft.loginBackgroundOverlay}');
    expect(brandSettings).toContain('aria-pressed={draft.loginBackgroundOverlay === "dark"}');
    expect(brandSettings).toContain("Áp dụng nhận diện đăng nhập");
    expect(brandSettings).toContain('draft.loginBackgroundOverlay === "dark" ? "bg-[#102A43]/75" : "bg-white/55"');
    expect(loginGateway).toContain("data-login-background-overlay={loginBackgroundOverlay}");
    expect(loginGateway).toContain('loginBackgroundOverlay === "dark" ? "bg-[#102A43]/75" : "bg-white/55"');
  });

  it("presents login methods as a clear accessible segmented control", () => {
    expect(loginGateway).toContain('role="tablist"');
    expect(loginGateway).toContain('aria-label="Phương thức đăng nhập"');
    expect(loginGateway).toContain('aria-selected={mode === "directory"}');
    expect(loginGateway).toContain('aria-selected={mode === "local"}');
    expect(loginGateway).toContain('"border-[#0F8C8C] bg-[#0F8C8C] text-white');
    expect(loginGateway).toContain('"border-[#D3DFE8] bg-white text-[#526779]');
  });

  it("replaces an unavailable logo with a non-broken fallback", () => {
    expect(loginGateway).toContain("const [logoFailed, setLogoFailed] = useState(false)");
    expect(loginGateway).toContain("useEffect(() => setLogoFailed(false), [logoUrl])");
    expect(loginGateway).toContain("onError={() => setLogoFailed(true)}");
    expect(loginGateway).toContain("Logo dự phòng");
  });
});
