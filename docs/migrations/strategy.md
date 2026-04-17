# Database Migration Strategy

## Overview

All database schema changes for PostgreSQL services (Auth, Inventory, Order, Payment) are managed through versioned SQL migration files. Migrations are immutable once committed — never edit a migration file after it's merged to main.

## Tools & Setup

- **Migration Tool:** node-pg-migrate
- **Storage:** `services/<service>/src/migrations/` directory
- **Naming Convention:** `{timestamp}-{description}.sql` (e.g., `001-create-users-table.sql`)

## Migration Lifecycle

### 1. Create Migration (Development)
```bash
cd services/auth-service
pnpm run migrate:create "create users table"
```

Output: `src/migrations/001-create-users-table.sql`

### 2. Write Up & Down
```sql
-- UP: Apply change
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- DOWN: Rollback change
DROP TABLE users;
```

### 3. Test Locally
```bash
pnpm run migrate:up     # Apply all pending migrations
pnpm run migrate:status # Check migration status
pnpm run migrate:down   # Rollback last migration (test rollback works)
pnpm run migrate:up     # Reapply (verify idempotency)
```

### 4. Commit & Deploy
```bash
git add services/auth-service/src/migrations/001-create-users-table.sql
git commit -m "feat(auth): add migrations for users table"
```

### 5. Production Deployment
- CI pipeline runs: `pnpm run migrate:up` on all PostgreSQL services
- If migration fails, deployment is blocked (fail-fast)
- Rollback: `pnpm run migrate:down` (only if latest migration caused issue)

---

## Rules

### Golden Rules
1. **Immutable:** Never edit a committed migration file — create a new one instead
2. **Reversible:** Every `UP` must have a corresponding `DOWN` (test rollback locally)
3. **Idempotent:** Running a migration twice must have same effect as once
   - Use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
   - Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
4. **No Data Loss:** Prefer additive changes (add column) over destructive (drop column)
5. **Backwards Compatible:** Apps must work during migration (zero-downtime deployments)

### Breaking Changes (Multi-Phase Approach)

**Example: Rename column from `name` to `full_name`**

**Phase 1 (Migration 001):**
```sql
-- UP
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- DOWN
ALTER TABLE users DROP COLUMN full_name;
```
- Deploy: code reads both columns, writes to `full_name` only
- Run: data migration script to populate `full_name` from `name`

**Phase 2 (After Phase 1 running successfully, Migration 002):**
```sql
-- UP
ALTER TABLE users DROP COLUMN name;

-- DOWN
ALTER TABLE users ADD COLUMN name VARCHAR(255);
```
- Deploy: code uses `full_name` only
- Run: old `name` column removed

---

## Current Migrations

### Auth Service (services/auth-service/src/migrations/)
- `001-create-users-table.sql` — Initial users table with email index
- `002-create-refresh-tokens-table.sql` — Refresh token storage
- `003-create-password-reset-tokens-table.sql` — Password reset workflow

### Inventory Service (services/inventory-service/src/migrations/)
- `001-create-inventory-levels-table.sql` — Stock levels by product
- `002-create-reservations-table.sql` — Reservation lifecycle tracking
- `003-create-inventory-ledger-table.sql` — Append-only audit log

### Order Service (services/order-service/src/migrations/)
- `001-create-orders-table.sql` — Order master record
- `002-create-order-items-table.sql` — Order line items
- `003-create-order-events-table.sql` — Event sourcing audit trail

### Payment Service (services/payment-service/src/migrations/)
- `001-create-payment-intents-table.sql` — Payment tracking
- `002-create-transactions-table.sql` — Financial transaction log
- `003-create-idempotency-keys-table.sql` — Idempotency tracking for Stripe

---

## Troubleshooting

### Migration Fails in Production
1. Check logs: `docker logs <service>` for error message
2. Do NOT manually fix database — apply fix via new migration
3. Roll back if critical: `pnpm run migrate:down -- --count 1`
4. Fix code/migration, commit, redeploy

### Lost Migration History
- **Problem:** Someone manually edited a migration file after commit
- **Prevention:** Pre-commit hook that prevents changes to committed migrations
- **Recovery:** Git reset to last known good commit, reapply migration

### Data Out of Sync
- **Problem:** Production database schema doesn't match migration history
- **Prevention:** Always migrate through versioned files, never manual SQL
- **Recovery:** Restore from backup, replay migrations from version control

---

## Commands Cheat Sheet

```bash
# Create new migration
pnpm run migrate:create "description"

# Apply all pending migrations
pnpm run migrate:up

# Rollback last migration
pnpm run migrate:down

# Rollback N migrations
pnpm run migrate:down -- --count N

# Check status
pnpm run migrate:status

# Redo (rollback + reapply last)
pnpm run migrate:redo
```

---

## Monitoring

### Alerts
- Migration takes > 5 minutes → investigate N+1 queries
- Rollback in production → page oncall immediately

### Metrics
- `db_migration_duration_seconds` — time to apply each migration
- `db_migration_status` — 0 (failed) / 1 (success)
- `db_pending_migrations_count` — count of unapplied migrations
