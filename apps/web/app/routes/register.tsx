import { AuthForm } from "../components/auth-form.js";
import { authenticate, guestOnly } from "../lib/auth.server.js";
import type { Route } from "./+types/register.js";

export function loader({ context, params }: Route.LoaderArgs) {
  return guestOnly(context, params.lang);
}

export function action({ request, context, params }: Route.ActionArgs) {
  return authenticate(request, context, params.lang === "en" ? "en" : "it", true);
}

export default function Register({ actionData }: Route.ComponentProps) {
  return <AuthForm register {...(actionData ? { result: actionData } : {})} />;
}
