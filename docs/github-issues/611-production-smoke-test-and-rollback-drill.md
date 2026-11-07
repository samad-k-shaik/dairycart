<!-- issue-meta
title: [M6-11] Production smoke test and rollback drill
labels: devops, testing
milestone: M6 – GCP Deployment
-->
# [M6-11] Production smoke test and rollback drill

**Milestone:** M6 – GCP Deployment · **Priority:** Medium · **Estimated effort:** 1–2 hours

## 1. Objective
Run the smoke checklist on production and practise rolling back to the previous revision.

## 2. Background
Practising rollback when nothing is broken makes it easy when something is.

## 3. Learning objectives
- Cloud Run revisions and traffic splitting

## 4. Prerequisites
- M6-09 done

## 5. Tasks
- [ ] Run the smoke checklist on production
- [ ] Deploy a trivial change, roll back to the previous revision, then roll forward
- [ ] Record times and steps

## 6. Technical guidance
Announce the drill to the team first.

## 7. Acceptance criteria
- [ ] Rollback completed and documented

## 8. Testing requirements
- Smoke results before and after rollback

## 9. Expected deliverables
- Notes in `docs/08-devops/deployment-guide.md`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- How long did the rollback take?
