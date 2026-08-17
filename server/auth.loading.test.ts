import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("auth loading recovery", () => {
  it("giới hạn thời gian chờ kiểm tra phiên để người chưa đăng nhập không bị kẹt ở màn hình tải", () => {
    const hook = readFileSync(new URL("../client/src/_core/hooks/useAuth.ts", import.meta.url), "utf8");

    expect(hook).toContain("export const AUTH_LOADING_TIMEOUT_MS = 8_000");
    expect(hook).toContain("setAuthLoadingTimedOut(true)");
    expect(hook).toContain("loading: (meQuery.isLoading && !authLoadingTimedOut) || logoutMutation.isPending");
  });
});
