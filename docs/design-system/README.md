## What this is

The system for Arrosticini 24ore, an online shop that ships arrosticini (sheep skewers from Abruzzo) worldwide. It has to look like a real shop run by people with taste: cream paper, ink-and-watercolour illustration, ember red, forest green, a touch of the Italian flag, and a dry sense of humour.

Build every page from the components here. If a page needs something that is not here, add it to the system first, then use it.

## Voice

- Italian first, English second. Routes are `/it` and `/en`. Currency is always EUR.
- Short sentences that end with a full stop: "La pecora vola. La tradizione resta." Sentence case everywhere. No exclamation marks, no emoji.
- Dry irony, about the sheep and the trip, never about the customer: "Altro che pecora al pascolo.", "Pronti a partire. E a finire sulla brace."
- Address the visitor as "tu" in Italian and "you" in English. The shop is "noi" / "we".
- Buttons start with a verb: "Aggiungi", "Scegli i tuoi arrosticini", "Vai al pagamento".
- Errors drop the irony. Say what happened, then what to do: "Il pagamento non è andato a buon fine. Nessun addebito. Riprova o usa un'altra carta."
- English runs longer and shorter in different places ("Spedizioni nel mondo" / "Worldwide delivery", "Aggiungi" / "Add to cart"). Let labels grow and titles wrap; never truncate, never shrink type to fit.
- Prices: `€ 37,50` in Italian, `€37.50` in English, always two decimals.
- **Text never lives inside an image.** Titles, notes and labels are live text set over or beside the illustration.

## Colour

- The page is `background` with the `paper-noise` texture. Raised things (cards, inputs, summary) are `card`. Quiet fills are `secondary`.
- Text is `foreground`; secondary text is `muted-foreground`.
- `primary` (ember red) means "act" and "price": primary buttons, prices, the active nav underline, brush underlines. `primary-foreground` on top of it.
- `forest` means "place and promise": eyebrows, value-prop titles, the second half of a two-tone title, paid and active badges, success, the focus `ring`.
- Two-tone titles are red then green, in that order, and only on the hero and page titles.
- `border` is decoration only (card outlines, dividers). Anything a person must find to operate, an input, a stepper, a secondary button, uses `input` for its edge.
- Errors use `destructive` (the same red as `primary`) on `destructive-soft`, always with `CircleAlert` and a message. Success uses `forest` on `success-soft` with `CircleCheck`.
- Order states are told apart by lightness, not hue: pending is pale (`warning-soft`), paid is dark (`forest`), cancelled is hollow.
- The tricolour appears once per screen at most, as the brush stroke that closes the logo: `forest`, `card`, `primary`.
- There is one theme. No dark mode.

## Type

- **Roboto Serif at 75% width** for titles, the wordmark, prices and button labels: weight 900 for titles, 700 for prices, 600 for the rest. Set the width with `font-stretch: 75%` and `font-variation-settings: "wdth" 75`; without it the face is the wrong shape.
- **DM Sans** for everything else: 400 body, 500 nav, 600 labels, 700 eyebrows and table headers.
- **Caveat 600** for the handwritten aside, once per screen at most.
- Titles are tight: negative tracking (`hero-title` -4px, `page-title` -2px, `section-title` -1.5px) and line height near 1.
- `hero-title` sits in light 3D perspective (`rotateY(7deg) rotateZ(-1deg)`) with a `background`-coloured outline where it crosses the landscape. Only the hero does this.
- One `page-title` per page. Sections use `section-title` with the brush underline. Card names use `card-title`.
- Body text is never under 16px in inputs and never under 13px anywhere except table headers and tile metadata (12px).
- Figures in prices, tables, counters and the stress panel are tabular.

## Layout

- Content is `content-max` (1536px) wide at most, centred, with `gutter` (32px) at the sides, `gutter-sm` (18px) under 700px.
- Two breakpoints: `bp-sm` 700px and `bp-lg` 1000px. Design from 320px up.
- Spacing comes from the `space-*` scale (4px steps, the same as Tailwind's). Sections are `space-16` apart, `space-12` under 700px.
- Product list: 1, 2, then 4 columns, `grid-gap` between. Home: three row cards from 1000px.
- Forms are one column up to 420px wide for login and registration, two columns from 700px for addresses and admin.
- Cart and checkout: list on the left, OrderSummary 360px on the right from 1000px, stacked below.
- The hero is `clamp(440px, 34vw, 540px)` tall: landscape on the right fading at its edges, airplane at 55% of the width top right, title over it on the left.

## Shape

- Corners: `radius-md` (6px) for controls and images, `radius-lg` (10px) for cards, `radius-sm` (4px) for badges. Nothing is a pill.
- Cards are outlined with a 1px `border`, not lifted. The only resting shadow is `shadow-cta` under the call to action; `shadow-pop` is for menus.
- Controls are `control-h` (44px) tall, which is also the minimum touch target. The call to action is `control-h-lg` (62px).
- The double rule (two 1px `rule` lines, 5px apart) opens and closes a band. Single hairlines divide rows.
- Brush underlines go under section titles only.

## Imagery

- Illustration is ink line with watercolour wash on cream. Product pictures sit on a cream ground so they merge with `card`.
- Every image box has a fixed ratio and `object-fit: cover`: 4:3 for product cards, thumbnails and table cells, 6:5 for the home row card. The picture never decides the size of its box.
- Decorations from the home mock, the red-and-white checked tablecloth in a corner and the olive branch, are corner pieces for the home and editorial pages. One of each per page at most, never behind text, never in the shop flow (cart, checkout, account, admin).
- Illustrations are decorative: `alt=""`. Product images take the product name as `alt` only where no visible name sits next to them.

## Icons

- Lucide, 20px, 2px stroke, `currentColor`. 16px inside text buttons and badges, 24px in the call to action.
- In use: `Globe`, `ShoppingCart`, `User`, `ChevronDown`, `Plus`, `Minus`, `Trash2`, `ArrowRight`, `Search`, `Settings`, `MapPin`, `CreditCard`, `KeyRound`, `Package`, `LogOut`, `ImagePlus`, `Pencil`, `Archive`, `Cpu`, `Server`, plus `Check`, `CircleCheck`, `CircleAlert` and `X` for feedback.
- An icon alone is always inside a 44px button with an `aria-label`. Icons next to a label are hidden from assistive technology.
- Icons are never coloured for decoration and never replace the illustrations.

## Motion

Three things move, and nothing else:

1. **Add to cart:** the button turns `forest` and reads "Aggiunto" for 1.2s; the header count bumps once (`a24-bump`, `duration-cart`).
2. **The hero airplane** sways slowly (`a24-sway`, `duration-sway`, ease-in-out).
3. **Stress-panel sheep** cross-fade between calm, overdrive and ghost (`duration-base`); the overdrive sheep jitters (`a24-jitter`).

Hover and focus changes take `duration-fast` to `duration-base` with `ease-out`. No page transitions, no scroll reveals, no shimmer, no spinners: loading is a Skeleton or a changed button label. Under `prefers-reduced-motion: reduce` everything stops, including hover transitions.

## States and access

- Every interactive component defines rest, hover, focus, disabled, loading and error where an error can occur. Use the state the component README names; do not improvise one.
- Focus is a 3px solid `ring`, offset 2px, on everything focusable. Never remove it.
- Text meets 4.5:1 on the ground its token note names; control edges, icons and the ring meet 3:1.
- State is never carried by colour alone: errors add an icon and a message, badges add a word, sheep tiles add a bar, a number and an edge style.
- Loading containers set `aria-busy="true"`. Success alerts are `role="status"`, errors `role="alert"`.

## In code

- Tokens are CSS variables with shadcn/ui names (`--background`, `--foreground`, `--card`, `--primary`, `--primary-foreground`, `--secondary`, `--muted-foreground`, `--border`, `--input`, `--ring`, `--destructive`), so they drop into a Tailwind v4 `@theme` block and shadcn components pick them up. Brand extras: `--forest`, `--rule`, `--rule-soft`, the `-soft` fills, `--ghost`.
- `space-N` equals Tailwind's `N` (4px base). Map `bp-sm` and `bp-lg` to custom breakpoints at 700px and 1000px.
- `components/bundle.css` is the reference implementation of every component as plain classes (`a24-*`). Read it for exact paddings and state rules, then express them as Tailwind utilities on shadcn primitives. The `.is-hover` and `.is-focus` classes exist only so the previews can show a state at rest.
- Animate with Motion using the three keyframes in `bundle.css` as the spec.
- Fonts in production come from Google Fonts: Roboto Serif with the `wdth` and `wght` axes, DM Sans, Caveat.
