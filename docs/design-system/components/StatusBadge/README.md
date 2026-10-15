# StatusBadge

A 26px label for the state of an order, a product or an address.

**You provide:** the status. The label comes from the translations, never from the API value.

| Status | IT | EN | Look |
|---|---|---|---|
| pending | In attesa di pagamento | Awaiting payment | pale `warning-soft` fill, `warning` text |
| paid | Pagato | Paid | solid `forest` |
| cancelled | Annullato | Cancelled | hollow, `input` edge, `muted-foreground` text |
| draft | Bozza | Draft | hollow, dashed edge |
| active | Attivo | Active | solid `forest` |
| archived | Archiviato | Archived | `secondary` fill, `muted-foreground` text |
| default | Predefinito | Default | `secondary` fill, `border` edge |

- The three order states differ in lightness and fill (pale, dark, hollow), not in hue, so they hold without colour. The word is always there.
- Not interactive. No icons, no dots, no counters.
- Do not invent a status. If the API adds one, add a row here first.
