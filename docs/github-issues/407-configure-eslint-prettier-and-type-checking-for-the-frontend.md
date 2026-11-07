<!-- issue-meta
title: [M4-07] Configure ESLint, Prettier and type checking for the frontend
labels: frontend, testing
milestone: M4 – Testing and Quality
-->
# [M4-07] Configure ESLint, Prettier and type checking for the frontend

**Milestone:** M4 – Testing and Quality · **Priority:** Medium · **Estimated effort:** 1–2 hours

## 1. Objective
Configure ESLint (React + TypeScript rules) and Prettier, and fix all issues.

## 2. Background
Same reasons as M4-06, for the frontend.

## 3. Learning objectives
- ESLint flat config
- Prettier and editor integration

## 4. Prerequisites
- M3 complete

## 5. Tasks
- [ ] Configure ESLint with `typescript-eslint`, React hooks rules
- [ ] Add Prettier and `format` / `format:check` scripts
- [ ] Fix all lint and type errors
- [ ] Add recommended VS Code extensions to `.vscode/extensions.json`

## 6. Technical guidance
Keep the formatting-only commit separate.

## 7. Acceptance criteria
- [ ] `npm run lint`, `npm run typecheck`, `npm run format:check` all pass

## 8. Testing requirements
- Paste command output

## 9. Expected deliverables
- Lint/format configs

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- What does the React hooks lint rule protect against?
