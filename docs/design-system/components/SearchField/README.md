# SearchField

A 48px input with `Search` on the left and a clear button on the right once there is text.

**You provide:** the query and a handler. Results filter the product grid below as the visitor types (debounced), with no submit button.

- Placeholder: "Cerca arrosticini, carbone, vino…" (EN: "Search arrosticini, charcoal, wine…").
- The clear button (`X`, `aria-label="Cancella ricerca"`) empties the field and returns focus to it.
- **Loading:** `aria-busy="true"` on the wrapper, `secondary` fill; the grid shows Skeleton cards.
- **No results:** the grid is replaced by EmptyState, which repeats the query and offers "Mostra tutti i prodotti".
- Full width of the content column under 700px; 480px at most above.
- Product list and admin tables only. It is not a site-wide search and does not live in the header.
