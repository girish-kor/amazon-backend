/**
 * Search entity and value objects
 */

export interface SearchProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  categoryId: string;
  inStock: boolean;
  createdAt: Date;
}

export interface SearchQuery {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  items: SearchProduct[];
  total: number;
  page: number;
  limit: number;
}
