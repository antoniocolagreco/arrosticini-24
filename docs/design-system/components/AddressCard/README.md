# AddressCard

A saved shipping address, in two modes: manage (account) and choose (checkout).

**You provide:** the address, whether it is the default, and the mode.

- **Manage:** text actions "Modifica" (`Pencil`), "Rimuovi" (`Trash2`) and, on the others, "Imposta come predefinito". The default carries the "Predefinito" badge and cannot be removed until another one is default.
- **Choose:** the whole card is a radio. Selected is a 2px `forest` edge; the default is preselected. No actions inside; "Usa un altro indirizzo" opens the form below the list.
- **Add tile:** dashed, with `Plus` and the count "2 di 5". At five it is disabled and says what to do. Five is the limit.
- Lines follow the destination country's order; the country is always the last line, in the page language.
- Cards in a row share the same height. One column under 700px, two from 700px, three from 1000px.
