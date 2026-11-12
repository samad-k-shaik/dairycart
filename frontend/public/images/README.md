# Image sources

Every image in this folder must be owned by the project, created by us, or licensed for reuse (see `docs/06-ui-ux/design-system.md` → Imagery). Record each file here.

| File | Source | Licence | Added in |
|---|---|---|---|
| `products/cow-milk.svg` | Original illustration drawn as SVG code for DairyCart (glass bottle, green label, cow outline; redrawn in #94) | Project-owned | M2-05 (#24), #94 |
| `products/buffalo-milk.svg` | Original illustration drawn as SVG code for DairyCart (glass bottle, blue label, buffalo outline; redrawn in #94) | Project-owned | M2-05 (#24), #94 |
| `products/paneer.svg` | Original illustration drawn as SVG code for DairyCart (paneer cubes on a plate) | Project-owned | #94 |
| `products/ghee.svg` | Original illustration drawn as SVG code for DairyCart (jar of ghee with a spoon) | Project-owned | #94 |
| `backgrounds/dairy-barn.webp` | "Cows feeding in a long barn aisle" by Ahmad Nasihin, https://unsplash.com/photos/cows-feeding-in-a-long-barn-aisle-um6edL4FaW4 (cropped to 1600×900, WebP) | [Unsplash License](https://unsplash.com/license) (free to use, no attribution required; credited anyway) | #93 |

Notes:

- The design system asks for square WebP images ≤ 100 KB. These are square SVG vector illustrations (under 6 KB each, with their own olive-green background, #94), which stay sharp at any size; replace them with WebP photos later if real product photos become available.
- Which image belongs to which product is mapped in `src/lib/productDisplay.ts` (the API contract has no image field). The lookup ignores upper/lower case; "Paneer" and "Panner" both get the paneer picture.
- Product pictures must not copy any brand's packaging or photos (#94: a brand's bottle photo was offered as a model; we drew our own in a similar style instead).
