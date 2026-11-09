# Dizionario dei servizi AWS

Per ogni servizio della slide 11 c'è cosa dire durante il talk: cos'è e come lo usa il progetto. L'ordine è quello della slide, cioè il percorso di una richiesta, poi i servizi di contorno.

## CloudFront

CloudFront è la CDN di AWS: una rete di server sparsi nel mondo che stanno tra gli utenti e il sito. Nel progetto è l'unico ingresso pubblico. Gestisce HTTPS, tiene in cache immagini e asset, così tornano subito senza toccare i task, e passa tutto il resto al load balancer.

## Certificate Manager

Certificate Manager crea e rinnova da solo i certificati per HTTPS, gratis. Il certificato del sito sta in us-east-1, perché CloudFront accetta solo certificati di quella regione. AWS verifica che il dominio è nostro con un record DNS.

## Shield Standard

Shield Standard è la protezione DDoS di base di AWS. È gratuita e sempre attiva su CloudFront, senza configurare niente. Ferma gli attacchi che inondano la rete con traffico, prima che arrivino al sito.

## WAF

Il WAF è un firewall che legge ogni richiesta HTTP e decide se farla passare. Nel progetto ha quattro regole. Blocca un IP che manda più di 2000 richieste in 5 minuti, blocca gli IP con cattiva reputazione e blocca gli attacchi noti, come il cross-site scripting e Log4Shell.

## ALB e target group

L'Application Load Balancer riceve le richieste HTTP e le distribuisce tra i task web. Il target group è l'elenco dei task a cui le manda. Ogni 5 secondi il load balancer controlla la salute di ogni task: dopo due risposte mancate lo toglie dall'elenco. Accetta traffico solo da CloudFront.

## VPC

La VPC è una rete privata dentro AWS, isolata da quella degli altri clienti. Nel progetto copre due AZ, e ogni AZ ha tre fasce di subnet. Le pubbliche contengono il load balancer e i NAT, le private contengono i task, le isolate contengono Valkey, che non può uscire su internet.

## NAT Gateway

Il NAT Gateway fa uscire su internet le risorse delle subnet private, senza renderle raggiungibili da fuori. Serve ad api per parlare con Stripe. Ce n'è uno per AZ, così se una AZ cade l'altra esce ancora. È anche la voce più cara del progetto.

## Security group

Un security group è un firewall attaccato a ogni risorsa, che dice chi può parlarle e su quale porta. Nel progetto ognuno accetta traffico solo dal componente prima di lui: il load balancer solo da CloudFront, web solo dal load balancer, api solo da web, Valkey solo da web e api.

## ECS Fargate

ECS esegue i container, e con Fargate lo fa senza server da gestire: si dice quanta CPU e memoria serve e AWS trova dove farlo girare. Web e api hanno da 2 a 4 task ciascuno, divisi sulle due AZ, ognuno con un quarto di CPU e mezzo giga di memoria. Se la CPU media supera l'80% ECS aggiunge un task, sotto il 30% ne toglie uno.

## Service Connect

Service Connect fa parlare tra loro i servizi ECS usando un nome invece di un indirizzo. Web chiama api all'indirizzo http://api:4000, e un piccolo proxy accanto a ogni task sa quali task api sono vivi. Distribuisce le richieste tra loro, riprova su un altro task se una fallisce e smette di usare un task che dà troppi errori.

## Cloud Map

Cloud Map è il registro dei servizi di AWS: un elenco di nomi con gli indirizzi dei task che li servono. Service Connect lo usa dietro le quinte. Quando un task api nasce o muore, il registro si aggiorna da solo, e i proxy di web lo vengono a sapere.

## ElastiCache Valkey

ElastiCache è la cache in memoria gestita da AWS, e Valkey è il motore, compatibile con Redis. Nel progetto è serverless: non si scelgono nodi, cresce da sola. Contiene sessioni e carrelli, così i task non tengono dati e se uno muore l'utente resta connesso.

## DynamoDB

DynamoDB è il database NoSQL serverless di AWS: non ci sono server, si paga per ogni lettura e scrittura. Nel progetto ci sono sette tabelle: prodotti, utenti, email degli utenti, ordini, pagamenti, clienti Stripe ed eventi Stripe già gestiti.

## S3

S3 è l'archivio di file di AWS: si salva un file e lo si recupera con il suo nome. Nel progetto contiene le immagini dei prodotti. Api le legge da S3, e CloudFront le tiene in cache.

## Parameter Store

Parameter Store conserva configurazioni e segreti, cifrati. Nel progetto contiene le chiavi Stripe e il segreto delle sessioni, che arrivano ai container all'avvio. Così nel repository non c'è nessun segreto.

## CloudWatch

CloudWatch raccoglie log, metriche e allarmi. Nel progetto riceve i log di web e api, e li tiene una settimana. Misura anche la CPU dei task ogni minuto, e sono i suoi allarmi a far partire lo scaling.

## IAM con OIDC

IAM gestisce chi può fare cosa su AWS. Con OIDC, GitHub Actions entra in AWS senza chiavi salvate: GitHub presenta un token firmato e AWS gli dà credenziali temporanee. Il ruolo vale solo per questo repository e solo per i tag di release.

## ECR

ECR è il registro delle immagini Docker di AWS. Nel progetto ha un repository per web e uno per api. Ogni immagine ha il tag della release e non si può sovrascrivere, e AWS tiene solo le ultime cinque versioni.

## CloudFormation e CDK

CloudFormation crea le risorse AWS a partire da un template, e CDK genera quel template da codice TypeScript. Nel progetto l'infrastruttura è divisa in quattro stack. Edge contiene il certificato e foundation i repository ECR e il ruolo per GitHub. Waf contiene il firewall, app tutto il resto. Un deploy confronta il codice con quello che esiste e cambia solo la differenza.
