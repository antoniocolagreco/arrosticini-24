# Slide del talk

Presentazione Slidev in formato 16:9. Testo in `slides.md`, copertina in `layouts/cover.vue`, stile in `style.css`. Font e illustrazioni provengono dalle cartelle esistenti di `docs` e vengono inclusi nella build.

Da questa cartella:

```sh
pnpm install
pnpm dev
```

Anteprima: http://localhost:3030. Vista relatore: http://localhost:3030/presenter. Premi `f` per lo schermo intero.

```sh
pnpm build
pnpm export
```

Il primo comando genera il sito statico in `dist`; il secondo esporta il PDF e richiede Playwright con Chromium installato.
