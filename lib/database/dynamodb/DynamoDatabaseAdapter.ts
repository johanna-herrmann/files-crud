import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import DatabaseAdapter from '@/types/database/DatabaseAdapter';
import DbItem from '@/types/database/DbItem';
import DbValue from '@/types/database/DbValue';
import { getFullConfig } from '@/config/config';
import { createTable, deleteItem, itemExists, listTables, loadItem, loadItems, putItem, updateItem } from '@/database/dynamodb/dynamoDbHelper';

/**
 * Database Adapter for AWS DynamoDB.
 */
class DynamoDatabaseAdapter implements DatabaseAdapter {
  private readonly config: DynamoDBClientConfig;
  private client: DynamoDBClient | null = null;

  constructor() {
    const config = getFullConfig();
    const region = (config.database?.region || config.region) as string;
    const accessKeyId = (config.database?.accessKeyId || config.accessKeyId) as string;
    const secretAccessKey = (config.database?.secretAccessKey || config.secretAccessKey) as string;
    this.config = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    };
  }

  public getConf(): DynamoDBClientConfig {
    return this.config;
  }

  public getClient(): DynamoDBClient | null {
    return this.client;
  }

  private ensureClient(): DynamoDBClient {
    if (this.client === null) {
      throw new Error('Client is null. Did not yet call open()? Did call close() already?');
    }
    return this.client;
  }

  private getDynamoTableName(table: string): string {
    const config = getFullConfig();
    const tableNames: Record<string, string | undefined> = config.database?.dynamoTableNames ?? {};
    return tableNames[table] ?? `files-crud-${table.replace(/_/g, '').toLowerCase()}`;
  }

  private async findOneIfExists<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T | undefined> {
    const actualTable = this.getDynamoTableName(table);
    const item = await loadItem<T>(this.ensureClient(), actualTable, filterKey, filterValue);
    return item ?? undefined;
  }

  public async open(): Promise<void> {
    this.client = this.client || new DynamoDBClient(this.config);
  }

  public async close(): Promise<void> {
    this.client?.destroy();
    this.client = null;
  }

  /**
   * Creates a new table/collection.
   * The first key of `item` is used as partition key / hash key.
   * @param table The name of the table.
   * @param item Dummy Item to derive the fields from.
   *             Example: Provide dummy user item, so fields of user can be derived.
   *             The table/collection will be created if it not exists already.
   */
  public async init<T extends DbItem>(table: string, item: T): Promise<void> {
    const actualTable = this.getDynamoTableName(table);
    const tables = await listTables(this.ensureClient());
    if (!tables.includes(actualTable)) {
      await createTable(this.ensureClient(), actualTable, Object.keys(item)[0]);
    }
  }

  public async add<T extends DbItem>(table: string, item: T): Promise<void> {
    const actualTable = this.getDynamoTableName(table);
    await putItem(this.ensureClient(), actualTable, item);
  }

  public async update(table: string, filterKey: string, filterValue: string, update: Record<string, DbValue>): Promise<void> {
    const actualTable = this.getDynamoTableName(table);
    await updateItem(this.ensureClient(), actualTable, filterKey, filterValue, update);
  }

  public async findOne<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T | null> {
    const item = await this.findOneIfExists<T>(table, filterKey, filterValue);
    return item || null;
  }

  public async findAll<T extends DbItem>(table: string): Promise<T[]> {
    const actualTable = this.getDynamoTableName(table);
    return await loadItems<T>(this.ensureClient(), actualTable);
  }

  public async exists(table: string, filterKey: string, filterValue: string): Promise<boolean> {
    const actualTable = this.getDynamoTableName(table);
    return await itemExists(this.ensureClient(), actualTable, filterKey, filterValue);
  }

  public async delete(table: string, filterKey: string, filterValue: string): Promise<void> {
    const actualTable = this.getDynamoTableName(table);
    await deleteItem(this.ensureClient(), actualTable, filterKey, filterValue);
  }
}

export { DynamoDatabaseAdapter };
