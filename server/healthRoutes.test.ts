import { describe, expect, it } from "vitest";
import {
  isRuntimeReady,
} from "./_core/healthRoutes";
import type {
  ServiceHealth,
  ServiceHealthStatus,
} from "./selfHostedServiceHealth";

function service(status: ServiceHealthStatus): ServiceHealth {
  return {
    status,
    checkedAt: "2026-09-09T00:00:00.000Z",
    latencyMs: status === "ready" ? 5 : null,
    message: status,
  };
}

describe("runtime readiness", () => {
  it("keeps hosted mode ready without self-hosted dependencies", () => {
    expect(
      isRuntimeReady({
        selfHosted: false,
        checkedAt: "2026-09-09T00:00:00.000Z",
        mysql: null,
        redis: null,
      })
    ).toBe(true);
  });

  it("requires MySQL in self-hosted mode", () => {
    expect(
      isRuntimeReady({
        selfHosted: true,
        checkedAt: "2026-09-09T00:00:00.000Z",
        mysql: service("unavailable"),
        redis: service("ready"),
      })
    ).toBe(false);
  });

  it("reports ready when required self-hosted services respond", () => {
    expect(
      isRuntimeReady({
        selfHosted: true,
        checkedAt: "2026-09-09T00:00:00.000Z",
        mysql: service("ready"),
        redis: service("ready"),
      })
    ).toBe(true);
  });

  it("allows Redis to be omitted but not to become unavailable", () => {
    expect(
      isRuntimeReady({
        selfHosted: true,
        checkedAt: "2026-09-09T00:00:00.000Z",
        mysql: service("ready"),
        redis: service("not_configured"),
      })
    ).toBe(true);

    expect(
      isRuntimeReady({
        selfHosted: true,
        checkedAt: "2026-09-09T00:00:00.000Z",
        mysql: service("ready"),
        redis: service("unavailable"),
      })
    ).toBe(false);
  });
});
