<!-- issue-meta
title: [M11-03] Separate login per browser tab (user and admin side by side)
labels: bug
milestone: M11 - User Authentication and Admin Management
-->
# [M11-03] Separate login per browser tab (user and admin side by side)

**GitHub issue:** #91 · **Milestone:** M11 - User Authentication and Admin Management

### 1. Objective

Allow a user account in one browser tab and an admin account in another tab at the same time.

### 2. Background

Since #89 the login session is kept in `localStorage`, which all tabs of the same site share. Logging in as an admin in a second tab replaces the user's session in the first tab (and vice versa), so the user is asked to log out and log in again.

### 5. Tasks

- [ ] Keep the session in `sessionStorage` (one per tab) instead of `localStorage`
- [ ] Remove the cross-tab session sync that copied logins/logouts between tabs
- [ ] Update the frontend README (session section) and ADR-013

### 7. Acceptance criteria

- [ ] Tab 1 logged in as a USER and tab 2 as an ADMIN both keep working; neither is logged out by the other
- [ ] Reloading a tab keeps that tab's login
- [ ] Logging out in one tab does not log out the other tab
- [ ] A new tab opened by typing the address starts logged out (documented trade-off)

### 8. Testing requirements

- Unit tests still pass; browser test with two tabs (user + admin), reload and logout in each

### 10. Definition of Done

- [ ] Acceptance criteria met, tests passing, docs updated, PR reviewed and merged into `develop`
