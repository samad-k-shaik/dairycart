<!-- issue-meta
title: [M2-05] Build the ProductCard component and customer home page
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-05] Build the ProductCard component and customer home page

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 3–5 hours

## 1. Objective
Build the customer home page with a hero banner, Cow/Buffalo category chips and a responsive grid of `ProductCard`s loaded from the mock product service.

## 2. Background
The home page is the first impression and implements FR-C1. `ProductCard` is reused across the app.

## 3. Learning objectives
- Component props and composition
- TanStack Query `useQuery` for loading/error states
- Responsive grid with Tailwind breakpoints

## 4. Prerequisites
- M2-03 and M2-04 merged

## 5. Tasks
- [ ] Set up `QueryClientProvider` in `main.tsx`
- [ ] Create `useProducts()` hook in `src/hooks/`
- [ ] Build `ProductCard`: image, name, size, price, round `+` add button
- [ ] Build hero banner and category chips (filter Cow / Buffalo / All)
- [ ] Grid of 2 / 3 / 4 columns at base / md / lg
- [ ] Add product images in `public/images/products/` with an image sources note

## 6. Technical guidance
Follow the design system (rounded-2xl cards, subtle shadow). Use only images you own or that are licensed for reuse. The `+` button can be wired to the cart in M2-07.

## 7. Acceptance criteria
- [ ] Only available products are shown
- [ ] Category chips filter the grid
- [ ] Clicking a card opens `/products/:id`
- [ ] Layout matches the approved design direction on mobile and desktop

## 8. Testing requirements
- Screenshots at 360 px, 768 px, 1280 px
- Check keyboard focus moves through cards and buttons

## 9. Expected deliverables
- `ProductCard`, `useProducts`, `HomePage`, images

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Where do loading and error states come from in `useQuery`?
