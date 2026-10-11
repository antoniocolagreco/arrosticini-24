# QuantityStepper

Minus, value, plus. Three 44px cells in one outlined control.

**You provide:** the value, the minimum (1) and a change handler.

- Minus is disabled at 1. To take a product out of the cart there is the remove button on the row; the stepper never reaches 0.
- Buttons are labelled "Diminuisci" and "Aumenta"; the value is an `output` announced politely.
- **Updating** (cart only): `aria-busy="true"` greys the number until the server confirms. No spinner.
- On a card it sits left of "Aggiungi" and resets to 1 after an add.
- No upper limit in the interface. If the API refuses a quantity, show an Alert above the cart.
