import mongoose from 'mongoose';
import { getFullConfig } from '@/config/config';
import { DatabaseAdapter } from '@/types/database/DatabaseAdapter';
import { DbItem } from '@/types/database/DbItem';
import { DbValue } from '@/types/database/DbValue';
import { DatabaseConfig } from '@/types/config/DatabaseConfig';

type MongoItem = DbItem & { _id: unknown };

/**
 * Database Adapter for MongoDB.
 */
class MongoDatabaseAdapter implements DatabaseAdapter {
  private readonly url: string;
  private readonly user?: string;
  private readonly pass?: string;
  private connection: null | mongoose.Connection = null;
  private session: null | mongoose.mongo.ClientSession = null;
  private collections: Record<string, mongoose.Collection<DbItem>> = {};

  constructor() {
    const config = getFullConfig();
    const url = config.database?.url as string;
    const { user, pass } = config.database as DatabaseConfig;
    this.url = url;
    this.user = user;
    this.pass = pass;
  }

  public getConf(): [string, string, string] {
    return [this.url, this.user ?? '', this.pass ?? ''];
  }

  public getConnection(): mongoose.Connection | null {
    return this.connection;
  }

  public getSession(): mongoose.mongo.ClientSession | null {
    return this.session;
  }

  public getCollections(): Record<string, mongoose.Collection<DbItem>> {
    return this.collections;
  }

  private async findOneIfExists<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T | undefined> {
    const collection = this.collections[table];
    const item = await collection?.findOne<MongoItem>({ [filterKey]: filterValue });
    if (!item) {
      return undefined;
    }
    delete item._id;
    return item as unknown as T;
  }

  public async open(): Promise<void> {
    if (!this.session) {
      this.connection = mongoose.createConnection(this.url, { directConnection: true });
      this.session = await this.connection.startSession();
    }
  }

  public async close(): Promise<void> {
    if (!!this.session) {
      await this.session?.endSession();
      await this.connection?.close();
      this.session = null;
      this.connection = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async init<T extends DbItem>(table: string, _: T): Promise<void> {
    if (!this.connection) {
      throw new Error('Error. Not connected');
    }
    if (!!this.collections[table]) {
      return;
    }
    this.collections[table] = this.connection.collection<DbItem>(table);
  }

  public async add<T extends DbItem>(table: string, item: T): Promise<void> {
    const collection = this.collections[table];
    await collection?.insertOne({ ...item });
  }

  public async update(table: string, filterKey: string, filterValue: string, update: Record<string, DbValue>): Promise<void> {
    const collection = this.collections[table];
    await collection?.findOneAndUpdate({ [filterKey]: filterValue }, { $set: update });
  }

  public async findOne<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T | null> {
    const item = await this.findOneIfExists<T>(table, filterKey, filterValue);
    return item || null;
  }

  public async findAll<T extends DbItem>(table: string): Promise<T[]> {
    const collection = this.collections[table];
    const items: T[] = [];
    const itemsCursor = collection?.find();
    while (await itemsCursor?.hasNext()) {
      const doc = await itemsCursor?.next();
      const item = await collection.findOne<MongoItem>({ _id: doc?._id });
      if (!item) {
        continue;
      }
      delete item._id;
      items.push(item as unknown as T);
    }
    return items;
  }

  public async exists(table: string, filterKey: string, filterValue: string): Promise<boolean> {
    const item = await this.findOneIfExists(table, filterKey, filterValue);
    return !!item;
  }

  public async delete(table: string, filterKey: string, filterValue: string): Promise<void> {
    const collection = this.collections[table];
    await collection?.findOneAndDelete({ [filterKey]: filterValue });
  }
}

export { MongoDatabaseAdapter, MongoItem };
