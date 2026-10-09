import type { CatalogContext } from "@arrosticini/catalog";
import { ACTOR_HEADER } from "@arrosticini/contracts";
import type { IdentityContext } from "@arrosticini/identity";
import {
  createHttpLogger,
  type ErrorContext,
  healthz,
  type Lifecycle,
  type Logger,
  mapProcedureErrors,
} from "@arrosticini/ops";
import type { OrderingContext } from "@arrosticini/ordering";
import type { ShoppingContext } from "@arrosticini/shopping";
import { OpenAPIHandler } from "@orpc/openapi/node";
import express, { type Express } from "express";
import { readActor } from "./actor.js";
import type { ApiRouter } from "./wiring.js";

type ApiContext = CatalogContext &
  IdentityContext &
  ShoppingContext &
  OrderingContext &
  ErrorContext;

export function createApp(logger: Logger, lifecycle: Lifecycle, router: ApiRouter): Express {
  const handler = new OpenAPIHandler<ApiContext>(router, {
    clientInterceptors: [mapProcedureErrors],
  });
  const app = express();
  app.disable("x-powered-by");
  app.use(
    createHttpLogger(logger, {
      userId: (req) => {
        const header = readActor(req);
        return header.valid ? header.actor?.userId : undefined;
      },
    }),
  );
  app.get("/healthz", healthz(lifecycle));
  app.use(async (req, res, next) => {
    const header = readActor(req);
    if (!header.valid) {
      res.status(400).json({
        defined: false,
        code: "BAD_REQUEST",
        status: 400,
        message: `Invalid ${ACTOR_HEADER} header`,
      });
      return;
    }
    const { matched } = await handler.handle(req, res, {
      context: { actor: header.actor, log: req.log },
    });
    if (!matched) {
      next();
    }
  });
  return app;
}
