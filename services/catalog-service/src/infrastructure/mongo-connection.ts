/**
 * MongoDB connection
 */

import { MongoClient, Db } from 'mongodb';
import { Logger } from 'pino';

export async function connectMongoDB(logger: Logger): Promise<{ client: MongoClient; db: Db }> {
  const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'ecommerce';

  try {
    const client = new MongoClient(url);
    await client.connect();

    const db = client.db(dbName);

    // Create indexes
    const collection = db.collection('products');
    await collection.createIndex({ sku: 1 }, { unique: true });
    await collection.createIndex({ categoryId: 1 });
    await collection.createIndex({ inStock: 1 });
    await collection.createIndex({ createdAt: -1 });

    logger.info({ database: dbName }, 'Connected to MongoDB');

    return { client, db };
  } catch (error) {
    logger.error({ error, url }, 'Failed to connect to MongoDB');
    throw error;
  }
}
