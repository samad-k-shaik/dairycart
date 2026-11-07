<!-- issue-meta
title: [M6-04] Store database credentials in Secret Manager
labels: devops, security
milestone: M6 – GCP Deployment
-->
# [M6-04] Store database credentials in Secret Manager

**Milestone:** M6 – GCP Deployment · **Priority:** High · **Estimated effort:** 30 minutes

## 1. Objective
Store the database password (or full `DATABASE_URL`) in Secret Manager for Cloud Run to read at runtime.

## 2. Background
Secrets in environment files or images can leak; Secret Manager controls and audits access.

## 3. Learning objectives
- Secret Manager secrets and versions
- Mounting secrets as environment variables in Cloud Run

## 4. Prerequisites
- M6-03 done

## 5. Tasks
- [ ] Create secret `database-url` (Cloud SQL socket URL format)
- [ ] Document the secret name (never the value)

## 6. Technical guidance
Socket URL format: `postgresql+psycopg://USER:PASS@/milk_delivery?host=/cloudsql/PROJECT:REGION:INSTANCE`

## 7. Acceptance criteria
- [ ] Secret exists; only the backend service account will be granted access

## 8. Testing requirements
- `gcloud secrets list` output (names only)

## 9. Expected deliverables
- Docs update

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- How do you rotate this secret?
