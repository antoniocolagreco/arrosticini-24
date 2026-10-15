import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { Logger } from "pino";

export type ShutdownTask = () => Promise<void>;

export class Lifecycle {
  #shuttingDown = false;
  readonly #tasks: ShutdownTask[] = [];

  get shuttingDown(): boolean {
    return this.#shuttingDown;
  }

  onShutdown(task: ShutdownTask): void {
    this.#tasks.push(task);
  }

  async shutdown(server: Server): Promise<void> {
    this.#shuttingDown = true;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    for (const task of this.#tasks) {
      await task();
    }
  }
}

export function healthz(lifecycle: Lifecycle) {
  return (_req: IncomingMessage, res: ServerResponse): void => {
    res.statusCode = lifecycle.shuttingDown ? 503 : 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ status: lifecycle.shuttingDown ? "shutting-down" : "ok" }));
  };
}

export function shutdownOnSignals(server: Server, lifecycle: Lifecycle, logger: Logger): void {
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      logger.info({ signal }, "shutting down");
      lifecycle.shutdown(server).then(
        () => {
          logger.info("shutdown complete");
          process.exit(0);
        },
        (error: unknown) => {
          logger.fatal({ err: error }, "shutdown failed");
          process.exit(1);
        },
      );
    });
  }
}

export function exitOnProcessErrors(logger: Logger): void {
  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "uncaught exception");
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "unhandled rejection");
    process.exit(1);
  });
}
