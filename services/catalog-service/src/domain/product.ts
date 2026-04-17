/**
 * Product entity and value objects
 */

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  categoryId: string;
  images: string[];
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  basePrice: number;
  currency: string;
  categoryId: string;
  images?: string[];
}

export interface ProductFilter {
  categoryId?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}
