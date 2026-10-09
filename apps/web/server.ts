import path from "node:path";
import { fileURLToPath } from "node:url";
import { exitOnProcessErrors, Lifecycle, shutdownOnSignals } from "@arrosticini/ops";
import { createRequestHandler } from "@react-router/express";
import express, { type NextFunction, type Request, type Response } from "express";
import { Valkey } from "iovalkey";
import { RouterContextProvider, type ServerBuild } from "react-router";
import { createValkeySessionStorage, sessionStorageContext } from "./app/lib/session.server.js";
import { createApp } from "./server/app.js";
import { type Config, loadConfig } from "./server/config.js";
import { logger } from "./server/logger.js";

const config: Config = loadConfig(process.env);
const lifecycle: Lifecycle = new Lifecycle();
const app = createApp(logger, lifecycle);
const directory: string = path.dirname(fileURLToPath(import.meta.url));
exitOnProcessErrors(logger);

const valkey: Valkey = new Valkey(config.VALKEY_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
  connectTimeout: 5000,
});
valkey.on("error", (error: Error) =>
  logger.error({ err: error }, "session store connection failed"),
);
await valkey.connect();
lifecycle.onShutdown(async () => {
  await valkey.quit();
});
const sessions: ReturnType<typeof createValkeySessionStorage> = createValkeySessionStorage(
  valkey,
  config.SESSION_SECRET,
  config.NODE_ENV === "production",
);
const getLoadContext = (): RouterContextProvider => {
  const context: RouterContextProvider = new RouterContextProvider();
  context.set(sessionStorageContext, sessions);
  return context;
};

if (config.NODE_ENV === "production") {
  const buildPath: string = path.join(directory, "build/server/index.js");
  const loaded: ServerBuild = await import(buildPath);
  const build: ServerBuild = {
    ...loaded,
    allowedActionOrigins: config.PUBLIC_ORIGIN ? [new URL(config.PUBLIC_ORIGIN).host] : [],
  };
  app.use(
    "/assets",
    express.static(path.join(directory, "build/client/assets"), { immutable: true, maxAge: "1y" }),
  );
  app.use(express.static(path.join(directory, "build/client"), { maxAge: "1h" }));
  app.use(createRequestHandler({ build, mode: "production", getLoadContext }));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({ root: directory, server: { middlewareMode: true } });
  lifecycle.onShutdown(() => vite.close());
  app.use(vite.middlewares);
  app.use(
    createRequestHandler({
      build: () => vite.ssrLoadModule("virtual:react-router/server-build") as Promise<ServerBuild>,
      mode: "development",
      getLoadContext,
    }),
  );
}

app.use((error: unknown, req: Request, res: Response, next: NextFunction): void => {
  req.log.error({ err: error }, "request failed");
  if (res.headersSent) {
    next(error);
    return;
  }
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR", requestId: req.id });
});

const server = app.listen(config.WEB_PORT, () => {
  logger.info({ port: config.WEB_PORT }, "web listening");
});
shutdownOnSignals(server, lifecycle, logger);
