<!-- issue-meta
title: [M2-02] Configure Tailwind CSS, shadcn/ui and the Manrope design tokens
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-02] Configure Tailwind CSS, shadcn/ui and the Manrope design tokens

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Install Tailwind CSS and shadcn/ui, load Manrope, and map the colour, radius and shadow tokens from `docs/06-ui-ux/design-system.md`.

## 2. Background
A shared set of design tokens is what makes eight screens built by different people look like one product.

## 3. Learning objectives
- Utility-first CSS with Tailwind
- CSS variables as design tokens
- How shadcn/ui copies components into your codebase (not a dependency)
- Lucide React icons

## 4. Prerequisites
- M2-01 merged
- Read `docs/06-ui-ux/design-system.md`

## 5. Tasks
- [ ] Install and configure Tailwind CSS following the official Vite guide
- [ ] Initialise shadcn/ui; add `button`, `badge`, `input`, `label`, `card`, `table`, `sheet`, `sonner`
- [ ] Load Manrope (`@fontsource/manrope` or Google Fonts) as the default font
- [ ] Map tokens (`primary`, `background`, `surface`, `border`, `muted-foreground`, status colours) to CSS variables
- [ ] Install `lucide-react`
- [ ] Create a temporary `/design` page showing buttons, badges, inputs and typography

## 6. Technical guidance
Use the exact hex values from the design system. If you change a token, update the design system doc in the same PR.

## 7. Acceptance criteria
- [ ] Manrope renders everywhere
- [ ] Primary buttons use `#2563EB`; page background is `#F8FAFC`
- [ ] The `/design` page shows every token and core component

## 8. Testing requirements
- Screenshot of the `/design` page (mobile and desktop) in the PR
- `npm run build` succeeds

## 9. Expected deliverables
- Tailwind config, `src/index.css` tokens, shadcn components, `/design` page

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why do we use tokens instead of writing hex colours in components?
