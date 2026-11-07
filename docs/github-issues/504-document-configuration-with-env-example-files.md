<!-- issue-meta
title: [M5-04] Document configuration with .env.example files
labels: devops, documentation, security
milestone: M5 – Docker and CI
-->
# [M5-04] Document configuration with .env.example files

**Milestone:** M5 – Docker and CI · **Priority:** Medium · **Estimated effort:** 1 hour

## 1. Objective
Make sure every environment variable is documented with safe example values and that no real secrets exist in the repository.

## 2. Background
Clear configuration docs prevent "works on my machine" problems and leaked secrets.

## 3. Learning objectives
- Secret hygiene
- `git log -p` and secret scanning

## 4. Prerequisites
- M5-03 merged

## 5. Tasks
- [ ] Review `backend/.env.example`, `frontend/.env.example`
- [ ] Add a configuration table to the deployment guide
- [ ] Enable GitHub secret scanning / push protection (Settings → Code security) if available
- [ ] Search history for accidental secrets

## 6. Technical guidance
If a real secret is found in history, rotate it immediately and tell the project lead.

## 7. Acceptance criteria
- [ ] All variables documented; no real secrets in the repo

## 8. Testing requirements
- Search output (`git log -p | grep -i password`) reviewed

## 9. Expected deliverables
- Updated docs and settings

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Deliverables committed or linked in the issue
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**

### Explain during review
- What do you do if a secret was committed?
