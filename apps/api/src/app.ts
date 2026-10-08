import { createHttpLogger, healthz, type Lifecycle, type Logger } from "@arrosticini/ops";
import express, { type Express } from "express";

export function createApp(logger: Logger, lifecycle: Lifecycle): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(createHttpLogger(logger));
  app.get("/healthz", healthz(lifecycle));
  return app;
}
