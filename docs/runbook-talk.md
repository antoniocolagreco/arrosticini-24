# Runbook del talk

Il talk dura 40 minuti, poi ci sono 20 minuti di domande.

Il deploy da zero dura circa 10 minuti. Il rolling update dura circa 16 minuti: 3 di CI, 7 per api e 6 per web.

Le slide contengono solo schemi e infografiche. Codice, console, terminale e sito si mostrano dal vivo.

## Preparazione

Un'ora prima si controlla che k6 sia installato e che l'hotspot del telefono funzioni, nel caso il Wi-Fi della sala non regga.

Il terminale si apre nella root del repository, con tre pannelli: il primo per deploy e seed, il secondo per k6, il terzo per le slide.

Nel terzo pannello si avviano le slide. L'install serve solo la prima volta:

```sh
pnpm --dir docs/slides install
```

```sh
pnpm --dir docs/slides dev
```

Le slide si aprono nel browser su http://localhost:3030 e con F vanno a schermo intero.

Nel primo pannello si genera il template di CloudFormation, che si mostra al minuto 7:

```sh
pnpm --filter @arrosticini/infra cdk synth
```

Nell'editor si aprono questi file:

```text
infra/lib/app-stack.ts
infra/cdk.out/arrosticini-app.template.json
infra/bin/app.ts
.github/workflows/ci.yml
.github/workflows/release.yml
```

Nel browser si aprono queste tab, senza il sito: slide, CloudFormation, WAF, release di GitHub, GitHub Actions, ECS e alarm di CloudWatch.

Subito prima di iniziare ci si autentica su AWS, così la sessione non scade durante il talk:

```sh
aws login
```

## Scaletta

Il minuto indica quando inizia ogni passo. Durante le attese le spiegazioni si allungano o si accorciano per restare in orario.

### Minuto 0 · Titolo

**SLIDE 1**: titolo.

### Minuto 1 · Il problema

**SLIDE 2**: una bottega di arrosticini aperta, con i clienti serviti.

**SLIDE 3**: la stessa bottega in quattro guai: un guasto, un aggiornamento che la chiude, una protesta che blocca l'ingresso, troppi clienti.

**SLIDE 4**: gli stessi quattro casi su AWS: un task che si blocca, una nuova versione, un attacco DDoS, un picco di traffico.

Un servizio su internet deve restare disponibile anche in questi quattro casi. Il talk li prova tutti, dal vivo, su un e-commerce.

**SLIDE 5**: le quattro risposte di AWS: task ridondanti, rolling update, protezione DDoS, autoscaling.

Per ogni caso AWS ha una risposta: un secondo task che prende il posto di quello caduto, il rolling update, un filtro davanti al sito e l'autoscaling.

### Minuto 2 · Il progetto

**SLIDE 6**: il monorepo. In alto web e api, sotto i cinque domini, in fondo i package condivisi, con il logo di ogni tecnologia.

Il progetto è un monorepo TypeScript gestito con pnpm e Turborepo. Contiene due servizi, web e api, ognuno con la sua immagine Docker.

Web è il sito, fatto con React Router su Express. Api è l'API interna e non è raggiungibile da internet. Le librerie sono sulla slide e non si leggono una per una.

Web e api comunicano attraverso un contratto scritto con oRPC e Zod: se una delle due parti non lo rispetta, TypeScript segnala l'errore.

La logica del negozio è divisa in cinque domini: catalog, identity, shopping, ordering e payments. Ognuno è un package separato. Altri package contengono i tipi comuni, i log con pino e il supporto ai test con Testcontainers.

Turborepo fa rispettare i confini tra i package con delle etichette: context per i domini, kernel per i tipi condivisi, app per web e api. Una regola in turbo.json vieta ai domini e ai tipi condivisi di importare un dominio o un'app. Quindi un dominio non può usare il codice di un altro dominio, e per questo si può spostare in un servizio a parte.

Turborepo blocca anche gli import di file fuori dal proprio package e gli import di package non dichiarati nel package.json. La CI esegue questo controllo a ogni push, e fallisce se una regola non è rispettata:

```sh
pnpm turbo boundaries
```

### Minuto 3 · Il cloud

**SLIDE 7**: a sinistra un data center proprio, a destra una regione AWS con le sue AZ.

Con un data center proprio i server si comprano per reggere il picco, e restano fermi il resto del tempo. Nel cloud si paga quello che si usa.

Un server nuovo arriva in settimane, un task nuovo parte in un minuto.

Ogni regione AWS ha più zone di disponibilità, dette AZ. Ogni AZ è formata da uno o più data center, separati da quelli delle altre AZ, quindi se una si guasta le altre continuano a funzionare. Per usare due AZ basta indicarlo nella configurazione. Con un data center proprio, invece, bisognerebbe costruirne un secondo.

Database, cache, CDN e firewall li gestisce AWS, e tutto si crea con il codice.

Il cloud ha anche dei contro: con un carico alto e costante può costare di più, e lega al fornitore.

Un esempio è 37signals, l'azienda di Basecamp e HEY. Nel 2022 spendeva circa 3,2 milioni di dollari l'anno di cloud per un carico stabile e prevedibile. Ha comprato server Dell per circa 700.000 dollari e ha riportato le applicazioni nei propri data center, risparmiando quasi 2 milioni l'anno. Poi ha spostato anche i file da S3, e stima un risparmio di oltre 10 milioni in cinque anni. Sono cifre dichiarate dall'azienda.

### Minuto 4 · Infrastructure as Code

**SLIDE 8**: codice TypeScript → CDK → template CloudFormation → risorse su AWS.

Le risorse non si creano a mano dalla console, ma si descrivono in un file. Il file sta in Git con il resto del codice, si può rivedere e ricrea sempre lo stesso ambiente.

### Minuto 5 · Parte il deploy

Nel pannello 1:

```sh
pnpm aws:app:deploy
```

L'infrastruttura viene creata da zero in circa 10 minuti. Nel frattempo si mostra il codice che la descrive.

### Minuto 6 · CDK

Nell'editor:

```text
infra/lib/app-stack.ts
```

Ogni stack è una classe TypeScript. Si dichiarano le risorse e come si collegano, e CDK ricava da solo permessi, regole di rete e ordine di creazione.

### Minuto 7 · Template CloudFormation

Nell'editor:

```text
infra/cdk.out/arrosticini-app.template.json
```

CDK trasforma il TypeScript in questo template, che è quello che AWS esegue. 470 righe di TypeScript diventano 3092 righe di JSON, con 88 risorse.

### Minuto 8 · Gli stack

Nell'editor:

```text
infra/bin/app.ts
```

Gli stack sono quattro.

Edge contiene il certificato HTTPS e sta in us-east-1, perché CloudFront accetta certificati solo da lì. Foundation contiene i repository delle immagini Docker e i permessi della CI. Questi due stack restano sempre.

Waf contiene le regole del firewall, app contiene tutto il resto. Questi due si creano e si distruggono insieme, prima waf e poi app.

Poi si apre la console di CloudFormation. Quando waf è completo, nella console WAF si mostrano le regole. La regola RateLimit si mette in Count, così conta le richieste ma non le blocca. Altrimenti bloccherebbe k6, che manda tutte le richieste da un solo IP.

### Minuto 9 · Il percorso di una richiesta

**SLIDE 9**: l'infrastruttura su AWS, minimale. Resta sullo schermo fino al minuto 14. Il prompt per costruirla è in fondo al documento.

Il browser trova il sito con il DNS di Cloudflare, che lo manda a CloudFront. CloudFront gestisce HTTPS e fa controllare ogni richiesta al WAF. Immagini e asset tornano subito dalla sua cache. Il resto passa al load balancer, che lo distribuisce tra i task web. Web costruisce la pagina e chiede i dati ad api.

### Minuto 10 · La rete

Tutto sta in una rete privata, la VPC, che copre due AZ. Ogni AZ ha tre fasce di subnet. Le pubbliche contengono il load balancer e i NAT, che fanno uscire i task su internet. Le private contengono i task. Le isolate contengono Valkey, che non ha accesso a internet.

Ogni AZ ha il suo NAT, così se una AZ cade l'altra esce ancora su internet. Ogni componente accetta traffico solo da quello prima di lui: il load balancer solo da CloudFront, web solo dal load balancer, api solo da web.

### Minuto 11 · Il calcolo

I container girano su ECS Fargate, senza server da gestire. Web e api hanno da 2 a 4 task ciascuno, divisi sulle due AZ. Il load balancer controlla la salute dei task web ogni 5 secondi.

Api non ha un load balancer: web lo raggiunge con Service Connect. Api si registra con il nome api sulla porta 4000, e web lo chiama all'indirizzo http://api:4000. ECS aggiunge a ogni task un piccolo proxy, il container ecs-service-connect che si vede anche nella console.

Il proxy di web conosce tutti i task api attivi e distribuisce le richieste a turno tra loro. Se una richiesta fallisce, la riprova su un altro task. Se un task dà 5 errori in 30 secondi, il proxy smette di usarlo per un tempo da 30 secondi a 5 minuti. Quando un task api nasce o muore, ECS aggiorna da solo l'elenco del proxy, quindi il rolling update e lo scaling di api non richiedono nessuna modifica a web.

### Minuto 12 · I dati

I task non tengono dati: se uno muore non si perde niente. DynamoDB contiene prodotti, utenti, ordini e pagamenti. Valkey contiene sessioni e carrelli. S3 contiene le immagini. Api parla con Stripe per i pagamenti.

Le chiavi Stripe stanno in Parameter Store e arrivano ai container all'avvio, quindi nel repository non c'è nessun segreto.

### Minuto 13 · La sicurezza

Un sito può cadere anche senza nessun guasto: se qualcuno lo inonda di richieste, consuma la capacità che serve agli utenti veri. Lo scaling non basta, perché si ferma a 4 task, pagati per servire l'attaccante. Per questo il traffico si filtra prima che arrivi ai task.

CloudFront è l'unico ingresso pubblico. Shield Standard ferma gli attacchi DDoS più comuni, quelli che inondano la rete. Il WAF blocca troppe richieste dallo stesso IP, gli IP con cattiva reputazione e gli attacchi noti.

### Minuto 14 · Eventi del deploy

Nella console di CloudFormation si guardano gli eventi dello stack app. CloudFormation crea in parallelo tutte le risorse che non dipendono da altre.

CloudFront parte quando il load balancer è pronto, e poi deve copiare la configurazione in tutti i suoi nodi nel mondo. Negli ultimi deploy ci ha messo da 3 a 9 minuti.

### Minuto 15 · Seed

Il deploy finisce e aggiorna il DNS da solo. Il database è vuoto, quindi nel pannello 1 si caricano prodotti, immagini e utente admin:

```sh
pnpm aws:app:seed
```

### Minuto 16 · Il sito dal vivo

Nel browser si mostrano catalogo, ricerca, cambio lingua e pagina di un prodotto.

Poi si fa un acquisto completo. Si registra un utente, si mettono due prodotti nel carrello e si va alla cassa. Si aggiunge un indirizzo e si conferma l'ordine. Il sito apre la pagina di pagamento di Stripe, dove si paga con la carta di test, una scadenza futura e un CVC qualsiasi:

```text
4242 4242 4242 4242
```

Stripe riporta alla pagina dell'ordine, che dice che il pagamento non è ancora confermato. Dopo pochi secondi l'ordine risulta pagato: Stripe ha avvisato il sito con un webhook, che passa da CloudFront, dal load balancer e da web fino ad api.

Il pagamento svuota il carrello, quindi si rimette un prodotto nel carrello per il test della sessione al minuto 21.

Infine si apre la pagina stress. Ogni pecora è un task, con versione, AZ e CPU: due web e due api, su due AZ. Il footer mostra la versione vN.

### Minuto 19 · Una nuova versione

Su GitHub si pubblica la release vN+1. Per circa 3 minuti la CI controlla il codice e costruisce le immagini. In questo tempo si fa il test 1.

### Minuto 20 · Test 1: un container muore

Nella console ECS si apre un task del servizio web. Si seleziona il container web e si preme Connect. Nel terminale che si apre si uccide il processo:

```sh
pkill -9 node
```

Nella pagina stress la pecora diventa un fantasma e sparisce. Il load balancer smette di mandare richieste al task morto in 10 secondi, ed ECS avvia un task nuovo in circa 20.

Il test si fa prima di avviare k6: le richieste in corso sul task ucciso falliscono, e k6 le conterebbe come errori del rolling update.

### Minuto 21 · La sessione resta

Si ricarica il sito. L'utente è ancora connesso e il prodotto è ancora nel carrello, perché la sessione sta in Valkey e non nel task.

### Minuto 22 · Test 2: rolling update

Quando in GitHub Actions parte il job deploy e la pagina stress conta di nuovo 2 task web attivi, nel pannello 2:

```sh
k6 run -e BASE_URL=https://arrosticini.colagreco.dev -e VUS=20 -e DURATION=13m load/browse.js
```

20 utenti virtuali navigano il sito mentre la nuova versione sostituisce la vecchia. Nessuno deve ricevere un errore.

### Minuto 23 · CI/CD

**SLIDE 10**: push → controlli → build delle immagini → ECR → deploy → rolling update.

Poi si mostra GitHub Actions con la run in corso, e nell'editor i due workflow:

```text
.github/workflows/ci.yml
.github/workflows/release.yml
```

Ogni push passa lint, typecheck, test e build. Ogni release costruisce le immagini e le mette in produzione. La CI entra su AWS senza chiavi salvate su GitHub.

### Minuto 24 · Come funziona il rolling update

Nella pagina stress compaiono le pecore api vN+1, poi spariscono le vecchie.

ECS avvia i task nuovi prima di spegnere i vecchi, quindi il sito ha sempre abbastanza task attivi. Un task vecchio smette di ricevere richieste, finisce quelle in corso e poi si spegne.

Se i task nuovi non partono, ECS torna da solo alla versione vecchia.

### Minuto 35 · Fine del rolling update

Quando la pagina stress mostra solo pecore vN+1, si ferma k6 con Ctrl+C. Il riepilogo deve mostrare 0% di richieste fallite. Il footer mostra vN+1.

### Minuto 35 · Test 3: un picco di traffico

Subito dopo, nel pannello 2:

```sh
k6 run -e BASE_URL=https://arrosticini.colagreco.dev -e VUS=50 -e DURATION=6m load/browse.js
```

50 utenti virtuali navigano il sito. Web costruisce ogni pagina sul server, quindi la CPU di web sale. Con le rampe di salita e discesa il carico dura 7 minuti, quindi continua durante le domande.

Quando la CPU media supera l'80%, ECS aggiunge un task. Sopra il 95% ne aggiunge due, sotto il 30% ne toglie uno. I task restano sempre tra 2 e 4.

Poi si mostra l'alarm in CloudWatch. Intanto le pecore web vanno in overdrive.

### Minuto 38 · Nuovi task

Nella pagina stress compaiono le nuove pecore web. Il carico si divide e la CPU scende.

### Minuto 39 · Cosa abbiamo visto

Si torna alla slide 5: i quattro casi, ognuno con la soluzione che l'ha retto.

### Minuto 40 · Grazie e domande

**SLIDE 11**: grazie.

Durante le domande, sullo schermo resta la pagina stress. Quando k6 finisce e la CPU scende sotto il 30%, web torna gradualmente a 2 task.

Se c'è tempo, si mostra la parte admin in una finestra privata, così l'utente resta connesso nella finestra normale. Si entra con l'utente admin creato dal seed. Nell'elenco degli ordini c'è l'ordine pagato al minuto 16: lo si segna come spedito, con corriere e numero di tracking. Poi si mostrano i prodotti, che l'admin può modificare, archiviare e ripristinare, e gli utenti registrati.

Se chiedono delle librerie, web usa React Router 8 su Express 5, React 19, Tailwind CSS 4, Radix UI con shadcn/ui, class-variance-authority, clsx, tailwind-merge, Lucide, Motion, i18next, react-i18next, remix-i18next, iovalkey e il client oRPC. Api usa Express 5, oRPC con OpenAPI, Zod 4, AWS SDK v3, Stripe e iovalkey. Gli strumenti sono TypeScript 7, Vite 8, Vitest 5, Supertest, Biome, tsx, Docker, GitHub Actions, AWS CDK, Playwright e k6.

Se c'è ancora tempo, per ultimo si mostra un HTTP flood. Nella console WAF la regola RateLimit si rimette in Block. Poi, nel pannello 2:

```sh
k6 run -e BASE_URL=https://arrosticini.colagreco.dev -e VUS=50 -e DURATION=2m load/browse.js
```

k6 manda tutte le richieste dallo stesso IP. Oltre 2000 richieste in 5 minuti, il WAF blocca quell'IP e k6 riceve 403. Di solito succede entro 30 secondi, ma può volerci qualche minuto. Nella console WAF si vedono le richieste bloccate dalla regola RateLimit. Anche il browser ha lo stesso IP, quindi il sito si blocca anche per chi presenta: per questo si fa per ultimo.

### Minuto 60 · Destroy

Nel pannello 1:

```sh
pnpm aws:app:destroy
```

## Se qualcosa va storto

Se il deploy è lento, si allunga la spiegazione della slide 9.

Se si è in ritardo prima del deploy, si salta l'esempio di 37signals. Le spiegazioni durante il deploy e il rolling update non recuperano tempo, perché si aspetta comunque AWS. Se il rolling update finisce tardi, al test 3 si avvia k6 e lo scaling si guarda durante le domande.

Se il deploy fallisce, si mostra l'errore in CloudFormation e si passa alla registrazione della prova generale.

Se il sito non si apre dopo il deploy, il DNS della sala ricorda ancora che il sito non esiste: si passa all'hotspot del telefono.

Se k6 riceve 403, la regola RateLimit del WAF va messa in Count.

Se Connect non compare, è selezionato il container sbagliato: va selezionato web.

Se al minuto 38 le nuove pecore web non ci sono ancora, si mostrano la CPU e l'alarm in CloudWatch e si va avanti: lo scaling si guarda durante le domande.

## Da verificare nella prova generale

Quanto durano davvero deploy, CI e rolling update. Se il webhook di Stripe arriva al sito su AWS e l'ordine risulta pagato. Se l'acquisto completo sta in 3 minuti. Se con 20 utenti virtuali le pecore web restano sotto l'80% di CPU durante il rolling update. Se il rolling update finisce con 0% di errori. Quanto ci mette browse con 50 utenti virtuali a far scalare web. Quanto ci mette il WAF a bloccare k6 con RateLimit in Block.

## Prompt per la slide 9

```text
Costruisci la slide 9 del deck Slidev come layout Vue con SVG, come la slide del monorepo, non come immagine generata. Mostra l'infrastruttura di Arrosticini 24ore su AWS ridotta all'essenziale: deve leggersi da lontano mentre parlo per cinque minuti. Testo di almeno 18px, al massimo una dozzina di elementi, frecce senza etichetta o con una sola parola, icone ufficiali AWS solo dove aiutano a riconoscere il servizio.

Il pubblico deve capire tre cose: c'è un solo ingresso, tutto è doppio sulle due AZ e i dati stanno fuori dai task.

Gli elementi: a sinistra l'utente e, sotto, Stripe, fuori da AWS. Poi CloudFront. A destra il riquadro della regione eu-south-1, con dentro la VPC divisa in due colonne, eu-south-1a ed eu-south-1b, e in tre fasce orizzontali: pubblica, privata e isolata. Nella fascia pubblica l'ALB, steso sulle due colonne, e un NAT per colonna. Nella fascia privata un task web e un task api per colonna. Nella fascia isolata Valkey, steso sulle due colonne. Nella regione ma fuori dalla VPC, DynamoDB e S3.

Non mettere porte, CIDR, security group, nomi delle tabelle, dimensioni dei task, Cloudflare DNS, Certificate Manager, Parameter Store, gateway endpoint, ECR, CloudWatch, Auto Scaling, GitHub Actions o CloudFormation: li dico a voce o stanno in altre slide.
```
