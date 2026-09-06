#!/usr/bin/env bash
# Idempotent bootstrap for the bauSoft monorepo Cloud Agent environment.
# Installs a local PostgreSQL, JS dependencies, generates the Prisma client,
# applies migrations, and seeds a default user.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Default to a self-contained local Postgres. A DATABASE_URL secret (e.g. a
# Supabase IPv4 session-pooler URL) takes precedence when provided.
export DATABASE_URL="${DATABASE_URL:-postgresql://bausoft:bausoft@localhost:5432/bausoft}"
USING_LOCAL_DB=0
if [ "$DATABASE_URL" = "postgresql://bausoft:bausoft@localhost:5432/bausoft" ]; then
  USING_LOCAL_DB=1
fi

if [ "$USING_LOCAL_DB" = "1" ]; then
  # 1. System dependency: PostgreSQL (skip if already installed).
  if ! command -v pg_ctlcluster >/dev/null 2>&1; then
    sudo apt-get update
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
  fi

  # 2. Ensure the cluster is running.
  sudo pg_ctlcluster "$(pg_lsclusters -h | awk 'NR==1{print $1}')" main start 2>/dev/null || true
  for _ in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done

  # 3. Role + database (idempotent).
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bausoft') THEN
    CREATE ROLE bausoft LOGIN PASSWORD 'bausoft' CREATEDB;
  END IF;
END$$;
SQL
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='bausoft'" \
    | grep -q 1 || sudo -u postgres createdb -O bausoft bausoft
fi

# 4. JS dependencies for all workspaces.
npm install

# 5. Prisma client + schema migrations.
npm run prisma:generate
( cd bauSoftBackend && npx prisma migrate deploy )

# 6. Seed a default user (the script is a no-op if one already exists).
( cd bauSoftBackend && npx ts-node create-default-user.ts ) || true

echo "bauSoft environment install complete."
