# Arrosticini 24ore — piano di lavoro

## Contesto

Software dimostrativo per un talk: un e-commerce globale di arrosticini su cui mostrare dal vivo:

1. rolling update senza downtime;
2. scaling orizzontale quando la CPU supera l'80%;
3. high availability quando un container muore;
4. sessioni su Valkey e CDN con CloudFront.

Multilingua IT/EN e pagamento Stripe in modalità test sono inclusi per sperimentazione.

Riferimenti visivi: `docs/mock.png` (home) e `docs/images/` (immagini del sito e dei prodotti).

## Decisioni

- **Monorepo:** pnpm workspace + Turborepo.
- **Architettura:** DDD in un monolite modulare. Ogni bounded context si deve poter estrarre in un servizio autonomo.
- **web:** React Router v8 (framework mode, SSR) su Fargate. Tailwind v4, shadcn/ui, Motion, Lucide.
- **api:** Express 5, Zod 4, AWS SDK v3 su Fargate. Non raggiungibile dalla rete pubblica.
- **Contratto web↔api:** oRPC contract-first in `packages/contracts`.
- **Persistenza:** DynamoDB (una tabella per bounded context), Valkey (sessioni e carrelli), S3 (asset della build e immagini dei prodotti).
- **Autenticazione:** email e password, sessione su Valkey, cookie HttpOnly. In registrazione si chiedono anche nome e cognome; il telefono sta su ogni indirizzo di spedizione, perché il corriere chiama chi riceve.
- **Pagamenti:** Stripe Checkout ospitato, modalità test.
- **Multilingua:** IT ed EN, lingua nel prefisso dell'URL (`/it/...`, `/en/...`).
- **Segreti:** AWS Systems Manager Parameter Store.
- **Immagini Docker:** `linux/amd64` su Alpine.
- **Sviluppo locale:** docker compose con DynamoDB Local, Valkey, RustFS (S3 compatibile) e Stripe CLI.
- **Infrastruttura:** CDK in TypeScript.
- **CI/CD:** GitHub Actions. Ogni release costruisce le immagini, le pubblica su ECR e avvia il rolling update.

## Architettura

```
                              ┌─ /assets/*  ──► S3 "static" (build JS/CSS)
Browser ──► CloudFront ───────┼─ /images/*  ──► S3 "media"  (immagini prodotto)
                              └─ default    ──► ALB ──► web (Fargate, ≥2 task, 2 AZ)
                                                         ├──► Valkey (sessioni)
                                                         └──► api (Fargate, ≥2 task, 2 AZ, rete privata)
                                                                ├──► DynamoDB
                                                                ├──► Valkey (carrelli)
                                                                ├──► S3 "media"
                                                                └──► Stripe API
Stripe ──► webhook ──► CloudFront ──► web /webhooks/stripe ──► api /payments/webhooks/stripe
```

- **web è il BFF:** il browser parla solo con `web`, che gestisce sessione, lingua e rendering e chiama `api`. `web` non contiene regole di business.
- **Rete:**
  - l'ALB sta nelle subnet pubbliche;
  - `web` e `api` stanno in subnet private, senza IP pubblico;
  - il security group di `api` accetta traffico solo da `web`;
  - un NAT Gateway dà l'uscita verso internet (Stripe, ECR, CloudWatch).
- **Comunicazione web→api:** ECS Service Connect.
- **Webhook Stripe:** `web` espone `/webhooks/stripe` e inoltra ad `api` il corpo grezzo e l'header `Stripe-Signature`. È `api` a verificare la firma.
- **Una sola regione AWS.**
- **Dominio:** l'URL predefinito di CloudFront (`dxxxx.cloudfront.net`), che cambia a ogni ricreazione dello stack. CDK lo passa a `web` nella variabile `PUBLIC_ORIGIN`, usata negli URL di ritorno di Stripe.

## Domain Driven Design

### Bounded context

| Contesto | Responsabilità | Aggregati | Persistenza |
|---|---|---|---|
| Catalog | prodotti, testi IT/EN, prezzo, immagini, stato, ricerca | `Product` | tabella `catalog`, S3 `media` |
| Identity | account, credenziali, ruolo (customer/admin), profilo, lingua preferita, indirizzi | `User` (con `Address`) | tabella `identity` |
| Shopping | carrello di anonimi e loggati, merge al login | `Cart` | Valkey `cart:*` |
| Ordering | ordine con copia di righe, prezzi e indirizzo; stati | `Order` | tabella `ordering` |
| Payments | Checkout Session, stato del pagamento, cliente Stripe, carte salvate, idempotenza dei webhook | `Payment`, `PaymentCustomer` | tabella `payments` |

### Regole di isolamento

1. Ogni contesto è un package in `contexts/<nome>` ed espone solo ciò che esporta da `index.ts`.
2. Nessun import diretto tra contesti. Se un contesto ha bisogno di un altro, dichiara una porta nel proprio livello application; l'adapter sta in `apps/api` (composition root).
3. La comunicazione asincrona passa da domain event su un'interfaccia `EventBus`, oggi implementata in-process.
4. Ogni contesto legge e scrive solo i propri dati.
5. Lo shared kernel (`packages/kernel`) contiene solo `Money`, `Locale`, `LocalizedText`, ID (ULID), `DomainError`, `DomainEvent`, `EventBus`.
6. `turbo boundaries` con tag (`context`, `kernel`, `app`) vieta le dipendenze tra contesti.
7. Per estrarre un contesto: nuovo `apps/<contesto>-service` che monta il suo router, adapter HTTP al posto di quello in-process, SQS o EventBridge al posto del bus in-process.

### Livelli di un contesto

```
contexts/ordering/src/
├─ domain/          aggregati, value object, eventi, errori, interfacce dei repository (niente AWS)
├─ application/     use case, porte verso altri contesti
├─ infrastructure/  repository DynamoDB, adapter esterni
├─ http/            implementazione del contratto oRPC
└─ index.ts         API pubblica del contesto
```

### Checkout e pagamento

1. Il browser fa `POST /it/checkout` su `web`, che chiama `POST /ordering/orders` con `cartId` e `addressId`.
2. Ordering (`PlaceOrder`) legge carrello (`CartReader` → Shopping), prezzi (`CatalogPricing` → Catalog) e indirizzo (`CustomerDirectory` → Identity). Poi crea l'`Order` in `PENDING_PAYMENT`, con la copia di nome, prezzo unitario e indirizzo.
3. Ordering chiama `PaymentInitiator` (→ Payments), che crea la Checkout Session con `orderId` nei metadata, lingua e cliente Stripe dell'utente, e restituisce l'URL di pagamento.
4. `web` reindirizza il browser su Stripe (303). Carta di test: `4242 4242 4242 4242`.
5. Stripe riporta il browser su `/it/orders/<id>` e invia il webhook `checkout.session.completed`.
6. Payments verifica la firma, scarta gli eventi già visti, segna il `Payment` come `SUCCEEDED` e pubblica `PaymentSucceeded`.
7. Ordering porta l'ordine a `PAID`, Shopping svuota il carrello.
8. La pagina dell'ordine interroga lo stato finché non diventa `PAID`.
9. `checkout.session.expired` → `Payment` in `EXPIRED`, evento `PaymentExpired`, ordine in `CANCELLED`.

Il bus esegue gli handler in modo sincrono, e `api` risponde 2xx a Stripe solo quando tutti gli handler sono terminati. Se il container muore a metà, Stripe ripete il webhook e gli handler idempotenti lo riapplicano.

Stati dell'ordine: `PENDING_PAYMENT` → `PAID` oppure `PENDING_PAYMENT` → `CANCELLED`. L'aggregato `Order` vieta ogni altra transizione.

## Sicurezza

- **Login:** `web` verifica le credenziali con `POST /identity/credentials/verify` e salva in sessione `userId`, `role` e `locale`.
- **Identità verso api:** `web` invia `userId` e `role` nell'header `x-actor`. `api` si fida dell'header perché il suo security group accetta traffico solo da `web`.
- **Ruolo admin:** controllato sia dal middleware di `web` sia dagli use case di `api`.
- **Password:** `crypto.scrypt` nativo di Node, salt casuale per utente, confronto con `timingSafeEqual`.

## Segreti

Parameter Store, parametri di tipo `SecureString`:

| Parametro | Chi lo crea |
|---|---|
| `/arrosticini/stripe-secret-key` | Antonio, a mano, una volta |
| `/arrosticini/session-secret` | Antonio, a mano, una volta |
| `/arrosticini/admin-password` | Antonio, a mano, una volta |
| `/arrosticini/stripe-webhook-secret` | lo script `up`, a ogni esecuzione |

- **Su AWS:** ECS legge i parametri all'avvio dei task e li passa come variabili d'ambiente.
- **In locale:** gli stessi valori stanno in `.env.local`, escluso da git.

## Struttura del monorepo

```
arrosticini-24/
├─ apps/
│  ├─ web/                     React Router v8 + server Express
│  │  ├─ server.ts             createRequestHandler, /healthz, graceful shutdown
│  │  ├─ app/
│  │  │  ├─ root.tsx, routes.ts
│  │  │  ├─ middleware/        session, locale, requireUser, requireAdmin
│  │  │  ├─ routes/
│  │  │  ├─ components/ui/     componenti shadcn
│  │  │  ├─ components/
│  │  │  ├─ locales/{it,en}/   traduzioni per namespace
│  │  │  ├─ lib/api.server.ts  client oRPC con header x-actor e x-request-id
│  │  │  └─ styles/app.css     token Tailwind dal mock
│  │  └─ Dockerfile
│  └─ api/                     composition root
│     ├─ src/server.ts         Express, handler oRPC, webhook Stripe, /healthz, graceful shutdown
│     ├─ src/wiring.ts         adapter porta→contesto, EventBus, handler degli eventi
│     ├─ bin/grill.js          busy loop di CPU per lo stress manuale
│     ├─ scripts/setup-local.ts  tabelle, bucket e seed in locale
│     └─ Dockerfile
├─ contexts/
│  ├─ catalog/  identity/  shopping/  ordering/  payments/
├─ packages/
│  ├─ kernel/                  shared kernel
│  ├─ contracts/               contratti oRPC per contesto, generazione di openapi/<contesto>.yaml
│  ├─ ops/                     health, graceful shutdown, metadata del task ECS, CPU, logger, request id, middleware degli errori
│  └─ tsconfig/
├─ load/                       scenari k6
├─ infra/                      CDK: stack foundation e app, script up e down
├─ .github/workflows/          ci.yml, release.yml
├─ docs/
├─ docker-compose.yml
├─ .env.example
└─ turbo.json, pnpm-workspace.yaml, biome.json, package.json
```

## Dati

Prezzi in centesimi interi con valuta `EUR` (value object `Money`). Testi localizzati come `{ it, en }` (value object `LocalizedText`).

### `catalog`

| Item | PK | SK | Attributi |
|---|---|---|---|
| Prodotto | `PRODUCT#<slug>` | `META` | name, description, pieces (facoltativo, solo arrosticini), priceCents, currency, images[] (chiavi S3), status `DRAFT\|ACTIVE\|ARCHIVED`, searchText, updatedAt |

- Lo slug è l'identità del prodotto ed è immutabile. Si crea con `attribute_not_exists(PK)`.
- **Ricerca:** Scan con filtro `status = ACTIVE` e `contains(searchText, q)`. `searchText` contiene nomi e descrizioni IT ed EN, in minuscolo e senza accenti.
- I prodotti si archiviano, non si cancellano.

### `identity`

| Item | PK | SK | Attributi |
|---|---|---|---|
| Utente | `USER#<userId>` | `PROFILE` | email, passwordHash, salt, role, firstName, lastName, preferredLocale, createdAt |
| Indice email | `EMAIL#<email>` | `LOOKUP` | userId |
| Indirizzo | `USER#<userId>` | `ADDRESS#<addressId>` | fullName, line1, line2, city, postalCode, country, phone, isDefault |

- L'email è salvata in minuscolo, senza spazi ai lati.
- Il telefono dell'indirizzo è obbligatorio; `line2` è l'unico campo facoltativo.
- La registrazione scrive utente e indice email in una `TransactWriteItems`, con condizione di non esistenza su entrambi.
- Massimo 5 indirizzi per utente.

### `ordering`

| Item | PK | SK | GSI1 (utente) | GSI2 (admin) |
|---|---|---|---|---|
| Ordine | `ORDER#<orderId>` | `META` | `USER#<userId>` / createdAt | `ORDER` / createdAt |

Attributi: userId, lines[] (slug, name, unitPriceCents, quantity), shippingAddress, totalCents, status, createdAt, paidAt.

### `payments`

| Item | PK | SK | Attributi |
|---|---|---|---|
| Pagamento | `PAYMENT#<orderId>` | `META` | stripeSessionId, amountCents, status `PENDING\|SUCCEEDED\|EXPIRED` |
| Cliente | `CUSTOMER#<userId>` | `STRIPE` | stripeCustomerId |
| Evento visto | `EVENT#<stripeEventId>` | `META` | receivedAt, ttl (30 giorni) |

Le carte salvate restano su Stripe.

### Valkey

- `sess:<id>`: sessione di `web`, TTL 7 giorni rinnovato a ogni richiesta.
- `cart:<cartId>`: carrello di Shopping, TTL 7 giorni rinnovato a ogni modifica.

### Seed

| slug | name it / en | pezzi | priceCents | immagine |
|---|---|---|---|---|
| `arrosticini-75` | Arrosticini 75 pezzi / Arrosticini 75 pieces | 75 | 3750 | `p_arrosticini.webp` |
| `arrosticini-225` | Pacco da 225 / 225-piece pack | 225 | 11250 | `p_arrosticini_pack.webp` |
| `arrosticini-3600` | Mini pallet / Mini pallet | 3600 | 180000 | `p_arrosticini_pallet.webp` |
| `cuoco` | Cuoco a domicilio / Chef at home | — | 5000 | `p_cuoco.webp` |
| `vino` | Vino locale / Local wine | — | 500 | `p_vino.webp` |
| `carbone` | Carbone / Charcoal | — | 2000 | `p_carbone.webp` |
| `pecora-diy` | Pecora per arrosticini DIY / Sheep for DIY arrosticini | — | 40000 | `p_sheep.webp` |
| `fornacella` | Fornacella / Arrosticini grill | — | 10000 | `p_fornacella.webp` |

- Le immagini dei prodotti stanno in `apps/api/seed/images/`, copiate da `docs/images/p_*.webp`. Il seed le carica nel bucket `media`.
- L'utente admin si crea dal seed con `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

## Contratto web↔api (oRPC)

Ogni endpoint è definito una sola volta in `packages/contracts/src/<contesto>.ts`:

```ts
export const getProduct = oc
  .route({ method: "GET", path: "/catalog/products/{slug}" })
  .input(z.object({ slug: ProductSlug }))
  .output(ProductDto)
  .errors({ PRODUCT_NOT_FOUND: { status: 404 } });
```

Dal contratto si ricavano:
- **server:** `implement(contract)` nel livello `http` di ogni contesto;
- **validazione:** di input e output;
- **client tipato in `web`:** `createORPCClient` con `OpenAPILink`;
- **spec OpenAPI:** `openapi/<contesto>.yaml`, generata e committata.

Regole:
- Un contratto per bounded context, tutti composti nel composition root.
- Path REST con prefisso per contesto.
- Errori dichiarati nel contratto, con codici stabili (`EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `PRODUCT_NOT_FOUND`, `ORDER_INVALID_TRANSITION`, ...).
- Un middleware oRPC legge `x-actor` e lo mette nel contesto della procedura. I middleware `authed` e `admin` proteggono le procedure riservate.
- **In CI:** la spec rigenerata deve coincidere con quella committata, e `oasdiff breaking` la confronta con quella dell'ultima release.
- **Fuori dal contratto, come route Express:** il webhook Stripe (serve il corpo grezzo) e `/healthz`.

## API interna (porta 4000)

| Contesto | Metodo e path | Accesso |
|---|---|---|
| Catalog | `GET /catalog/products?q=&status=` | pubblico (`status` solo admin) |
| Catalog | `GET /catalog/products/{slug}` | pubblico |
| Catalog | `POST /catalog/products` · `PATCH /catalog/products/{slug}` | admin |
| Catalog | `POST /catalog/products/{slug}/images` · `DELETE /catalog/products/{slug}/images/{imageId}` | admin |
| Identity | `POST /identity/users` · `POST /identity/credentials/verify` | pubblico |
| Identity | `GET` e `PATCH /identity/me` · `POST /identity/me/password` | utente |
| Identity | `GET` e `POST /identity/me/addresses` · `PATCH` e `DELETE /identity/me/addresses/{id}` | utente |
| Shopping | `POST /shopping/carts` · `GET /shopping/carts/{id}` | pubblico |
| Shopping | `PUT /shopping/carts/{id}/lines/{slug}` (quantità 0 rimuove) · `POST /shopping/carts/{id}/merge` | pubblico / utente |
| Ordering | `POST /ordering/orders` · `GET /ordering/orders` · `GET /ordering/orders/{id}` | utente |
| Ordering | `GET /ordering/admin/orders` | admin |
| Payments | `GET /payments/methods` · `POST /payments/methods/setup-session` · `DELETE /payments/methods/{id}` | utente |
| Payments | `POST /payments/webhooks/stripe` | solo da web |
| Ops | `GET /internal/whoami` | solo da web |
| Ops | `GET /healthz` | ECS |

**Upload immagini:** `web` inoltra il file ad `api` come `File` dichiarato nel contratto. Catalog controlla il tipo dai magic byte (JPEG, PNG, WebP) e la dimensione (massimo 5 MB), poi lo salva su S3 `media` con chiave `products/<slug>/<ulid>.<ext>`.

## Web

### Route

| Path | Contenuto | Accesso |
|---|---|---|
| `/` | redirect a `/it` o `/en` (cookie, poi `Accept-Language`) | pubblico |
| `/:lang` | home come nel mock | pubblico |
| `/:lang/products?q=` | lista prodotti con ricerca | pubblico |
| `/:lang/products/:slug` | pagina prodotto | pubblico |
| `/:lang/story` · `/:lang/delivery` | pagine statiche | pubblico |
| `/:lang/cart` | carrello | pubblico |
| `/:lang/checkout` | indirizzo, riepilogo, pagamento | utente |
| `/:lang/orders` · `/:lang/orders/:id` | storico e dettaglio ordine | utente |
| `/:lang/account` | profilo e lingua preferita | utente |
| `/:lang/account/addresses` | indirizzi | utente |
| `/:lang/account/payment-methods` | carte salvate | utente |
| `/:lang/account/password` | cambio password | utente |
| `/:lang/login` · `/:lang/register` · `/logout` | autenticazione | pubblico |
| `/:lang/admin/products` · `/:lang/admin/products/new` · `/:lang/admin/products/:slug` | gestione prodotti e immagini | admin |
| `/:lang/admin/orders` | tutti gli ordini | admin |
| `/:lang/stress` | pannello pecore | pubblico |
| `/stress/status` · `/webhooks/stripe` · `/healthz` | resource route | tecnico |
| 404 / 500 | ErrorBoundary con la pecora in overdrive | — |

### Comportamento

- **Middleware:** sessione da Valkey, poi lingua dall'URL, poi `requireUser` o `requireAdmin`.
- **Carrello:** il `cartId` sta in sessione e si crea alla prima aggiunta, anche per gli anonimi. Al login il carrello anonimo si unisce a quello dell'utente.
- **Form:** le modifiche passano da `action` con `<Form>` o `useFetcher`.
- **Animazioni Motion:** aggiunta al carrello, badge del carrello, aereo dell'hero, pecore.
- **Cookie `__session`:** HttpOnly, Secure in produzione, SameSite=Lax.
- **Asset:** `build/client/assets/*` con hash nel nome, serviti da S3 tramite CloudFront.
- **Immagini prodotto:** URL `${MEDIA_BASE_URL}/products/...`. `MEDIA_BASE_URL` vale `/images` su AWS e l'endpoint di RustFS in locale.

### Multilingua

- **Librerie:** `remix-i18next` v8 e `i18next`. Namespace: `common`, `shop`, `account`, `admin`, `stress`, `errors`.
- **Selettore lingua:** sostituisce "EN / EUR" del mock e mantiene il path. La valuta resta EUR.
- **Contenuti di dominio:** i prodotti hanno nome e descrizione in IT ed EN, e il form admin li chiede entrambi.
- **Formattazione:** prezzi e date con `Intl.NumberFormat` e `Intl.DateTimeFormat`.
- **Integrazioni:** Stripe Checkout riceve la lingua dell'utente. `web` traduce i codici di errore di `api`.

## Stress, scaling e high availability

- **Scaling:** k6 dal portatile contro CloudFront, task da 0,25 vCPU. Due scenari:
  - `browse`: pagine SSR e ricerca, che caricano `web`;
  - `login-storm`: scrypt, che carica `api`.
- **Stress manuale:** `aws ecs execute-command ... "node bin/grill.js --seconds 120"`. In locale: `docker compose exec`.
- **Container che muore:** `aws ecs execute-command ... "kill -9 1"`.
- **Pannello `/:lang/stress`:**
  - il browser chiama `/stress/status` ogni 500 ms;
  - `web` risponde con i dati del proprio task e con `/internal/whoami` di un task `api`;
  - ogni pecora mostra versione, AZ e id breve del task;
  - sotto l'80% di CPU la pecora è tranquilla, sopra va in overdrive;
  - una pecora che non risponde da 5 s diventa fantasma e poi sparisce;
  - una riga per `web` e una per `api`.
- **CPU:** quella del pannello è istantanea e per task; lo scaling usa la media del servizio su un minuto (CloudWatch).
- **ECS Exec richiede:** `enableExecuteCommand` sui servizi, permessi SSM nel task role, Session Manager plugin sul portatile.

## Comportamenti operativi

- **`/healthz`:** risponde 200 se il processo è vivo, 503 durante lo shutdown. Non controlla Valkey, DynamoDB, `api` né altre dipendenze.
- **Graceful shutdown:** su `SIGTERM`, `/healthz` passa a 503, il server smette di accettare connessioni, termina le richieste in corso, chiude Valkey ed esce. `stopTimeout`: 30 s.
- **Health check dell'ALB:** intervallo 5 s, 2 controlli per healthy, 2 per unhealthy. Deregistration delay: 15 s.
- **Rolling update:** `minimumHealthyPercent` 100, `maximumPercent` 200, circuit breaker con rollback.
- **Versione visibile:** `APP_VERSION` (build arg) in footer e pannello.
- **Asset su S3:** mai cancellati al deploy, perché durante il rolling update convivono HTML v1 e v2.

## Log, errori e correlazione

Il codice è in `packages/ops`, dalla fase 0.

### Log

- **pino + `pino-http`** in `web` e `api`, JSON su stdout.
- **Campi fissi:** `service`, `version`, `taskId`, `requestId`. Sulle righe HTTP anche `userId`, metodo, path, status e durata.
- **Mai nei log:** password, cookie, header `authorization` e `stripe-signature`.
- **Livelli:** `info` richieste, `warn` 4xx, `error` 5xx, `fatal` errori di processo.
- **Destinazione:** `pino-pretty` in locale; su AWS CloudWatch Logs con il driver `awslogs`.

### Request id

- `web` genera un `requestId` (ULID) per ogni richiesta, o riusa `x-request-id` se arriva già.
- Il client oRPC lo passa ad `api` in `x-request-id`.
- La pagina 500 lo mostra.

### Errori in api

- **Middleware oRPC comune:** converte un `DomainError` nell'errore del contratto con lo stesso codice, se l'endpoint lo dichiara.
- **Tutto il resto:** 500 generico, con lo stack solo nel log.

### Errori in web

- **Errore previsto in loader o action:** torna al form, con messaggio tradotto (namespace `errors`) ed errori per campo.
- **Errore inatteso:** rilanciato, lo gestisce l'ErrorBoundary.
- **Una sola funzione,** usata da tutte le route, distingue i due casi.

### Errori di processo

`uncaughtException` e `unhandledRejection`: log `fatal` e uscita con codice 1.

## Rilascio e CI/CD

### Stack CDK

| Stack | Contenuto | Durata |
|---|---|---|
| `foundation` | 2 repository ECR (tag immutabili, ultime 20 immagini), provider OIDC di GitHub, ruolo IAM della CI | permanente |
| `app` | VPC, NAT, ALB, ECS, Valkey, DynamoDB, bucket S3, CloudFront | creato con `up`, distrutto con `down` |

- `cdk bootstrap` una volta per account e regione.
- `app` riceve il tag delle immagini come contesto: `cdk deploy app -c imageTag=v1.3.0`.
- Fargate con `runtimePlatform` `LINUX` / `X86_64`.

### Branch

- Feature branch da `dev`, PR verso `dev`, squash merge. Regole in `AGENTS.md`.
- Release: PR da `dev` a `master` con merge commit, poi GitHub Release `vX.Y.Z` su `master`.
- Nessun push diretto su `dev` o `master`.

### Workflow

| File | Trigger | Cosa fa |
|---|---|---|
| `ci.yml` | PR verso `dev` e `master`, push su `dev` | `turbo run lint typecheck test build`, `turbo boundaries`, controllo delle chiavi i18n, spec OpenAPI aggiornate, `oasdiff breaking` |
| `release.yml` | release pubblicata con tag `vX.Y.Z` | i passi qui sotto |

Passi di `release.yml`, su runner `ubuntu-24.04`:

1. Accesso ad AWS via OIDC: il ruolo accetta solo token di questo repository per tag `v*`.
2. Gli stessi controlli di `ci.yml`.
3. Build delle immagini `linux/amd64`, con `APP_VERSION` uguale al tag. Tag dell'immagine: la versione.
4. Push su ECR.
5. Se lo stack `app` non esiste, il workflow si ferma qui.
6. Asset estratti dall'immagine web appena costruita (`docker create` + `docker cp build/client`), poi `aws s3 sync` sul bucket `static` con `Cache-Control: public, max-age=31536000, immutable`, senza `--delete`.
7. `cdk deploy app -c imageTag=<tag> --require-approval never`. Se il deploy fallisce, il circuit breaker ripristina la versione precedente.
8. Concurrency group `deploy-app`: due release ravvicinate si mettono in coda.

Variabili GitHub: `AWS_REGION`, `AWS_ROLE_ARN`.

### Zero downtime

- I nuovi task partono prima che si fermino i vecchi (100/200).
- L'ALB manda traffico a un task solo dopo che `/healthz` è verde.
- Deregistration delay e graceful shutdown evitano richieste troncate.
- `web` dipende da `api` in CDK: si aggiorna prima `api`, poi `web`.
- Ogni rilascio deve funzionare con la versione precedente dell'altro servizio. Le modifiche incompatibili si dividono in due rilasci (expand/contract).
- Sessioni e carrelli sono su Valkey, quindi sopravvivono alla sostituzione dei task.

## Sviluppo locale

| Servizio compose | Immagine | Ruolo |
|---|---|---|
| `valkey` | `valkey/valkey` (stessa major di ElastiCache) | sessioni e carrelli |
| `dynamodb` | `amazon/dynamodb-local` | tabelle `catalog`, `identity`, `ordering`, `payments` |
| `s3` | `rustfs/rustfs` | bucket `media`, lettura anonima |
| `stripe` | `stripe/stripe-cli` | `listen --forward-to` verso `web` |

- **Client AWS:** `endpoint` e `forcePathStyle` arrivano dalle variabili d'ambiente.
- **`pnpm setup:local`:** crea tabelle (con GSI e TTL), bucket e seed.
- **`pnpm dev`:** avvia `web` e `api` sull'host. Il profilo compose `full` avvia tutto dalle immagini Docker.

## Immagini

Sorgenti in `docs/images/`. In `web` si usano le versioni `.webp`, copiate in `apps/web/public/images/`. Il testo non va mai dentro le immagini.

| File | Uso |
|---|---|
| `sheep.webp` | logo |
| `airplane.webp` | aereo dell'hero |
| `background.webp` | paesaggio dell'hero, nuvole comprese |
| `town.webp` | value prop "Dall'Abruzzo" |
| `box.webp` | value prop "Spedizione refrigerata" |
| `globe.webp` | value prop "Destinazione mondo" |
| `sheep_overdrive_off.webp` | pecora tranquilla del pannello |
| `sheep_overdrive_on.webp` | pecora in overdrive del pannello e delle pagine di errore |
| `p_*.webp` | prodotti del seed |
| `favicon.svg` | favicon |

Manca il segnaposto per i prodotti senza immagine.

In CSS, senza immagini:
- tovaglia a quadri;
- texture della carta;
- pecora fantasma (scala di grigi e opacità su `sheep_overdrive_off.webp`).

Icone Lucide:

| Uso | Icone |
|---|---|
| header | `Globe`, `ShoppingCart`, `User`, `ChevronDown` |
| carrello | `Plus`, `Minus`, `Trash2`, `ArrowRight` |
| ricerca | `Search` |
| area utente | `Settings`, `MapPin`, `CreditCard`, `KeyRound`, `Package`, `LogOut` |
| admin | `ImagePlus`, `Pencil`, `Archive` |
| stress | `Cpu`, `Server` |

## Fasi di lavoro

La divisione tra i due agenti è in `docs/battle-plan.md`.

| # | Fase | Contenuto | Fatto quando |
|---|---|---|---|
| 0 | Fondamenta | workspace, turbo, Biome, tsconfig, `kernel`, `contracts` con `whoami` e generazione OpenAPI, logger e request id in `ops`, compose, `turbo boundaries` | `pnpm turbo run build lint typecheck` e `turbo boundaries` verdi |
| 1 | Catalog + Identity | contratti, dominio, repository, implementazione, `setup:local` | test verdi, spec `catalog` e `identity` generate |
| 2 | web base | React Router v8, i18n, Tailwind, shadcn, Motion, layout, home, lista con ricerca, pagina prodotto, pagine di errore | home in IT ed EN uguale al mock |
| 3 | Auth e account | registrazione, login, logout, sessione, profilo, password, indirizzi | dopo il riavvio di `web` si resta loggati |
| 4 | Shopping + Ordering | carrello, merge al login, checkout, pagine ordini | ordine `PENDING_PAYMENT` con totale ricalcolato lato server |
| 5 | Payments | Stripe Checkout, webhook, idempotenza, carte salvate, ordini admin | pagamento con 4242 e ordine `PAID`; webhook ripetuto senza effetti doppi |
| 6 | Admin catalogo | creazione e modifica prodotti IT/EN, upload immagini, archiviazione | prodotto creato visibile in lista con la sua immagine |
| 7 | Stress | `whoami`, `/stress/status`, pannello pecore, `grill.js`, k6 | con 2 `web` e 2 `api` in locale compaiono 4 pecore |
| 8 | Container | Dockerfile multi-stage `node:24-alpine`, `linux/amd64`, `turbo prune --docker` | profilo `full` funzionante |
| 9 | Infra CDK | stack `foundation` e `app` (VPC su 2 AZ, ALB, 2 servizi Fargate con ECS Exec, Service Connect, DynamoDB, ElastiCache Serverless Valkey, 2 bucket S3, CloudFront con OAC, NAT Gateway, parametri da Parameter Store, autoscaling all'80% di CPU) | sito raggiungibile da `*.cloudfront.net` |
| 10 | CI/CD | `ci.yml`, `release.yml` | una release aggiorna i servizi senza 5xx sotto k6 |
| 11 | Script e runbook | **`up`:** `cdk deploy foundation`, `cdk deploy app` con il tag dell'ultima release, registrazione del webhook Stripe, `/arrosticini/stripe-webhook-secret` su Parameter Store, nuovo deployment di `api`, upload degli asset, seed (prodotti, immagini, admin). **`down`:** cancellazione del webhook, `cdk destroy app`. Runbook del talk | `up` da account vuoto produce un sito con pagamento funzionante; `down` rimuove lo stack `app` |

## Test

Strumenti: Vitest in tutti i package e in `web`, Playwright per i test end-to-end.

- **Dominio, senza infrastruttura:** `Cart` (quantità tra 1 e 99, merge), transizioni di `Order`, `Money`, `LocalizedText`, massimo 5 indirizzi per `User`.
- **Integrazione:** repository su DynamoDB Local, carrello su Valkey, upload su RustFS.
- **Payments:** firma del webhook con `stripe.webhooks.generateTestHeaderString`, idempotenza, sessione scaduta che porta a `CANCELLED`.
- **Contratto:** procedure chiamate con il client oRPC, errori dichiarati compresi.
- **i18n:** chiavi IT ed EN identiche in ogni namespace.
- **Playwright:** registrazione → carrello → pagamento → `PAID`; admin che crea un prodotto con immagine; cambio lingua.

## Verifica finale (prova generale su AWS)

1. **Rolling update:** release v2 pubblicata con k6 `browse` attivo. Zero 5xx; nel pannello convivono pecore v1 e v2 fino al passaggio completo.
2. **Scaling:** con k6 `login-storm` la CPU di `api` supera l'80% e compaiono nuove pecore.
3. **HA:** `kill -9 1` su un task. ECS avvia un nuovo task; l'utente resta loggato e il carrello resta intatto.
4. **Valkey:** `valkey-cli` mostra le chiavi `sess:*` e `cart:*`.
5. **CDN:** asset e immagini rispondono con `x-cache: Hit from cloudfront`.
6. **Pagamento:** ordine pagato con carta di test, stato `PAID` nella pagina utente e in quella admin.

## Punti aperti

- Regione AWS.
- Policy di scaling: target tracking all'80% oppure step scaling.
- NAT Gateway: uno per AZ oppure uno solo.
- Font, da scegliere confrontandoli con il mock.
