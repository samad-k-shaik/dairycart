# database/

| File | Purpose |
|---|---|
| `init.sql` | Reference DDL that mirrors the ERD. For learning and review. **Not** executed automatically. |
| `seed.sql` | Initial product catalogue and a demo customer. |

From M1, **Alembic migrations in `backend/alembic/` are the only way the schema changes.** Keep `init.sql` and `docs/04-architecture/database-erd.md` in sync with the migrations.
