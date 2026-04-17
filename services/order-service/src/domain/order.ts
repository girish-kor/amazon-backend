/**
 * Order entity and value objects
 */

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'payment_processing' | 'confirmed' | 'cancelled' | 'completed';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderRequest {
  userId: string;
  items: OrderItem[];
  total: number;
  shippingAddress: Order['shippingAddress'];
}
