# database/

| File | Purpose |
|---|---|
| `init.sql` | Reference DDL that mirrors the ERD. For learning and review. **Not** executed automatically. |
| `seed.sql` | Initial product catalogue and a demo customer (reference; loaded by the seed script below). |

From M1, **Alembic migrations in `backend/alembic/` are the only way the schema changes.** Keep `init.sql` and `docs/04-architecture/database-erd.md` in sync with the migrations.

## Migrations (Alembic, M1-06)

Run from `backend/` with the virtual environment active. The database comes from `DATABASE_URL` (environment or `backend/.env`); `alembic.ini` never contains a URL or password.

| Command | What it does |
|---|---|
| `alembic upgrade head` | Apply all migrations: creates or updates the tables. Run after every `git pull`. |
| `alembic current` | Show which migration the database is at |
| `alembic history` | List all migrations |
| `alembic downgrade -1` | Undo the latest migration |
| `alembic downgrade base` | Undo all migrations (drops all tables and their data) |
| `alembic check` | Fails if the models and the migrations differ (a migration is missing) |
| `alembic upgrade head --sql` | Print the SQL instead of running it (to review) |

### Changing the schema

1. Change the model in `backend/app/models/`.
2. `alembic revision --autogenerate -m "short description"` writes a **draft** in `backend/alembic/versions/`.
3. **Review it line by line.** Autogenerate can miss or misread things (CHECK constraints on existing tables, renamed columns look like drop + add, server defaults). Fix it by hand.
4. `alembic upgrade head`, then `alembic downgrade -1`, then `alembic upgrade head` again to prove both directions work.
5. Update `init.sql` and the ERD in the same PR. `pytest` checks the models and migrations still match.

**Never edit a migration that has been merged.** Other databases have already run it; they would not run it again, so they would silently differ. Write a new migration instead.

The first migration, `initial schema`, creates `customers`, `products`, `orders` and `order_items` with all constraints and indexes, and is identical to `init.sql` (compared on PostgreSQL 16).
