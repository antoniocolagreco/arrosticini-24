import { randomBytes } from "node:crypto";
import { IdDto, LocaleDto, Role, type UserDto } from "@arrosticini/contracts";
import { isLocale } from "@arrosticini/kernel";
import {
  type Cookie,
  createContext,
  createCookie,
  createSessionStorage,
  type MiddlewareFunction,
  type RouterContext,
  type RouterContextProvider,
  redirect,
  type Session,
  type SessionStorage,
} from "react-router";
import { z } from "zod";
import { detectRejectedActor } from "./api.server.js";
import { pathLocale } from "./locale.server.js";

const AuthSessionData = z.object({ userId: IdDto, role: Role, locale: LocaleDto });
const SessionData = AuthSessionData.partial().extend({ cartId: IdDto.optional() });
export type AuthSessionData = z.infer<typeof AuthSessionData>;
type SessionData = z.infer<typeof SessionData>;
export const SESSION_TTL = 60 * 60 * 24 * 7;

export interface SessionClient {
  getex(key: string, mode: "EX", ttl: number): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttl: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export function createValkeySessionStorage(
  client: SessionClient,
  secret: string,
  secure: boolean,
): SessionStorage<SessionData> & { cookie: Cookie } {
  const cookie: Cookie = createCookie("__session", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: SESSION_TTL,
    secrets: [secret],
  });
  const storage: SessionStorage<SessionData> = createSessionStorage<SessionData>({
    cookie,
    async createData(value) {
      const id: string = randomBytes(32).toString("hex");
      await client.set(`sess:${id}`, JSON.stringify(SessionData.parse(value)), "EX", SESSION_TTL);
      return id;
    },
    async readData(id) {
      if (!/^[a-f0-9]{64}$/.test(id)) return null;
      const value: string | null = await client.getex(`sess:${id}`, "EX", SESSION_TTL);
      return value ? SessionData.parse(JSON.parse(value)) : null;
    },
    async updateData(id, value) {
      await client.set(`sess:${id}`, JSON.stringify(SessionData.parse(value)), "EX", SESSION_TTL);
    },
    async deleteData(id) {
      await client.del(`sess:${id}`);
    },
  });
  return { ...storage, cookie };
}

type SessionStore = SessionStorage<SessionData> & { cookie: Cookie };
const shared: typeof globalThis & {
  arrosticiniSessionStorageContext?: RouterContext<SessionStore>;
} = globalThis;
export const sessionStorageContext: RouterContext<SessionStore> =
  shared.arrosticiniSessionStorageContext ?? createContext<SessionStore>();
shared.arrosticiniSessionStorageContext = sessionStorageContext;
export const sessionContext = createContext<Session<SessionData>>();

export const sessionMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const storage: SessionStore = context.get(sessionStorageContext);
  const session: Session<SessionData> = await storage.getSession(request.headers.get("cookie"));
  context.set(sessionContext, session);
  const { response, rejected } = await detectRejectedActor(next);
  if (rejected && session.has("userId")) {
    const path: string | null = pathLocale(request.url);
    const locale: string = isLocale(path) ? path : (session.get("locale") ?? "it");
    throw redirect(`/${locale}/login`, {
      headers: { "Set-Cookie": await storage.destroySession(session) },
    });
  }
  if (
    session.id &&
    !response.headers.getSetCookie().some((cookie: string) => cookie.startsWith("__session="))
  ) {
    response.headers.append("Set-Cookie", await storage.cookie.serialize(session.id));
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};

export function requireUser(
  context: Readonly<RouterContextProvider>,
  locale: string,
): AuthSessionData {
  const session: Session<SessionData> = context.get(sessionContext);
  if (!session.has("userId")) throw redirect(`/${locale}/login`);
  return AuthSessionData.parse(session.data);
}

export function assertSameOrigin(request: Request): void {
  const origin: string | null = request.headers.get("origin");
  const expected: string = new URL(process.env.PUBLIC_ORIGIN ?? request.url).origin;
  if (origin !== expected) throw new Response(null, { status: 403 });
}

export async function loginSession(
  context: Readonly<RouterContextProvider>,
  user: UserDto,
  cartId?: string,
): Promise<string> {
  const storage: SessionStorage<SessionData> = context.get(sessionStorageContext);
  const previous: Session<SessionData> = context.get(sessionContext);
  if (previous.id) await storage.destroySession(previous);
  const session: Session<SessionData> = await storage.getSession();
  session.set("userId", user.id);
  session.set("role", user.role);
  session.set("locale", user.preferredLocale);
  if (cartId) session.set("cartId", cartId);
  return storage.commitSession(session);
}
