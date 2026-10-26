export function publicOrigin(requestUrl: string): string {
  return new URL(process.env.PUBLIC_ORIGIN ?? requestUrl).origin;
}
