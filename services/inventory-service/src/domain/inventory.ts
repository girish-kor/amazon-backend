/**
 * Inventory entity and value objects
 */

export interface InventoryLevel {
  id: string;
  productId: string;
  quantity: number;
  reserved: number;
  available: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  inventoryId: string;
  productId: string;
  quantity: number;
  orderId: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
  expiresAt: Date;
  confirmedAt?: Date;
}

export interface ReservationRequest {
  productId: string;
  quantity: number;
  orderId: string;
  expiryMinutes?: number;
}
