import { type DestinationStream, type Logger, type LoggerOptions, pino } from "pino";

export type { Logger } from "pino";

export interface CreateLoggerOptions {
  service: "web" | "api";
  version: string;
  level: string;
  pretty: boolean;
}

const REDACTED_PATHS = [
  "password",
  "*.password",
  "req.headers.cookie",
  "req.headers.authorization",
  'req.headers["stripe-signature"]',
  'res.headers["set-cookie"]',
];

export function createLogger(
  { service, version, level, pretty }: CreateLoggerOptions,
  destination?: DestinationStream,
): Logger {
  const options: LoggerOptions = {
    level,
    base: { service, version },
    redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
  };
  if (pretty) {
    options.transport = { target: "pino-pretty" };
  }
  return destination ? pino(options, destination) : pino(options);
}
