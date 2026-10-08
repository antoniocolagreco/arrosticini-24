import { createLogger, exitOnProcessErrors, Lifecycle, shutdownOnSignals } from "@arrosticini/ops";
import { createApp } from "./app.js";
import { createDynamoDbClient } from "./aws.js";
import { loadConfig } from "./config.js";
import { createRouter } from "./wiring.js";

const config = loadConfig(process.env);
const logger = createLogger({
  service: "api",
  version: config.APP_VERSION,
  level: config.LOG_LEVEL,
  pretty: config.NODE_ENV !== "production",
});
exitOnProcessErrors(logger);

const dynamo = createDynamoDbClient(config.AWS_REGION, config.DYNAMODB_ENDPOINT);
const router = createRouter(dynamo, { catalog: config.CATALOG_TABLE });
const lifecycle = new Lifecycle();
lifecycle.onShutdown(async () => dynamo.destroy());

const server = createApp(logger, lifecycle, router).listen(config.API_PORT, () => {
  logger.info({ port: config.API_PORT }, "api listening");
});
shutdownOnSignals(server, lifecycle, logger);
