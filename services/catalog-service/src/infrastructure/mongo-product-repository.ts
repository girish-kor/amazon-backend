/**
 * MongoDB product repository implementation
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { Product, CreateProductRequest, ProductFilter } from '../domain/product';
import { IProductRepository } from '../domain/product-repository';

export class MongoProductRepository implements IProductRepository {
  private collection: Collection<Product>;

  constructor(db: Db) {
    this.collection = db.collection<Product>('products');
  }

  async findById(id: string): Promise<Product | null> {
    const product = await this.collection.findOne({ id });
    return product || null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const product = await this.collection.findOne({ sku });
    return product || null;
  }

  async findAll(filter: ProductFilter): Promise<{ items: Product[]; total: number }> {
    const query: any = {};

    if (filter.categoryId) {
      query.categoryId = filter.categoryId;
    }

    if (filter.inStock !== undefined) {
      query.inStock = filter.inStock;
    }

    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      query.basePrice = {};
      if (filter.minPrice !== undefined) {
        query.basePrice.$gte = filter.minPrice;
      }
      if (filter.maxPrice !== undefined) {
        query.basePrice.$lte = filter.maxPrice;
      }
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.collection.find(query).skip(skip).limit(limit).toArray(),
      this.collection.countDocuments(query),
    ]);

    return { items, total };
  }

  async create(request: CreateProductRequest): Promise<Product> {
    const id = this.generateId();
    const now = new Date();

    const product: Product = {
      id,
      sku: request.sku,
      name: request.name,
      description: request.description || '',
      basePrice: request.basePrice,
      currency: request.currency,
      categoryId: request.categoryId,
      images: request.images || [],
      inStock: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.insertOne(product);
    return product;
  }

  async update(id: string, product: Partial<Product>): Promise<Product> {
    const updated = {
      ...product,
      updatedAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: updated },
      { returnDocument: 'after' },
    );

    if (!result.value) {
      throw new Error('Product not found');
    }

    return result.value;
  }

  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
  }

  private generateId(): string {
    return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
