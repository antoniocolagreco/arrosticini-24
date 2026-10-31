---
theme: none
title: Alta disponibilità su AWS
author: Antonio Colagreco
aspectRatio: 16/9
canvasWidth: 1280
colorSchema: light
fonts:
  provider: none
  sans: DM Sans
  serif: Roboto Serif
drawings:
  persist: false
mdc: true
layout: cover
---

# Alta disponibilità

## su AWS

Antonio Colagreco

---
layout: shop-open
---

---
layout: shop-problems
---

# Cosa può andare storto?

---
layout: aws-problems
---

# Cosa può andare storto?

---
layout: aws-solutions
---

# Come rispondiamo?

---
layout: project
---

# Il progetto

<!--
Loghi a colori: https://github.com/devicons/devicon/tree/master/icons (TypeScript, pnpm, Docker, React, React Router, Tailwind CSS, AWS); https://cdn.simpleicons.org/ (Turborepo, Zod, Stripe, pino); https://github.com/simple-icons/simple-icons/blob/develop/icons/express.svg; https://orpc.dev/icon.svg; https://valkey.io/img/valkey-horizontal.svg; https://github.com/testcontainers/testcontainers-node/blob/main/docs/site/logo.svg.
Riferimento per la leggibilita del diagramma: https://learn.microsoft.com/en-us/azure/well-architected/architect-role/design-diagrams. Container illustrato con Imagegen, prompt in assets/project-image-prompt.md.
-->

---
layout: cloud
---

# Il cloud

<!--
AWS: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions-availability-zones.html.
Un solo disegno di data center industriale, riutilizzato nelle tre AZ schematiche. Riferimento architettonico: fotografia AWS Project Rainier pubblicata da Amazon, https://www.aboutamazon.com/news/aws/aws-project-rainier-ai-trainium-chips-compute-cluster. Il disegno non identifica una specifica AZ.
37signals: https://world.hey.com/dhh/our-cloud-exit-savings-will-now-top-ten-million-over-five-years-c7d9b5bd, 17 ottobre 2024. Spesa cloud annuale dichiarata da 3,2 a 1,3 milioni di dollari; hardware Dell circa 700.000 dollari. Nel 2024 l'uscita da S3 era pianificata per il 2025, non ancora conclusa.
Settimane e minuti sono ordini di grandezza illustrativi, non tempi garantiti. Le risorse cloud allocate possono essere fatturate anche quando il carico e basso. La disponibilita su piu AZ richiede un'applicazione e una configurazione adeguate.
Icone: https://github.com/lucide-icons/lucide. Rack e data center generati con Imagegen; prompt in assets/cloud-image-prompt.md.
-->

---
layout: infrastructure-code
---

# Infrastruttura come codice

<!--
AWS CDK genera il template CloudFormation; CloudFormation crea o aggiorna le risorse: https://docs.aws.amazon.com/cdk/v2/guide/deploy.html.
La riproducibilita riguarda la definizione dell'infrastruttura, a parita di configurazione e dipendenze; non implica la ricreazione dei dati applicativi o degli identificativi fisici delle risorse.
Illustrazione generata con Imagegen integrato; prompt in assets/infrastructure-code-prompt.md.
-->

---
layout: architecture
---

# Arrosticini 24ore su AWS

<!--
Schema illustrato in assets/arrosticini-aws-minimal-v4.png. Prompt in assets/arrosticini-aws-minimal-v4-prompt.md. Fonti CDK in assets/arrosticini-aws-architecture-sources.md.
CloudFront e rappresentato come rete globale, con Shield e WAF associati. Nella VPC di Milano, due colonne rappresentano le AZ e tre fasce rappresentano subnet pubbliche, private e isolate. ALB e Valkey sono servizi condivisi sulle due AZ; ogni AZ ha un NAT e una coppia nominale web/api. Service Connect permette a ogni web di raggiungere entrambe le api.
Valkey riceve sessioni dal web e carrelli dalle api. DynamoDB e S3 sono nella regione, fuori dalla VPC. Quattro frecce indipendenti mostrano l'accesso di entrambe le api a entrambi i servizi dati: due rosse e due verdi, senza raccordi comuni. Le api raggiungono Stripe tramite il NAT della propria AZ. Per leggibilita sono omessi DNS, Internet Gateway, endpoint, porte e servizi di gestione. Il diagramma tecnico completo resta disponibile in assets/arrosticini-aws-architecture.svg.
-->

---
layout: cicd
---

# CI/CD

<!--
Minuto 23. Seguire il flusso: push → controlli → creazione e pubblicazione della release → build delle immagini → pubblicazione su ECR → deploy → rolling update. La release e il passaggio esplicito che avvia la pubblicazione: i controlli da soli non pubblicano immagini ne avviano il deploy.
Passare a GitHub Actions e mostrare una run in corso, se disponibile. Nell'editor aprire .github/workflows/ci.yml e .github/workflows/release.yml.
La CI esegue lint, typecheck, test e build, verifica i confini dei package e che le specifiche OpenAPI siano aggiornate. Il trigger effettivo e pull_request verso dev/prod, oltre a workflow_call: i push su una PR aperta rilanciano i controlli, non ogni push su qualsiasi branch.
La pubblicazione di una GitHub Release richiama prima la CI, poi costruisce le immagini web e api, le pubblica su ECR con il tag della release e avvia il deploy CDK dello stack applicativo. Il deploy viene saltato se lo stack arrosticini-app non esiste.
GitHub Actions assume un ruolo AWS tramite OIDC con id-token: write e configure-aws-credentials; riceve credenziali temporanee senza access key salvate su GitHub.
ECS sostituisce progressivamente i task: minHealthyPercent 100, maxHealthyPercent 200, circuit breaker con rollback. Fonti: .github/workflows/ci.yml, .github/workflows/release.yml e infra/lib/app-stack.ts.
Illustrazione aggiornata con Imagegen integrato; prompt in assets/cicd-flow-v2-prompt.md.
-->

---
layout: thanks
---

# Grazie

<!--
Ringraziamenti. Genos combatte i bot dell'attacco DDoS, Saitama cucina gli arrosticini alla fornacella. La coppia di clienti della slide 3 torna nella scena: il signore mangia un arrosticino e conversa con Saitama guardandolo negli occhi, senza borse. La signora guarda in basso verso Genos e i bot, spaventata e con una mano sulla bocca.
Illustrazione modificata con Imagegen integrato in assets/thanks-anime-v5.png; prompt in assets/thanks-anime-v5-prompt.md. Paesaggio ispirato alla Maiella, usando come riferimento https://www.italiainblu.it/roccascalegna.html e la fotografia https://www.italiainblu.it/borghi/roccascalegna/14.jpg. Il titolo Grazie resta testo modificabile nella slide.
-->
