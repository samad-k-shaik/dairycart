<!-- issue-meta
title: [M6-01] Create the GCP project, budget alert and enable required APIs
labels: devops
milestone: M6 – GCP Deployment
-->
# [M6-01] Create the GCP project, budget alert and enable required APIs

**Milestone:** M6 – GCP Deployment · **Priority:** High · **Estimated effort:** 1 hour

## 1. Objective
Prepare a dedicated GCP project with billing, a low budget alert and only the APIs we need.

## 2. Background
A separate project isolates costs and permissions. A budget alert prevents surprise bills.

## 3. Learning objectives
- GCP projects, billing accounts and budgets
- Enabling APIs with `gcloud`

## 4. Prerequisites
- M5 complete
- gcloud CLI installed and logged in

## 5. Tasks
- [ ] Create project (e.g. `milk-delivery-poc-<suffix>`)
- [ ] Link billing; create a budget alert (e.g. ₹1,000/month at 50 %, 90 %, 100 %)
- [ ] Enable Cloud Run, Cloud SQL Admin, Artifact Registry, Secret Manager, IAM Credentials, Cloud Logging APIs
- [ ] Record project id and region (`asia-south1`) in `infrastructure/gcp/README.md`

## 6. Technical guidance
Only the project lead creates billing-linked resources. Never commit service account keys.

## 7. Acceptance criteria
- [ ] Project, budget alert and APIs exist; details documented

## 8. Testing requirements
- `gcloud services list --enabled` output in the issue

## 9. Expected deliverables
- `infrastructure/gcp/README.md`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- What happens when the budget alert fires? (It alerts; it does not stop spending.)
