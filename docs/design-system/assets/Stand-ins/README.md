# Stand-ins

Low-resolution crops from the mocks, used only so the component previews are not empty boxes. Do not ship them. Replace each with the real file:

| Stand-in | Real file |
|---|---|
| `sheep-standin.webp` | `sheep.webp` (logo), `sheep_overdrive_off.webp` (calm tile, empty states), `sheep_overdrive_on.webp` (overdrive tile, 404, 500) |
| `town-standin.webp` | `town.webp` |
| `product-*-standin.webp` | the matching `p_*.webp` |

The box and globe of the value props are shown with Lucide `Package` and `Globe` until `box.webp` and `globe.webp` are added. The airplane and the landscape are not in the system yet.

The sheep and town crops are transparent and meant for `background` or `card` only.
