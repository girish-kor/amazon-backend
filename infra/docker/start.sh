#!/bin/bash

# E-Commerce Backend Infrastructure Setup Script
# Starts all services required for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting E-Commerce Backend Infrastructure...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker daemon is not running. Please start Docker first.${NC}"
    exit 1
fi

# Navigate to infra/docker directory
cd "$(dirname "$0")"

# Pull latest images
echo -e "${YELLOW}Pulling latest images...${NC}"
docker-compose pull

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker-compose up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"

SERVICES=("postgres" "mongo" "redis" "kafka" "elasticsearch" "jaeger" "prometheus" "grafana" "loki")

for service in "${SERVICES[@]}"; do
    echo -n "Waiting for $service... "
    while [ "$(docker-compose ps $service -q)" == "" ] || [ "$(docker-compose exec -T $service true 2>/dev/null)" != "" ]; do
        echo -n "."
        sleep 2
    done
    echo -e "${GREEN}OK${NC}"
done

echo -e "${GREEN}All services started successfully!${NC}"

echo -e "\n${YELLOW}Service URLs:${NC}"
echo "PostgreSQL:    localhost:5432 (postgres:password)"
echo "MongoDB:       localhost:27017 (admin:password)"
echo "Redis:         localhost:6379"
echo "Kafka:         localhost:9092"
echo "Elasticsearch: localhost:9200"
echo "Jaeger UI:     http://localhost:16686"
echo "Prometheus:    http://localhost:9090"
echo "Grafana:       http://localhost:3000 (admin:admin)"
echo "Loki:          http://localhost:3100"
echo "PgAdmin:       http://localhost:5050 (admin@admin.com:admin)"
echo "Kafka UI:      http://localhost:8080"

echo -e "\n${YELLOW}To stop services, run:${NC}"
echo "docker-compose down"

echo -e "\n${YELLOW}To view logs:${NC}"
echo "docker-compose logs -f [service-name]"
