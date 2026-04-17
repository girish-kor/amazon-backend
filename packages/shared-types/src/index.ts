/**
 * Shared types and interfaces for all services
 */

export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
  currency: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryLevel {
  productId: string;
  quantityAvailable: number;
  quantityReserved: number;
  quantityCommitted: number;
  updatedAt: Date;
}

export interface OrderStatus {
  id: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'payment_failed' | 'refunded';
  totalAmount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  recordedAt: Date;
  correlationId: string;
  causationId: string | null;
  schemaVersion: string;
  payload: unknown;
}

export interface ServiceRequest {
  requestId: string;
  userId?: string;
  traceId: string;
  timestamp: Date;
}
