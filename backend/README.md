# backend/

FastAPI application (Python 3.12). Not scaffolded yet: `app/main.py`, dependency files and Alembic configuration are created by the first **M1 – Backend Foundation** issue.

| Folder | Responsibility |
|---|---|
| `app/core` | Settings (env vars), logging, error handlers |
| `app/database` | Engine, session factory, `get_db` dependency, declarative `Base` |
| `app/models` | SQLAlchemy ORM models (tables) |
| `app/schemas` | Pydantic request/response models |
| `app/routers` | HTTP endpoints only, no business logic |
| `app/services` | Business rules (order totals, status transitions) |
| `app/repositories` | Database queries |
| `tests` | pytest tests |
| `alembic` | Database migrations |

Request flow: `router → service → repository → model → PostgreSQL`. See `docs/04-architecture/low-level-design.md`.
