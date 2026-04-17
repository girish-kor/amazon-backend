#!/bin/bash

# E-Commerce Backend Infrastructure Teardown Script
# Stops all running services and cleans up volumes (optional)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping E-Commerce Backend Infrastructure...${NC}"

# Navigate to infra/docker directory
cd "$(dirname "$0")"

# Stop services
docker-compose down

echo -e "${GREEN}All services stopped.${NC}"

# Ask if user wants to remove volumes
read -p "Do you want to remove all volumes? This will delete all data. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Removing volumes...${NC}"
    docker-compose down -v
    echo -e "${GREEN}Volumes removed.${NC}"
fi

echo -e "${YELLOW}Cleanup complete.${NC}"
