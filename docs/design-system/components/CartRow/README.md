# CartRow

One line of the cart: thumbnail, name, unit price, stepper, line total, remove.

**You provide:** the line (product, quantity, unit price) and handlers for quantity and removal.

- Thumbnail is 96px wide, fixed 4:3 (72px in narrow columns).
- Unit price sits under the name in `muted-foreground` ("€ 37,50 l'uno", EN "€37.50 each"); the line total is the one `primary` number, right aligned.
- Remove is an icon button (`Trash2`) labelled with the product name ("Rimuovi Carbone"). It removes at once, no confirmation; an Alert offers "Annulla".
- **Updating:** `aria-busy="true"` fades the row to 60% until the server answers. The total updates only then.
- Rows are separated by one `border` hairline. No card around each row.
- Read-only variant for order detail and checkout summary: same row without stepper and remove, quantity as "× 2" after the name.
- Empty cart: replace the list with EmptyState.
