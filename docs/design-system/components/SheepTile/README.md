# SheepTile

One sheep per container on the stress panel. Calm under 80% CPU, in overdrive from 80%, a ghost when it stops answering.

**You provide:** per container: CPU percentage (or no answer), version, availability zone, short id. Group tiles in two rows, Web and Api, each headed by `Server`.

| State | When | Look |
|---|---|---|
| calm | CPU under 80% | `sheep_overdrive_off.webp`, `card` tile, `forest` bar |
| overdrive | CPU 80% or more | `sheep_overdrive_on.webp`, 2px `destructive` edge, `destructive-soft` fill, red bar, the sheep jitters |
| ghost | no answer | grey sheep at 35%, dashed `ghost` edge, empty bar, "non risponde" |

- The label reads `version · zone` and the short id on a second line, at 12px with tabular figures.
- Changes between states cross-fade in `duration-base`. The jitter is one of the three animations in the product and stops under `prefers-reduced-motion`; the red edge and the number still say overdrive.
- State never rests on colour alone: the bar length, the percentage, the edge style and the sheep all change.
- A tile that appears (scale-out) or disappears (scale-in) does so without animation; the grid just reflows.
- Each tile has an accessible name ("Container c21f8a0: in overdrive, CPU 92%"). Do not announce every poll; announce state changes only.
- Tiles are 136px minimum and fill the row. Stress-panel only.
