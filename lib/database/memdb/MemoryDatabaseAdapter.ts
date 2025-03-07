import { DatabaseAdapter } from '@/types/database/DatabaseAdapter';
import { DbItem } from '@/types/database/DbItem';
import { DbValue } from '@/types/database/DbValue';

const data: Record<string, DbItem[]> = {};

/**
 * Database Adapter for in-memory db.
 */
class MemoryDatabaseAdapter implements DatabaseAdapter {
  private connected: boolean = false;

  public isConnected(): boolean {
    return this.connected;
  }

  private async findOneIfExists<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T | undefined> {
    const items = await this.findAll<T>(table);
    const item = items.find((item) => (item as unknown as Record<string, unknown>)[filterKey] === filterValue);
    return item as T | undefined;
  }

  private async findOneOrThrowError<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T> {
    const item = await this.findOneIfExists<T>(table, filterKey, filterValue);
    if (!item) {
      throw new Error(`Item not found in table ${table} where ${filterKey}=${filterValue}.`);
    }
    return item;
  }

  public async open(): Promise<void> {
    this.connected = true;
  }

  public async close(): Promise<void> {
    this.connected = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async init<T extends DbItem>(table: string, _item: T, _key: string): Promise<void> {
    data[table] = data[table] ?? [];
  }

  public async add<T extends DbItem>(table: string, item: T): Promise<void> {
    data[table].push({ ...item });
  }

  public async update(table: string, filterKey: string, filterValue: string, update: Record<string, DbValue>): Promise<void> {
    const item = await this.findOne(table, filterKey, filterValue);
    for (const [key, value] of Object.entries(update)) {
      (item as unknown as Record<string, unknown>)[key] = value;
    }
  }

  public async findOne<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T | null> {
    const item = await this.findOneIfExists<T>(table, filterKey, filterValue);
    return item || null;
  }

  public async findAll<T extends DbItem>(table: string): Promise<T[]> {
    return data[table] as T[];
  }

  public async exists(table: string, filterKey: string, filterValue: string): Promise<boolean> {
    const item = await this.findOneIfExists(table, filterKey, filterValue);
    return !!item;
  }

  public async delete(table: string, filterKey: string, filterValue: string): Promise<void> {
    const item = await this.findOneOrThrowError(table, filterKey, filterValue);
    const items = data[table];
    const index = items.indexOf(item);
    items.splice(index, 1);
  }
}

export { MemoryDatabaseAdapter, data };
