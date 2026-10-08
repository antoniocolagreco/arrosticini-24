import { contract } from "@arrosticini/contracts";
import { createORPCClient, ORPCError } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { OpenAPILink } from "@orpc/openapi-client/fetch";

export function api(request: Request): ContractRouterClient<typeof contract> {
  const requestId: string | null = request.headers.get("x-request-id");
  const link = new OpenAPILink(contract, {
    url: process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? "4000"}`,
    headers: requestId ? { "x-request-id": requestId } : {},
  });
  return createORPCClient<ContractRouterClient<typeof contract>>(link);
}

export function getApiError(error: unknown): "PRODUCT_NOT_FOUND" | "BAD_REQUEST" {
  if (
    error instanceof ORPCError &&
    (error.code === "PRODUCT_NOT_FOUND" || error.code === "BAD_REQUEST")
  ) {
    return error.code;
  }
  throw error;
}
