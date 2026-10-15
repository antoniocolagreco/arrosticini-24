import { createLogger, type Logger } from "@arrosticini/ops";
import { type Config, loadConfig } from "./config.js";

const config: Config = loadConfig(process.env);

export const logger: Logger = createLogger({
  service: "web",
  version: config.APP_VERSION,
  level: config.LOG_LEVEL,
  pretty: config.NODE_ENV === "development",
});
