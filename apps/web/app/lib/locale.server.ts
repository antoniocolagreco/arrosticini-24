import { isLocale, type Locale } from "@arrosticini/kernel";
import { createCookie } from "react-router";

export const localeCookie = createCookie("locale", {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
});

export function pathLocale(url: string): string | null {
  return new URL(url).pathname.split("/")[1]?.replace(/\.data$/, "") || null;
}

export async function preferredLocale(request: Request): Promise<Locale> {
  const cookie: unknown = await localeCookie.parse(request.headers.get("cookie"));
  if (isLocale(cookie)) return cookie;
  const languages: { locale: string; quality: number }[] = (
    request.headers.get("accept-language") ?? ""
  )
    .split(",")
    .map((part) => {
      const [language = "", ...parameters] = part.trim().split(";");
      const quality: string | undefined = parameters.find((parameter) =>
        parameter.trim().startsWith("q="),
      );
      return {
        locale: language.toLowerCase().split("-")[0] ?? "",
        quality: quality ? Number(quality.trim().slice(2)) : 1,
      };
    })
    .filter(({ quality }) => Number.isFinite(quality) && quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality);
  for (const { locale } of languages) {
    if (isLocale(locale)) return locale;
  }
  return "it";
}
