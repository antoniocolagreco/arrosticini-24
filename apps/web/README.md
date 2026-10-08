# Web

React Router v8 in framework mode with an Express server. Includes Italian and English routes, shared navigation, story and delivery pages, localized error pages and the public catalog connected to the API through oRPC. Account flows follow in subsequent steps.

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
| `API_URL` | `http://localhost:${API_PORT}` (`4000` when unset) | Internal API origin; set to `http://api:4000` for Service Connect, or `http://localhost:4100` for the frontend workdir |
| `MEDIA_BASE_URL` | `/images` | Prefix for product image keys; use `http://localhost:9100/media` with local RustFS |

`GET /healthz` reports process health and returns 503 during shutdown. HTML responses persist the locale in an HttpOnly cookie; `/` selects the saved language before negotiating `Accept-Language`. The language switch preserves the path, query and hash.

Build output is in `build/client` and `build/server`. The Express launcher is `server.ts`, run with `tsx`. Container packaging must include the launcher, the `server` directory and the `tsx` runtime until the server itself has a compiled entry point.

`/:lang/products?q=` searches active products through the backend; `/:lang/products/:slug` shows translated names, descriptions, EUR prices and images. Missing or invalid slugs return 404. Invalid searches return a translated field error; unexpected API failures use the shared 500 page. Request IDs propagate to the API, and browser requests stay on the web origin. Products without images use a CSS placeholder. Cart controls follow when Shopping is available.
