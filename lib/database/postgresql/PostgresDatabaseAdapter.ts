import { Client } from 'pg';
import DatabaseAdapter from '@/types/database/DatabaseAdapter';
import DbItem from '@/types/database/DbItem';
import PgDbConf from '@/types/database/PgDbConf';
import DbValue from '@/types/database/DbValue';
import PgDbValue from '@/types/database/PgDbValue';
import { connect, definingQuery, end, getNewClient, readingQuery, writingQuery } from '@/database/postgresql/pgWrapper';
import { getConfig } from '@/config';

/**
 * Database Adapter for postgresql.
 */
class PostgresDatabaseAdapter implements DatabaseAdapter {
  private readonly conf: PgDbConf;
  private client: Client;
  private connected = false;

  constructor() {
    const config = getConfig();
    const host = config.database?.host || 'localhost';
    const port = config.database?.port || 5432;
    const database = config.database?.db || 'files-crud';
    const { user, pass } = config.database ?? {};
    this.conf = { host, port, database, user, password: pass };
    this.client = getNewClient(this.conf);
  }

  public getConf(): PgDbConf {
    return this.conf;
  }

  public getClient(): Client {
    return this.client;
  }

  public setClient(client: Client): void {
    this.client = client;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  private buildUpdateAndValues(update: Record<string, DbValue>): [string, PgDbValue[]] {
    let index = 1;
    const updateParts: string[] = [];
    const values: PgDbValue[] = [];
    Object.entries(update).forEach(([key, value]) => {
      updateParts.push(`"${key}"=$${index++}`);
      values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    });
    const updater = `SET ${updateParts.join(', ')}`;
    return [updater, values];
  }

  private buildReadingQuery(table: string, filterKey: string, filterValue: string): [string, PgDbValue[]] {
    const query = `SELECT * FROM ${table} WHERE "${filterKey}"=$1`;
    return [query, [filterValue]];
  }

  private buildDeletingQuery(table: string, filterKey: string, filterValue: string): [string, PgDbValue[]] {
    const query = `DELETE FROM ${table} WHERE "${filterKey}"=$1`;
    return [query, [filterValue]];
  }

  private buildCreatingQuery(table: string, item: DbItem): [string, PgDbValue[]] {
    const valueParts: string[] = [];
    const keys: string[] = [];
    const values: PgDbValue[] = [];
    let index = 1;
    Object.entries(item).forEach(([key, value]) => {
      valueParts.push(`$${index++}`);
      keys.push(`"${key}"`);
      values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    });
    const query = `INSERT INTO ${table}(${keys.join(', ')}) VALUES(${valueParts.join(', ')})`;
    return [query, values];
  }

  private buildUpdatingQuery(table: string, filterKey: string, filterValue: string, update: Record<string, DbValue>): [string, PgDbValue[]] {
    const [updater, updateValues] = this.buildUpdateAndValues(update);
    const query = `UPDATE ${table} ${updater} WHERE "${filterKey}"=$${updateValues.length + 1}`;
    return [query, [...updateValues, filterValue]];
  }

  private async findOneIfExists<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T | undefined> {
    const [query, values] = this.buildReadingQuery(table, filterKey, filterValue);
    const result = await readingQuery<T>(this.client, query, values);
    if (!result || result.rowCount !== 1) {
      return undefined;
    }
    return result.rows[0];
  }

  public async open(): Promise<void> {
    if (this.connected) {
      return;
    }
    await connect(this.client);
    this.connected = true;
  }

  public async close(): Promise<void> {
    if (this.connected) {
      await end(this.client);
      this.connected = false;
    }
  }

  /**
   * Creates a new table/collection.
   * The first key of `item` is used as primary key.
   * @param table The name of the table.
   * @param item Dummy Item to derive the fields from.
   *             Example: Provide dummy user item, so fields of user can be derived.
   *             The table/collection will be created if it not exists already.
   */
  public async init<T extends DbItem>(table: string, item: T): Promise<void> {
    const types: Record<string, string> = {
      string: 'text',
      number: 'bigint',
      boolean: 'Boolean',
      object: 'JSON'
    };
    const fields: string[] = [];
    Object.entries(item).forEach(([key, value]) => {
      const type = typeof value;
      fields.push(`"${key}" ${types[type]}`);
    });
    fields[0] = `${fields[0]} PRIMARY KEY`;
    const query = `CREATE TABLE IF NOT EXISTS ${table}(${fields.join(', ')})`;
    await definingQuery(this.client, query);
  }

  public async add<T extends DbItem>(table: string, item: T): Promise<void> {
    const [query, values] = this.buildCreatingQuery(table, item);
    await writingQuery(this.client, query, values);
  }

  public async update(table: string, filterKey: string, filterValue: string, update: Record<string, DbValue>): Promise<void> {
    const [query, values] = this.buildUpdatingQuery(table, filterKey, filterValue, update);
    await writingQuery(this.client, query, values);
  }

  public async findOne<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T | null> {
    const item = await this.findOneIfExists<T>(table, filterKey, filterValue);
    return item || null;
  }

  public async findAll<T extends DbItem>(table: string): Promise<T[]> {
    const query = `SELECT * FROM ${table}`;
    const result = await readingQuery<T>(this.client, query);
    return result?.rows || [];
  }

  public async exists(table: string, filterKey: string, filterValue: string): Promise<boolean> {
    const item = await this.findOneIfExists(table, filterKey, filterValue);
    return !!item;
  }

  public async delete(table: string, filterKey: string, filterValue: string): Promise<void> {
    const [query, values] = this.buildDeletingQuery(table, filterKey, filterValue);
    await writingQuery(this.client, query, values);
  }
}

export { PostgresDatabaseAdapter };
