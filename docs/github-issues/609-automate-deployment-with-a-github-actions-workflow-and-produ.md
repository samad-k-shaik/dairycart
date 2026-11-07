<!-- issue-meta
title: [M6-09] Automate deployment with a GitHub Actions workflow and production approval
labels: devops, security
milestone: M6 – GCP Deployment
-->
# [M6-09] Automate deployment with a GitHub Actions workflow and production approval

**Milestone:** M6 – GCP Deployment · **Priority:** High · **Estimated effort:** 3–4 hours

## 1. Objective
Create `deploy.yml` that builds, pushes and deploys both services from `main`, gated by manual approval in a `production` environment.

## 2. Background
Automated, approved deployments are repeatable and auditable.

## 3. Learning objectives
- GitHub Environments and required reviewers
- Job dependencies and image tags by SHA

## 4. Prerequisites
- M6-06 to M6-08 done

## 5. Tasks
- [ ] Create environment `production` with required reviewers (project lead)
- [ ] `deploy.yml` on push to `main` and `workflow_dispatch`: auth (WIF) → build & push images tagged `${{ github.sha }}` → run migration job → deploy backend → deploy frontend → curl health
- [ ] Document rollback (`gcloud run services update-traffic --to-revisions`)

## 6. Technical guidance
Use `concurrency` so two deploys never run at once.

## 7. Acceptance criteria
- [ ] A merge to `main` waits for approval, then deploys successfully

## 8. Testing requirements
- Link to an approved, successful deployment run

## 9. Expected deliverables
- `deploy.yml`, updated CI/CD docs

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Walk through what happens between merge and live site
