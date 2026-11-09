# database/

| File | Purpose |
|---|---|
| `init.sql` | Reference DDL that mirrors the ERD. For learning and review. **Not** executed automatically. |
| `seed.sql` | Initial product catalogue and a demo customer (reference; the seed script below loads the same data). |

From M1, **Alembic migrations in `backend/alembic/` are the only way the schema changes.** Keep `init.sql` and `docs/04-architecture/database-erd.md` in sync with the migrations.

## Seed data (M1-07)

After `alembic upgrade head`, load the product catalogue and the demo customer. From `backend/` with the virtual environment active:

```bash
python -m app.scripts.seed
```

```text
Seed complete: 4 product(s) and 1 customer(s) added. Database now has 4 product(s) and 1 customer(s).
```

- **Idempotent:** run it as often as you like. Rows that already exist are skipped (`ON CONFLICT DO NOTHING`), so a second run adds nothing and never overwrites a price changed later.
- **Data:** Cow Milk 500 ml ₹30, Cow Milk 1 Litre ₹60, Buffalo Milk 500 ml ₹35, Buffalo Milk 1 Litre ₹70, and the demo customer `9000000001`. The script (`backend/app/scripts/seed.py`) and `seed.sql` hold the same values; a test fails if they drift apart.
- Seed data is **not** a migration: migrations create the structure every environment needs; seed data is starting content for development, tests and the demo.

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
