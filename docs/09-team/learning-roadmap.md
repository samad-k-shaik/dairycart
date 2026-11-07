# Learning Roadmap

Every issue follows **Understand → Research → Plan → Implement → Test → Pull Request → Code Review → Merge** and answers seven questions:

1. What are we building?
2. Why are we building it?
3. Which technology is involved?
4. What concepts must be understood?
5. How does it interact with other components?
6. What should be tested?
7. What should the participant explain during review?

## Milestone learning goals

| Milestone | Concepts learned | You can explain… |
|---|---|---|
| **M0 – Project Foundation** | Requirements, scope, HLD/LLD, ERD, REST contracts, Git branching, PRs, GitHub Projects, AI-assistant rules | How the three tiers talk; why totals are calculated on the server; how a PR gets merged |
| **M1 – Backend Foundation** | FastAPI routing, Pydantic validation, dependency injection, SQLAlchemy ORM, sessions, Alembic migrations, env config | The lifecycle of a request from router to database |
| **M2 – Frontend Foundation** | Vite, React components/props/state, TypeScript types, Tailwind, shadcn/ui, routing, responsive design, mock data | How a page is composed from components; how the design tokens are applied |
| **M3 – Order Management** | TanStack Query, API client, forms, transactions, business rules, state machines (status), CORS | Why `POST /orders` is atomic; how cache invalidation updates the admin list |
| **M4 – Testing and Quality** | pytest fixtures, API tests, test DBs, Vitest/RTL, coverage, linting | What a good test checks; the test pyramid |
| **M5 – Docker and CI** | Images, containers, multi-stage builds, Compose networking, GitHub Actions jobs/caching | What happens when you open a PR |
| **M6 – GCP Deployment** | Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, IAM, Workload Identity Federation, logging | How code gets from `main` to a public URL, and how secrets stay safe |
| **M7 – Final Demonstration** | Presenting, retrospectives, technical storytelling | What you built, what you learned, what you'd do next |

## Recommended learning resources

| Topic | Resource |
|---|---|
| Git | Pro Git book (git-scm.com/book), chapters 1–3 |
| FastAPI | Official tutorial (fastapi.tiangolo.com/tutorial) |
| SQLAlchemy 2.0 | ORM Quick Start (docs.sqlalchemy.org) |
| Alembic | Tutorial (alembic.sqlalchemy.org) |
| React | react.dev "Learn" section |
| TypeScript | TypeScript Handbook |
| Tailwind | tailwindcss.com/docs |
| TanStack Query | tanstack.com/query "Overview" and "Quick Start" |
| Docker | Docker "Get started" guide |
| GitHub Actions | docs.github.com/actions "Quickstart" |
| Cloud Run | cloud.google.com/run/docs/quickstarts |

## Using AI assistants to learn (not just to generate)

- Ask Codex to **explain** an unfamiliar concept before asking it to write code.
- Ask it for a **plan** first; challenge the plan.
- After it writes code, ask "what would break if…?" and "why this approach over X?".
- Write at least the tests or one function yourself in each issue.
- In review, explain the code without reading the AI's explanation.

## Progress tracking

Each participant keeps a short learning log in their PR descriptions ("What I learned"). The project lead reviews progress at the end of each milestone.
