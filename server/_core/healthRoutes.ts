import type { Express, Request, Response } from "express";
import {
  getSelfHostedServiceHealth,
  type ServiceHealthStatus,
} from "../selfHostedServiceHealth";

type RuntimeHealthSnapshot = Awaited<
  ReturnType<typeof getSelfHostedServiceHealth>
>;

export function isRuntimeReady(snapshot: RuntimeHealthSnapshot) {
  if (!snapshot.selfHosted) return true;

  const mysqlStatus: ServiceHealthStatus =
    snapshot.mysql?.status ?? "not_configured";
  const redisStatus: ServiceHealthStatus =
    snapshot.redis?.status ?? "not_configured";

  return (
    mysqlStatus === "ready" &&
    (redisStatus === "ready" || redisStatus === "not_configured")
  );
}

function publicDependencyStatus(snapshot: RuntimeHealthSnapshot) {
  if (!snapshot.selfHosted) return {};

  return {
    mysql: snapshot.mysql?.status ?? "not_configured",
    redis: snapshot.redis?.status ?? "not_configured",
  };
}

export function registerHealthRoutes(app: Express) {
  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({
      ok: true,
      service: "assetmaster",
      checkedAt: new Date().toISOString(),
    });
  });

  app.get("/readyz", async (_req: Request, res: Response) => {
    try {
      const snapshot = await getSelfHostedServiceHealth();
      const ready = isRuntimeReady(snapshot);

      res.status(ready ? 200 : 503).json({
        ok: ready,
        service: "assetmaster",
        checkedAt: snapshot.checkedAt,
        dependencies: publicDependencyStatus(snapshot),
      });
    } catch {
      res.status(503).json({
        ok: false,
        service: "assetmaster",
        checkedAt: new Date().toISOString(),
        dependencies: {
          mysql: "unavailable",
          redis: "unavailable",
        },
      });
    }
  });
}
