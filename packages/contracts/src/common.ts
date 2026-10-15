import { CURRENCY, LOCALES } from "@arrosticini/kernel";
import { oc } from "@orpc/contract";
import { z } from "zod";

export const LocaleDto = z.enum(LOCALES);

export function localizedTextDto(maxLength: number) {
  return z.object({
    it: z.string().trim().min(1).max(maxLength),
    en: z.string().trim().min(1).max(maxLength),
  });
}

export const CurrencyDto = z.literal(CURRENCY);

export const IdDto = z.ulid();

export const authed = oc.errors({
  UNAUTHORIZED: { status: 401 },
});

export const admin = authed.errors({
  FORBIDDEN: { status: 403 },
});
