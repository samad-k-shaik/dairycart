<!-- issue-meta
title: [M3-08] Configure CORS and build the frontend API client
labels: backend, frontend, security
milestone: M3 – Order Management
-->
# [M3-08] Configure CORS and build the frontend API client

**Milestone:** M3 – Order Management · **Priority:** High · **Estimated effort:** 2–4 hours

## 1. Objective
Allow the frontend origin via CORS and create a typed `apiClient` that calls the backend and converts error responses into `ApiError`.

## 2. Background
Browsers block cross-origin calls unless the API allows them. One API client keeps URL and error handling in one place.

## 3. Learning objectives
- Same-origin policy and CORS
- `fetch`, JSON parsing and typed errors
- Vite environment variables (`VITE_API_BASE_URL`)

## 4. Prerequisites
- M3-04 merged
- M2 approved

## 5. Tasks
- [ ] Add `CORSMiddleware` using `CORS_ORIGINS` from settings (no `*`)
- [ ] Create `frontend/src/services/apiClient.ts` (`get`, `post`, `patch`) reading `VITE_API_BASE_URL`
- [ ] Parse error JSON into `ApiError { code, message, details, requestId }`
- [ ] Add `frontend/.env.example`

## 6. Technical guidance
Never use `allow_origins=["*"]` together with credentials. Keep the mock services available behind a `VITE_USE_MOCKS=true` flag for offline UI work.

## 7. Acceptance criteria
- [ ] Frontend at `localhost:5173` can call the API at `localhost:8000`
- [ ] A request from another origin is blocked
- [ ] Errors surface as `ApiError` with the backend message

## 8. Testing requirements
- Manual browser test; screenshot of network tab
- Unit test for error parsing in `apiClient`

## 9. Expected deliverables
- CORS config, `apiClient.ts`, `.env.example`

## 10. Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written and passing (paste the real command output in the PR)
- [ ] Relevant documentation updated
- [ ] PR references this issue and is approved by another participant
- [ ] CI checks pass (from M5 onward)
- [ ] Merged into `develop`
- [ ] Card moved to **Done**

### Explain during review
- Who enforces CORS, the browser or the server?
