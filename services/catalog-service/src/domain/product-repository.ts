/**
 * Product repository interface
 */

import { Product, CreateProductRequest, ProductFilter } from './product';

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findAll(filter: ProductFilter): Promise<{ items: Product[]; total: number }>;
  create(request: CreateProductRequest): Promise<Product>;
  update(id: string, product: Partial<Product>): Promise<Product>;
  delete(id: string): Promise<void>;
}
