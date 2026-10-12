# Storefront end-to-end tests

Playwright runs the actual production API and web application against the shared local DynamoDB, Valkey and RustFS services. Each worker creates UUID-suffixed tables, a dedicated test bucket with public image reads, its own admin account and isolated API/web processes on allocated ports. It removes only its own tables, bucket, session/cart keys and Stripe test customers afterwards. It does not reset or seed the shared shop.

Build and run from the repository root:

```sh
pnpm turbo run build --filter=@arrosticini/api --filter=@arrosticini/web
pnpm --filter @arrosticini/e2e exec playwright install chromium
pnpm --filter @arrosticini/e2e test:e2e
```

The suite covers registration with anonymous-cart merge and shipping-address persistence, language switching with query/cart preservation, and admin draft creation, real image upload to RustFS and publication in Italian and English. It runs on Chromium desktop and mobile. Browsers use fresh contexts and failures retain ignored traces, screenshots and an HTML report under `e2e`.

The hosted payment test uses real Stripe test-mode Checkout and card `4242 4242 4242 4242`. It reads `STRIPE_SECRET_KEY` from the environment or root `.env.local`, rejects live keys, and skips only that test when no key is supplied. After Stripe confirms payment, the fixture retrieves the actual completion event, signs its local delivery with an isolated webhook secret and forwards it through web `/webhooks/stripe`. This exercises signature verification, payment and order persistence, polling, cart clearing and duplicate delivery. It does not require a Stripe CLI listener, and does not test Stripe's external webhook-delivery configuration. Stripe keeps historical test payments even after the fixture removes the test customer.

To run the same journeys against the production container images, build them and select the Docker runtime:

```sh
docker compose --env-file .env.local --profile full build api web
E2E_RUNTIME=docker pnpm --filter @arrosticini/e2e test:e2e
```

The Docker fixture uses the root Compose `full` services with `e2e/docker-compose.yml`, in a UUID-suffixed project. It starts only API and web, publishes web on an allocated port and removes its containers and network afterwards. The shared infrastructure stays running. Images must be built again after application changes. Containers reach the shared host services through `host.docker.internal`; `E2E_DYNAMODB_CONTAINER_ENDPOINT`, `E2E_S3_CONTAINER_ENDPOINT` and `E2E_VALKEY_CONTAINER_URL` override those addresses.

`E2E_DYNAMODB_ENDPOINT`, `E2E_S3_ENDPOINT` and `E2E_VALKEY_URL` override local service URLs used by fixtures and the host runtime. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects an installed Chromium. No CI workflow is changed; invoke this suite separately from unit tests.
