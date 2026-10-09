import { ACTOR_HEADER, type ActorDto, contract } from "@arrosticini/contracts";
import { createORPCClient, ORPCError } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { OpenAPILink } from "@orpc/openapi-client/fetch";

export function api(request: Request, actor?: ActorDto): ContractRouterClient<typeof contract> {
  const requestId: string | null = request.headers.get("x-request-id");
  const link = new OpenAPILink(contract, {
    url: process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? "4000"}`,
    headers: {
      ...(requestId ? { "x-request-id": requestId } : {}),
      ...(actor ? { [ACTOR_HEADER]: JSON.stringify(actor) } : {}),
    },
  });
  return createORPCClient<ContractRouterClient<typeof contract>>(link);
}

export function getApiError(
  error: unknown,
): "PRODUCT_NOT_FOUND" | "BAD_REQUEST" | "INVALID_CREDENTIALS" | "EMAIL_TAKEN" | "UNAUTHORIZED" {
  if (
    error instanceof ORPCError &&
    (error.code === "PRODUCT_NOT_FOUND" ||
      error.code === "BAD_REQUEST" ||
      error.code === "INVALID_CREDENTIALS" ||
      error.code === "EMAIL_TAKEN" ||
      error.code === "UNAUTHORIZED")
  ) {
    return error.code;
  }
  throw error;
}
