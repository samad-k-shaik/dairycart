# Image sources

Every image in this folder must be owned by the project, created by us, or licensed for reuse (see `docs/06-ui-ux/design-system.md` → Imagery). Record each file here.

| File | Source | Licence | Added in |
|---|---|---|---|
| `products/cow-milk.svg` | Original illustration drawn as SVG code for DairyCart | Project-owned | M2-05 (#24) |
| `products/buffalo-milk.svg` | Original illustration drawn as SVG code for DairyCart | Project-owned | M2-05 (#24) |

Notes:

- The design system asks for square WebP images ≤ 100 KB. These are square SVG vector illustrations (under 2 KB each), which stay sharp at any size; replace them with WebP photos later if real product photos become available.
- Which image belongs to which product is mapped in `src/lib/productDisplay.ts` (the API contract has no image field).
