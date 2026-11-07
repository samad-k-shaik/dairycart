<!-- issue-meta
title: [M5-07] Enable required status checks on main and develop
labels: devops, security
milestone: M5 – Docker and CI
-->
# [M5-07] Enable required status checks on main and develop

**Milestone:** M5 – Docker and CI · **Priority:** High · **Estimated effort:** 30 minutes

## 1. Objective
Require the CI jobs to pass before any PR can merge into `main` or `develop`.

## 2. Background
Now that CI exists and has passed, making it required stops broken code from merging (git-workflow doc).

## 3. Learning objectives
- Branch protection / rulesets

## 4. Prerequisites
- M5-06 merged and CI green at least once

## 5. Tasks
- [ ] Settings → Branches (or Rules): add required checks `backend`, `frontend`, `docker-build` for `main` and `develop`
- [ ] Require branches to be up to date before merging
- [ ] Update the protection table in `git-workflow.md`

## 6. Technical guidance
Check names must match job names exactly, or every PR will be stuck waiting.

## 7. Acceptance criteria
- [ ] A PR with a failing check cannot be merged

## 8. Testing requirements
- Open a test PR with a failing test; screenshot the blocked merge; close it

## 9. Expected deliverables
- Updated settings and docs

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- What happens if a required check name is misspelled?
