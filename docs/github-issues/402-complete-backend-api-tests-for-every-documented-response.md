<!-- issue-meta
title: [M4-02] Complete backend API tests for every documented response
labels: backend, testing
milestone: M4 – Testing and Quality
-->
# [M4-02] Complete backend API tests for every documented response

**Milestone:** M4 – Testing and Quality · **Priority:** High · **Estimated effort:** 3–5 hours

## 1. Objective
Test every endpoint for its success response and each documented error code and shape.

## 2. Background
The API contract is a promise to the frontend; API tests keep that promise.

## 3. Learning objectives
- Contract testing
- Testing response shapes, headers and status codes

## 4. Prerequisites
- M4-01 merged

## 5. Tasks
- [ ] One test file per router in `backend/tests/api/`
- [ ] Assert status code, `error.code` and key fields for each documented case
- [ ] Assert `X-Request-ID` header is present

## 6. Technical guidance
Compare against `api-contracts.md`; if the contract is wrong, fix it in the same PR and explain.

## 7. Acceptance criteria
- [ ] Every row in each endpoint's status table is tested

## 8. Testing requirements
- `pytest tests/api -q` output

## 9. Expected deliverables
- API test files

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Which contract detail was easiest to get wrong?
