import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function isHttpsOrigin(origin: string | undefined): boolean {
  return origin !== undefined && new URL(origin).protocol === "https:";
}
