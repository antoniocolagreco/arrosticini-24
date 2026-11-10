# Simulazione del talk

Il testo da dire, slide per slide. Tempi, comandi e azioni sono in `runbook-talk.md`.

## Prima del talk

Nel pannello 1 si genera il template da mostrare:

```sh
pnpm --filter @arrosticini/infra cdk synth
```

Subito prima di iniziare ci si autentica su AWS:

```sh
aws login
```

## Hooks

**SLIDE 1**: titolo.

Buongiorno, sono Antonio Colagreco, consulente per Ready 2 USE presso PagoPA.

Questo talk me l'ha proposto l'azienda, e io l'ho usato per fare il punto su come stiamo cambiando nell'epoca dell'AI. Secondo me l'AI ha reso la scrittura del codice più un hobby che un lavoro.

Il talk dura 40 minuti, poi ci sono 20 minuti per le domande.

**SLIDE 2**: l'evoluzione dei ruoli.

Per me non ha più senso dividersi tra frontend, backend, DevOps e QA. Si va verso il product engineer, che porta un prodotto dall'idea alla produzione. Quando lavora presso un cliente si chiama forward deployed engineer.

Non serve più essere verticali su un linguaggio, un framework o una tecnologia: l'AI ne conosce la sintassi e le API meglio di noi. Serve conoscere a fondo i concetti che stanno sotto, come rete, dati, concorrenza e sicurezza. Sono quelli che servono per capire se il codice scritto dall'AI è giusto.

Gli specialisti restano dove il problema è profondo o rischioso: affidabilità, piattaforma, sicurezza, dati e modelli.

L'AI abbassa il costo del codice. Il valore si sposta su progettazione, decisioni e responsabilità del risultato.

**SLIDE 3**: il ciclo del product engineer.

Il Product Engineer è un ingegnere che trasforma problemi e bisogni degli utenti in prodotti software funzionanti, occupandosi dell'intero ciclo di vita, dalla progettazione allo sviluppo, fino al rilascio e al miglioramento continuo, con l'obiettivo di generare valore reale per utenti e business.

Il ciclo è questo: capisce il problema, progetta la soluzione, la costruisce, la mette in produzione e osserva come si comporta. Quello che osserva diventa il problema del giro dopo.

Per questo, dopo cinque anni di frontend, ho iniziato a lavorare sul backend, ho studiato AWS e a ottobre ho preso la certificazione Solutions Architect. Questo progetto è il modo in cui ho messo in pratica quello che ho studiato.

Oggi vediamo quattro passi del ciclo: design, build, deploy e observe. Metto online un e-commerce da zero, davanti a voi, e poi provo a romperlo in quattro modi.

## Il problema

**SLIDE 4**: la bottega di arrosticini aperta.

Di solito per alta disponibilità si intende un sistema che resta in funzione anche quando si guasta un suo componente. Si misura in percentuale di tempo online: 99,9% vuol dire circa 9 ore di fermo all'anno, 99,99% meno di un'ora. Si ottiene duplicando ogni componente, così nessun pezzo da solo può fermare il servizio.

Qui la intendiamo in senso più largo: il servizio deve restare disponibile qualunque cosa succeda. Non solo un guasto, ma anche un aggiornamento, un attacco o un picco di traffico.

Partiamo da una cosa che qui conosciamo tutti: una bottega di arrosticini. Apre, i clienti entrano, comprano e tornano a casa contenti. Anche i supereroi fanno la fila. Finché va tutto bene, non serve niente di speciale.

Ma cosa può andare storto?

**SLIDE 5**: la bottega in quattro guai.

Un guasto: si rompe la fornacella e non si cucina più.

Un rinnovo: bisogna rifare il bancone, e per farlo si chiude.

Una protesta: un gruppo di persone si piazza davanti alla porta, e i clienti veri non riescono a entrare.

Ferragosto: arrivano tutti insieme, e la fila arriva in fondo alla strada.

In tutti e quattro i casi il risultato è lo stesso: il cliente se ne va senza arrosticini.

**SLIDE 6**: gli stessi quattro guai su AWS.

Su internet succedono le stesse quattro cose.

Il guasto è un server che si blocca. Su AWS si parla di task: un container in esecuzione, che fa il lavoro di un server. Se il task muore, le richieste in corso ricevono 502 Bad Gateway. Se si blocca senza rispondere, 504 Gateway Timeout.

Il rinnovo è una nuova versione del sito. Il modo più semplice di installarla è spegnere la vecchia, e per qualche minuto il sito non c'è: 503 Service Unavailable.

La protesta è un attacco DDoS: migliaia di computer inondano il sito di traffico finto, e quello degli utenti veri non passa. Se l'attacco colpisce la rete, la pagina non carica affatto e non arriva nessun codice. Se colpisce con richieste HTTP, gli utenti ricevono 503 o 504.

Ferragosto è un picco di traffico: un'offerta, una pubblicità, il Black Friday. I server che bastavano ieri oggi non bastano più. Le pagine rallentano fino al 504, o il server rifiuta le richieste con 503.

Sono tutti errori 5xx: la colpa è del server, non dell'utente.

Solo che qui il cliente non resta senza arrosticini: con un clic va dalla concorrenza.

Oggi provo tutti e quattro i casi, dal vivo, su un e-commerce vero.

**SLIDE 7**: le quattro risposte di AWS.

Per ogni caso c'è una risposta.

Contro il guasto, la ridondanza e l'autoriparazione. I task sono almeno due, in due data center diversi. A ECS, il servizio che gestisce i container, non si dice "avvia due task", ma "voglio sempre due task attivi". ECS confronta di continuo quanti task vuoi con quanti ne girano davvero: se uno muore, ne avvia subito un altro. Il load balancer invece fa da sensore: interroga ogni task ogni 5 secondi, e dopo due risposte mancate smette di mandargli utenti e lo segnala a ECS, che lo sostituisce. Nella bottega: due fornacelle, e qualcuno che ne accende una nuova appena una si spegne.

Contro il rinnovo, il rolling update: AWS avvia i task della nuova versione prima di spegnere quelli vecchi, quindi c'è sempre qualcuno che risponde. Se la nuova versione non parte, torna da solo a quella vecchia. Nella bottega: si rifà il bancone un pezzo alla volta, senza mai chiudere.

Contro l'attacco, tre filtri uno dopo l'altro, tutti prima dei task.

Il primo è CloudFront, la rete di AWS con centinaia di punti di presenza nel mondo. È l'unico ingresso del sito: il load balancer accetta traffico solo dagli indirizzi di CloudFront, quindi l'attaccante non può aggirarlo. Un attacco distribuito viene diviso tra tanti punti di presenza, e nessuno da solo viene travolto. Immagini e asset li serve dalla sua cache, senza disturbare i task. CloudFront però non riconosce un attacco: offre lo spazio e la capacità dove fermarlo.

Il secondo è Shield Standard, gratuito e sempre attivo, che gira dentro i punti di presenza di CloudFront. Osserva il traffico di rete, ai livelli 3 e 4, riconosce gli attacchi come SYN flood, UDP flood e amplificazione, e li scarta prima che diventino richieste.

Il terzo è il WAF, che legge ogni richiesta HTTP, al livello 7. Ha quattro regole. La prima blocca un IP che manda più di 2000 richieste in 5 minuti. La seconda blocca gli IP che Amazon ha già visto attaccare. La terza blocca gli attacchi più comuni alle applicazioni web, come cross-site scripting e path traversal. La quarta blocca richieste che sfruttano vulnerabilità note, come Log4Shell.

Nella bottega: qualcuno alla porta che fa entrare solo i clienti. Sulla slide lo fa Genos, mentre Saitama mangia arrosticini.

Contro il picco, l'autoscaling: quando i task sono troppo carichi, AWS ne aggiunge altri. Quando il carico scende, li toglie, e si paga solo quello che si usa. Nella bottega: a Ferragosto si chiamano i cugini ad arrostire, e a settembre tornano a casa.

Oggi le vediamo all'opera tutte e quattro.

## Il cloud

**SLIDE 8**: a sinistra un server on premises, a destra una regione AWS con le sue AZ.

Prima del cloud, un'azienda aveva i suoi server: in casa, o in un data center in affitto. Si dice on premises.

I server si comprano per reggere il picco, e il resto del tempo restano fermi. Nel cloud si paga quello che si usa.

Un server nuovo arriva in settimane: ordine, consegna, installazione. Nel cloud parte in minuti.

I guasti li gestisci tu: se si rompe un disco, vai tu a cambiarlo. Su AWS ogni regione ha più zone di disponibilità, dette AZ. Ogni AZ è fatta di uno o più data center, separati da quelli delle altre AZ: se una si guasta, le altre continuano a funzionare. I due data center di cui parlavo prima sono due AZ. Per usarne due basta indicarlo nella configurazione. Con server propri, bisognerebbe costruire un secondo data center.

Il cloud ha anche dei contro: con un carico alto e costante può costare di più, e lega al fornitore.

Un esempio è 37signals, l'azienda di Basecamp e HEY. Nel 2022 spendeva circa 3,2 milioni di dollari l'anno di cloud, per un carico stabile e prevedibile. Ha comprato server Dell per circa 700.000 dollari e ha riportato le applicazioni nei propri data center, risparmiando quasi 2 milioni l'anno. Sono cifre dichiarate dall'azienda.

**SLIDE 9**: il mercato del cloud.

AWS è il primo fornitore cloud, con circa un quarto del mercato mondiale, davanti ad Azure e Google Cloud. In Europa le stime danno lo stesso ordine.

AWS perde quote, ma non clienti: in un anno i suoi ricavi sono cresciuti del 39%. È il mercato che cresce più in fretta, del 55%, trainato dall'AI. Google cresce del 103% soprattutto grazie alle TPU, i suoi chip per l'AI, comprati dai grandi laboratori come Anthropic.

Anche piattaforme molto usate come Vercel, Supabase e Neon girano su AWS: ci aggiungono il loro software e la loro gestione.

## Infrastruttura come codice

**SLIDE 10**: TypeScript → CDK → template CloudFormation → risorse AWS.

Le risorse non si creano a mano dalla console: si descrivono in un file, che sta in Git insieme al resto del codice.

Il progetto usa CDK: l'infrastruttura si scrive in TypeScript. CDK la trasforma in un template di CloudFormation, un file JSON che elenca le risorse. CloudFormation legge il template e crea le risorse su AWS, nell'ordine giusto.

Questo dà tre vantaggi. Ogni modifica ha la sua storia in Git. Prima del deploy si vede il diff, cioè cosa verrà creato, modificato o cancellato. E lo stesso codice ricrea sempre lo stesso ambiente.

Adesso lo faccio davvero. Nel pannello 1:

```sh
pnpm aws:app:deploy
```

Il comando crea l'infrastruttura da zero, poi aggiorna il DNS su Cloudflare. Ci vogliono circa 10 minuti, e intanto guardiamo il codice che la descrive.

Nell'editor si apre `infra/lib/app-stack.ts`. Ogni stack è una classe TypeScript. Si dichiarano le risorse e come si collegano, e CDK ricava da solo permessi, regole di rete e ordine di creazione.

Poi si apre `infra/cdk.out/arrosticini-app.template.json`. CDK trasforma il TypeScript in questo template, che è quello che AWS esegue. 470 righe di TypeScript diventano 3092 righe di JSON, con 88 risorse.

Poi si apre `infra/bin/app.ts`.

Le risorse sono divise in stack. Uno stack è un gruppo di risorse che CloudFormation crea, aggiorna e cancella insieme. Il progetto ne ha quattro, divisi per regione e per ciclo di vita.

Edge contiene il certificato HTTPS. Sta in Virginia, nella regione us-east-1, perché CloudFront accetta certificati solo da lì.

Foundation contiene i repository delle immagini Docker e i permessi della CI. Sta a Milano.

Edge e foundation restano sempre: il certificato e le immagini non si ricreano a ogni demo.

Waf contiene le regole del firewall. Anche lui sta in us-east-1, perché un WAF associato a CloudFront deve stare lì.

App contiene tutto il resto: rete, load balancer, container, database, cache e CloudFront. Sta a Milano.

Waf e app si creano e si distruggono insieme: oggi li creo da zero, e dopo il talk li cancello.

Il codice è diviso in due cartelle. In lib ci sono le classi degli stack: ognuna descrive le risorse di uno stack, ma da sola non crea niente. In bin c'è il punto di ingresso, app.ts, che decide quali stack esistono, in quale regione e come si collegano. lib dice cosa è ogni stack, bin dice quali stack esistono e dove.

## Il progetto

**SLIDE 11**: il monorepo.

Questo è l'e-commerce che oggi mettiamo online e proviamo a rompere. Non è una demo da dieci righe: è un negozio completo, con catalogo, utenti, carrello, ordini e pagamenti veri, su Stripe.

Tutto sta in un solo repository, un monorepo. Il linguaggio è TypeScript, ovunque: sito, API, infrastruttura e test. pnpm installa le dipendenze, Turborepo esegue build e test solo dei package che sono cambiati.

Le applicazioni sono due, web e api, e ognuna diventa un'immagine Docker. È questa immagine che AWS esegue nei task.

Web è il sito. Le pagine le costruisce il server, così arrivano al browser già pronte: è il server-side rendering. React disegna l'interfaccia, React Router gestisce pagine e caricamento dei dati, Express è il server HTTP che li fa girare, Tailwind gestisce lo stile.

Api è l'API privata del negozio, e da internet non si raggiunge. Anche lei usa Express. Con l'AWS SDK parla con DynamoDB e S3, e con Stripe gestisce i pagamenti.

Web e api devono essere d'accordo su come si parlano: quali chiamate esistono, quali dati si mandano, cosa si riceve. Questo accordo è il contratto, ed è il cuore del progetto.

Il contratto si scrive una volta sola, in un package condiviso. Zod descrive la forma dei dati, oRPC usa il contratto da tutte e due le parti.

Da quel contratto oRPC ricava due cose. In api, un server: per ogni chiamata scriviamo solo la logica, e oRPC pensa a indirizzi, controllo dei dati e risposte. In web, un client: ogni chiamata del contratto diventa una funzione TypeScript, con parametri e risposta già tipizzati.

Se il contratto cambia e una delle due parti non si adegua, il codice non compila. L'errore lo vedo nell'editor, non in produzione.

In mezzo c'è Valkey, una cache in memoria, compatibile con Redis. Web ci tiene le sessioni, api i carrelli. Per questo i task non tengono dati: se uno muore, l'utente resta connesso e il carrello resta pieno.

Sotto api ci sono i cinque domini del negozio: catalog per i prodotti, identity per gli utenti, shopping per il carrello, ordering per gli ordini, payments per i pagamenti. Ognuno è un package separato.

In fondo ci sono i package condivisi. Kernel contiene i tipi comuni a tutti. Ops contiene i log, scritti con pino in JSON, così CloudWatch li legge e li filtra. Testing contiene il supporto ai test con Testcontainers, che avvia in Docker Valkey, la versione locale di DynamoDB, uno storage compatibile con S3 e un simulatore di Stripe. I test parlano con servizi veri, non con oggetti finti scritti nel codice.

I confini tra i package non sono solo una buona intenzione. Turborepo li controlla: un dominio non può importare un altro dominio né un'applicazione. La CI esegue questo controllo a ogni push, e se una regola non è rispettata fallisce. Per questo un dominio si può spostare in un servizio a parte senza riscrivere niente.

## L'architettura

**SLIDE 12**: il diagramma dell'architettura su AWS.

Questo è quello che il deploy sta costruendo in questo momento. Dal diagramma conviene portarsi a casa tre idee: c'è un solo ingresso, ogni pezzo è doppio, e i dati non stanno nei container.

Seguiamo una richiesta da sinistra a destra.

L'utente scrive l'indirizzo del sito. Il DNS di Cloudflare lo manda a CloudFront, la rete di AWS che abbiamo visto prima. CloudFront gestisce HTTPS e fa controllare ogni richiesta da Shield e dal WAF. Immagini e asset li restituisce subito dalla sua cache. Tutto il resto lo passa al load balancer.

Da qui siamo dentro AWS, a Milano, in una rete privata che si chiama VPC. La VPC copre due zone di disponibilità, le due colonne: eu-south-1a ed eu-south-1b. Ogni pezzo importante c'è in tutte e due. Se una zona cade, l'altra continua da sola.

Le righe sono tre fasce di rete, dette subnet, ognuna più protetta della precedente.

Nella fascia pubblica c'è il load balancer, l'ALB. Riceve le richieste da CloudFront e le distribuisce tra i container web delle due zone. Accetta traffico solo da CloudFront: chi prova a raggiungerlo direttamente viene rifiutato.

Nella fascia privata ci sono i container. Web costruisce le pagine e chiede i dati ad api. Api non ha un load balancer: web la trova con Service Connect, un servizio di AWS che sa sempre quali container api sono vivi e distribuisce le chiamate tra loro. Da internet non si può entrare in questa fascia.

Ogni componente accetta traffico solo da quello prima di lui: il load balancer solo da CloudFront, web solo dal load balancer, api solo da web.

Nella fascia isolata c'è Valkey, con sessioni e carrelli. Questa fascia non ha nessun accesso a internet, né in entrata né in uscita.

In basso, fuori dalla VPC, ci sono DynamoDB e S3. DynamoDB è il database: prodotti, utenti, ordini e pagamenti. S3 contiene le immagini dei prodotti. Sono servizi gestiti da AWS, già ridondati su più zone senza che io debba fare niente.

Ecco perché i container possono morire senza danni: non tengono niente. Sessioni e carrelli sono in Valkey, tutto il resto in DynamoDB e S3. Un container nuovo riparte da zero e trova tutto al suo posto.

Resta Stripe, a destra, fuori da AWS. Api deve poterlo chiamare per i pagamenti, ma sta in una fascia senza ingresso da internet. Per uscire usa il NAT, uno per zona, che permette di aprire connessioni verso l'esterno ma non di riceverne. Anche il NAT è doppio: se una zona cade, l'altra esce ancora su internet.

Le chiavi di Stripe non sono nel codice. Stanno in Parameter Store, un archivio cifrato di AWS, e arrivano ai container solo all'avvio.
