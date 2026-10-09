# Web

React Router v8 in framework mode with an Express server. Includes Italian and English routes, shared navigation, story and delivery pages, localized error pages, the public catalog and authentication connected to the API through oRPC.

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
| `VALKEY_URL` | Required | Session store URL; use `redis://localhost:6379` with the shared local compose stack |
| `SESSION_SECRET` | Required | At least 32 characters, shared by every web instance to sign the session cookie; generate a random value and keep it out of Git |
| `PUBLIC_ORIGIN` | Required in production | Public HTTPS origin, such as the CloudFront origin; used to reject cross-origin form submissions behind the load balancer |

`GET /healthz` reports process health and returns 503 during shutdown. HTML responses persist the locale in an HttpOnly cookie; `/` selects the saved language before negotiating `Accept-Language`. The language switch preserves the path, query and hash.

Build output is in `build/client` and `build/server`. The Express launcher is `server.ts`, run with `tsx`. Container packaging must include the launcher, the `server` directory and the `tsx` runtime until the server itself has a compiled entry point.

`/:lang/products?q=` searches active products through the backend; `/:lang/products/:slug` shows translated names, descriptions, EUR prices and images. Missing or invalid slugs return 404. Invalid searches return a translated field error; unexpected API failures use the shared 500 page. Request IDs propagate to the API, and browser requests stay on the web origin. Products without images use a CSS placeholder. Cards and product details allow adding a selected quantity to the cart.

`/:lang/cart` reads Shopping lines and resolves product names, current prices and images from Catalog. Quantities update through server actions; zero removes a line, and the removal notice can restore its previous quantity. Adding is cumulative and quantities above 99 return a translated error. Unavailable products remain removable and suppress the total until removed. The header count sums quantities. The first add creates an anonymous cart and stores its ID in the Valkey session, without exposing it to form input. Login and registration merge the anonymous cart into the user's cart and keep the returned ID, including when an existing user signs in without a visitor cart. Logout clears the session so the user's cart is not visible to the next visitor. Checkout and order pages follow the Ordering implementation.

`/:lang/login` submits email and password to Identity from a server action. `/:lang/register` requires email, password, first name and last name, validates the Identity input schema and signs the user in immediately. Email addresses are trimmed and normalized to lowercase; an already registered address returns an `EMAIL_TAKEN` field error. `/:lang/account` requires authentication and reads names, email and preferred locale from Identity. `POST /:lang/logout` removes the Valkey session and expires the cookie; GET requests do not sign users out. Profile editing, password changes and address management follow separately.

The signed `__session` cookie is HttpOnly, SameSite=Lax and Secure in production. It contains only a random identifier; `sess:<id>` on Valkey holds the cart ID and, after login, user ID, role and preferred locale. Both cookie and Valkey TTL renew for seven days on requests with a session. Login rotates the session ID. Restarting web preserves authentication and the cart when it uses the same Valkey instance and session secret. The API actor header comes only from server session data, never from browser headers. Passwords are not stored in session or returned in form errors.
