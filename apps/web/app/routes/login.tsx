import { AuthForm } from "../components/auth-form.js";
import { authenticate, guestOnly } from "../lib/auth.server.js";
import type { Route } from "./+types/login.js";

export function loader({ context, params }: Route.LoaderArgs) {
  return guestOnly(context, params.lang);
}

export function action({ request, context, params }: Route.ActionArgs) {
  return authenticate(request, context, params.lang === "en" ? "en" : "it", false);
}

export default function Login({ actionData }: Route.ComponentProps) {
  return <AuthForm register={false} {...(actionData ? { result: actionData } : {})} />;
}
