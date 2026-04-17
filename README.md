# E-Commerce Backend Monorepo

Large-scale production-grade e-commerce backend built with microservices architecture.

## Architecture

- **7 Domain Services:** Auth, Catalog, Inventory, Cart, Order, Payment, Search
- **1 API Gateway:** Single entry point with JWT validation and rate limiting
- **Event-driven:** Apache Kafka for async inter-service communication
- **Polyglot Persistence:** PostgreSQL (relational), MongoDB (flexible schema), Elasticsearch (search), Redis (cache)
- **Observability:** OpenTelemetry tracing, Prometheus metrics, Grafana dashboards

See [docs/architecture/](docs/architecture/) for detailed architecture documentation.

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Local Development

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, MongoDB, Redis, Kafka, Elasticsearch, Jaeger)
pnpm infra:up

# Run all services in development mode
pnpm dev

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format
```

### Project Structure

```
/
├── services/
│   ├── api-gateway/          # Express gateway with JWT validation, rate limiting
│   ├── auth/                 # User authentication and JWT issuance
│   ├── catalog/              # Product metadata (MongoDB)
│   ├── inventory/            # Stock management and reservations (PostgreSQL)
│   ├── cart/                 # Shopping cart (Redis)
│   ├── order/                # Order lifecycle (PostgreSQL)
│   ├── payment/              # Payment processing (PostgreSQL)
│   └── search/               # Full-text search (Elasticsearch)
├── packages/
│   ├── shared-types/         # TypeScript interfaces and types
│   ├── shared-errors/        # Standardized error classes
│   ├── shared-logger/        # Pino logger with OpenTelemetry
│   ├── shared-middleware/    # Auth, validation, security middleware
│   ├── shared-messaging/     # Kafka producer/consumer
│   ├── shared-telemetry/     # OpenTelemetry SDK setup
│   ├── shared-http-client/   # HTTP client with circuit breaker
│   └── shared-cache/         # Redis caching utilities
├── infra/
│   ├── docker/               # Docker Compose for local dev
│   ├── k8s/                  # Kubernetes manifests & Helm charts
│   └── terraform/            # Infrastructure as Code
└── docs/
    ├── architecture/         # System design documents
    ├── api-contracts/        # OpenAPI 3.1 specifications
    └── events/               # Kafka event schemas
```

## Documentation

- [Architecture Decision Record](docs/architecture/ADR-001-microservices-vs-monolith.md)
- [Domain Boundaries](docs/architecture/domain-map.md)
- [Service Interactions](docs/architecture/service-interaction-diagram.md)
- [Data Flows](docs/architecture/data-flow.md)
- [API Contracts](docs/api-contracts/)
- [Event Catalog](docs/events/event-catalog.md)

## Development Workflow

### Creating a new service or package

```bash
# Create service directory
mkdir services/my-service
cd services/my-service

# Initialize with clean architecture
pnpm add -w --save-dev typescript @types/node

# Create src directory structure (see T05 for structure)
```

### Running tests

```bash
# Unit tests
pnpm test:unit

# Integration tests (requires infra:up)
pnpm test:integration

# All tests
pnpm test
```

### Deploying

See CI/CD documentation in [Phase 10](docs/deployment/).

## Status

- **Phase 1:** ✅ System Design & Architecture (T01-T03)
- **Phase 2:** 🟡 Project Bootstrapping (T04-T05)
- **Phase 3:** ⬜ Core Infrastructure (T06-T08)
- **Phase 4:** ⬜ Service Development (T09-T15)
- **Phase 5:** ⬜ Inter-Service Communication (T16-T17)
- **Phase 6:** ⬜ Data Management (T18-T20)
- **Phase 7:** ⬜ Security & Authentication (T21-T22)
- **Phase 8:** ⬜ Performance (T23-T24)
- **Phase 9:** ⬜ Testing (T25-T27)
- **Phase 10:** ⬜ DevOps & Deployment (T28-T31)

## License

MIT
