/**
 * Search service business logic
 */

import { SearchProduct, SearchQuery, SearchResult } from '../domain/search';
import { ISearchRepository } from '../domain/search-repository';
import { ValidationError } from '@shared/errors';

export class SearchService {
  constructor(private searchRepository: ISearchRepository) {}

  /**
   * Search products
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    // Validate pagination
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));

    return this.searchRepository.search({
      ...query,
      page,
      limit,
    });
  }

  /**
   * Index product for search
   */
  async indexProduct(product: SearchProduct): Promise<void> {
    if (!product.id || !product.name) {
      throw new ValidationError('Product ID and name are required');
    }

    await this.searchRepository.indexProduct(product);
  }

  /**
   * Remove product from search index
   */
  async removeProduct(productId: string): Promise<void> {
    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    await this.searchRepository.deleteProduct(productId);
  }
}
