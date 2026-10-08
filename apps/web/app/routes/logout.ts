import { redirect } from "react-router";
import { assertSameOrigin, sessionContext, sessionStorageContext } from "../lib/session.server.js";
import type { Route } from "./+types/logout.js";

export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/${params.lang}/account`);
}

export async function action({ request, context, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  const cookie: string = await context
    .get(sessionStorageContext)
    .destroySession(context.get(sessionContext));
  return redirect(`/${params.lang}/login`, { status: 303, headers: { "Set-Cookie": cookie } });
}
