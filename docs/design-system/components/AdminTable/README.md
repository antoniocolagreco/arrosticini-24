# AdminTable

The table for admin products and admin orders: uppercase header on `secondary`, 60px rows on `card`.

**You provide:** columns and rows. Numbers and prices get the `num` class (right aligned, tabular).

- **Products:** image, name (IT with EN underneath), pezzi, prezzo, stato, actions (`Pencil` edit, `Archive` archive). A product without a count shows a dash in the cell.
- **Orders:** numero, data, cliente, totale, stato. The whole row links to the order detail; no action column.
- Row hover is a `background` fill. Rows are divided by one `border` hairline.
- Icon actions are 44px, labelled with the row's name ("Archivia Fornacella"). Archive asks nothing and shows an Alert with "Annulla".
- **Loading:** six rows of Skeleton lines in the same column widths. **Empty:** EmptyState inside the wrapper.
- Under 700px the wrapper scrolls sideways; the name column never shrinks under 180px. Do not turn rows into cards.
- The "Nuovo prodotto" button (`Plus`, primary) and the SearchField sit above the table, not inside it.
