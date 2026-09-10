import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerHealthRoutes } from "./healthRoutes";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerSharedStorageRoutes } from "../localSharedStorage";
import { selfHostedAuthEnabled } from "../selfHostedAuth";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function configuredPort() {
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

async function resolveListenPort(preferredPort: number) {
  if (process.env.NODE_ENV !== "production") {
    return findAvailablePort(preferredPort);
  }

  if (!(await isPortAvailable(preferredPort))) {
    throw new Error(
      `Production port ${preferredPort} is unavailable; refusing to listen on an unexpected port`
    );
  }

  return preferredPort;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.disable("x-powered-by");
  registerHealthRoutes(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerSharedStorageRoutes(app);
  if (!selfHostedAuthEnabled()) {
    const { registerOAuthRoutes } = await import("./oauth");
    registerOAuthRoutes(app);
  }
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = configuredPort();
  const port = await resolveListenPort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; stopping AssetMaster gracefully`);

    const forceExit = setTimeout(() => {
      console.error("Graceful shutdown timed out");
      server.closeAllConnections();
      process.exit(1);
    }, 25_000);
    forceExit.unref();

    server.close(error => {
      clearTimeout(forceExit);
      if (error) {
        console.error("Failed to close HTTP server", error);
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(error => {
  console.error("AssetMaster failed to start", error);
  process.exitCode = 1;
});
