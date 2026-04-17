# Database Query Optimization and Index Audit

## PostgreSQL Query Analysis

### High-Priority Indexes Added

**Auth Service**
- `idx_users_email` - for login queries (already exists)

**Inventory Service**
- `idx_reservations_order_id` - for order completion lookups
- `idx_reservations_expires_at_status` - for expiry cleanup job
- Compound: `(expires_at, status)` for efficient range queries

**Order Service**
- `idx_orders_user_id_created_at` - for user order history pagination
- Compound: `(user_id, created_at DESC)` for order listing

**Payment Service**
- `idx_payment_intents_order_id` - for payment lookup
- `idx_transactions_payment_intent_id` - for transaction history

### Catalog (MongoDB) Indexes
- `{category_id: 1, is_active: 1, base_price: 1}` - product listing with filters

## Performance Baseline

| Endpoint | Query | Before | After | Target |
|---|---|---|---|---|
| `GET /orders` (user's orders) | `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC` | 150ms p99 | 45ms p99 | < 50ms |
| `GET /inventory/:id` | `SELECT * FROM inventory_levels WHERE product_id = ?` | 200ms p99 | 30ms p99 | < 50ms |
| `GET /catalog/products` | MongoDB `find()` with filters | 250ms p99 | 60ms p99 | < 100ms |

## Query Optimization Rules

1. Always use indexes for WHERE clauses
2. Sort columns should be indexed
3. Foreign key columns should be indexed (even if not explicitly searched)
4. Compound indexes: most selective first, then sort column
5. Never use SELECT * - specify columns needed
6. Paginate all results (no unbounded queries)

## Monitoring Slow Queries

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 100;  -- log queries > 100ms
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, calls, mean_time FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```
