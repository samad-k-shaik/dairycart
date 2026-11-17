<!-- issue-meta
title: [M11-01]
labels: 
milestone: M11 - User Authentication and Admin Management
-->
# [M11-01] Sign-up page, login page and admin page

**GitHub issue:** #89 · **Milestone:** M11 - User Authentication and Admin Management

### 1. Objective

Create a User Sign-Up page, Login page, and Admin page. Newly registered users must be stored in the database and should be able to log in using the credentials created during registration.

### 2. Background

Currently, the application does not have a Sign-In or Login page. Users need the ability to create an account and log in using their registered credentials. Administrators should have a separate Admin page to view and manage registered users.

## 3. Learning objectives

- User registration and login flow
- React forms and form validation
- FastAPI authentication endpoints
- Password hashing and verification
- JWT authentication
- Role-Based Access Control (RBAC)
- Frontend and backend authentication integration

## 4. Prerequisites

- M1 – Frontend and Backend setup complete
- Database connectivity established
- Existing User model and API structure available

## 5. Tasks

- Create `SignUp` page with Full Name, Email, Username, Password and Confirm Password fields
- Validate mandatory fields, email format and password matching
- Store newly registered users in the database with hashed passwords
- Prevent duplicate email addresses and usernames
- Create `Login` page with Username/Email and Password fields
- Authenticate users using the credentials created during registration
- Generate JWT access tokens after successful login
- Redirect authenticated users to the User Dashboard
- Create `Admin` page to display all registered users and their details
- Implement separate `USER` and `ADMIN` roles
- Allow only authorized administrators to access the Admin page
- Provide Logout functionality

### 6. Technical guidance

Create separate registration and login APIs:

- `POST /api/auth/register` – Register a new user and save details in the database.
- `POST /api/auth/login` – Validate registered user credentials and generate JWT token.
- `GET /api/auth/me` – Retrieve logged-in user details.
- `GET /api/admin/users` – Retrieve all registered users for the Admin page.

Newly registered users should automatically receive the `USER` role. Admin access should be assigned only through an authorized process.

Use password hashing (bcrypt or Argon2) instead of storing plain-text passwords. Implement JWT authentication and backend role validation to prevent normal users from accessing Admin functionality

## 7. Acceptance criteria

- User can successfully register through the Sign-Up page
- Registered user details are saved in the database
- Newly created users can log in using their registered credentials
- Duplicate email addresses and usernames are rejected
- Invalid credentials return an appropriate error message
- Successful login redirects users to the User Dashboard
- Admin can log in and access the Admin Dashboard
- Admin can view all registered users
- Normal users cannot access Admin pages or APIs
- Passwords are stored securely using hashing
- Logout successfully clears the authentication session


## 8. Testing requirements

- Unit tests for user registration and field validation
- Test login with valid and invalid credentials
- Test duplicate email and username scenarios
- Test password hashing and verification
- Test JWT token generation and validation
- Test Admin and User role-based access
- Test unauthorized access to Admin APIs
- Test logout functionality


## 9. Expected deliverables

- `app/schemas/auth.py`
- `app/models/user.py`
- `app/routes/auth.py`
- `app/routes/admin.py`
- `app/services/auth_service.py`
- `frontend/src/pages/SignUp.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/AdminDashboard.tsx`
- `frontend/src/pages/UserDashboard.tsx`
- Unit and integration tests

## 10. Definition of Done

- Sign-Up, Login and Admin pages are implemented
- Frontend and backend APIs are integrated
- Newly registered users can log in successfully
- Role-based authorization is implemented
- All acceptance criteria are met
- Tests written and passing (paste the real command output in the PR)
- Relevant documentation updated
- PR references this issue and is approved by another participant
- CI checks pass (from M5 onward)
- Merged into `develop`
- Card moved to Done
