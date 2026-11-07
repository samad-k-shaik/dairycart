<!-- issue-meta
title: [M6-03] Provision Cloud SQL for PostgreSQL
labels: devops, database
milestone: M6 – GCP Deployment
-->
# [M6-03] Provision Cloud SQL for PostgreSQL

**Milestone:** M6 – GCP Deployment · **Priority:** High · **Estimated effort:** 1–2 hours

## 1. Objective
Create the smallest suitable Cloud SQL PostgreSQL 16 instance, a database and an application user.

## 2. Background
Managed PostgreSQL handles backups and patching. It is the main cost of the POC.

## 3. Learning objectives
- Managed databases, tiers and backups
- Private vs public IP and the Cloud SQL connector

## 4. Prerequisites
- M6-01 done

## 5. Tasks
- [ ] Create instance (shared-core tier, `asia-south1`, automated backups on)
- [ ] Create database `milk_delivery` and user `milk_app` with a strong generated password
- [ ] Do not add authorised networks (`0.0.0.0/0` is forbidden)
- [ ] Document how to stop/start the instance to save cost

## 6. Technical guidance
Store the password directly in Secret Manager (M6-04); do not paste it into chats, issues or files.

## 7. Acceptance criteria
- [ ] Instance running; no public authorised networks
- [ ] Cost-saving instructions documented

## 8. Testing requirements
- Connect once via Cloud SQL Auth Proxy and run `SELECT 1`

## 9. Expected deliverables
- Docs update

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Why is opening the database to 0.0.0.0/0 dangerous?
