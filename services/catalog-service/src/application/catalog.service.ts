/**
 * Product service business logic
 */

import { Product, CreateProductRequest, ProductFilter } from '../domain/product';
import { IProductRepository } from '../domain/product-repository';
import { ValidationError, ConflictError, NotFoundError } from '@shared/errors';

export class CatalogService {
  constructor(private productRepository: IProductRepository) {}

  /**
   * Get all products with filtering
   */
  async getProducts(filter: ProductFilter): Promise<{ items: Product[]; total: number }> {
    // Validate pagination
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));

    return this.productRepository.findAll({
      ...filter,
      page,
      limit,
    });
  }

  /**
   * Get product by ID
   */
  async getProduct(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  /**
   * Create new product
   */
  async createProduct(request: CreateProductRequest): Promise<Product> {
    // Validate input
    if (!request.sku || !request.name || request.basePrice === undefined) {
      throw new ValidationError('SKU, name, and basePrice are required');
    }

    if (request.basePrice <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }

    // Check if SKU already exists
    const existing = await this.productRepository.findBySku(request.sku);
    if (existing) {
      throw new ConflictError('Product with this SKU already exists');
    }

    return this.productRepository.create(request);
  }

  /**
   * Update product
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    // Verify product exists
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Validate updates
    if (updates.basePrice !== undefined && updates.basePrice <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }

    return this.productRepository.update(id, updates);
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<void> {
    // Verify product exists
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await this.productRepository.delete(id);
  }
}
