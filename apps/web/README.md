# Web

React Router v8 in framework mode with an Express server. The scaffold includes Italian and English routes, shared navigation, story and delivery pages, and localized error pages. Catalog and account flows follow in subsequent steps.

Run from the repository root:

```sh
pnpm --filter @arrosticini/web dev
pnpm --filter @arrosticini/web build
pnpm --filter @arrosticini/web start
```

The development server loads the root `.env.local` when present. Production receives its environment from the process.

| Variable | Default | Purpose |
|---|---|---|
| `WEB_PORT` | `3100` | Express listener for the frontend workdir |
| `APP_VERSION` | `dev` | Footer and log version |
| `LOG_LEVEL` | `info` | Shared pino logger level |
| `NODE_ENV` | `development` | Vite middleware in development; built SSR in production |

`GET /healthz` reports process health and returns 503 during shutdown. HTML responses persist the locale in an HttpOnly cookie; `/` selects the saved language before negotiating `Accept-Language`. The language switch preserves the path, query and hash.

Build output is in `build/client` and `build/server`. The Express launcher is `server.ts`, run with `tsx`. Container packaging must include the launcher, the `server` directory and the `tsx` runtime until the server itself has a compiled entry point.
