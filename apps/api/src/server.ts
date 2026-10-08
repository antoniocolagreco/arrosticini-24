import { createLogger, exitOnProcessErrors, Lifecycle, shutdownOnSignals } from "@arrosticini/ops";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig(process.env);
const logger = createLogger({
  service: "api",
  version: config.APP_VERSION,
  level: config.LOG_LEVEL,
  pretty: config.NODE_ENV !== "production",
});
exitOnProcessErrors(logger);

const lifecycle = new Lifecycle();
const server = createApp(logger, lifecycle).listen(config.API_PORT, () => {
  logger.info({ port: config.API_PORT }, "api listening");
});
shutdownOnSignals(server, lifecycle, logger);
