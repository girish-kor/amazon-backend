/**
 * Gateway configuration
 */

export interface ServiceConfig {
  name: string;
  url: string;
  timeout: number;
  retries: number;
  circuitBreakerThreshold: number;
}

export const SERVICES: Record<string, ServiceConfig> = {
  auth: {
    name: 'auth-service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    timeout: 5000,
    retries: 2,
    circuitBreakerThreshold: 5,
  },
  catalog: {
    name: 'catalog-service',
    url: process.env.CATALOG_SERVICE_URL || 'http://localhost:3002',
    timeout: 5000,
    retries: 2,
    circuitBreakerThreshold: 5,
  },
  inventory: {
    name: 'inventory-service',
    url: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
    timeout: 5000,
    retries: 2,
    circuitBreakerThreshold: 5,
  },
  cart: {
    name: 'cart-service',
    url: process.env.CART_SERVICE_URL || 'http://localhost:3004',
    timeout: 5000,
    retries: 2,
    circuitBreakerThreshold: 5,
  },
  order: {
    name: 'order-service',
    url: process.env.ORDER_SERVICE_URL || 'http://localhost:3005',
    timeout: 5000,
    retries: 2,
    circuitBreakerThreshold: 5,
  },
  payment: {
    name: 'payment-service',
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
    timeout: 5000,
    retries: 2,
    circuitBreakerThreshold: 5,
  },
  search: {
    name: 'search-service',
    url: process.env.SEARCH_SERVICE_URL || 'http://localhost:3007',
    timeout: 5000,
    retries: 2,
    circuitBreakerThreshold: 5,
  },
};

export const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // requests per window
};

export const ROUTES = {
  '/auth': 'auth',
  '/products': 'catalog',
  '/inventory': 'inventory',
  '/cart': 'cart',
  '/orders': 'order',
  '/payments': 'payment',
  '/search': 'search',
};
