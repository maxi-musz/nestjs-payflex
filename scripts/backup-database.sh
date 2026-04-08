#!/usr/bin/env bash
# Full logical backup of the Postgres database (Neon-compatible).
# Usage (from backend/):
#   export DATABASE_URL='postgresql://...'
#   ./scripts/backup-database.sh
#
# If DATABASE_URL is unset, reads the first uncommented DATABASE_URL= line from .env
# (shell "source .env" breaks when the URL contains &).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${DATABASE_URL:-}" && -f .env ]]; then
  DATABASE_URL="$(node -e "
    const fs = require('fs');
    const raw = fs.readFileSync('.env', 'utf8').split(/\\r?\\n/);
    for (const line of raw) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const m = t.match(/^DATABASE_URL=(.+)$/);
      if (!m) continue;
      let v = m[1].trim();
      if ((v.startsWith('\"') && v.endsWith('\"')) || (v.startsWith(\"'\") && v.endsWith(\"'\"))) v = v.slice(1, -1);
      process.stdout.write(v);
      process.exit(0);
    }
    process.exit(1);
  ")" || true
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Export it or ensure backend/.env has DATABASE_URL=..."
  exit 1
fi

if ! command -v pg_dump &>/dev/null; then
  echo "ERROR: pg_dump not found. Install PostgreSQL client tools (e.g. brew install libpq)."
  exit 1
fi

mkdir -p backups
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="backups/neondb-backup-${STAMP}.sql"
echo "Writing ${OUT} ..."
pg_dump "$DATABASE_URL" --no-owner --no-acl --format=plain --file="$OUT"
echo "Done: $(wc -c < "$OUT") bytes"
