<!-- issue-meta
title: [M0] Create project repository and initialize monorepo structure
labels: documentation, architecture, devops, good-first-issue
milestone: M0 – Project Foundation
-->
# [M0] Create project repository and initialize monorepo structure

> **Initial draft status:** The repository skeleton was created during project initialization. This issue covers **verifying, understanding and approving** it, and fixing anything missing.

## 1. Objective
Establish the `milk-delivery-poc` GitHub repository with the agreed monorepo folder structure and root configuration files, so every later issue has a clear place to put its work.

## 2. Background
We are building a learning-first milk delivery POC with a React frontend, FastAPI backend and PostgreSQL database. Keeping them in **one repository (monorepo)** means one place for issues, one CI configuration and atomic PRs that change frontend and backend together. A predictable structure lets beginners and AI assistants find things quickly.

## 3. Learning objectives
- Understand what a monorepo is and why we chose it.
- Understand the purpose of each top-level folder (`frontend/`, `backend/`, `database/`, `infrastructure/`, `docs/`, `.github/`).
- Understand why Git does not track empty folders (and why `.gitkeep` exists).
- Understand what `.gitignore` protects (secrets, build output, dependencies).

## 4. Prerequisites
- GitHub account with access to the repository.
- Git installed locally (`git --version`).
- Read `README.md`.

## 5. Tasks
- [ ] Clone the repository and check out `develop`.
- [ ] Compare the folder tree with the structure in the master plan / `README.md`.
- [ ] Confirm root files exist: `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `.gitignore`, `docker-compose.yml`.
- [ ] Confirm `frontend/README.md` and `backend/README.md` explain each subfolder.
- [ ] Review `.gitignore`: does it exclude `.env`, `node_modules/`, `.venv/`, `__pycache__/`, build output and keys?
- [ ] Raise a PR for any gaps found.

## 6. Technical guidance
- Show the tree: `find . -path ./.git -prune -o -type d -print | sort` (macOS/Linux) or `tree -a -I .git`.
- Source files such as `App.tsx`, `main.tsx` and `app/main.py` are intentionally **not** created yet. They are created by M1/M2 scaffolding issues so that M0 contains no application code.
- `docker-compose.yml` is a placeholder with only the `db` service.

## 7. Acceptance criteria
- [ ] Repository exists under the authenticated GitHub account with `main` and `develop` branches.
- [ ] All agreed folders exist (with `.gitkeep` where empty).
- [ ] Root files exist and are meaningful (not empty).
- [ ] `.gitignore` prevents committing secrets and build artefacts.
- [ ] No application feature code exists.

## 8. Testing requirements
- Run `git status` after creating a dummy `.env` file and `node_modules/` folder locally; confirm Git ignores them. Delete the dummies afterwards.
- Confirm `docker compose config` parses `docker-compose.yml` without errors (if Docker is installed).

## 9. Expected deliverables
- Verified repository structure.
- A PR (if changes were needed) referencing this issue.
- A comment on this issue summarising what you checked.

## 10. Definition of Done
- [ ] Acceptance criteria met
- [ ] Reviewer confirmed the structure
- [ ] Any fix PR merged into `develop`
- [ ] Card moved to **Done**

### Review questions (be ready to answer)
- Why a monorepo instead of separate frontend/backend repos?
- Why don't we create `App.tsx` and `main.py` yet?
