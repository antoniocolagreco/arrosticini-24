# Battle-plan — Claude e ChatGPT

Il cosa e il perché stanno in `docs/piano-di-lavoro.md`. Branch, commit e PR seguono `AGENTS.md`.

## Modello

- **Claude apre la strada:** fondamenta, contratti oRPC, backend, piattaforma.
- **ChatGPT segue:** tutto `web` e i test Playwright.

Le dipendenze vanno in un senso solo: `web` usa ciò che Claude ha già portato su `dev`. Per non far aspettare ChatGPT, il contratto di ogni contesto arriva su `dev` con una PR dedicata, prima dell'implementazione. ChatGPT costruisce la UI su quel contratto e la collega al backend reale quando arriva anche la PR di implementazione.

## Proprietà dei file

| Chi | Path |
|---|---|
| Antonio | `infra/**` (CDK, script `up` e `down`), `.github/**` |
| ChatGPT | `apps/web/**` (escluso `Dockerfile`), `e2e/**` |
| Claude | tutto il resto |

Gli agenti lavorano solo in locale e non toccano i path di Antonio.

Eccezione decisa da Antonio: l'area admin (gestione utenti, gestione ordini, admin senza acquisti) la fa Claude anche dentro `apps/web`. ChatGPT intanto prosegue dalla riga 7 e, prima di modificare le stesse pagine, fa rebase sulle PR di Claude già su `dev`.

Se ChatGPT ha bisogno di qualcosa fuori da `apps/web` (un campo nel contratto, una variabile d'ambiente, una dipendenza nel catalog di pnpm), lo chiede in `docs/agents/gpt.md`.

## Git

- Feature branch da `dev` e PR verso `dev`, con le regole di `AGENTS.md`. Antonio fa la review e lo squash merge.
- Le release passano da una PR `dev` → `master` e dalla pubblicazione della GitHub Release: le gestisce Antonio.
- Il workspace `/home/ac/Projects/arrosticini-24-workspace/` ha una cartella (worktree) per ciascuno. Ognuno lavora solo dalla propria cartella e lì crea e cambia i branch che gli servono:
  - Antonio: `master`
  - Claude: `backend`
  - ChatGPT: `frontend`

## Sequenza

Claude procede in ordine. Ogni riga sblocca il lavoro di ChatGPT sulla stessa riga, appena la PR indicata è su `dev`.

| # | Claude | PR che sblocca | ChatGPT |
|---|---|---|---|
| 1 | Fondamenta: monorepo, kernel, contracts, compose, logger e request id in `ops`, `apps/api` con `/healthz` | fondamenta | scaffold di `web`: React Router v8, Tailwind, shadcn, Motion, Lucide, i18n, layout, pagine di errore e statiche |
| 2 | Contratti Catalog e Identity | contratti | home, lista con ricerca, pagina prodotto, login e registrazione (su fixture tipate dal contratto) |
| 3 | Implementazione Catalog e Identity, seed | implementazione | collegamento al backend reale, sessione su Valkey, area account |
| 4 | Contratti Shopping e Ordering, poi implementazione | contratti | carrello, checkout, pagine ordini |
| 5 | Contratto Payments, poi Stripe, webhook e carte salvate; Catalog admin con upload su S3 | contratti | pagina di esito del pagamento, carte salvate, inoltro del webhook, area admin |
| 6 | resto di `packages/ops` (metadata del task, CPU), `/internal/whoami`, `grill.js`, k6 | ops | pannello pecore `/stress` |
| 6b | area admin: utenti (scheda e sospensione), ordini (indirizzo, stato, spedizione), admin senza acquisti; backend e pagine `web` | area admin | nessuno: fa tutto Claude |
| 7 | Dockerfile e profilo compose `full` | Docker | test Playwright end-to-end |
| 8 | runbook del talk | — | rifinitura della UI |

Il deploy lo fa Antonio: CDK, script `up` e `down`, GitHub Actions. La prova generale su AWS si fa dopo.

## Comunicazione

- **Canale principale: la sezione Unblocks di ogni PR mergiata.** Dice cosa diventa disponibile: endpoint, codici di errore, variabili d'ambiente, script.
- **Per tutto il resto:** due file in `/home/ac/Projects/arrosticini-24-workspace/agents/`, fuori dal repository. Ognuno ha un solo autore, così i due agenti non si sovrascrivono:
  - **`claude.md`, scritto da Claude:** risposte alle richieste di ChatGPT e note che non stanno in una PR;
  - **`gpt.md`, scritto da ChatGPT:** richieste e domande per Claude, più lo stato del proprio lavoro.
- Ogni agente legge il file dell'altro all'inizio di ogni task.

## Ambiente locale

- Valkey, DynamoDB Local e RustFS: un solo stack compose, avviato una volta dalla cartella `master`.
- Porte di Claude: `api` 4000, `web` 3000. Porte di ChatGPT: `api` 4100, `web` 3100. Ogni worktree ha il proprio `.env.local`.
- I test di integrazione usano nomi di tabelle e chiavi con suffisso casuale, così i due agenti possono lanciarli nello stesso momento.

## Prompt di avvio

**Claude Code:** `Sei Claude nel progetto arrosticini-24. Leggi docs/battle-plan.md e /home/ac/Projects/arrosticini-24-workspace/agents/gpt.md, poi esegui il prossimo passo della tua colonna e apri la PR verso dev.`

**Codex CLI:** `Sei ChatGPT nel progetto arrosticini-24. Leggi docs/battle-plan.md, le PR mergiate su dev e /home/ac/Projects/arrosticini-24-workspace/agents/claude.md, poi esegui il prossimo passo della tua colonna che ha la PR di sblocco su dev e apri la PR verso dev.`
