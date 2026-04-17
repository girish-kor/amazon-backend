/**
 * Elasticsearch connection
 */

import { Client } from '@elastic/elasticsearch';
import { Logger } from 'pino';

export async function connectElasticsearch(logger: Logger): Promise<Client> {
  const url = process.env.ELASTICSEARCH_URI || 'http://localhost:9200';

  try {
    const client = new Client({ node: url });

    // Test connection
    await client.info();

    logger.info({ url }, 'Connected to Elasticsearch');

    // Create index if doesn't exist
    try {
      await client.indices.create({
        index: 'products',
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              sku: { type: 'keyword' },
              name: { type: 'text' },
              description: { type: 'text' },
              basePrice: { type: 'double' },
              currency: { type: 'keyword' },
              categoryId: { type: 'keyword' },
              inStock: { type: 'boolean' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      logger.info('Products index created');
    } catch (error) {
      // Index already exists
    }

    return client;
  } catch (error) {
    logger.error({ error, url }, 'Failed to connect to Elasticsearch');
    throw error;
  }
}
