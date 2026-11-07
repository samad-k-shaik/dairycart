<!-- issue-meta
title: [M5-08] Tag the first release after Docker and CI
labels: devops, documentation
milestone: M5 – Docker and CI
-->
# [M5-08] Tag the first release after Docker and CI

**Milestone:** M5 – Docker and CI · **Priority:** Medium · **Estimated effort:** 1 hour

## 1. Objective
Merge `develop` into `main` through a release PR and tag `v0.5.0`.

## 2. Background
Practises the release flow before production deployments in M6.

## 3. Learning objectives
- Release PRs, tags and changelogs

## 4. Prerequisites
- M5-01 to M5-07 done

## 5. Tasks
- [ ] Open release PR `develop → main` titled `release: v0.5.0 – Docker and CI`
- [ ] Write a short changelog in the PR
- [ ] Merge with a merge commit; tag `v0.5.0`; create a GitHub Release

## 6. Technical guidance
See "Releases" in `git-workflow.md`.

## 7. Acceptance criteria
- [ ] Tag and GitHub Release exist

## 8. Testing requirements
- CI green on `main`

## 9. Expected deliverables
- Release v0.5.0

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- Why use a merge commit for releases but squash for features?
