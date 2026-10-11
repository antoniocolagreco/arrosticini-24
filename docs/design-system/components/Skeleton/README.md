# Skeleton

Flat `skeleton` blocks in the shape of what is loading. Static: no shimmer, no pulse.

**You provide:** the same layout as the loaded component, with blocks in place of image, title, price and controls.

- Shapes: `a24-skel--media` (4:3), `--title` (22px), `--line` (14px), `--price` (30px), `--btn` (44px).
- Use the real container (the product card, the cart row grid, the table) so nothing moves when data arrives.
- Set `aria-busy="true"` on the container and keep the blocks out of the accessibility tree.
- Show as many as you expect: 8 cards on the product list, 3 rows in the cart, 6 in a table.
- Under 300ms of loading show nothing at all rather than a flash of skeleton.
- No skeleton for buttons that are waiting on an action; that is the button's loading state.
