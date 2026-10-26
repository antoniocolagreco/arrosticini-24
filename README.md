# Arrosticini 24ore

<p align="center">
  <img src="docs/images/sheep.webp" alt="Arrosticini 24ore sheep" width="360">
</p>

A full-stack e-commerce application built to demonstrate high availability on AWS: zero-downtime deployments, horizontal autoscaling and self-healing containers, shown live while real traffic keeps flowing.

The shop sells arrosticini (Abruzzo's lamb skewers) worldwide, in Italian and English, with real Stripe test-mode payments, customer accounts and a full admin back office.

## Status

- **Application:** feature complete and running locally with Docker Compose, covered by unit, integration and end-to-end tests.
- **AWS infrastructure:** deployed with AWS CDK and served at https://arrosticini.colagreco.dev while the app stack is up. Publishing a GitHub Release builds the images and rolls them out.

## Highlights

- **Domain-Driven Design across two services:** `web` and `api` ship as separate images. The API is split into five bounded contexts, each a package with its own domain, application, infrastructure and HTTP layers. Cross-context imports are rejected by `turbo boundaries`, so any context can be extracted into its own service.
- **Contract-first API:** oRPC contracts with Zod schemas shared by API and web, with OpenAPI specs generated from them and checked in CI.
- **Backend for Frontend:** the browser only talks to the SSR web app, which owns sessions, locale and rendering. The API sits in a private network.
- **Stateless containers:** sessions and carts live in Valkey, so any task can die or be replaced without logging users out.
- **Payments:** Stripe Checkout with signed webhooks, idempotent event handling and saved cards. Domain events move a paid order forward and empty the cart.
- **Built for rolling updates:** `/healthz` returns 503 as soon as a task starts shutting down, and on `SIGTERM` the server finishes in-flight requests and closes its clients before exiting.
- **Security:** scrypt password hashing with constant-time comparison, HttpOnly signed session cookies, same-origin checks on every form action, role checks in both web and API, account suspension enforced on every request.
- **SEO:** the web app serves these, and the other pages are marked `noindex`:
  - canonical and `hreflang` links for Italian and English;
  - Open Graph and Twitter cards with a social preview image;
  - JSON-LD for the organization, the website and each product with its offer and breadcrumbs;
  - `robots.txt` and a `sitemap.xml` built from the catalog.
- **Live stress panel:** `/:lang/stress` polls the web app every 500 ms and shows each web and api task it meets as a sheep, with its version, Availability Zone and CPU read from the container cgroup. Tasks appear when the service scales out and fade away when they stop.
- **Testing at every level:** Vitest unit and integration tests against real DynamoDB, Valkey, S3 and Stripe mock containers (Testcontainers), Playwright end-to-end tests against the production builds and Docker images, and k6 load scripts.

## Architecture

### On AWS

```
Browser ──► CloudFront + WAF ──► ALB ──► web (Fargate, 2-4 tasks, 2 AZs)
            arrosticini.colagreco.dev     ├──► Valkey (sessions)
                                          └──► api (Fargate, 2-4 tasks, 2 AZs, private)
                                                 ├──► DynamoDB
                                                 ├──► Valkey (carts)
                                                 ├──► S3 "media"
                                                 └──► Stripe API
Stripe ──► webhook ──► CloudFront ──► web /webhooks/stripe ──► api /payments/webhooks/stripe
```

- **Network:** a VPC across two Availability Zones with public, private and isolated subnets.
  - The ALB sits in the public subnets and accepts traffic only from CloudFront, through the CloudFront origin-facing prefix list.
  - The ECS tasks run in the private subnets. They reach Stripe, ECR, CloudWatch Logs and Parameter Store through one NAT gateway per AZ, and DynamoDB and S3 through gateway endpoints.
  - Valkey Serverless runs in the isolated subnets and accepts connections only from `web` and `api`.
- **Services:** `web` and `api` are ECS Fargate services with 0.25 vCPU tasks, spread across both AZs.
  - `api` accepts traffic only from `web`, through ECS Service Connect.
  - Each service scales between 2 and 4 tasks on its average CPU over one minute: one task more from 80%, two more from 95%, one less under 30%.
- **CloudFront:** serves the custom domain with an ACM certificate in `us-east-1`.
  - `/assets/*` (build JS and CSS) and `/images/*` are cached.
  - Every other path goes to the ALB uncached.
  - Product images are served by `web` at `/images/products/...`, read through `api` from the private `media` bucket.
- **WAF:** the web ACL on CloudFront has these rules:
  - a rate limit of 2000 requests per IP every 5 minutes;
  - the AWS managed IP reputation list;
  - the core rule set, with the body size rule in count mode;
  - the known bad inputs rule set.

  Shield Standard covers network-layer attacks.
- **Rolling updates:** each service keeps 100% of its tasks healthy and starts the new ones alongside, up to 200%.
  - `web` is updated after `api`.
  - The deployment circuit breaker rolls a service back when its new tasks do not become healthy.
- **DNS:** the `colagreco.dev` zone is on Cloudflare. The `arrosticini` CNAME points to the CloudFront domain and is set by the deploy scripts.

The CDK app in `infra/` defines four stacks:

| Stack | Region | Contents |
|---|---|---|
| `arrosticini-foundation` | `eu-south-1` | ECR repositories with immutable tags, keeping the last five `v*` images; GitHub OIDC provider and the `arrosticini-ci` role assumed by releases |
| `arrosticini-edge` | `us-east-1` | ACM certificate for `arrosticini.colagreco.dev`; it stays when the app is destroyed |
| `arrosticini-waf` | `us-east-1` | web ACL attached to CloudFront |
| `arrosticini-app` | `eu-south-1` | VPC, DynamoDB tables, `media` bucket, Valkey, ECS cluster and services, ALB, CloudFront distribution |

`arrosticini-waf` and `arrosticini-app` are synthesized only when ECR holds an image tag present in both repositories. The app always deploys the most recently pushed of these tags.

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
| AWS | ECS Fargate, ALB, CloudFront, WAF, ACM, DynamoDB, ElastiCache Serverless for Valkey, S3, ECR, Parameter Store |
| Delivery | Docker multi-stage images, GitHub Actions, AWS CDK, Cloudflare DNS |

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
infra/          AWS CDK app: stacks, Cloudflare DNS script
e2e/            Playwright end-to-end tests
load/           k6 load scripts
docs/           work plan, design system, design references
.github/        CI and release workflows
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

They need an AWS session (`aws login`).

Publishing a GitHub Release `vX.Y.Z` runs the CI checks, then builds the images and pushes them to ECR with the release tag. When the app stack exists, the release also runs `cdk deploy arrosticini-app`; when it does not, the deploy is skipped. CI does not touch DNS, because an update keeps the same CloudFront domain.

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
| `pnpm aws:app:api:restart` | replace the `api` tasks with a rolling update on the same image |
| `pnpm aws:app:web:restart` | replace the `web` tasks with a rolling update on the same image |

Destroy the app stack with `pnpm aws:app:destroy`, not from the console. If the CNAME still points to a deleted distribution, CloudFront refuses to attach the domain to a new one.

#### First deploy

The deploy reads these Parameter Store parameters in `eu-south-1`:

| Parameter | Type | Value |
|---|---|---|
| `/arrosticini/repository-path` | String | GitHub `owner/repository`, trusted by the CI role for `v*` tags |
| `/arrosticini/session-secret` | SecureString | at least 32 random characters |
| `/arrosticini/stripe-secret-key` | SecureString | Stripe test secret key |
| `/arrosticini/stripe-webhook-secret` | SecureString | signing secret of the Stripe webhook endpoint |
| `/arrosticini/admin-email` | String | admin account created by the seed |
| `/arrosticini/admin-password` | SecureString | its password, at least 8 characters |
| `/arrosticini/cloudflare-zone-id` | String | ID of the `colagreco.dev` zone |
| `/arrosticini/cloudflare-api-token` | SecureString | Cloudflare API token allowed to edit DNS in that zone |

The release workflow needs the GitHub repository variables `AWS_ROLE_ARN` (the `arrosticini-ci` role) and `AWS_REGION` (`eu-south-1`).

From an empty account:

1. `pnpm aws:bootstrap`.
2. `pnpm aws:foundation:deploy`.
3. Publish a GitHub Release, which pushes the first images. The deploy is skipped because the app stack does not exist yet.
4. Create the Stripe webhook endpoint at `https://arrosticini.colagreco.dev/webhooks/stripe` for `checkout.session.completed` and `checkout.session.expired`, and store its signing secret in `/arrosticini/stripe-webhook-secret`. The `api` tasks read it at startup, so it must exist before the app.
5. `pnpm aws:app:deploy`. The first time, the certificate stack waits for DNS validation: add to Cloudflare the validation CNAME shown in the ACM console, without proxy, and keep it for renewals.
6. `pnpm aws:app:seed`.

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

`browse.js` navigates the storefront with 50 virtual users. `login-storm.js` sends failed logins to a registered account with 20 virtual users, to load the CPU with password hashing. Both run for 5 minutes against `http://localhost:3100`. `BASE_URL`, `VUS` and `DURATION` override the target and the load.

From a single IP, a run against AWS goes over the WAF rate limit: switch the `RateLimit` rule to count before it.

## Workflow

- Feature branches from `dev`, pull requests to `dev`, squash merge after CI.
- Conventional Commits: `<type>(<scope>): <description>`.
- Releases: a pull request from `dev` to `prod` with a merge commit, then a GitHub Release `vX.Y.Z` that builds, publishes and deploys the images.

The full design, in Italian, is in [`docs/piano-di-lavoro.md`](docs/piano-di-lavoro.md).

## Author

Antonio Colagreco
