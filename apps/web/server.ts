import path from "node:path";
import { fileURLToPath } from "node:url";
import { exitOnProcessErrors, Lifecycle, shutdownOnSignals } from "@arrosticini/ops";
import { createRequestHandler } from "@react-router/express";
import express, { type NextFunction, type Request, type Response } from "express";
import { RouterContextProvider, type ServerBuild } from "react-router";
import { createApp } from "./server/app.js";
import { type Config, loadConfig } from "./server/config.js";
import { logger } from "./server/logger.js";

const config: Config = loadConfig(process.env);
const lifecycle: Lifecycle = new Lifecycle();
const app = createApp(logger, lifecycle);
const directory: string = path.dirname(fileURLToPath(import.meta.url));
exitOnProcessErrors(logger);

const getLoadContext = (): RouterContextProvider => new RouterContextProvider();

if (config.NODE_ENV === "production") {
  const buildPath: string = path.join(directory, "build/server/index.js");
  const build: ServerBuild = await import(buildPath);
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
