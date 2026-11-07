<!-- issue-meta
title: [M0] Configure GitHub Project board, milestones and labels
labels: devops, documentation
milestone: M0 – Project Foundation
-->
# [M0] Configure GitHub Project board, milestones and labels

> **Initial draft status:** Milestones, labels and the project board were created during initialization (see the verification report). This issue covers **verifying them, completing manual steps and learning how to use them**.

## 1. Objective
Set up GitHub project management so all work is visible: milestones M0–M7, a standard label set, and a Project board with a clear status workflow.

## 2. Background
Without a shared board, a team cannot see who is doing what. Milestones group issues into deliverable stages, labels classify work, and the board shows flow from idea to done.

## 3. Learning objectives
- Understand GitHub Issues, Milestones, Labels and Projects.
- Understand a Kanban workflow and work-in-progress limits.
- Learn how issues move through statuses and link to PRs.

## 4. Prerequisites
- Write access to the repository.
- Issue #1 complete.

## 5. Tasks
- [ ] Verify milestones exist: M0 – Project Foundation, M1 – Backend Foundation, M2 – Frontend Foundation, M3 – Order Management, M4 – Testing and Quality, M5 – Docker and CI, M6 – GCP Deployment, M7 – Final Demonstration.
- [ ] Verify labels exist: `epic`, `feature`, `backend`, `frontend`, `database`, `devops`, `testing`, `documentation`, `architecture`, `bug`, `security`, `good-first-issue`, `blocked`.
- [ ] Verify the Project board **Status** field has: Backlog, Ready, In Progress, In Review, Testing, Done.
- [ ] Verify all M0 issues are on the board.
- [ ] Add a **Board** view grouped by Status (manual step in the GitHub UI if not already present).
- [ ] Enable built-in workflows: "Item added → Backlog", "Item closed → Done", "Pull request merged → Done".
- [ ] Link the project to the repository.

## 6. Technical guidance
- Project UI: repository → **Projects** tab → open the project → **⋯ → Workflows**.
- Board view: **+ New view → Board**, group by **Status**.
- Status meanings:

| Status | Meaning |
|---|---|
| Backlog | Captured, not yet refined |
| Ready | Refined, prerequisites met, can be picked up |
| In Progress | Someone is assigned and working |
| In Review | PR open, waiting for review |
| Testing | Merged to `develop`, being verified |
| Done | Verified and complete |

- Suggested WIP limit: one issue **In Progress** per person.

## 7. Acceptance criteria
- [ ] 8 milestones exist with descriptions.
- [ ] 13 labels exist with colours and descriptions.
- [ ] Project board exists with the 6 statuses and a Board view.
- [ ] All 8 M0 issues are on the board with milestone and labels.
- [ ] Automation workflows enabled.

## 8. Testing requirements
- Move one issue through every status and back; confirm it displays correctly.
- Close a test issue and confirm automation moves it to Done (then reopen or delete the test issue).

## 9. Expected deliverables
- Screenshot of the board view posted as a comment.
- List of any manual configuration performed.

## 10. Definition of Done
- [ ] Acceptance criteria met
- [ ] Screenshot posted
- [ ] Card moved to **Done**

### Review questions
- What's the difference between a milestone and a label?
- When should an issue move from Backlog to Ready?
