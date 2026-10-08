import { type ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import type { Route } from "./+types/root.js";
import { ErrorPage } from "./components/error-page.js";
import { SiteLayout } from "./components/site-layout.js";
import { localeCookie } from "./lib/locale.server.js";
import { getLocale, i18nextMiddleware } from "./middleware/i18next.js";
import "./styles/app.css";

export const middleware = [i18nextMiddleware];

export async function loader({ context, request }: Route.LoaderArgs) {
  const locale: string = getLocale(context);
  return data(
    {
      locale,
      version: process.env.APP_VERSION ?? "dev",
      requestId: request.headers.get("x-request-id"),
    },
    {
      headers: {
        "Set-Cookie": await localeCookie.serialize(locale),
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export function links(): Route.LinkDescriptors {
  return [{ rel: "icon", href: "/images/favicon.svg", type: "image/svg+xml" }];
}

export function meta(): Route.MetaDescriptors {
  return [{ title: "Arrosticini 24ore" }];
}

export function Layout({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  return (
    <html lang={i18n.language} dir={i18n.dir()}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { i18n } = useTranslation();
  useEffect(() => {
    if (i18n.language !== loaderData.locale) void i18n.changeLanguage(loaderData.locale);
  }, [i18n, loaderData.locale]);
  return (
    <SiteLayout version={loaderData.version}>
      <Outlet />
    </SiteLayout>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const loaderData = useRouteLoaderData<typeof loader>("root");
  const status: number = isRouteErrorResponse(error) ? error.status : 500;
  return (
    <SiteLayout version={loaderData?.version ?? "dev"}>
      <ErrorPage
        status={status}
        {...(loaderData?.requestId ? { requestId: loaderData.requestId } : {})}
      />
    </SiteLayout>
  );
}
