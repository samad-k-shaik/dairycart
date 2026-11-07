<!-- issue-meta
title: [M3-06] Implement order status transition rules
labels: backend
milestone: M3 – Order Management
-->
# [M3-06] Implement order status transition rules

**Milestone:** M3 – Order Management · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Implement the order status state machine in the service layer so only allowed transitions succeed.

## 2. Background
Enforces the lifecycle in `functional-requirements.md`. The frontend restriction is not enough on its own.

## 3. Learning objectives
- State machines
- Row locking with `SELECT ... FOR UPDATE`

## 4. Prerequisites
- M3-02 merged

## 5. Tasks
- [ ] `ALLOWED_TRANSITIONS` dict in `order_service.py`
- [ ] `update_status(order_id, new_status)` locking the row, validating, saving
- [ ] Raise `InvalidStatusTransitionError` with a helpful message (from → to)

## 6. Technical guidance
This function is the single place future notifications (WhatsApp, SMS) would hook in, so keep it clean.

## 7. Acceptance criteria
- [ ] All 6 allowed transitions succeed; every other pair fails with 409

## 8. Testing requirements
- Parametrised test over all 25 from/to pairs

## 9. Expected deliverables
- Service function and tests

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Why lock the row before updating?
