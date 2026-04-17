/**
 * Elasticsearch search repository implementation
 */

import { Client } from '@elastic/elasticsearch';
import { SearchProduct, SearchQuery, SearchResult } from '../domain/search';
import { ISearchRepository } from '../domain/search-repository';

export class ElasticsearchRepository implements ISearchRepository {
  private indexName = 'products';

  constructor(private client: Client) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    const must: any[] = [];
    const filter: any[] = [];

    // Full-text search
    if (query.q) {
      must.push({
        multi_match: {
          query: query.q,
          fields: ['name^2', 'description'],
        },
      });
    }

    // Category filter
    if (query.categoryId) {
      filter.push({ term: { categoryId: query.categoryId } });
    }

    // Stock filter
    if (query.inStock !== undefined) {
      filter.push({ term: { inStock: query.inStock } });
    }

    // Price range filter
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceRange: any = {};
      if (query.minPrice !== undefined) priceRange.gte = query.minPrice;
      if (query.maxPrice !== undefined) priceRange.lte = query.maxPrice;
      filter.push({ range: { basePrice: priceRange } });
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const from = (page - 1) * limit;

    try {
      const response = await this.client.search({
        index: this.indexName,
        body: {
          query: {
            bool: {
              must: must.length > 0 ? must : [{ match_all: {} }],
              filter,
            },
          },
          from,
          size: limit,
          sort: [{ createdAt: { order: 'desc' } }],
        },
      });

      const items = response.hits.hits.map((hit: any) => hit._source as SearchProduct);
      const total = (response.hits.total as any).value;

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      // Return empty results if index doesn't exist yet
      return {
        items: [],
        total: 0,
        page,
        limit,
      };
    }
  }

  async indexProduct(product: SearchProduct): Promise<void> {
    await this.client.index({
      index: this.indexName,
      id: product.id,
      body: product,
      refresh: true,
    });
  }

  async deleteProduct(productId: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id: productId,
        refresh: true,
      });
    } catch {
      // Ignore if product doesn't exist
    }
  }

  async clearIndex(): Promise<void> {
    try {
      await this.client.indices.delete({ index: this.indexName });
    } catch {
      // Ignore if index doesn't exist
    }
  }
}
