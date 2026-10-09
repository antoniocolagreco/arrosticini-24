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

`/:lang/cart` reads Shopping lines and resolves product names, current prices and images from Catalog. Quantities update through server actions; zero removes a line, and the removal notice can restore its previous quantity. Adding is cumulative and quantities above 99 return a translated error. Unavailable products remain removable and suppress the total until removed. The header count sums quantities. The first add creates an anonymous cart and stores its ID in the Valkey session, without exposing it to form input. Login and registration merge the anonymous cart into the user's cart and keep the returned ID, including when an existing user signs in without a visitor cart. Logout clears the session so the user's cart is not visible to the next visitor.

`/:lang/checkout` requires authentication and a nonempty cart. Customers select a saved shipping address or add one, including the required recipient phone; Identity enforces the five-address limit. The order action reads the cart ID and actor from session, validates the Ordering contract, and supplies the locale and absolute orders URL from the public origin. Ordering copies the address and current Catalog prices and returns the authoritative total and Stripe `paymentUrl`, redirected with 303. The cart remains populated until successful payment. `/:lang/orders` lists the customer's orders; `/:lang/orders/:id` displays the copied lines, total, status and address. Missing, invalid or another customer's order IDs return 404. Pending orders refresh every three seconds while the page is visible, stopping when paid or cancelled; revalidation also refreshes the header cart count.

`POST /webhooks/stripe` forwards the unchanged raw JSON body, Stripe signature and request ID to the internal API, preserving its response status. It runs before session and locale middleware and does not forward browser cookies or actor headers. Signature verification and payment state transitions remain in the API. Configure Stripe CLI or the dashboard to send events to the public web origin at `/webhooks/stripe`; Stripe keys and webhook secrets are API configuration, not web requirements.

Stripe CLI v1.51 requires an explicit event selection. Until the compose service command includes it, run `docker compose --env-file .env.local --profile stripe run --rm stripe listen --events checkout.session.completed,checkout.session.expired --forward-to host.docker.internal:3100/webhooks/stripe`. The API's `STRIPE_WEBHOOK_SECRET` must match the signing secret printed by that listener; a dashboard endpoint has a different secret.

`/:lang/account/payment-methods` requires authentication and lists the customer's saved cards. Adding a card redirects with 303 to Stripe's setup checkout and returns to the localized cards page using `PUBLIC_ORIGIN`. Removing a card refreshes the list without replacing it with a loading screen. Card numbers and security codes are entered only on Stripe; web displays brand, last four digits and expiry.

`/:lang/login` submits email and password to Identity from a server action. `/:lang/register` requires email, password, first name and last name, validates the Identity input schema and signs the user in immediately. Email addresses are trimmed and normalized to lowercase; an already registered address returns an `EMAIL_TAKEN` field error. `/:lang/account` requires authentication and reads names, email and preferred locale from Identity. `POST /:lang/logout` removes the Valkey session and expires the cookie; GET requests do not sign users out. Profile editing, password changes and address management follow separately.

The signed `__session` cookie is HttpOnly, SameSite=Lax and Secure in production. It contains only a random identifier; `sess:<id>` on Valkey holds the cart ID and, after login, user ID, role and preferred locale. Both cookie and Valkey TTL renew for seven days on requests with a session. Login rotates the session ID. Restarting web preserves authentication and the cart when it uses the same Valkey instance and session secret. The API actor header comes only from server session data, never from browser headers. Passwords are not stored in session or returned in form errors.
