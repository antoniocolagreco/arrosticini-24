# Arrosticini 24ore — fonti del diagramma

Un unico SVG autonomo: icone AWS ufficiali incorporate, testi e collegamenti vettoriali. La slide apre il file originale con un clic per leggere i dettagli. Nessuna risorsa AWS e stata creata o modificata.

## Progetto verificato

- `master/infra/lib/app-stack.ts`: VPC 10.10.0.0/16, due AZ, due NAT Gateway, subnet pubbliche/private/isolate, gateway endpoint S3 e DynamoDB, ALB, task Fargate web/api, Valkey 9 Serverless, sette tabelle DynamoDB on-demand, bucket media, segreti SecureString, log, regole SG, CloudFront e autoscaling.
- `master/infra/lib/edge-stack.ts`: certificato ACM con validazione DNS.
- `master/infra/lib/waf-stack.ts`: rate limit per IP, Amazon IP Reputation List, Common Rule Set e Known Bad Inputs. `SizeRestrictions_BODY` del Common Rule Set e in modalita count.
- `master/infra/lib/foundation-stack.ts`: repository ECR e ruolo CI con OIDC, limitato ai tag GitHub `v*`, senza chiavi AWS statiche.
- `master/infra/bin/app.ts`: Milano per l'applicazione, us-east-1 per ACM e WAF, dominio arrosticini.colagreco.dev.
- `master/infra/cdk.context.json`: disponibilita di eu-south-1a e eu-south-1b.
- `master/infra/scripts/dns.ts`: CNAME verso la distribuzione CloudFront, `proxied: false`.
- `master/.github/workflows/release.yml`: autenticazione OIDC, build e push delle immagini, deploy tramite CDK/CloudFormation.

La modalita test di Stripe e indicata da Antonio; non sono state lette le chiavi di pagamento. I nomi delle tabelle nel diagramma descrivono i dati, non i nomi fisici generati da CloudFormation.

## Precisazioni

- Le due AZ rappresentano la distribuzione nominale dei servizi; il numero desiderato e 2 per servizio e l'autoscaling arriva a 4 per servizio. Ogni task applicativo richiede 0,25 vCPU e 512 MB.
- Valkey Serverless e un unico servizio collegato alle due subnet isolate, non due cache indipendenti.
- CloudFront e l'ingresso previsto per il sito. L'ALB e internet-facing con accesso HTTP limitato alla prefix list AWS CloudFront origin-facing; questa regola non autentica una particolare distribuzione CloudFront.
- Shield Standard e incluso automaticamente; non viene mostrato Shield Advanced.
- Le frecce WAF/Shield/ACM rappresentano associazioni al servizio, non tre proxy in serie. Le linee viola rappresentano dipendenze operative, non percorsi di routing IP.
- Nella vista completa le etichette di dettaglio sono piccole: il file vettoriale permette di ingrandirle senza perdita di qualita.

## Fonti ufficiali

- Icone: https://aws.amazon.com/architecture/icons/
- Pacchetto originale, luglio 2026: https://d1.awsstatic.com/onedam/marketing-channels/website/public/shared/architecture-icon-release/Icon-package_07312026.5846e92413caa21490223536cc97f1269e44fa92.zip
- Shield Standard: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-standard-summary.html
