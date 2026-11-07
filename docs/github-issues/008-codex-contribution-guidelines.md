<!-- issue-meta
title: [M0] Prepare Codex / AI assistant contribution guidelines (AGENTS.md)
labels: documentation, good-first-issue
milestone: M0 – Project Foundation
-->
# [M0] Prepare Codex / AI assistant contribution guidelines (AGENTS.md)

> **Initial draft status:** A draft exists in `AGENTS.md` at the repository root. This issue covers **reviewing it, testing it with Codex, and approving it**.

## 1. Objective
Give every AI coding assistant (Codex and others) clear, enforceable instructions for working in this repository, and give participants rules for using AI responsibly while learning.

## 2. Background
Codex reads `AGENTS.md` automatically. Without guidance, AI assistants tend to make broad unrelated changes, add unapproved libraries or claim success without running tests. This project's goal is learning, so the AI must explain plans, stay in scope and report honestly, and the participant must understand everything that gets merged.

## 3. Learning objectives
- Understand how AI coding agents use repository instruction files.
- Learn an AI-assisted workflow: issue → plan → implement → validate → explain.
- Recognize common AI failure modes (scope creep, hallucinated APIs, unverified claims).
- Take ownership of AI-generated code.

## 4. Prerequisites
- Issues #3 and #5 reviewed (AGENTS.md refers to them).
- Access to Codex (or another AI coding assistant).

## 5. Tasks
- [ ] Review `AGENTS.md`: confirm it covers the 10 required behaviours (read issue first, understand architecture, analyze files, plan before coding, avoid unrelated changes, follow conventions, write tests, validate, update docs, report limitations honestly).
- [ ] Confirm it states that tests must never be claimed as passing unless actually executed.
- [ ] Confirm conventions match the architecture and API docs.
- [ ] **Experiment:** open Codex in the repo and ask: *"Read AGENTS.md and summarise the rules you must follow."* Post the response as a comment.
- [ ] **Experiment:** ask Codex to plan (not implement) issue #4's validation steps. Check it plans before acting.
- [ ] Improve `AGENTS.md` via PR based on what you observed.

## 6. Technical guidance
- Keep `AGENTS.md` concise. Long instruction files get followed less reliably.
- Prefer specific rules ("Money uses `Decimal`") over vague ones ("write good code").

## 7. Acceptance criteria
- [ ] `AGENTS.md` exists at the repo root and covers all 10 behaviours.
- [ ] It includes honesty rules, learning rules, conventions, out-of-scope list and "do not" list.
- [ ] Codex experiment results posted.
- [ ] Project lead approves.

## 8. Testing requirements
- The Codex summary in the experiment mentions planning first, scope limits and honest test reporting.

## 9. Expected deliverables
- Approved `AGENTS.md`.
- Issue comment with experiment results.

## 10. Definition of Done
- [ ] Acceptance criteria met
- [ ] PR reviewed and merged (or "no changes needed" recorded)
- [ ] Card moved to **Done**

### Review questions
- Why should Codex explain its plan before writing code?
- What should you do if Codex says "all tests pass" but you didn't see them run?
