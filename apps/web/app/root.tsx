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
import { sessionContext, sessionMiddleware } from "./lib/session.server.js";
import { getLocale, i18nextMiddleware } from "./middleware/i18next.js";
import "./styles/app.css";

export const middleware = [i18nextMiddleware, sessionMiddleware];

export async function loader({ context, request }: Route.LoaderArgs) {
  const locale: string = getLocale(context);
  return data(
    {
      locale,
      version: process.env.APP_VERSION ?? "dev",
      requestId: request.headers.get("x-request-id"),
      signedIn: context.get(sessionContext).has("userId"),
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
  return [
    { rel: "icon", href: "/images/favicon.svg", type: "image/svg+xml" },
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Roboto+Serif:opsz,wdth,wght@8..144,75,600;8..144,75,700;8..144,75,900&display=swap",
    },
  ];
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
    <SiteLayout version={loaderData.version} signedIn={loaderData.signedIn}>
      <Outlet />
    </SiteLayout>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const loaderData = useRouteLoaderData<typeof loader>("root");
  const status: number = isRouteErrorResponse(error) ? error.status : 500;
  return (
    <SiteLayout version={loaderData?.version ?? "dev"} signedIn={loaderData?.signedIn ?? false}>
      <ErrorPage
        status={status}
        {...(loaderData?.requestId ? { requestId: loaderData.requestId } : {})}
      />
    </SiteLayout>
  );
}
