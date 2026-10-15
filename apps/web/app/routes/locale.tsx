import { isLocale } from "@arrosticini/kernel";
import { Outlet } from "react-router";
import type { Route } from "./+types/locale.js";

export const middleware: Route.MiddlewareFunction[] = [
  async ({ params }, next) => {
    if (!isLocale(params.lang)) throw new Response(null, { status: 404 });
    return next();
  },
];

export default function LocaleLayout() {
  return <Outlet />;
}
