# ProductCard

Image, name, pieces, price, quantity, "Aggiungi". Two layouts: stacked for the product list, row for the home.

**You provide:** the product (localized name, pieces or nothing, price in cents, image, slug).

- **The image box is fixed:** 4:3 stacked, 6:5 in the row card, `object-fit: cover`, 6px corners, 10px inset from the card edge. The image never sets the size of the card.
- No image yet: the box stays, in `secondary`, with `ImagePlus`. Loading: the Skeleton card with the same box.
- Name is a link to the product page; the image links there too but is hidden from the keyboard, so the card has one stop for the page and then the controls.
- Pieces line ("75 arrosticini", EN "75 arrosticini"): only for products that have a count. When absent the line keeps its height so prices align across a row.
- Actions sit at the bottom of the card whatever the name length: stepper on the left, button taking the rest. In the row card they stack.
- After an add: the button shows "Aggiunto" for 1.2s, the stepper returns to 1, the header count bumps. If the add fails, show an error Alert above the grid; the card does not carry errors.
- Hover darkens the card edge to `input`. No lift, no shadow, no image zoom.
- Grid: 1 column under 700px, 2 from 700px, 4 from 1000px, 24px gap. Home: 3 row cards from 1000px, stacked cards below.
- Long English names ("Sheep for DIY arrosticini") wrap to two lines. Never truncate a product name.
