import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("login brand synchronization", () => {
  it("loads only public company branding and uses it across the login gateway", () => {
    const loginGateway = readFileSync(new URL("../client/src/pages/LoginGateway.tsx", import.meta.url), "utf8");
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

    expect(loginGateway).toContain("trpc.company.publicBrand.useQuery()");
    expect(loginGateway).toContain("Logo ${companyName}");
    expect(loginGateway).toContain("{companyName}");
    expect(loginGateway).toContain("{websiteTitle}");
    expect(loginGateway).toContain("Đăng nhập {companyName}");
    expect(loginGateway).toContain("{loginGreeting}");
    expect(loginGateway).toContain("loginBackgroundUrl");
    expect(loginGateway).toContain("loginBackgroundOverlay");
    expect(loginGateway).toContain('const logoUrl = brand?.logoUrl || "/manus-storage/assetmaster-logo_f5d79b06.png"');
    expect(loginGateway).toContain('className="grid h-12 w-12 shrink-0 place-items-center"');
    expect(loginGateway).toContain('className="h-12 w-12 object-contain"');
    expect(loginGateway).not.toContain("backgroundColor: brandColor");
    expect(loginGateway).not.toContain("truncate font-display text-2xl");
    expect(router).toContain("publicBrand: publicProcedure.query");
    expect(router).toContain("websiteTitle: company.websiteTitle");
    expect(router).toContain("loginBackgroundUrl: company.loginBackgroundUrl");
    expect(router).toContain("loginBackgroundOverlay: company.loginBackgroundOverlay");
    expect(router).not.toContain("publicBrand: publicProcedure.query(() => getCompany())");
  });
});
