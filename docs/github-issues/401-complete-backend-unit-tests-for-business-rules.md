<!-- issue-meta
title: [M4-01] Complete backend unit tests for business rules
labels: backend, testing
milestone: M4 – Testing and Quality
-->
# [M4-01] Complete backend unit tests for business rules

**Milestone:** M4 – Testing and Quality · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Ensure every business rule (BR-1 to BR-6 and status transitions) is covered by focused unit tests.

## 2. Background
Business rules are where bugs are most expensive. Tests document the rules as executable examples.

## 3. Learning objectives
- Unit vs integration tests
- Arrange / Act / Assert
- `pytest.mark.parametrize`

## 4. Prerequisites
- M3 complete
- Read `docs/07-testing/test-strategy.md`

## 5. Tasks
- [ ] Map each rule in the test strategy's must-have table to at least one test
- [ ] Add missing tests in `backend/tests/unit/`
- [ ] Name tests by behaviour (e.g. `test_total_uses_database_price`)

## 6. Technical guidance
A test should fail if the rule is broken. Temporarily break the code to prove it.

## 7. Acceptance criteria
- [ ] Every must-have case in the test strategy has a passing test
- [ ] Each test has been seen failing at least once

## 8. Testing requirements
- `pytest tests/unit -q` output in the PR

## 9. Expected deliverables
- Unit tests and a short coverage table in the PR description

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Show one test you made fail on purpose. What did it catch?
