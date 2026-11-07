<!-- issue-meta
title: [M2-01] Scaffold the React + Vite + TypeScript frontend
labels: frontend, good-first-issue
milestone: M2 – Frontend Foundation
-->
# [M2-01] Scaffold the React + Vite + TypeScript frontend

**Milestone:** M2 – Frontend Foundation · **Priority:** High · **Estimated effort:** 2–3 hours

## 1. Objective
Create the frontend application in `frontend/` using Vite's React + TypeScript template with strict TypeScript and a documented run command.

## 2. Background
All M2 screens are built on this scaffold. It must follow the folder structure in `frontend/README.md` and run identically for every participant.

## 3. Learning objectives
- What Vite does (dev server, hot reload, production build)
- React function components and JSX
- TypeScript strict mode and why it helps beginners
- `package.json` scripts and `package-lock.json`

## 4. Prerequisites
- M0 approved
- Node.js 20 LTS (`node --version`)

## 5. Tasks
- [ ] Run `npm create vite@latest` with the `react-ts` template inside `frontend/` (keep our existing folders)
- [ ] Enable `"strict": true` in `tsconfig`
- [ ] Configure path alias `@/` → `src/`
- [ ] Replace the Vite demo page with a simple "Milk Delivery POC" heading
- [ ] Add scripts `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`)
- [ ] Update `frontend/README.md` with setup steps

## 6. Technical guidance
Commit `package-lock.json`. Do not add libraries beyond the approved stack; Tailwind/shadcn come in M2-02 and the router in M2-04.

## 7. Acceptance criteria
- [ ] `npm run dev` serves the app at `http://localhost:5173`
- [ ] `npm run build` and `npm run typecheck` succeed
- [ ] Folder structure matches `frontend/README.md`

## 8. Testing requirements
- Run `npm run build` and paste the output summary

## 9. Expected deliverables
- Vite project files, updated README

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- What is the difference between `npm run dev` and `npm run build`?
- Why commit `package-lock.json`?
