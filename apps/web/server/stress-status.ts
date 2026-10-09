import { WhoAmIDto } from "@arrosticini/contracts";
import type { WhoAmI } from "@arrosticini/ops";
import type { RequestHandler } from "express";
import { api } from "../app/lib/api.server.js";

export function createStressStatus(whoami: () => WhoAmI): RequestHandler {
  return async (req, res) => {
    const request: Request = new Request("http://web/stress/status", {
      headers: { "x-request-id": String(req.id) },
    });
    let apiTask: WhoAmIDto | null = null;
    try {
      const reading: WhoAmIDto = WhoAmIDto.parse(
        await api(request).ops.whoami(undefined, { signal: AbortSignal.timeout(1000) }),
      );
      if (reading.service === "api") apiTask = reading;
    } catch {
      apiTask = null;
    }
    res.set("Cache-Control", "no-store").json({ web: whoami(), api: apiTask });
  };
}
