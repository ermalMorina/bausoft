#!/usr/bin/env bash
# Per-boot reconciliation: make sure the local PostgreSQL cluster is up before
# the backend and Expo dev servers start. Safe to run repeatedly.
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-postgresql://bausoft:bausoft@localhost:5432/bausoft}"

# Raise inotify limits so Metro/Expo watchers don't hit EMFILE in the monorepo.
sudo sysctl -w fs.inotify.max_user_watches=524288 >/dev/null 2>&1 || true
sudo sysctl -w fs.inotify.max_user_instances=1024 >/dev/null 2>&1 || true

if [ "$DATABASE_URL" = "postgresql://bausoft:bausoft@localhost:5432/bausoft" ] \
   && command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo pg_ctlcluster "$(pg_lsclusters -h | awk 'NR==1{print $1}')" main start 2>/dev/null || true
  for _ in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done
fi

echo "bauSoft services prerequisites ready."
