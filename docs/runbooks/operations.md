# Comprehensive Production Runbooks

## Runbook: Service Down / Troubleshooting

### Symptom: Service is returning 500 errors or timing out

**Step 1: Identify which service is down**
```bash
# Check all service health endpoints
for service in auth catalog inventory cart order payment search; do
  curl -s http://localhost:3000/health | jq '.service'
done

# Or check Prometheus metrics
curl http://prometheus:9090/api/v1/query?query=up
```

**Step 2: Check service logs**
```bash
docker logs amazon-backend-<service>-1 --tail 100
# Look for: startup errors, connection failures, crashes

# Or check centralized logs (if using Loki)
curl -G -s http://loki:3100/loki/api/v1/query_range \
  --data-urlencode 'query={service="<service>"}' \
  --data-urlencode 'start=5m'
```

**Step 3: Check dependencies**
```bash
# Database connectivity
psql -h postgres -U postgres -c "SELECT 1"

# Redis connectivity
redis-cli ping

# Kafka connectivity
kafka-topics --list --bootstrap-server kafka:9092

# Elasticsearch connectivity
curl elasticsearch:9200/_health
```

**Step 4: Restart service**
```bash
docker-compose restart <service>
# Monitor logs until it reaches "listening on port XXX"
```

**Step 5: Verify recovery**
```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

---

## Runbook: Kafka Consumer Lag

### Symptom: Events not being processed, DLQ has messages

**Step 1: Check consumer lag**
```bash
kafka-consumer-groups --bootstrap-server kafka:9092 \
  --group <service>-consumer-group \
  --describe

# Look for LAG column - should be 0 or low
# If LAG > 1000, consumer is falling behind
```

**Step 2: Check DLQ for failed messages**
```bash
kafka-console-consumer --bootstrap-server kafka:9092 \
  --topic <topic>.dlq \
  --from-beginning \
  --max-messages 10
```

**Step 3: Investigate failure reason**
```bash
# Check service logs for consumer error
docker logs amazon-backend-<service>-1 | grep -i "dlq\|failed\|error"
```

**Step 4: Drain DLQ (if messages are recoverable)**
```bash
# Re-publish DLQ messages back to main topic (after fixing root cause)
kafka-console-consumer --bootstrap-server kafka:9092 \
  --topic <topic>.dlq | \
kafka-console-producer --broker-list kafka:9092 \
  --topic <topic>

# Or use a DLQ handler service to process and log
```

---

## Runbook: Inventory Discrepancy

### Symptom: Stock counts don't match reality

**Step 1: Check current inventory**
```sql
SELECT product_id, quantity_available, quantity_reserved, 
       quantity_available + quantity_reserved AS total
FROM inventory_levels
ORDER BY total DESC;
```

**Step 2: Check reservation state**
```sql
SELECT product_id, status, COUNT(*) as count, SUM(quantity) as qty
FROM reservations
GROUP BY product_id, status;
```

**Step 3: Verify against order history**
```sql
-- Check confirmed orders
SELECT SUM(quantity) FROM order_items 
WHERE order_id IN (SELECT id FROM orders WHERE status = 'confirmed');
```

**Step 4: Reconcile**
```sql
-- If mismatch found, write correction via inventory audit trail
INSERT INTO inventory_ledger (product_id, delta, reason, reference_id)
VALUES ($product_id, $delta_qty, 'Manual reconciliation', $reference_id);

-- Update inventory_levels
UPDATE inventory_levels 
SET quantity_available = quantity_available + $delta_qty
WHERE product_id = $product_id;
```

---

## Runbook: Deployment Rollback

### If deployment to production has critical issues

```bash
# List Helm release history
helm history ecommerce -n ecommerce-prod

# Rollback to previous release
helm rollback ecommerce -n ecommerce-prod 3  # Rollback to release 3

# Verify rollback
kubectl rollout status deployment/<service> -n ecommerce-prod

# Check service health
curl https://api.ecommerce.com/health
```

---

## Runbook: JWT Key Rotation

### Scheduled quarterly rotation or emergency key rotation

**Step 1: Generate new keys**
```bash
openssl genrsa -out /tmp/private_new.pem 2048
openssl rsa -in /tmp/private_new.pem -pubout -out /tmp/public_new.pem
```

**Step 2: Update Auth service secret**
```bash
# Set new key in environment variable
export JWT_PRIVATE_KEY_NEW=$(cat /tmp/private_new.pem | base64)

# Update Kubernetes secret
kubectl patch secret auth-jwt-keys -n ecommerce-prod \
  -p '{"data":{"JWT_PRIVATE_KEY_NEW":"'$JWT_PRIVATE_KEY_NEW'"}}'
```

**Step 3: Deploy Auth service**
```bash
# New version signs tokens with old key, keeps new key ready
kubectl set env deployment/auth \
  JWT_PUBLIC_KEY_NEW=$JWT_PUBLIC_KEY_NEW \
  -n ecommerce-prod

# Monitor JWKS endpoint - should return both old and new keys
curl https://api.ecommerce.com/auth/.well-known/jwks.json | jq '.keys | length'
```

**Step 4: Wait 24 hours for token overlap**
```bash
# All old tokens continue working, all new tokens signed with new key
```

**Step 5: Complete rotation**
```bash
# After 24 hours, remove old key
kubectl set env deployment/auth JWT_PRIVATE_KEY=- -n ecommerce-prod
# (This removes the old key from environment)

# Redeploy to pick up change
kubectl rollout restart deployment/auth -n ecommerce-prod
```

---

## Post-Mortem Template

Use this template after any production incident:

```markdown
# Post-Mortem: [Brief Description]

## Timeline
- **14:30 UTC** - Alert triggered: p99 latency spike
- **14:32 UTC** - On-call investigates, identifies Elasticsearch timeout
- **14:45 UTC** - Root cause: Elasticsearch disk full
- **15:10 UTC** - Mitigation: Added disk space
- **15:20 UTC** - Service recovered, p99 latency normalized

## Impact
- Duration: 50 minutes
- Services affected: Search Service (read-only, users saw cached results)
- Requests failed: ~2% of search requests timed out
- Revenue impact: $0 (cache prevented most user-facing errors)

## Root Cause
Elasticsearch disk filled due to large index without retention policy. New products indexed continuously but old product versions never cleaned up.

## Remediation
1. Configured Elasticsearch index retention (30 days)
2. Implemented index lifecycle management (ILM) policy
3. Added automated disk usage alerting (alert at 80%)

## Prevention
- [ ] Add Elasticsearch disk usage to Prometheus dashboards
- [ ] Add PagerDuty alert for disk > 80%
- [ ] Document ILM policy in runbooks
- [ ] Add quarterly index audit to maintenance calendar

## Lessons Learned
- Stateful services (databases, search engines) need dedicated monitoring
- Cache provides resilience for read-heavy services like Search
- Automated disk cleanup prevents cascading failures
```
