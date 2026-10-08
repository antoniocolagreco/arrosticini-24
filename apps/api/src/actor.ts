import type { IncomingMessage } from "node:http";
import { ACTOR_HEADER, ActorDto } from "@arrosticini/contracts";

export type ActorHeader = { valid: true; actor: ActorDto | undefined } | { valid: false };

export function readActor(req: IncomingMessage): ActorHeader {
  const header = req.headers[ACTOR_HEADER];
  if (header === undefined) {
    return { valid: true, actor: undefined };
  }
  if (typeof header !== "string") {
    return { valid: false };
  }
  try {
    const parsed = ActorDto.safeParse(JSON.parse(header));
    return parsed.success ? { valid: true, actor: parsed.data } : { valid: false };
  } catch {
    return { valid: false };
  }
}
