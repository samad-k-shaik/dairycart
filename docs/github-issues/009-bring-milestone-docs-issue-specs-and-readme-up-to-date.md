<!-- issue-meta
title: Bring milestone docs, issue specs and README up to date (M8, M11, M12)
labels: documentation
milestone: M0 – Project Foundation
-->
# Bring milestone docs, issue specs and README up to date (M8, M11, M12)

**GitHub issue:** #137 · **Milestone:** M0 – Project Foundation

## 1. Objective
Make the documentation complete enough that someone could rebuild every feature, milestone by milestone, from `docs/` alone.

## 2. Background
`docs/github-issues/` is meant to hold a Markdown copy of every GitHub issue, and `milestones.md` the description of every milestone. Since M7 the app grew a lot, but:
- 17 issues have no spec file: #86, #89–#105 (accounts, stock, shop look, subscriptions, delivery slots, addresses, delivery boys, Orders board, Income) and #121 (mobile login).
- 13 of them had no milestone. They are now in the new milestone **M8 – Ordering, Subscriptions and Delivery Operations**.
- M11 has no section in `milestones.md` or the issues index; #134 (M12-09) is missing from the index.
- The root `README.md` still says "M0, no features implemented" and lists only M0–M7.
- `docs/02-project-scope.md` and HLD section 10 still call M12 "planned / not built yet".
- `milestones.md` and the M12 milestone still say "No Google Maps", which ADR-021 (#134) changed.

## 3. Tasks
- [ ] Copy the 17 missing issue bodies from GitHub into spec files (`8xx` = M8, `11xx` = M11), unchanged, with the `issue-meta` header
- [ ] Add M8 and M11 to `docs/github-issues/milestones.md` and `docs/github-issues/README.md`; add #134 to the M12 table
- [ ] Give M11 a GitHub milestone description and fix the M12 one (Google Maps directions links allowed, ADR-021)
- [ ] `README.md`: current status, every milestone, a short list of what the app does
- [ ] `docs/02-project-scope.md` and HLD section 10: M12 is built
- [ ] `docs/09-team/learning-roadmap.md`: M8, M11 and M12 rows

## 4. Acceptance criteria
- [ ] Every GitHub issue has a spec file in `docs/github-issues/` and appears in its index
- [ ] Every milestone appears in `milestones.md`, the README and the learning roadmap
- [ ] No document says a built feature is "planned" or "not built yet"

## 5. Definition of Done
- [ ] All acceptance criteria met
- [ ] Reviewed by another participant / project lead
- [ ] Card moved to **Done**
