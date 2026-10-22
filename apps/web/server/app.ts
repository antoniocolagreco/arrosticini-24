import {
  createHttpLogger,
  healthz,
  type Lifecycle,
  type Logger,
  REQUEST_ID_HEADER,
} from "@arrosticini/ops";
import express, { type Express } from "express";
import { serveProductImage } from "./product-image.js";
import { forwardStripeWebhook } from "./stripe-webhook.js";

export function createApp(logger: Logger, lifecycle: Lifecycle): Express {
  const app: Express = express();
  app.disable("x-powered-by");
  app.use(createHttpLogger(logger));
  app.use((req, _res, next) => {
    req.headers[REQUEST_ID_HEADER] = String(req.id);
    next();
  });
  app.get("/healthz", healthz(lifecycle));
  app.post("/webhooks/stripe", express.raw({ type: "application/json" }), forwardStripeWebhook);
  app.get("/images/products/:slug/:fileName", serveProductImage);
  return app;
}
