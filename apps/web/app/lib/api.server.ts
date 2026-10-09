import { AsyncLocalStorage } from "node:async_hooks";
import { ACTOR_HEADER, type ActorDto, contract } from "@arrosticini/contracts";
import { createORPCClient, ORPCError } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { OpenAPILink } from "@orpc/openapi-client/fetch";

const actorChecks = new AsyncLocalStorage<{ rejected: boolean }>();

export async function detectRejectedActor(
  run: () => Promise<Response>,
): Promise<{ response: Response; rejected: boolean }> {
  const check = { rejected: false };
  const response: Response = await actorChecks.run(check, run);
  return { response, rejected: check.rejected };
}

export function api(request: Request, actor?: ActorDto): ContractRouterClient<typeof contract> {
  const requestId: string | null = request.headers.get("x-request-id");
  const link = new OpenAPILink(contract, {
    url: process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? "4000"}`,
    headers: {
      ...(requestId ? { "x-request-id": requestId } : {}),
      ...(actor ? { [ACTOR_HEADER]: JSON.stringify(actor) } : {}),
    },
    interceptors: actor
      ? [
          async ({ next }) => {
            try {
              return await next();
            } catch (error: unknown) {
              const check = actorChecks.getStore();
              if (check && error instanceof ORPCError && error.code === "UNAUTHORIZED")
                check.rejected = true;
              throw error;
            }
          },
        ]
      : [],
  });
  return createORPCClient<ContractRouterClient<typeof contract>>(link);
}

export function getApiError(
  error: unknown,
):
  | "PRODUCT_NOT_FOUND"
  | "CART_NOT_FOUND"
  | "BAD_REQUEST"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_SUSPENDED"
  | "EMAIL_TAKEN"
  | "UNAUTHORIZED"
  | "USER_NOT_FOUND"
  | "USER_NOT_SUSPENDABLE" {
  if (
    error instanceof ORPCError &&
    (error.code === "PRODUCT_NOT_FOUND" ||
      error.code === "CART_NOT_FOUND" ||
      error.code === "BAD_REQUEST" ||
      error.code === "INVALID_CREDENTIALS" ||
      error.code === "ACCOUNT_SUSPENDED" ||
      error.code === "EMAIL_TAKEN" ||
      error.code === "UNAUTHORIZED" ||
      error.code === "USER_NOT_FOUND" ||
      error.code === "USER_NOT_SUSPENDABLE")
  ) {
    return error.code;
  }
  throw error;
}
