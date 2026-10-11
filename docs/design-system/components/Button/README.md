# Button

Four kinds: primary, secondary, text, icon. Plus one large call to action.

**You provide:** the label (a verb first: "Aggiungi", "Vai al pagamento", "Salva indirizzo"), an optional Lucide icon, and the state.

- **Primary** (`a24-btn--primary`): one per card, one per form, one per summary. If two actions compete, the second is secondary.
- **Secondary** (`a24-btn--secondary`): the way back or the alternative ("Continua lo shopping", "Annulla").
- **Text** (`a24-btn--text`): inline actions inside a card ("Modifica", "Rimuovi", "Imposta come predefinito").
- **Icon** (`a24-btn--icon`): 44px square, always with an `aria-label`. Used for remove, edit, archive, clear search.
- **Call to action** (`a24-btn--lg`): 62px, `shadow-cta`, lifts 3px on hover. Home hero and 404 only, once per screen.
- Icons sit before the label; `ArrowRight` is the one exception and sits after.
- **Loading:** set `aria-busy="true"` and change the label ("Aggiungo…"). No spinner: the product has three animations and this is not one of them.
- **Added:** after a successful add the button turns `forest` with `Check` and "Aggiunto" for 1.2s, then returns.
- **Disabled:** `secondary` fill, `muted-foreground` label. Buttons have no error state; the error belongs to the field or to an Alert.
- English labels are longer ("Add to cart", "Go to payment"): buttons grow with the label and never truncate. In cards the button takes the remaining width.
