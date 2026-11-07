<!-- issue-meta
title: [M6-02] Create the Artifact Registry repository
labels: devops
milestone: M6 – GCP Deployment
-->
# [M6-02] Create the Artifact Registry repository

**Milestone:** M6 – GCP Deployment · **Priority:** High · **Estimated effort:** 30 minutes

## 1. Objective
Create a Docker repository `milk-delivery` in Artifact Registry for CI-built images.

## 2. Background
Cloud Run pulls images from Artifact Registry.

## 3. Learning objectives
- Container registries and image tags

## 4. Prerequisites
- M6-01 done

## 5. Tasks
- [ ] Create the repository in `asia-south1`
- [ ] Push a test backend image manually to confirm access
- [ ] Add commands to `infrastructure/gcp/README.md`

## 6. Technical guidance
Tag images with the Git SHA, never only `latest`.

## 7. Acceptance criteria
- [ ] Repository exists with one test image

## 8. Testing requirements
- `gcloud artifacts docker images list` output

## 9. Expected deliverables
- Docs update

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Why tag with the Git SHA?
