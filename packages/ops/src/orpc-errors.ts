import { DomainError } from "@arrosticini/kernel";
import { ORPCError, type ProcedureClientInterceptorOptions, ValidationError } from "@orpc/server";
import type { Logger } from "pino";

export interface ErrorContext {
  log: Logger;
}

export interface InputIssue {
  path: string[];
  message: string;
}

type InterceptorOptions = ProcedureClientInterceptorOptions<
  ErrorContext,
  Record<never, never>,
  Record<never, never>
> & { next: () => Promise<unknown> };

export async function mapProcedureErrors({
  next,
  procedure,
  context,
}: InterceptorOptions): Promise<unknown> {
  try {
    return await next();
  } catch (error) {
    if (error instanceof DomainError) {
      const declared = procedure["~orpc"].errorMap[error.code];
      if (declared) {
        throw new ORPCError(error.code, {
          ...(declared.status === undefined ? {} : { status: declared.status }),
          message: error.message,
          cause: error,
        });
      }
    }
    if (
      error instanceof ORPCError &&
      error.code === "BAD_REQUEST" &&
      error.cause instanceof ValidationError
    ) {
      const issues: InputIssue[] = error.cause.issues.map((issue) => ({
        path: (issue.path ?? []).map((segment) =>
          String(typeof segment === "object" ? segment.key : segment),
        ),
        message: issue.message,
      }));
      throw new ORPCError("BAD_REQUEST", {
        status: 400,
        message: error.message,
        data: { issues },
        cause: error.cause,
      });
    }
    if (!(error instanceof ORPCError) || error.status >= 500) {
      context.log.error({ err: error }, "procedure failed");
    }
    throw error;
  }
}
