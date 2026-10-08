import { z } from "zod";

const Env = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  APP_VERSION: z.string().min(1).default("dev"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  return Env.parse(env);
}
