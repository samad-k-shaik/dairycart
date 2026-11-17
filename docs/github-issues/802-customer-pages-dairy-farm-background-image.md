<!-- issue-meta
title: Customer pages: dairy-farm background image
labels: 
milestone: M8 – Ordering, Subscriptions and Delivery Operations
-->
# Customer pages: dairy-farm background image

**GitHub issue:** #93 · **Milestone:** M8 – Ordering, Subscriptions and Delivery Operations

## Objective
Give the customer pages a dairy-farm background picture: a barn aisle with black-and-white cows eating hay.

## Scope
- Customer pages only (everything inside `CustomerLayout`: Home, product details, cart, checkout, My orders, account, login and sign-up). Admin pages do not change.
- Use a **free-to-use** photo: "Cows feeding in a long barn aisle" by Ahmad Nasihin on Unsplash (Unsplash License): https://unsplash.com/photos/cows-feeding-in-a-long-barn-aisle-um6edL4FaW4
- Do not use the Adobe Stock preview first suggested. It has no licence.

## Acceptance criteria
- [ ] The picture stays fixed behind every customer page, with a light overlay so text and cards still meet WCAG AA contrast
- [ ] The image is optimised (WebP, about 250 KB or less) and stored in `frontend/public/images/backgrounds/`
- [ ] Works at 360px phone width and on desktop, with no horizontal scroll
- [ ] Admin pages are unchanged
- [ ] The design system doc records the background and the photo credit and licence

## Testing
- `npm run typecheck`, `npm run build`, `npm test`
- Browser check at 360px and 1280px (screenshots)
