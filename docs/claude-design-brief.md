# Arrosticini 24ore: brief per Claude Design

## Obiettivo

Un design system completo e le schermate di tutte le pagine di un e-commerce dimostrativo di arrosticini (spiedini di pecora abruzzesi) spediti in tutto il mondo. Il sito serve come demo in un talk tecnico, ma deve sembrare un negozio vero, curato da un designer: coerente in ogni pagina, leggibile, con un carattere illustrato e ironico.

Output richiesto:

1. Design system: token (colori, tipografia, spaziature, raggi, ombre, griglia, breakpoint, motion) e componenti con i loro stati.
2. Schermate desktop (1440 px) e mobile (390 px) per ogni pagina elencata sotto, costruite solo con i componenti del design system.

## Riferimenti da allegare

| File | Contenuto |
|---|---|
| `docs/mock.png` | Mock della home: è il riferimento visivo principale e va seguito |
| `docs/products.png` | Le 8 illustrazioni dei prodotti affiancate |
| `docs/images/sheep.webp` | Logo (pecora a china) |
| `docs/images/airplane.webp` | Aereo con livrea Arrosticini 24ore, per l'hero |
| `docs/images/background.webp` | Paesaggio abruzzese (borgo, colline, montagne, pecore, cielo) per l'hero |
| `docs/images/town.webp`, `box.webp`, `globe.webp` | Illustrazioni delle tre value prop |
| `docs/images/sheep_overdrive_off.webp`, `sheep_overdrive_on.webp` | Pecora tranquilla e pecora "in overdrive" (pannello stress e pagine di errore) |
| `docs/images/p_*.webp` | Immagini dei singoli prodotti, sfondo crema |

Regola: il testo non va mai dentro le immagini.

## Brand e tono

- Nome: Arrosticini 24ore. Claim: "La pecora vola. La tradizione resta."
- Stile: illustrazione a china acquerellata, carta crema con texture leggera, rosso brace e verde bosco, un tocco di tricolore. Tradizione abruzzese con ironia (es. la nota a mano "Altro che pecora al pascolo." nel mock).
- Dettagli decorativi del mock: tovaglia a quadri bianco-rossa in un angolo, ramo d'ulivo, sottolineature a pennello sotto i titoli.

## Stato attuale (estratto dalla home implementata)

### Colori

| Ruolo | Valore |
|---|---|
| Sfondo carta | `#faf5e9` (con rumore SVG `#85673d` al 4,5%) |
| Testo | `#321b12` |
| Primario (rosso brace) | `#a52b1c` |
| Testo su primario | `#fff9eb` |
| Secondario | `#eae6d5` |
| Bordo | `#c9b793` |
| Verde bosco | `#253d26` |
| Separatori value prop | `#70744c` (doppia linea 5 px), `#969173` |
| Testo secondario | `#6f6251` |

### Tipografia

- Titoli, logo, pulsanti: Roboto Serif (Google Fonts), larghezza 75%, peso 900 (titoli) e 600.
- Testo: DM Sans 400 / 500 / 600 / 700.
- Titolo hero: `clamp(68px, 6.3vw, 101px)`, interlinea 1.03, tracking -4px, prospettiva 3D leggera (`rotateY(7deg) rotateZ(-1deg)`), contorno color carta per la leggibilità sul paesaggio.
- Sottotitolo hero: Roboto Serif 600, `clamp(20px, 2vw, 29px)`.
- Eyebrow: DM Sans 700, 13 px, maiuscolo, tracking 3px, verde.
- Value prop: titolo 23 px verde, testo 16 px.

### Layout

- Contenuto largo al massimo 1536 px, margini laterali 32 px (18 px sotto i 700 px).
- Breakpoint usati: 700 px e 1000 px.
- Hero: altezza `clamp(440px, 34vw, 540px)`, paesaggio a destra sfumato sui bordi, aereo al 55% della larghezza in alto a destra, titolo sovrapposto.
- CTA: alta 62 px, testo 22 px, ombra `0 8px 24px #74251a18`, sollevamento di 3 px all'hover.

### Problemi da risolvere

- Le pagine non hanno un sistema comune: ogni pagina è improvvisata e il risultato è slegato e caotico.
- Nella lista prodotti l'immagine è enorme: mancano proporzioni e dimensioni fisse.
- Animazioni sparse e fuori posto.
- Rispetto al mock il titolo è troppo leggero e il logo non ha il wordmark grassetto rosso/verde con il tricolore.
- Header incompleto: mancano Shop, il pulsante carrello rosso con contatore, la freccia del selettore lingua, l'accesso all'account.

## Pagine da progettare

Il sito è in italiano e inglese (prefisso `/it`, `/en`), valuta sempre EUR.

| Pagina | Contenuto |
|---|---|
| Home | Come il mock: hero, tre value prop, griglia prodotti "Pronti a partire. E a finire sulla brace." |
| Lista prodotti | Ricerca, griglia di card, stato vuoto per ricerca senza risultati |
| Pagina prodotto | Immagine, nome, pezzi, prezzo, descrizione, quantità, aggiungi al carrello |
| La nostra storia, Spedizioni nel mondo | Pagine editoriali con illustrazione |
| Carrello | Righe con immagine, nome, prezzo unitario, quantità, rimozione; totale; carrello vuoto |
| Checkout | Scelta o inserimento dell'indirizzo, riepilogo, pulsante di pagamento (Stripe ospitato) |
| Ordini | Storico con stato; dettaglio ordine con righe, indirizzo, totale, stato (in attesa di pagamento, pagato, annullato) |
| Account | Profilo e lingua preferita; indirizzi (massimo 5, uno predefinito); carte salvate; cambio password |
| Login, Registrazione | Form con errori per campo |
| Admin prodotti | Tabella prodotti con stato (bozza, attivo, archiviato); form di creazione/modifica con testi IT ed EN, prezzo, pezzi, upload immagini |
| Admin ordini | Tabella di tutti gli ordini |
| Pannello stress | Griglia di "pecore", una per container: tranquilla sotto l'80% di CPU, in overdrive sopra, fantasma (grigia, semitrasparente) se non risponde; due righe, web e api; etichetta con versione, zona e id breve |
| 404 e 500 | Pecora in overdrive, messaggio, link alla home; la 500 mostra un request id |

## Componenti richiesti

Header (logo, navigazione Shop / La nostra storia / Spedizioni nel mondo, selettore lingua, carrello con contatore, account), footer, pulsanti (primario, secondario, testo, icona), campo di ricerca, input e select con errore, card prodotto, selettore quantità (−, valore, +), prezzo, badge di stato, riga carrello, riepilogo ordine, card indirizzo, tabella admin, avviso (successo, errore), stato vuoto, scheletro di caricamento, tile pecora del pannello stress.

Card prodotto: immagine con proporzione fissa, nome, numero di pezzi se presente, prezzo, selettore quantità, pulsante "Aggiungi".

Icone: Lucide (`Globe`, `ShoppingCart`, `User`, `ChevronDown`, `Plus`, `Minus`, `Trash2`, `ArrowRight`, `Search`, `Settings`, `MapPin`, `CreditCard`, `KeyRound`, `Package`, `LogOut`, `ImagePlus`, `Pencil`, `Archive`, `Cpu`, `Server`).

## Dati reali

| Prodotto IT / EN | Pezzi | Prezzo |
|---|---|---|
| Arrosticini 75 pezzi / Arrosticini 75 pieces | 75 | € 37,50 |
| Pacco da 225 / 225-piece pack | 225 | € 112,50 |
| Mini pallet / Mini pallet | 3600 | € 1.800,00 |
| Cuoco a domicilio / Chef at home | — | € 50,00 |
| Vino locale / Local wine | — | € 5,00 |
| Carbone / Charcoal | — | € 20,00 |
| Pecora per arrosticini DIY / Sheep for DIY arrosticini | — | € 400,00 |
| Fornacella / Arrosticini grill | — | € 100,00 |

Formato prezzi: `€ 37,50` in italiano, `€37.50` in inglese.

## Testi della home

| Chiave | IT | EN |
|---|---|---|
| Eyebrow | Abruzzo · Spedizioni internazionali | Abruzzo · International delivery |
| Titolo | La pecora vola. / La tradizione resta. | The sheep flies. / Tradition stays. |
| Sottotitolo | Arrosticini d'Abruzzo, direzione mondo. | Arrosticini from Abruzzo, heading worldwide. |
| CTA | Scegli i tuoi arrosticini | Choose your arrosticini |
| Value prop 1 | Dall'Abruzzo · Terra di arrosticini | From Abruzzo · The home of arrosticini |
| Value prop 2 | Spedizione refrigerata · Per un gusto autentico | Refrigerated delivery · For an authentic taste |
| Value prop 3 | Destinazione: mondo · La nostra tradizione viaggia lontano | Destination: the world · Our tradition travels far |
| Sezione prodotti | Pronti a partire. E a finire sulla brace. | Ready to take off. And to end up on the grill. |
| Footer | Dall'Abruzzo, con la brace nel cuore. | From Abruzzo, with a love for the grill. |

## Motion

Solo queste animazioni, nient'altro:

- aggiunta al carrello e aggiornamento del contatore;
- aereo dell'hero (leggero ondeggiamento);
- pecore del pannello stress (passaggio tranquilla / overdrive / fantasma).

Hover e focus brevi (150-200 ms). Con `prefers-reduced-motion` tutto si ferma.

## Vincoli tecnici

- Implementazione: React, Tailwind CSS v4 con token come variabili CSS, componenti shadcn/ui, icone Lucide, animazioni con Motion.
- Font da Google Fonts.
- Responsive da 320 px a 1536 px.
- Contrasto WCAG AA, focus visibile, target touch di almeno 44 px.
- I testi inglesi hanno lunghezze diverse dagli italiani: i componenti devono reggere entrambi.
- Stati da progettare per ogni componente interattivo: normale, hover, focus, disabilitato, caricamento, errore.
