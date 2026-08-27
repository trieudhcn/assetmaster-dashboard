import { afterEach, describe, expect, it } from "vitest";
import { getSelfHostedServiceHealth } from "./selfHostedServiceHealth";

const originalSelfHostedFlag = process.env.SELF_HOSTED_AUTH_ENABLED;

afterEach(() => {
  if (originalSelfHostedFlag === undefined)
    delete process.env.SELF_HOSTED_AUTH_ENABLED;
  else process.env.SELF_HOSTED_AUTH_ENABLED = originalSelfHostedFlag;
});

describe("self-hosted service health", () => {
  it("không probe hạ tầng hoặc tiết lộ cấu hình khi self-hosted chưa được bật", async () => {
    delete process.env.SELF_HOSTED_AUTH_ENABLED;

    await expect(getSelfHostedServiceHealth()).resolves.toMatchObject({
      selfHosted: false,
      mysql: null,
      redis: null,
    });
  });
});
