# ADR-001: Microservices vs. Modular Monolith

## Status
ACCEPTED

## Context
Building a large-scale e-commerce backend that must support millions of users, thousands of concurrent orders per second, and radically different scaling requirements across different domains.

### Constraints
- **Inventory Management:** Requires extreme horizontal scaling under flash sale conditions (millions of reserved items per minute)
- **Search:** Needs Elasticsearch, full-text indexing, faceted search with sub-100ms p99 latency
- **Orders & Payments:** Require ACID guarantees, distributed transaction coordination across multiple services
- **Authentication:** Low-frequency writes (new users, password resets) but high-frequency reads (token validation on every request)
- **Product Catalog:** High read volume, low write volume, flexible schema (books vs. electronics have different attributes)

### Failure Modes
- A single service failure (e.g., Elasticsearch crash) must not bring down the entire platform
- Payment processing must not be impacted by catalog indexing latency
- Search service can be degraded (eventual consistency acceptable) while inventory must be strongly consistent
- Authentication service can have brief unavailability; order processing cannot

## Decision
**Adopt Microservices architecture** with the following service boundaries:

1. **User/Auth Service** — identity authority, JWT issuance
2. **Product Catalog Service** — product metadata, categories, pricing
3. **Inventory Service** — stock management, reservations
4. **Cart Service** — user shopping carts, checkout initiation
5. **Order Service** — order lifecycle, fulfillment coordination
6. **Payment Service** — transaction processing, refund handling
7. **Search Service** — full-text search, Elasticsearch index
8. **API Gateway** — single entry point, JWT validation, rate limiting

Each service is independently deployable, scalable, and has its own database.

## Rationale

### Why NOT a Modular Monolith?
- **Scaling Imbalance:** Inventory under load requires 10x scale, while Auth requires 0.5x. In a monolith, both scale together, wasting resources.
- **Technology Heterogeneity:** Inventory thrives on PostgreSQL's ACID guarantees. Search demands Elasticsearch. Merging these into one codebase creates impedance mismatches.
- **Failure Isolation:** Search latency (1 minute to index a million products) would block entire monolith deployments. Microservices isolate this risk.
- **Team Scalability:** With microservices, 3–4 teams can develop services in parallel after Phase 3. A monolith would create merge conflicts and coordination overhead.

### Why Microservices?
- **Independent Scaling:** Each service scales to its own demand curve
- **Technology Fit:** Each service chooses the best data model (SQL, NoSQL, search engine) for its problem
- **Failure Isolation:** One service degrading does not cascade to others (with proper circuit breakers)
- **Deployment Independence:** Auth service can deploy daily; Search can deploy weekly
- **Team Scalability:** Clear ownership boundaries allow parallel development

## Trade-offs Accepted

| Benefit | Cost |
|---------|------|
| Horizontal scalability | Operational complexity (monitoring, logging across services) |
| Technology fit per domain | Learning curve for distributed systems patterns |
| Independent team development | Distributed debugging, network latency, data consistency challenges |
| Failure isolation | Need for circuit breakers, timeouts, and saga coordination |

**Operational Overhead Mitigation:**
- OpenTelemetry tracing + Jaeger for request flow visibility
- Structured logging with correlation IDs
- Centralized monitoring with Prometheus + Grafana
- Dead letter queues for failed events

## Consequences

### Short-term
- Phase 1–3 (design + bootstrapping): 6–8 weeks for one developer to establish foundations
- Phase 4–5 (service development): Parallelizable across team members

### Long-term
- Production operations require investment in: distributed tracing, log aggregation, alert tuning
- Debugging a bug spanning 3 services requires understanding sagas, eventual consistency
- Network reliability becomes critical (latency + timeouts must be tuned)

### Deployment
- Cannot do blue-green deployment of entire system (services have independent lifecycles)
- Kafka as event backbone requires operational expertise (topic management, consumer groups, DLQ handling)

## Compliance
This decision is consistent with Amazon, Netflix, and Uber scale-out architectures. It trades operational complexity for the ability to independently scale and deploy each service.

## Approved By
Architecture Review Team — April 17, 2026
