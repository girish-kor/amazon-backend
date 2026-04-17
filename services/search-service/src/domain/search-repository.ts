/**
 * Search repository interface
 */

import { SearchProduct, SearchQuery, SearchResult } from './search';

export interface ISearchRepository {
  search(query: SearchQuery): Promise<SearchResult>;
  indexProduct(product: SearchProduct): Promise<void>;
  deleteProduct(productId: string): Promise<void>;
  clearIndex(): Promise<void>;
}
