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

  it("replaces an unavailable logo with a non-broken fallback", () => {
    expect(loginGateway).toContain("const [logoFailed, setLogoFailed] = useState(false)");
    expect(loginGateway).toContain("useEffect(() => setLogoFailed(false), [logoUrl])");
    expect(loginGateway).toContain("onError={() => setLogoFailed(true)}");
    expect(loginGateway).toContain("Logo dự phòng");
  });
});
