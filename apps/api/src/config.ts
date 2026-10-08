import { z } from "zod";

export const Env = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  APP_VERSION: z.string().min(1).default("dev"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AWS_REGION: z.string().min(1),
  DYNAMODB_ENDPOINT: z.url().optional(),
  CATALOG_TABLE: z.string().min(1),
});

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  return Env.parse(env);
}
