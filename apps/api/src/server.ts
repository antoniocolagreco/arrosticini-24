import { createLogger, exitOnProcessErrors, Lifecycle, shutdownOnSignals } from "@arrosticini/ops";
import { Valkey } from "iovalkey";
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
const valkey = new Valkey(config.VALKEY_URL);
const router = createRouter(dynamo, valkey, {
  catalog: config.CATALOG_TABLE,
  identity: config.IDENTITY_TABLE,
});
const lifecycle = new Lifecycle();
lifecycle.onShutdown(async () => dynamo.destroy());
lifecycle.onShutdown(async () => {
  await valkey.quit();
});

const server = createApp(logger, lifecycle, router).listen(config.API_PORT, () => {
  logger.info({ port: config.API_PORT }, "api listening");
});
shutdownOnSignals(server, lifecycle, logger);
