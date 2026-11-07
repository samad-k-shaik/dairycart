# Roles and Responsibilities

In a learning team, people **rotate roles** so everyone experiences the full lifecycle. One person may hold several roles.

| Role | Responsibilities |
|---|---|
| Project Lead / Mentor | Owns scope and milestones, approves designs and M0 docs, unblocks the team, runs reviews and retrospectives |
| Technical Lead / Architect | Owns architecture docs and ADRs, reviews cross-cutting PRs, keeps the stack consistent |
| Product Owner (rotating) | Writes and prioritizes issues, checks acceptance criteria, demos features |
| Backend Developer | FastAPI routers, services, repositories, models, migrations, backend tests |
| Frontend Developer | React pages and components, design system, hooks/services, frontend tests |
| QA / Test Owner (rotating) | Test strategy, test cases, manual smoke runs, reviews test quality |
| DevOps Owner | Docker, Compose, GitHub Actions, GCP setup, secrets, monitoring |
| Reviewer (everyone) | Reviews at least one PR per week; asks learning questions |

## Responsibility matrix (RACI)

R = Responsible, A = Accountable, C = Consulted, I = Informed

| Activity | Project Lead | Tech Lead | Product Owner | Developers | QA | DevOps |
|---|---|---|---|---|---|---|
| Scope & milestones | A | C | R | I | I | I |
| Architecture & ADRs | C | A/R | C | C | I | C |
| Writing issues | A | C | R | C | C | C |
| Implementation | I | C | I | A/R | C | C |
| Code review | I | R | I | R | R | R |
| Testing | I | C | C | R | A/R | C |
| CI/CD & deployment | I | C | I | C | C | A/R |
| Production approval | A/R | C | I | I | I | R |
| Demo (M7) | A | C | R | R | R | R |

## Expectations for every participant

- Assign yourself before starting an issue; update the board as you go.
- Post your plan on the issue before coding.
- Ask for help after ~1 hour stuck – it's a learning project.
- Be able to explain your code, including AI-generated parts.
- Review others' work respectfully and specifically.
