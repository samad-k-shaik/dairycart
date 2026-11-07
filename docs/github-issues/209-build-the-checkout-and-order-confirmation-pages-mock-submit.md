<!-- issue-meta
title: [M2-09] Build the checkout and order confirmation pages (mock submit)
labels: frontend
milestone: M2 – Frontend Foundation
-->
# [M2-09] Build the checkout and order confirmation pages (mock submit)

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 3–5 hours

## 1. Objective
Build the checkout form (name, phone) with an order summary, submit it to the mock order service, and show the confirmation page.

## 2. Background
Implements FR-C5 and FR-C6 against mock data. M3 replaces the mock with `POST /api/v1/orders`.

## 3. Learning objectives
- Forms, controlled inputs and validation messages
- TanStack Query `useMutation`
- Navigating after a successful action

## 4. Prerequisites
- M2-08 merged

## 5. Tasks
- [ ] Build the checkout form with labelled inputs and inline errors (name 2–100 chars, phone `^[6-9]\d{9}$`)
- [ ] Build the order summary (items, quantities, estimated total)
- [ ] Submit only `{customer, items:[{product_id, quantity}]}` to the mock `createOrder`
- [ ] On success clear the cart and go to `/orders/:id/confirmation`
- [ ] Confirmation page: success icon, order id, items, total from the response, `PLACED` badge, buttons to view orders / continue shopping
- [ ] Disable the submit button while submitting

## 6. Technical guidance
The request must never include prices or totals. Payment is cash on delivery; do not add address, shipping or payment fields.

## 7. Acceptance criteria
- [ ] Invalid inputs show clear messages and block submission
- [ ] The request payload contains only product ids and quantities
- [ ] Confirmation shows the total returned by the service, not the cart estimate
- [ ] Cart is empty after success

## 8. Testing requirements
- Log the payload in dev tools and screenshot it in the PR
- Screenshots of form errors and confirmation

## 9. Expected deliverables
- `CheckoutPage`, `OrderConfirmationPage`, `useCreateOrder`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why does the request not include prices?
