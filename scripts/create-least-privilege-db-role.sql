-- Checklist item #40 — least-privileged database role for the running app.
--
-- Today (docker-compose.yml, render.yaml) a single Postgres role
-- ("devtoolbox" locally; whatever Render provisions in production) is used
-- for BOTH schema migrations (`prisma migrate deploy`, which needs DDL:
-- CREATE/ALTER/DROP TABLE) and normal runtime queries (which only ever need
-- DML: SELECT/INSERT/UPDATE/DELETE — see backend/src/database/prisma.service.ts
-- and every *.service.ts, none of which issue DDL). If the app's runtime
-- credential leaks, the blast radius today includes the ability to alter
-- the schema itself, not just read/write rows.
--
-- This script provisions a second, runtime-only role scoped to DML on the
-- application's own tables. Run this ONCE against the production database
-- (as the existing admin/migration role — e.g. via Render's psql shell or
-- `psql "$DATABASE_URL" -f scripts/create-least-privilege-db-role.sql`),
-- then:
--   1. Set a real password below (replace 'REPLACE_ME') before running, or
--      run `\password devtoolbox_app` afterward.
--   2. Point the app's runtime DATABASE_URL (Render env var) at this new
--      role instead of the migration role.
--   3. Keep using the original (migration) role's connection string only
--      for `prisma migrate deploy` (e.g. in the deploy-backend.yml
--      workflow / Render's release/pre-deploy command), never for the
--      running app process.
--
-- This can't be run automatically from this codebase — it needs to execute
-- against the actual production database with admin credentials Claude
-- doesn't have access to. See DATABASE.md's "Least-privilege runtime role"
-- section for the full write-up.

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
