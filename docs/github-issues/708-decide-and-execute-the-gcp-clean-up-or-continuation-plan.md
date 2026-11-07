<!-- issue-meta
title: [M7-08] Decide and execute the GCP clean-up or continuation plan
labels: devops
milestone: M7 – Final Demonstration
-->
# [M7-08] Decide and execute the GCP clean-up or continuation plan

**Milestone:** M7 – Final Demonstration · **Priority:** High · **Estimated effort:** 1 hour

## 1. Objective
Decide whether to keep the hosted POC running, pause it, or delete all GCP resources, and do it.

## 2. Background
Idle cloud resources (especially Cloud SQL) cost money.

## 3. Learning objectives
- Cloud cost management and resource clean-up

## 4. Prerequisites
- M7-04 done

## 5. Tasks
- [ ] Agree the decision with the project lead
- [ ] If deleting, export a database backup first, then delete Cloud Run services, Cloud SQL, Artifact Registry repo, secrets, service accounts and the WIF pool
- [ ] If continuing, stop Cloud SQL when idle and keep the budget alert
- [ ] Record the decision in `infrastructure/gcp/README.md`

## 6. Technical guidance
Deleting is irreversible; double-check the project id before running any delete command.

## 7. Acceptance criteria
- [ ] Decision executed and documented; billing shows no unexpected charges

## 8. Testing requirements
- `gcloud` listing shows the expected remaining resources

## 9. Expected deliverables
- Updated GCP README

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Which resource cost the most during the project?
