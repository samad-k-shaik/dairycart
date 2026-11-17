<!-- issue-meta
title: [M11-05] Sign up and log in with mobile number and password (remove email and username)
labels: feature, backend, frontend, database
milestone: M11 - User Authentication and Admin Management
-->
# [M11-05] Sign up and log in with mobile number and password (remove email and username)

**GitHub issue:** #121 · **Milestone:** M11 - User Authentication and Admin Management

### 1. Objective

Sign up and log in with **mobile number + password** instead of email/username. Sign-up asks only for **Full name (mandatory)**, **Mobile number**, **Password** and **Confirm password**. Email and username are removed from the backend, the UI and the docs.

### 2. Background

#89 built sign-up with Full name, Email, Username and Password, and login with "username or email". Our customers are local households who already give their mobile number at checkout (the `customers` table is keyed by phone, BR-5). Email and username are extra things to remember that we never use.

This is a POC, so we use **mobile + password**. If we deploy for real later, the plan is **mobile + OTP**. OTP stays **out of scope** for now (AGENTS.md "Out of scope"). This issue only records it as the future direction.

### 3. Learning objectives

- Changing a unique login identifier safely with an Alembic migration (upgrade **and** downgrade)
- Reusing one validation rule (Indian mobile number) across schemas instead of copying it
- Following a field rename through every layer: model → repository → service → schema → API contract → frontend types → pages
- Treating a phone number as personal data (never logged, never in `repr`)

### 4. Prerequisites

- #89 (sign-up, login, JWT, USER/ADMIN roles)
- #90 (orders linked to `users.user_id`)

### 5. Tasks

**Backend**
- [ ] Migration on `users`: add `phone VARCHAR(15) NOT NULL UNIQUE`, drop `email` and `username` (and their unique indexes). Downgrade must work too (see Technical guidance).
- [ ] `User` model: `full_name` (required), `phone`, `password_hash`, `role`, `created_at`
- [ ] `RegisterRequest`: `full_name`, `phone`, `password` (`extra="forbid"` stays, so sending `email`/`username`/`role` is a 422)
- [ ] `LoginRequest`: `phone` + `password`
- [ ] `UserRead` / `AdminUserDetail`: `phone` instead of `email` and `username`
- [ ] Duplicate mobile number → 409 in the standard error format ("This mobile number is already registered")
- [ ] Wrong mobile or wrong password → the same 401 message (do not reveal which numbers are registered)
- [ ] `user_repository`: `get_by_phone`, `phone_taken`; remove the email/username lookups
- [ ] Admin order board, delivery list and admin subscriptions: show the account's **full name** (and phone where useful) instead of `username`
- [ ] `create_admin` script: `--name --phone --password` to create, `--promote <phone>` to promote
- [ ] Seed data / test factories updated

**Frontend**
- [ ] Sign-up page: Full name\*, Mobile number\*, Password\*, Confirm password\*. No email or username fields.
- [ ] Login page: Mobile number + Password
- [ ] Client-side validation matches the backend (10 digits, starts with 6–9; name 2–100 characters)
- [ ] Mobile input: `type="tel"`, `inputMode="numeric"`, `autoComplete="tel"`, max 10 digits, with a fixed "+91" prefix shown on the input (the stored value stays 10 digits)
- [ ] Header/dashboard, admin Users list, admin User details, admin Orders board and admin Subscriptions show name + mobile instead of username/email
- [ ] Checkout: pre-fill the delivery phone from the account as well as the name (the user can still change it)
- [ ] Types in `src/types/auth.ts` (and any others using `username`/`email`) and `authService.ts` updated

### 6. Technical guidance

- **Reuse the existing phone rule.** `app/schemas/order.py` already has `Phone = ^[6-9]\d{9}$`. Move it to `app/schemas/common.py` and use it in both order and auth schemas. Strip spaces before validating, and also accept an optional leading `+91`/`0` that is removed before saving, so we always store exactly 10 digits.
- **Migration and existing rows.** Nothing is deployed yet (M6), so only local/dev data exists. Recommended approach, to confirm in the implementation plan:
  - upgrade: add `phone` as nullable → if any user rows exist, stop with a clear message telling the developer to reset the local DB and re-seed (do not invent phone numbers) → set NOT NULL + unique → drop `email`/`username`.
  - downgrade: re-add `email`/`username` filled with placeholders (`user<id>@example.invalid`, `user<id>`) so the downgrade test passes, then drop `phone`.
- `users.phone` and `customers.phone` stay **separate columns**. The account phone is the login. The order/customer phone is the delivery contact (BR-5) and can differ. Do not merge the two tables in this issue.
- Keep `full_name` mandatory and trimmed (2–100 characters), as it is today.
- The JWT `sub` stays `user_id`, so tokens do not change.
- Never log the phone number; keep `User.__repr__` free of it.
- Add **ADR-019** in `high-level-design.md`: "Login by mobile + password for the POC; mobile + OTP is the future option (out of scope)".

### 7. Acceptance criteria

- [ ] A new user can sign up with full name, mobile number and password, and nothing else
- [ ] Sign-up without a name, with an invalid mobile, or with mismatched passwords is rejected (UI and API)
- [ ] A second sign-up with the same mobile number is rejected (409)
- [ ] The user can log in with mobile + password; wrong mobile or wrong password shows one generic error
- [ ] Email and username no longer appear anywhere in the UI, the API responses or the `users` table
- [ ] Admin screens identify users by name + mobile
- [ ] `create_admin` works with a mobile number
- [ ] Migration upgrades and downgrades cleanly
- [ ] Docs updated: API contract, ERD, functional requirements, HLD (ADR), and OTP noted as future work

### 8. Testing requirements

- API tests: register success; missing name; invalid phones (9 digits, 11 digits, starts with 5, letters); `+91`/`0` prefix normalised; duplicate phone → 409; extra `email`/`username`/`role` field → 422; login success; wrong phone and wrong password give the same 401
- Admin endpoints return `phone`/`full_name` and no `email`/`username`
- `create_admin` create and promote by phone
- Migration upgrade/downgrade test passes
- Frontend tests for the new sign-up/login validation (`authValidation`)
- Service coverage gate (70 %, #53) still passes
- Browser walkthrough: sign up → log in → place order → admin sees the user by name + mobile

### 9. Expected deliverables

- Alembic migration
- `app/models/user.py`, `app/schemas/auth.py`, `app/schemas/common.py`, `app/schemas/order.py`, `app/repositories/user_repository.py`, `app/services/auth_service.py`, `app/core/errors.py`, `app/scripts/create_admin.py`, affected admin repositories/schemas
- `SignUpPage.tsx`, `LoginPage.tsx`, `authValidation.ts`, auth types/service, admin Users / User details / Orders / Subscriptions pages, checkout pre-fill
- Updated tests (backend + frontend)
- Docs: `api-contracts.md`, `database-erd.md`, `functional-requirements.md`, `high-level-design.md`

### 10. Definition of Done

- All acceptance criteria are met
- Tests written and passing (paste the real command output in the PR)
- Ruff, type checks and frontend lint pass
- Relevant documentation updated
- PR references this issue (`Closes #N`) and is approved by another participant
- CI checks pass
- Merged into `develop`
- Card moved to Done
