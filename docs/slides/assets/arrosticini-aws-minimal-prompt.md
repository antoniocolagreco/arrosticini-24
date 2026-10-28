# Schema minimale AWS

Generato con Imagegen integrato. Riferimento di stile: `infrastructure-code-flow-v2.png`.

Illustrazione orizzontale ad acquerello e inchiostro su carta crema #faf5e9, verde bosco, terracotta e oro tenue. Schema essenziale leggibile da una slide: Utente, CloudFront + WAF con scudo associato, ALB che distribuisce alle due AZ di AWS Milano. Ogni AZ contiene un web e un api, collegati in questo ordine. Sotto, un solo gruppo di servizi condivisi: Valkey, DynamoDB e S3. Stripe all'esterno, collegato al livello api. Due AZ simmetriche, etichette grandi, poche frecce, nessun dettaglio di subnet, porte o gestione. Niente titolo nell'immagine: titolo e numero restano nel layout Slidev.

Le due coppie web/api rappresentano la distribuzione nominale dei task. I servizi dati non vengono duplicati come istanze indipendenti. Lo schema semplifica i collegamenti ai dati: web usa Valkey per le sessioni, api usa Valkey per i carrelli, DynamoDB e S3.

## Prompt di correzione dei collegamenti

Precise diagram correction. Keep ALL artwork, text, positions, colors, shapes and background unchanged. Correct only connectors in the supplied diagram. ALB should branch to the TOP 'web' container in AZ 1 and the TOP 'web' container in AZ 2. Remove completely the diagonal arrow from ALB to the LOWER 'api' container in AZ 1. Remove completely both horizontal orange arrows BETWEEN the two zones (web to web and api to api): the zones must have no direct connecting arrows between their containers. Retain the vertical downward arrow from web to api within each zone. To reach AZ 2 web from ALB, draw a single thin terracotta connector from ALB that routes ABOVE both web containers, below AZ headings if space permits, then down into AZ 2 web. ALB to AZ 1 web stays. Preserve the api links to shared data and Stripe. No other changes. Exactly two ALB outgoing destinations, both web; zero direct ALB to api; zero web to web or api to api cross-zone arrows.
