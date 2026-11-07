<!-- issue-meta
title: [M4-08] Measure and enforce backend test coverage
labels: backend, testing
milestone: M4 – Testing and Quality
-->
# [M4-08] Measure and enforce backend test coverage

**Milestone:** M4 – Testing and Quality · **Priority:** Medium · **Estimated effort:** 1 hour

## 1. Objective
Measure coverage with `pytest-cov` and enforce at least 70 % on the backend service layer (NFR-12).

## 2. Background
Coverage shows untested code; it is a guide, not a goal in itself.

## 3. Learning objectives
- Line vs branch coverage
- Why 100 % coverage does not mean bug-free

## 4. Prerequisites
- M4-01 to M4-03 merged

## 5. Tasks
- [ ] Configure coverage in `pyproject.toml` (`--cov=app --cov-branch`)
- [ ] Set `fail_under = 70` for `app/services`
- [ ] Add tests for any service gaps

## 6. Technical guidance
Do not write tests that only execute lines without asserting behaviour.

## 7. Acceptance criteria
- [ ] Coverage report generated; services ≥ 70 %

## 8. Testing requirements
- Paste the coverage summary

## 9. Expected deliverables
- Coverage config

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Show an uncovered line and explain whether it needs a test
