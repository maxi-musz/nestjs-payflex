
Backup is done.

- **Path:** `db-backups/prod-db-1.dump`
- **Size:** ~160 KB
- **DB:** Production Neon DB (from your `.env`)

Restore when needed:
```bash
pg_restore -h <host> -p 5432 -U neondb_owner -d neondb --clean --if-exists db-backups/prod-db-1.dump
```
Or with a connection URL:
```bash
pg_restore "$DATABASE_URL" --clean --if-exists db-backups/prod-db-1.dump
```