# Arrosticini 24ore

<p align="center">
  <img src="docs/images/sheep.webp" alt="Arrosticini 24ore sheep" width="360">
</p>

A full-stack e-commerce application built to demonstrate high availability on AWS: zero-downtime deployments, horizontal autoscaling and self-healing containers, shown live while real traffic keeps flowing.

The shop sells arrosticini (Abruzzo's lamb skewers) worldwide, in Italian and English, with real Stripe test-mode payments, customer accounts and a full admin back office.

## Status

- **Application:** feature complete and running locally with Docker Compose, covered by unit, integration and end-to-end tests.
- **AWS infrastructure:** in progress. The CDK stacks and the release pipeline are being written; the target architecture is described below.

## Highlights

- **Domain-Driven Design in a modular monolith:** five bounded contexts, each a package with its own domain, application, infrastructure and HTTP layers. Cross-context imports are rejected by `turbo boundaries`, so any context can be extracted into its own service.
- **Contract-first API:** oRPC contracts with Zod schemas shared by API and web, with OpenAPI specs generated from them and checked in CI.
- **Backend for Frontend:** the browser only talks to the SSR web app, which owns sessions, locale and rendering. The API sits in a private network.
- **Stateless containers:** sessions and carts live in Valkey, so any task can die or be replaced without logging users out.
- **Payments:** Stripe Checkout with signed webhooks, idempotent event handling and saved cards. Domain events move a paid order forward and empty the cart.
- **Built for rolling updates:** `/healthz` returns 503 as soon as a task starts shutting down, and on `SIGTERM` the server finishes in-flight requests and closes its clients before exiting.
- **Security:** scrypt password hashing with constant-time comparison, HttpOnly signed session cookies, same-origin checks on every form action, role checks in both web and API, account suspension enforced on every request.
- **Testing at every level:** Vitest unit and integration tests against real DynamoDB, Valkey, S3 and Stripe mock containers (Testcontainers), Playwright end-to-end tests against the production builds and Docker images, and k6 load scripts.

## Architecture

### Target on AWS

```
                              ┌─ /assets/*  ──► S3 "static" (build JS/CSS)
Browser ──► CloudFront + WAF ─┤
                              └─ default    ──► ALB ──► web (Fargate, ≥2 tasks, 2 AZs)
                                                         ├──► Valkey (sessions)
                                                         └──► api (Fargate, ≥2 tasks, 2 AZs, private)
                                                                ├──► DynamoDB
                                                                ├──► Valkey (carts)
                                                                ├──► S3 "media"
                                                                └──► Stripe API
Stripe ──► webhook ──► CloudFront ──► web /webhooks/stripe ──► api /payments/webhooks/stripe
```

- ECS Fargate services spread across two Availability Zones behind an Application Load Balancer, scaling out when CPU goes above 80%.
- `api` runs in private subnets and accepts traffic only from `web`, through ECS Service Connect.
- Product images are served by `web` at `/images/products/...`, read through `api` from the private `media` bucket, and cached by CloudFront like any other path.
- AWS WAF on CloudFront with a per-IP rate limit and SQL injection rules; Shield Standard covers network-layer attacks.
- Infrastructure as code with AWS CDK in TypeScript. Releases build the images, push them to ECR and trigger a rolling update with automatic rollback.

### Bounded contexts

| Context | Responsibility | Storage |
|---|---|---|
| Catalog | products, IT/EN texts, prices, images, search | DynamoDB, S3 |
| Identity | accounts, credentials, roles, suspension, addresses | DynamoDB |
| Shopping | anonymous and customer carts, merge on login | Valkey |
| Ordering | orders with copied lines and address, fulfilment states | DynamoDB |
| Payments | Stripe Checkout sessions, customers, saved cards, webhook idempotency | DynamoDB |

Contexts communicate through ports declared in their application layer, wired in `apps/api`, and through domain events on an in-process event bus.

## Tech stack

| Area | Tools |
|---|---|
| Language and runtime | TypeScript, Node.js 24 |
| Monorepo | pnpm workspaces, Turborepo, Biome |
| API | Express 5, oRPC, Zod 4, AWS SDK v3, pino |
| Web | React 19, React Router 8 (framework mode, SSR), Tailwind CSS 4, Radix UI, Motion, i18next |
| Data | DynamoDB, Valkey, S3 |
| Payments | Stripe |
| Testing | Vitest, Testcontainers, Supertest, Playwright, k6 |
| Delivery | Docker multi-stage images, GitHub Actions, AWS CDK |

## Repository layout

```
apps/
  api/          Express + oRPC server, composition root of the bounded contexts
  web/          React Router SSR app and Express server (BFF)
contexts/       catalog, identity, shopping, ordering, payments
packages/
  contracts/    oRPC contracts and generated OpenAPI specs
  kernel/       shared kernel: Money, Locale, IDs, domain errors and events
  ops/          health checks, logging, graceful shutdown, CPU sampling
  testing/      Testcontainers setup shared by the test suites
  tsconfig/     shared TypeScript configuration
e2e/            Playwright end-to-end tests
load/           k6 load scripts
docs/           work plan, design system, design references
```

## Getting started

### Prerequisites

- Node.js 24
- pnpm 12
- Docker with Compose
- A Stripe test account, for checkout and saved cards

### Run locally

```sh
pnpm install
cp .env.example .env.local
```

Edit `.env.local`:

- `SESSION_SECRET`: a random value of at least 32 characters, for example from `openssl rand -base64 48`.
- `STRIPE_SECRET_KEY`: your Stripe test secret key (`sk_test_...`).
- `ADMIN_PASSWORD`: add it (at least 8 characters) to create the admin account for `ADMIN_EMAIL`.

Start DynamoDB Local, Valkey and RustFS (S3 compatible), then create the tables and the bucket, seed the catalog and create the admin:

```sh
pnpm local:up
```

Start the API and the web app in watch mode:

```sh
pnpm dev
```

The shop is on http://localhost:3100 and the API on http://localhost:4000.

### Payments

Forward Stripe events to the local web app:

```sh
docker compose --env-file .env.local --profile stripe up -d stripe
docker compose logs stripe
```

Copy the `whsec_...` signing secret printed by the listener into `STRIPE_WEBHOOK_SECRET` and restart `pnpm dev`. Pay with the test card `4242 4242 4242 4242`, any future expiry date and any CVC.

### Production images

Instead of `pnpm dev`, the API and web app can run from their production Docker images:

```sh
docker compose --env-file .env.local --profile full up -d --build api web
```

### Local stack commands

| Command | Effect |
|---|---|
| `pnpm local:up` | start the services and run the setup |
| `pnpm local:stop` | stop the services, keeping the data |
| `pnpm local:destroy` | remove the services and their data |
| `pnpm local:reset` | destroy and start again from scratch |

### AWS commands

They need an AWS session (`aws login`). Publishing a GitHub Release pushes the images and, when the app stack exists, deploys it from CI; when it does not, the deploy is skipped. CI does not touch DNS: an update keeps the same CloudFront domain.

| Command | Effect |
|---|---|
| `pnpm aws:bootstrap` | bootstrap CDK in `eu-south-1` and `us-east-1` |
| `pnpm aws:foundation:deploy` | deploy the foundation stack: ECR repositories and the GitHub OIDC role |
| `pnpm aws:foundation:destroy` | destroy the foundation stack |
| `pnpm aws:app:deploy` | deploy the app stack with the latest image tag present in both ECR repositories, plus the certificate and web ACL stacks in `us-east-1`, then run `aws:dns:update` |
| `pnpm aws:dns:update` | point the `arrosticini.colagreco.dev` CNAME on Cloudflare to the CloudFront domain, using the `/arrosticini/cloudflare-zone-id` and `/arrosticini/cloudflare-api-token` parameters |
| `pnpm aws:dns:delete` | delete the `arrosticini.colagreco.dev` CNAME on Cloudflare, refusing while the app stack still serves a CloudFront domain |
| `pnpm aws:app:seed` | seed the catalog and the admin from the Parameter Store credentials |
| `pnpm aws:app:destroy` | destroy the app stack and its web ACL, then run `aws:dns:delete`, so the next deploy can attach the domain to a new distribution; the certificate stack stays |

## Quality checks

```sh
pnpm turbo run lint typecheck test build
pnpm boundaries
```

End-to-end tests, against the compiled API and web app:

```sh
pnpm turbo run build --filter=@arrosticini/api --filter=@arrosticini/web
pnpm --filter @arrosticini/e2e exec playwright install chromium
pnpm --filter @arrosticini/e2e test:e2e
```

Load tests with k6:

```sh
k6 run load/browse.js
k6 run -e EMAIL=admin@arrosticini24ore.local load/login-storm.js
```

`browse.js` navigates the storefront; `login-storm.js` sends failed logins to a registered account to load the CPU with password hashing. `BASE_URL`, `VUS` and `DURATION` override the target and the load.

## Workflow

- Feature branches from `dev`, pull requests to `dev`, squash merge after CI.
- Conventional Commits: `<type>(<scope>): <description>`.
- Releases: a pull request from `dev` to `prod` with a merge commit, then a GitHub Release `vX.Y.Z` that builds, publishes and deploys the images.

The full design, in Italian, is in [`docs/piano-di-lavoro.md`](docs/piano-di-lavoro.md).

## Author

Antonio Colagreco
