# Non-Functional Requirements

Targets are sized for a POC: meaningful enough to learn from, small enough to achieve.

| ID | Category | Requirement | How we verify |
|---|---|---|---|
| NFR-1 | Performance | API p95 response time < 500 ms for product and order endpoints with seed data | Manual check in M4, Cloud Logging latency in M6 |
| NFR-2 | Performance | Customer home page usable within 3 s on a 4G phone | Lighthouse in M4 |
| NFR-3 | Usability | Mobile-first responsive layout from 360 px wide upward | Manual check on phone widths |
| NFR-4 | Accessibility | Semantic HTML, labelled form fields, keyboard navigation, text contrast ≥ 4.5:1 | Lighthouse accessibility score ≥ 90 |
| NFR-5 | Reliability | Order creation is atomic: either the order and all items are saved, or nothing is | Backend test that forces an item failure |
| NFR-6 | Data integrity | Money stored as `NUMERIC(10,2)`; foreign keys and check constraints enforced in the DB | Migration review |
| NFR-7 | Security | No secrets in Git; config via environment variables; Secret Manager in GCP | PR review, secret scanning |
| NFR-8 | Security | All input validated with Pydantic; SQL only via SQLAlchemy (parameterized) | Code review, tests |
| NFR-9 | Security | CORS restricted to known frontend origins | Config review |
| NFR-10 | Security | Admin pages and every `/api/v1/admin/*` API need an ADMIN login (#89, ADR-013); passwords stored as bcrypt hashes; JWT secret only in the environment. Remaining gaps: ordering and order history by phone have no login; no login rate limiting, password reset or email confirmation. Must not hold real customer data or be advertised publicly | `backend/tests/api/test_auth.py` (401/403 for every admin API) |
| NFR-11 | Maintainability | Layered backend (router/service/repository), typed code, linting in CI | CI |
| NFR-12 | Testability | Backend business logic coverage ≥ 70 % by end of M4 | pytest-cov in CI |
| NFR-13 | Observability | Structured JSON logs with request id, method, path, status, duration | Cloud Logging in M6 |
| NFR-14 | Portability | Whole stack runs locally with `docker compose up` | M5 acceptance |
| NFR-15 | Cost | GCP resources sized at minimum tiers; Cloud Run scales to zero | M6 review |
| NFR-16 | Documentation | Every feature PR updates relevant docs | PR template checklist |
