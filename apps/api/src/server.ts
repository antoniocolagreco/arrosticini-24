import { createLogger, exitOnProcessErrors, Lifecycle, shutdownOnSignals } from "@arrosticini/ops";
import { Valkey } from "iovalkey";
import Stripe from "stripe";
import { createApp } from "./app.js";
import { createDynamoDbClient, createS3Client } from "./aws.js";
import { loadConfig } from "./config.js";
import { createApi } from "./wiring.js";

const config = loadConfig(process.env);
const logger = createLogger({
  service: "api",
  version: config.APP_VERSION,
  level: config.LOG_LEVEL,
  pretty: config.NODE_ENV !== "production",
});
exitOnProcessErrors(logger);

const dynamo = createDynamoDbClient(config.AWS_REGION, config.DYNAMODB_ENDPOINT);
const s3 = createS3Client(config.AWS_REGION, config.S3_ENDPOINT);
const valkey = new Valkey(config.VALKEY_URL);
const api = createApi(
  { dynamo, s3, valkey, stripe: new Stripe(config.STRIPE_SECRET_KEY) },
  {
    mediaBucket: config.MEDIA_BUCKET,
    tables: {
      catalog: config.CATALOG_TABLE,
      identity: config.IDENTITY_TABLE,
      ordering: config.ORDERING_TABLE,
      payments: config.PAYMENTS_TABLE,
    },
    stripeWebhookSecret: config.STRIPE_WEBHOOK_SECRET,
  },
);
const lifecycle = new Lifecycle();
lifecycle.onShutdown(async () => dynamo.destroy());
lifecycle.onShutdown(async () => s3.destroy());
lifecycle.onShutdown(async () => {
  await valkey.quit();
});

const server = createApp(logger, lifecycle, api).listen(config.API_PORT, () => {
  logger.info({ port: config.API_PORT }, "api listening");
});
shutdownOnSignals(server, lifecycle, logger);
