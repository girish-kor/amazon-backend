# Catalog Service

Product catalog management with MongoDB.

## Features

- **Product CRUD**: Create, read, update, delete products
- **Product Search**: Filter by category, price range, stock status
- **Pagination**: Configurable page size and offset
- **MongoDB**: Document-based product storage
- **SKU Uniqueness**: Enforce unique SKUs
- **Full Indexing**: Optimized MongoDB indexes for common queries

## API Endpoints

### List Products

```bash
GET /products?page=1&limit=20&categoryId=cat-001&inStock=true&minPrice=50&maxPrice=500

Response (200):
{
  "items": [
    {
      "id": "prod_xxx",
      "sku": "PROD-001",
      "name": "Product Name",
      "description": "...",
      "basePrice": 99.99,
      "currency": "USD",
      "categoryId": "cat-001",
      "images": ["url1", "url2"],
      "inStock": true,
      "createdAt": "2026-04-17T...",
      "updatedAt": "2026-04-17T..."
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### Get Product

```bash
GET /products/{id}

Response (200):
{
  "id": "prod_xxx",
  "sku": "PROD-001",
  "name": "Product Name",
  ...
}
```

### Create Product

```bash
POST /products
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "sku": "PROD-001",
  "name": "Product Name",
  "description": "Product description",
  "basePrice": 99.99,
  "currency": "USD",
  "categoryId": "cat-001",
  "images": ["url1", "url2"]
}

Response (201):
{
  "id": "prod_xxx",
  "sku": "PROD-001",
  ...
}
```

### Update Product

```bash
PUT /products/{id}
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "name": "Updated Name",
  "basePrice": 129.99,
  "inStock": false
}

Response (200):
{
  "id": "prod_xxx",
  ...
}
```

### Delete Product

```bash
DELETE /products/{id}
Authorization: Bearer <ACCESS_TOKEN>

Response (204): No content
```

## Database Schema

MongoDB collections:

```javascript
// Products collection
db.createCollection('products');

// Indexes
db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ categoryId: 1 });
db.products.createIndex({ inStock: 1 });
db.products.createIndex({ createdAt: -1 });
```

## Configuration

Environment variables:

```bash
# Server
CATALOG_SERVICE_PORT=3002
NODE_ENV=development
LOG_LEVEL=info

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=ecommerce
```

## Development

### Start Service

```bash
pnpm dev
```

Service runs on port 3002 (or `CATALOG_SERVICE_PORT` if set).

### Test Endpoints

```bash
# List products
curl http://localhost:3002/products

# Get product
curl http://localhost:3002/products/prod_xxx

# Create product (requires auth)
curl -X POST http://localhost:3002/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "sku":"PROD-001",
    "name":"Product",
    "basePrice":99.99,
    "currency":"USD",
    "categoryId":"cat-001"
  }'
```

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "message": "SKU, name, and basePrice are required",
    "code": "VALIDATION_ERROR"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "message": "Product not found",
    "code": "NOT_FOUND"
  }
}
```

### 409 Conflict
```json
{
  "error": {
    "message": "Product with this SKU already exists",
    "code": "CONFLICT"
  }
}
```

## Performance Considerations

1. **Pagination**: Always use pagination for list endpoints
2. **Indexes**: MongoDB indexes on frequently filtered fields
3. **Caching**: Consider caching product data in Redis
4. **Lazy Loading**: Load related data on-demand
5. **Aggregation**: Use MongoDB aggregation pipeline for complex queries

## Production Deployment

1. Enable MongoDB authentication
2. Use connection pooling
3. Implement data replication
4. Enable backups
5. Monitor query performance
6. Implement full-text search for products
7. Add product recommendations engine
8. Implement inventory sync with Inventory Service
9. Add product versioning
10. Implement soft deletes for audit trail
