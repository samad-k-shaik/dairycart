<!-- issue-meta
title: [M6-10] Configure Cloud Logging, error alerting and basic monitoring
labels: devops
milestone: M6 – GCP Deployment
-->
# [M6-10] Configure Cloud Logging, error alerting and basic monitoring

**Milestone:** M6 – GCP Deployment · **Priority:** Medium · **Estimated effort:** 2 hours

## 1. Objective
Confirm structured logs appear in Cloud Logging, create a log-based alert for 5xx errors and save useful log queries.

## 2. Background
Production monitoring tells us about problems before users do (NFR-13).

## 3. Learning objectives
- Cloud Logging queries
- Log-based metrics and alerting policies

## 4. Prerequisites
- M6-07 done

## 5. Tasks
- [ ] Verify JSON fields (request_id, status_code, duration_ms) are parsed in Logs Explorer
- [ ] Save queries for errors and slow requests (> 500 ms)
- [ ] Create an alert for 5xx responses emailing the project lead
- [ ] Document how to trace a request by `request_id`

## 6. Technical guidance
Trigger a test 500 safely (e.g. temporarily stop Cloud SQL) to prove the alert works, then restore.

## 7. Acceptance criteria
- [ ] Saved queries and alert exist; test alert received

## 8. Testing requirements
- Screenshot of the alert email and log query

## 9. Expected deliverables
- `docs/08-devops/monitoring.md`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Find a specific request in the logs using its request ID
