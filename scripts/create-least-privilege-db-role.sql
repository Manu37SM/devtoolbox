-- Checklist item #40 — least-privileged database role for the running app.
--
-- Today (docker-compose.yml locally; whatever Neon provisions in
-- production) a single Postgres role is used for BOTH schema migrations
-- (`prisma migrate deploy`, which needs DDL: CREATE/ALTER/DROP TABLE) and
-- normal runtime queries (which only ever need DML:
-- SELECT/INSERT/UPDATE/DELETE — see backend/src/database/prisma.service.ts
-- and every *.service.ts, none of which issue DDL). If the app's runtime
-- credential leaks, the blast radius today includes the ability to alter
-- the schema itself, not just read/write rows.
--
-- This script provisions a second, runtime-only role scoped to DML on the
-- application's own tables. Run this ONCE against the production database
-- (as the existing admin/migration role — e.g. via Neon's SQL Editor in
-- the console, or `psql "$NEON_DIRECT_URL" -f scripts/create-least-privilege-db-role.sql`
-- from a terminal), then:
--   1. Set a real password below (replace 'REPLACE_ME') before running, or
--      run `\password devtoolbox_app` afterward.
--   2. Check you're connected to the right database before running this
--      (`\c devtoolbox` or `\l` to see the exact name) — GRANT CONNECT ON
--      DATABASE below is the only line that's database-qualified by name,
--      everything else applies to "whichever database this session is
--      currently in".
--   3. Point the app's runtime `DATABASE_URL` (Render env var, holding a
--      Neon connection string) at this new role's connection string
--      instead of the admin role's. Use Neon's *direct* (non-pooled)
--      connection string — see PROD_READY.md §6 step 3.
--   4. Add a NEW Render env var, `MIGRATE_DATABASE_URL`, holding the
--      ORIGINAL admin role's Neon connection string (what `DATABASE_URL`
--      used to be) — `backend/Dockerfile`'s CMD uses this to run
--      `prisma migrate deploy` with admin/DDL privileges, then starts the
--      app itself with `DATABASE_URL` (the restricted role). Migrations
--      run on every container boot here (Render's free-tier web service
--      plan doesn't support `preDeployCommand`), so this split is required,
--      not optional, once `DATABASE_URL` points at the restricted role — if
--      you skip this step the app will fail to boot at all.
--
-- This can't be run automatically from this codebase — it needs to execute
-- against the actual production database (Neon) with admin credentials
-- Claude doesn't have access to. See DATABASE.md's "Least-privilege runtime
-- role" section for the full write-up.

CREATE ROLE devtoolbox_app WITH LOGIN PASSWORD 'REPLACE_ME';

-- Connect/use the database itself.
GRANT CONNECT ON DATABASE devtoolbox TO devtoolbox_app;
GRANT USAGE ON SCHEMA public TO devtoolbox_app;

-- DML only on existing tables — no CREATE/ALTER/DROP.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO devtoolbox_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO devtoolbox_app;

-- Tables created by future migrations (run under the original/admin role)
-- should extend the same grants automatically, so this doesn't need to be
-- re-run after every migration.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO devtoolbox_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO devtoolbox_app;

-- Explicitly NOT granted: CREATE/ALTER/DROP on the schema or its tables,
-- and no superuser/createrole/createdb attributes (the default for a role
-- created without those flags).
