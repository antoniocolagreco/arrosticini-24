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

export const IdDto = z.uuidv7();

export const Cursor = z.string().min(1).max(1024);

export function pageDto<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: Cursor.optional() });
}

export const invalidCursor = { INVALID_CURSOR: { status: 400 } } as const;

export const authed = oc.errors({
  UNAUTHORIZED: { status: 401 },
});

export const admin = authed.errors({
  FORBIDDEN: { status: 403 },
});
