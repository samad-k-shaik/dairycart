<!-- issue-meta
title: [M6-06] Configure Workload Identity Federation for GitHub Actions
labels: devops, security
milestone: M6 – GCP Deployment
-->
# [M6-06] Configure Workload Identity Federation for GitHub Actions

**Milestone:** M6 – GCP Deployment · **Priority:** High · **Estimated effort:** 1–2 hours

## 1. Objective
Let GitHub Actions authenticate to GCP as `github-deployer` without any stored keys, trusting only this repository.

## 2. Background
Keyless authentication removes the risk of leaked JSON keys.

## 3. Learning objectives
- OIDC tokens and federation
- Attribute conditions to restrict trust

## 4. Prerequisites
- M6-05 done

## 5. Tasks
- [ ] Create a workload identity pool and GitHub provider
- [ ] Restrict with an attribute condition on `assertion.repository == 'samad-k-shaik/dairycart'`
- [ ] Grant `roles/iam.workloadIdentityUser` to the pool principal on `github-deployer`
- [ ] Save provider and service account names as GitHub repository variables

## 6. Technical guidance
Follow the `google-github-actions/auth` README. Variables, not secrets, are fine here because they are not credentials.

## 7. Acceptance criteria
- [ ] A test workflow can run `gcloud auth list` successfully

## 8. Testing requirements
- Link to the successful test run

## 9. Expected deliverables
- Repo variables, docs

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- What stops another repository from using our pool?
