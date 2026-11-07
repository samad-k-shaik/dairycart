<!-- issue-meta
title: [M6-05] Create service accounts with least-privilege IAM
labels: devops, security
milestone: M6 – GCP Deployment
-->
# [M6-05] Create service accounts with least-privilege IAM

**Milestone:** M6 – GCP Deployment · **Priority:** High · **Estimated effort:** 1 hour

## 1. Objective
Create one runtime service account for the backend and one deployer account for GitHub Actions, each with only the roles they need.

## 2. Background
Least privilege limits damage if credentials are misused.

## 3. Learning objectives
- Service accounts and IAM roles
- Principle of least privilege

## 4. Prerequisites
- M6-01 done

## 5. Tasks
- [ ] `milk-backend-run`: Cloud SQL Client, Secret Manager Secret Accessor (on the one secret)
- [ ] `github-deployer`: Cloud Run Admin, Artifact Registry Writer, Service Account User (on `milk-backend-run` only)
- [ ] Document roles and reasons

## 6. Technical guidance
Never create or download JSON keys for these accounts.

## 7. Acceptance criteria
- [ ] Accounts and roles exist exactly as documented

## 8. Testing requirements
- `gcloud projects get-iam-policy` excerpt in the issue

## 9. Expected deliverables
- IAM table in `infrastructure/gcp/README.md`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Why can't the backend account deploy services?
