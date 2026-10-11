# Price

Roboto Serif 700 at 75% width, `primary`, tabular figures.

**You provide:** the amount in cents and the locale. Format with `Intl.NumberFormat`, never by hand.

- Italian: `€ 37,50`, symbol first, a space, comma decimals, dot thousands (`€ 1.800,00`).
- English: `€37.50`, no space, dot decimals, comma thousands (`€1,800.00`).
- Currency is always EUR, always with two decimals, even for round amounts.
- 30px on cards, the product page and totals; 20px (`a24-price--sm`) in cart rows and tables.
- `a24-price--plain` (`foreground`) for a unit price shown next to a line total, so only one red number leads each row.
- Never wraps. No crossed-out prices, no "da", no discounts: the catalogue has none.
