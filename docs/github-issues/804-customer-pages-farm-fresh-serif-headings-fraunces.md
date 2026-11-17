<!-- issue-meta
title: Customer pages: farm-fresh serif headings (Fraunces)
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Customer pages: farm-fresh serif headings (Fraunces)

**GitHub issue:** #95 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective
Give the customer shop a warmer, "farm-fresh" typography that matches the serif names on the new product pictures (#94).

## Scope
- Headings (page titles, section titles, product names), prices and the DairyCart logo text on **customer pages only** use **Fraunces**: a soft, warm variable serif under the SIL Open Font License, self-hosted via `@fontsource-variable/fraunces` (same approach as Manrope, so no Google Fonts call).
- Body text, buttons, forms and labels stay **Manrope** for readability.
- Admin pages are unchanged.

## Acceptance criteria
- [ ] Fraunces is used for h1–h3, prices and the logo inside `CustomerLayout`; Manrope everywhere else
- [ ] The font is self-hosted (no external font request) and has a serif fallback
- [ ] Sizes and line heights follow the existing type scale; no overflow at 360px
- [ ] Admin pages are unchanged
- [ ] The design system doc's Typography section is updated

## Testing
- `npm run typecheck`, `npm run build`, `npm test`
- Browser check at 360px and 1280px: computed font families, no horizontal scroll, admin still Manrope
