import { opsContract } from "@arrosticini/contracts";
import type { WhoAmI } from "@arrosticini/ops";
import { implement } from "@orpc/server";

const os = implement(opsContract);

export function opsRouter(whoami: () => WhoAmI) {
  return {
    whoami: os.whoami.handler(() => whoami()),
  };
}
