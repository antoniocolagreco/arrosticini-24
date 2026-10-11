# OrderSummary

The card that totals an order and carries the one primary action of cart and checkout.

**You provide:** the lines (name, quantity, line total), the total, and the action for the page.

- Cart: "Vai al checkout". Checkout: "Vai al pagamento" with `CreditCard`, then "Pagamento sicuro su Stripe" underneath. Order detail: no button, a StatusBadge next to the title instead.
- The total is the only Price at 30px. Line totals are plain text, right aligned, tabular.
- **Loading** after the click: `aria-busy="true"` and "Ti porto su Stripe…" (EN "Redirecting to Stripe…"). The button stays put; the page does not change until Stripe opens.
- Checkout with no address chosen: the button is disabled and an inline hint under it says "Scegli un indirizzo di spedizione".
- Show only rows the order really has. No shipping, tax or discount row unless the API returns one.
- Sits to the right of the cart from 1000px (360px wide, sticky under the header); under the list below that.
