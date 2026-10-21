import { Cursor } from "@arrosticini/contracts";
import { ORPCError } from "@orpc/client";
import { data } from "react-router";

export function readCursor(request: Request): string | undefined {
  const cursor: string | null = new URL(request.url).searchParams.get("cursor");
  if (cursor === null) return undefined;
  if (!Cursor.safeParse(cursor).success) throw data(null, { status: 400 });
  return cursor;
}

export async function loadPage<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error: unknown) {
    if (error instanceof ORPCError && error.code === "INVALID_CURSOR")
      throw data(null, { status: 400 });
    throw error;
  }
}
