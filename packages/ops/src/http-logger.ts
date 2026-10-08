import { newId } from "@arrosticini/kernel";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";

export const REQUEST_ID_HEADER = "x-request-id";

export function createHttpLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incoming = req.headers[REQUEST_ID_HEADER];
      const requestId = typeof incoming === "string" && incoming !== "" ? incoming : newId();
      res.setHeader(REQUEST_ID_HEADER, requestId);
      return requestId;
    },
    quietReqLogger: true,
    customAttributeKeys: { reqId: "requestId" },
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) {
        return "error";
      }
      return res.statusCode >= 400 ? "warn" : "info";
    },
    serializers: {
      req: (req) => ({ method: req.method, path: req.url?.split("?")[0] }),
      res: (res) => ({ status: res.statusCode }),
    },
  });
}
