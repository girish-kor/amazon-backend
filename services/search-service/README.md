# Search Service

Full-text product search powered by Elasticsearch.

## Features

- **Full-Text Search**: Search products by name and description
- **Filtering**: Filter by category, price range, stock status
- **Ranking**: Results ranked by relevance
- **Pagination**: Configurable page size
- **Elasticsearch**: Distributed search and analytics engine
- **Real-Time Indexing**: Products indexed immediately

## API Endpoints

### Search Products

```bash
GET /search?q=laptop&categoryId=electronics&minPrice=500&maxPrice=2000&inStock=true&page=1&limit=20

Response (200):
{
  "items": [
    {
      "id": "prod_001",
      "sku": "LAPTOP-001",
      "name": "High-Performance Laptop",
      "description": "Fast processor, 16GB RAM",
      "basePrice": 1299.99,
      "currency": "USD",
      "categoryId": "electronics",
      "inStock": true,
      "createdAt": "2026-04-17T..."
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

## Query Parameters

- `q` - Full-text search query
- `categoryId` - Filter by category
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `inStock` - Filter by stock status (true/false)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)

## Configuration

Environment variables:

```bash
# Server
SEARCH_SERVICE_PORT=3007
NODE_ENV=development
LOG_LEVEL=info

# Elasticsearch
ELASTICSEARCH_URI=http://localhost:9200
```

## Development

### Start Service

```bash
pnpm dev
```

Service runs on port 3007 (or `SEARCH_SERVICE_PORT` if set).

### Test Endpoints

```bash
# Simple search
curl "http://localhost:3007/search?q=laptop"

# Filtered search
curl "http://localhost:3007/search?q=laptop&categoryId=electronics&minPrice=500&maxPrice=2000&inStock=true"

# Paginated search
curl "http://localhost:3007/search?q=laptop&page=2&limit=50"
```

## Elasticsearch Index

Index name: `products`

Mappings:
```json
{
  "id": { "type": "keyword" },
  "sku": { "type": "keyword" },
  "name": { "type": "text" },
  "description": { "type": "text" },
  "basePrice": { "type": "double" },
  "currency": { "type": "keyword" },
  "categoryId": { "type": "keyword" },
  "inStock": { "type": "boolean" },
  "createdAt": { "type": "date" }
}
```

## Indexing Workflow

1. Product created in Catalog Service
2. Event published to Kafka: `product.created`
3. Search Service consumes event
4. Product indexed in Elasticsearch
5. Search returns results

## Performance Considerations

1. **Indexing**: Asynchronous via Kafka events
2. **Caching**: Cache search results in Redis
3. **Aggregations**: Use Elasticsearch aggregations for facets
4. **Boost**: Boost name field for higher relevance
5. **Sharding**: Increase shards for higher throughput

## Production Deployment

1. Set up Elasticsearch cluster
2. Enable authentication
3. Implement index lifecycle management (ILM)
4. Add index snapshots for backups
5. Monitor cluster health
6. Implement search analytics
7. Add spell checking/suggestions
8. Implement synonym dictionary
9. Add relevance tuning
10. Implement search monitoring and alerts
