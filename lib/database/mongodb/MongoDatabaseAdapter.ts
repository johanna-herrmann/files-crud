import DatabaseAdapter from '@/types/database/DatabaseAdapter';
import DbItem from '@/types/database/DbItem';
import mongoose from 'mongoose';
import { getFullConfig } from '@/config/config';
import DbValue from '@/types/database/DbValue';
import DatabaseConfig from '@/types/config/DatabaseConfig';

interface MongoItem {
  _doc: {
    _id: string;
    __v: number;
  } & DbItem;
}

const types = {
  string: { type: String, default: '' },
  number: { type: Number, default: '' },
  boolean: { type: Boolean, default: '' },
  object: Object
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dummyModel = mongoose.model('dummy', new mongoose.Schema({ dummy: { type: String, default: '' } }));

const schemata: Record<string, Record<string, unknown>> = {};

/**
 * Database Adapter for MongoDB.
 */
class MongoDatabaseAdapter implements DatabaseAdapter {
  private readonly url: string;
  private readonly user?: string;
  private readonly pass?: string;

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

  private getType(value: string | number | boolean | Record<string, unknown>) {
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean') {
      return types[type];
    }
    return types['object'];
  }

  public getModel(table: string): typeof dummyModel {
    const model = mongoose.models[table];
    if (!!model) {
      return model;
    }
    const schema = schemata[table];
    return mongoose.model(table, new mongoose.Schema(schema)) as typeof dummyModel;
  }

  private async findOneIfExists<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T | undefined> {
    const Model = this.getModel(table);
    const item = await Model.findOne<MongoItem>({ [filterKey]: filterValue });
    if (!item) {
      return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, __v, ...actualItem } = item._doc;
    return actualItem as T;
  }

  public async open(): Promise<void> {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(this.url, { user: this.user, pass: this.pass });
    }
  }

  public async close(): Promise<void> {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }

  public async init<T extends DbItem>(table: string, item: T): Promise<void> {
    let schema: Record<string, unknown> | undefined = schemata[table];
    if (!!schema) {
      return;
    }
    schema = {};
    Object.entries(item).forEach(([key, value]) => {
      schema[key] = this.getType(value);
    });
    schemata[table] = schema;
  }

  public async add<T extends DbItem>(table: string, item: T): Promise<void> {
    const Model = this.getModel(table);
    await new Model(item).save();
  }

  public async update(table: string, filterKey: string, filterValue: string, update: Record<string, DbValue>): Promise<void> {
    const Model = this.getModel(table);
    await Model.findOneAndUpdate({ [filterKey]: filterValue }, update);
  }

  public async findOne<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T | null> {
    const item = await this.findOneIfExists<T>(table, filterKey, filterValue);
    return item || null;
  }

  public async findAll<T extends DbItem>(table: string): Promise<T[]> {
    const Model = this.getModel(table);
    const items = await Model.find<MongoItem>();
    return items.map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...actualItem } = item._doc;
      return actualItem as T;
    });
  }

  public async exists(table: string, filterKey: string, filterValue: string): Promise<boolean> {
    const Model = this.getModel(table);
    return !!(await Model.exists({ [filterKey]: filterValue }));
  }

  public async delete(table: string, filterKey: string, filterValue: string): Promise<void> {
    const Model = this.getModel(table);
    await Model.findOneAndDelete({ [filterKey]: filterValue });
  }
}

export { MongoDatabaseAdapter, schemata };
