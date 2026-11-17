<!-- issue-meta
title: Customer pages: brighter background, new milk bottle, paneer and ghee images
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Customer pages: brighter background, new milk bottle, paneer and ghee images

**GitHub issue:** #94 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective
Follow-up to #93: make the customer background brighter, and give products better pictures.

## Scope
1. **Brighter background.** Thin the white layer over the dairy-barn photo from 85% to about 35%. Text that sits directly on the photo (page titles and subtitles, product details, the "Our milk" row) gets a frosted white panel so it stays readable.
2. **New milk bottle pictures.** Original DairyCart illustrations (SVG) in a glass-bottle style: white milk, dark-green label, olive background, labelled "Cow Milk" / "Buffalo Milk" with a cow or buffalo outline. No brand names, and no copying of any brand's product photo.
3. **Paneer and ghee pictures.** Free-licence photos (Unsplash or Pexels). The products named "Paneer"/"Panner" and "Ghee" show them instead of the milk-bottle fallback.

## Acceptance criteria
- [ ] The background is clearly visible, and text and cards still meet WCAG AA contrast (4.5:1)
- [ ] The new bottle images are used on the cards and the details page for Cow and Buffalo milk
- [ ] Paneer and Ghee have their own images and descriptions
- [ ] Every new image is recorded in `frontend/public/images/README.md` with its source and licence
- [ ] Works at 360px and 1280px; admin pages unchanged

## Testing
- `npm run typecheck`, `npm run build`, `npm test` (productDisplay tests for the new names)
- Browser check at 360px and 1280px
