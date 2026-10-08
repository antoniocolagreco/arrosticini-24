# Arrosticini 24ore — istruzioni per gli agenti

Valgono per Claude Code e per ChatGPT (Codex CLI).

- `docs/piano-di-lavoro.md`: cosa si costruisce e perché.
- `docs/battle-plan.md`: chi fa cosa e in che ordine.

## Branch

Ogni branch nasce da `github/dev`. Mai push su `dev` o `master`.

**Formato:** `<tipo>/<scope>_<descrizione>`

- **Tipo:** `feature`, `bugfix`, `refactor`, `perf`, `docs`, `build`, `ci`, `chore`, `test`.
- **Scope:** il package o l'area toccata: `catalog`, `identity`, `shopping`, `ordering`, `payments`, `kernel`, `contracts`, `ops`, `api`, `web`, `e2e`, `infra`, `repo`.
- **Descrizione:** breve, in inglese, kebab-case, imperativa.
- **Esempi:** `feature/catalog_add-product-search`, `feature/web_add-home-page`, `bugfix/payments_handle-duplicate-webhook`.

Se la modifica tocca più scope, si usa quello principale.

## Commit

**Formato:** `<tipo>(<scope>): <descrizione>`

- Il tipo è quello del branch. Unica eccezione: `bugfix` diventa `fix`.
- Inglese, imperativo, massimo 100 caratteri, una riga sola. Il corpo è ammesso solo per un `BREAKING CHANGE`.
- Un commit per ogni modifica logica.
- **Esempi:** `feature(catalog): add product search`, `fix(payments): ignore duplicate webhook events`.
- Prima di ogni commit si verifica il branch con `git branch --show-current`.

## Pull request

- **Direzione:** dal feature branch verso `dev`, aperta come Draft. Passa a ready quando tutti i controlli sono verdi.
- **Prima di aprirla:** `git fetch github && git rebase github/dev`, poi `pnpm turbo run lint typecheck test build` e `turbo boundaries` verdi.
- **Titolo:** identico al messaggio di commit, nel formato `<tipo>(<scope>): <descrizione>`.
- **Label:** l'agente autore, `claude` o `gpt`.
- **Merge:** squash su `dev`, fatto da Antonio. Gli agenti non fanno merge.
- **Release:** a fare la PR da `dev` a `master` (con merge commit) e a pubblicare la GitHub Release `vX.Y.Z` è Antonio.
- **Lingua:** tutto ciò che sta su GitHub è in inglese.

**Template della descrizione**, da usare così com'è:

```markdown
## Context
- <the problem and why this change is needed>

## Scope
- <packages>

## Key Changes
- <one bullet per file or contract touched>

## Unblocks
- <what the other agent can use after merge: endpoints, error codes, env vars, scripts; "None" if nothing>

## Checklist
- [ ] Branch name and PR title follow AGENTS.md
- [ ] lint, typecheck, test, build and turbo boundaries pass
- [ ] OpenAPI specs regenerated (if contracts changed)
- [ ] .env.example updated (if new env vars)
```

Come compilarlo:
- **Context:** il problema e cosa rompe, in una o due righe. Niente dettagli implementativi.
- **Scope:** solo nomi di package.
- **Key Changes:** una riga per ogni file o contratto toccato, con cosa fa adesso.
- **Unblocks:** è il canale con cui l'altro agente scopre cosa può usare.
- **Checklist:** si spunta ciò che è vero. Non si aggiungono né si tolgono voci.
- **Nient'altro:** nessuna sezione oltre a queste.

## Conflitti

Un conflitto su `pnpm-lock.yaml` non si risolve a mano: si prende la versione di `github/dev` (`git checkout github/dev -- pnpm-lock.yaml`), si esegue `pnpm install` e si aggiunge il file risultante.

## Divieti

- Em dash nei branch, nei commit e nelle PR. Al loro posto si usano virgola, due punti o parentesi.
- `Co-Authored-By` o qualsiasi testo che attribuisca il lavoro a un'AI, in commit e PR.
- Force push, salvo autorizzazione esplicita di Antonio. Anche in quel caso, solo `--force-with-lease` e solo su un feature branch.
- Modifiche a file di cui non sei proprietario (vedi `docs/battle-plan.md`).
- Commenti nel codice.
