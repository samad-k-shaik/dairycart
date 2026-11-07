<!-- issue-meta
title: [M0] Define Git branching strategy and pull request standards
labels: devops, documentation, security
milestone: M0 – Project Foundation
-->
# [M0] Define Git branching strategy and pull request standards

> **Initial draft status:** Drafts exist in `docs/08-devops/git-workflow.md`, `CONTRIBUTING.md` and `.github/pull_request_template.md`. Branches `main` and `develop` were created during initialization. This issue covers **reviewing the standards, verifying branch protection and practising the workflow**.

## 1. Objective
Agree and enforce how code moves from a developer's machine into `develop` and `main`: branch naming, commit messages, PR rules, reviews and branch protection.

## 2. Background
With many learners and AI assistants contributing, a consistent workflow prevents broken `main`, lost work and unreviewed code. Branch protection makes the rules automatic where GitHub allows it.

## 3. Learning objectives
- Understand `main` / `develop` / `feature/*` / `bugfix/*` / `hotfix/*`.
- Write conventional commit messages.
- Open, review and squash-merge a PR.
- Understand branch protection and repository rulesets, and their plan limitations.
- Understand rebasing your own branch vs merging.

## 4. Prerequisites
- Issue #1 complete.
- Git configured locally (`git config user.name`, `user.email`).

## 5. Tasks
- [ ] Review `docs/08-devops/git-workflow.md` and `CONTRIBUTING.md`.
- [ ] Review `.github/pull_request_template.md`.
- [ ] Verify `develop` is the default branch for PRs (repo Settings → General).
- [ ] Verify branch protection / rulesets on `main` and `develop` (see initialization report). If unavailable on the current plan, record that the rules are enforced by agreement.
- [ ] Enable "Automatically delete head branches" (Settings → General).
- [ ] **Practice:** each participant creates `feature/7-add-<yourname>-to-team`, adds their name to a "Participants" section in `docs/09-team/roles-and-responsibilities.md`, opens a PR, gets one review and squash-merges.

## 6. Technical guidance
- Do not add **required status checks** until the CI workflow exists (M5); otherwise every PR is blocked.
- Keep admin bypass enabled for emergencies only.
- If a direct push to `develop` is accidentally rejected, that's protection working: create a branch and open a PR.

## 7. Acceptance criteria
- [ ] Branching model and naming conventions documented and approved.
- [ ] Commit message format documented with examples.
- [ ] PR rules (issue reference, template, 1 approval, squash merge) documented.
- [ ] `main` and `develop` exist; protection is enabled or its unavailability is documented with the reason.
- [ ] Every participant has merged one practice PR.

## 8. Testing requirements
- Attempt a direct push to `develop` (with protection enabled) and confirm it is rejected.
- Confirm a PR without approval cannot be merged.

## 9. Expected deliverables
- Approved workflow docs.
- One merged practice PR per participant.

## 10. Definition of Done
- [ ] Acceptance criteria met
- [ ] Card moved to **Done**

### Review questions
- When would you create a `hotfix/*` branch instead of `bugfix/*`?
- Why squash-merge feature PRs?
