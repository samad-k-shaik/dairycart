<!-- issue-meta
title: [M4-06] Configure Ruff linting and formatting for the backend
labels: backend, testing
milestone: M4 – Testing and Quality
-->
# [M4-06] Configure Ruff linting and formatting for the backend

**Milestone:** M4 – Testing and Quality · **Priority:** Medium · **Estimated effort:** 1–2 hours

## 1. Objective
Add Ruff for linting and formatting and fix all reported issues (ADR-010).

## 2. Background
Consistent style reduces review noise; linters catch real bugs (unused variables, bad imports).

## 3. Learning objectives
- Linters vs formatters
- `pyproject.toml` tool configuration

## 4. Prerequisites
- M3 complete

## 5. Tasks
- [ ] Add `backend/pyproject.toml` with Ruff config (line length 100, rules E, F, I, B, UP)
- [ ] Run `ruff check --fix` and `ruff format`
- [ ] Document commands in the backend README

## 6. Technical guidance
Put pure formatting changes in their own commit so reviewers can skip it.

## 7. Acceptance criteria
- [ ] `ruff check .` and `ruff format --check .` report zero issues

## 8. Testing requirements
- Paste command output

## 9. Expected deliverables
- `pyproject.toml`, formatted code

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Name one real bug a linter can catch
