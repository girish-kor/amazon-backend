# Docker Infrastructure Setup

This directory contains Docker Compose configuration and utilities for local development of the E-Commerce Backend.

## Services

- **PostgreSQL** (5432): Relational database for Auth, Inventory, Order, Payment services
- **MongoDB** (27017): NoSQL database for Catalog service
- **Redis** (6379): In-memory cache for Cart service and distributed caching
- **Apache Kafka** (9092): Event streaming for async communication between services
- **Zookeeper** (2181): Kafka coordination service
- **Elasticsearch** (9200): Search indexing for the Search service
- **Jaeger** (16686): Distributed tracing and observability
- **Prometheus** (9090): Metrics collection and alerting
- **Grafana** (3000): Metrics visualization dashboards
- **Loki** (3100): Log aggregation and querying
- **PgAdmin** (5050): PostgreSQL management UI (optional)
- **Kafka UI** (8080): Kafka topic management UI (optional)

## Quick Start

### Start All Services

```bash
./start.sh
```

Or manually:

```bash
docker-compose up -d
```

### Stop All Services

```bash
./stop.sh
```

Or manually:

```bash
docker-compose down
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f [service-name]
```

### Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| PostgreSQL | localhost:5432 | postgres:password |
| MongoDB | localhost:27017 | admin:password |
| Redis | localhost:6379 | - |
| Kafka | localhost:9092 | - |
| Elasticsearch | localhost:9200 | - |
| Jaeger UI | http://localhost:16686 | - |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3000 | admin:admin |
| Loki | http://localhost:3100 | - |
| PgAdmin | http://localhost:5050 | admin@admin.com:admin |
| Kafka UI | http://localhost:8080 | - |

## Configuration

### PostgreSQL

- Default database: `ecommerce`
- Default user: `postgres`
- Default password: `password`
- Port: `5432`

### MongoDB

- Default database: `ecommerce`
- Root user: `admin`
- Root password: `password`
- Port: `27017`

### Redis

- Default port: `6379`
- No authentication required in dev

### Kafka

- Bootstrap servers: `localhost:9092` (from host) or `kafka:29092` (from container)
- Zookeeper: `localhost:2181`
- Topics auto-created on message produce (can be disabled)

### Elasticsearch

- Default port: `9200`
- Security disabled for development

### Jaeger

- UI: `http://localhost:16686`
- Agent UDP port: `6831`
- Collector HTTP port: `14268`

### Prometheus

- Configuration file: `prometheus.yml`
- Scrapes metrics from all services on `/metrics` endpoint every 10s

### Grafana

- Default admin user: `admin`
- Default admin password: `admin`
- Change password on first login

### Loki

- Configuration file: `loki-config.yml`
- Stores logs in local filesystem under `/loki/chunks`

## Data Persistence

All services use named Docker volumes for data persistence:

- `postgres_data`: PostgreSQL data directory
- `mongo_data`: MongoDB data directory
- `redis_data`: Redis data directory
- `kafka_data`: Kafka broker logs
- `zookeeper_data`: Zookeeper state
- `elasticsearch_data`: Elasticsearch indices
- `prometheus_data`: Prometheus time-series data
- `grafana_data`: Grafana configuration and dashboards
- `loki_data`: Loki logs

Volumes are NOT automatically deleted when running `docker-compose down`. Use `docker-compose down -v` to remove volumes.

## Health Checks

All services include health checks. View status with:

```bash
docker-compose ps
```

## Troubleshooting

### Services not starting

1. Check Docker daemon is running: `docker ps`
2. View logs: `docker-compose logs [service-name]`
3. Ensure ports are not already in use: `netstat -tuln` (macOS/Linux)
4. Check resource availability (memory, disk space)

### Port already in use

If a port is already in use, modify the port mapping in `docker-compose.yml`:

```yaml
services:
  postgres:
    ports:
      - '5432:5432'  # Change first 5432 to any available port
```

### Cannot connect to database

1. Verify service is running: `docker-compose ps`
2. Check health status: `docker-compose ps`
3. View logs: `docker-compose logs postgres`
4. Ensure firewall allows connections to localhost

### Elasticsearch out of memory

Increase JVM heap size in `docker-compose.yml`:

```yaml
elasticsearch:
  environment:
    ES_JAVA_OPTS: '-Xms1g -Xmx1g'  # Increase from 512m
```

## Development Workflow

1. Start infrastructure: `./start.sh`
2. Run services: `pnpm dev` (from project root)
3. Services will connect to Docker containers automatically (configured in `.env`)
4. Use monitoring dashboards: Jaeger (16686), Grafana (3000), Prometheus (9090)
5. When done: `./stop.sh`

## Production Considerations

This Docker Compose configuration is **only for local development**. For production:

- Use Kubernetes with helm charts (see `/infra/k8s`)
- Enable authentication and security (SSL/TLS, secrets management)
- Separate monitoring infrastructure
- Use managed services (Amazon RDS, DynamoDB, ElastiCache, etc.)
- Implement proper backup and disaster recovery
- Use container registries and orchestration

See main project README for deployment instructions.
