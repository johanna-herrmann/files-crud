import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/lib-dynamodb';
import { DynamoDatabaseAdapter } from '@/database/dynamodb/DynamoDatabaseAdapter';
import { loadConfig } from '@/config/config';
import { testUser } from '#/testItems';
import User from '@/types/user/User';
import JwtKey from '@/types/user/JwtKey';
import DbItem from '@/types/database/DbItem';
import DbValue from '@/types/database/DbValue';

type Tables = Record<string, DbItem[]>;
interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
}

const mocked_keys: Record<string, string> = {
  'files-crud-user': '',
  'files-crud-jwtkey': '',
  'files-crud-failedloginattempts': ''
};

const mocked_tables: string[] = [];

const mocked_db: Tables = {
  'files-crud-user': [],
  'files-crud-jwtkey': [],
  'files-crud-failedloginattempts': []
};
const id = 'test-id';
const mocked_id = id;
let mocked_index = 0;

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');
  return {
    ...actual,
    v4() {
      return mocked_id + mocked_index++;
    }
  };
});

jest.mock('@/database/dynamodb/dynamoDbHelper', () => {
  // noinspection JSUnusedGlobalSymbols - used outside
  return {
    async listTables() {
      return Object.keys(mocked_db);
    },
    async createTable(_client: DynamoDBClient, TableName: string, keyName: string) {
      mocked_db[TableName] = [];
      mocked_tables.push(TableName);
      mocked_keys[TableName] = keyName;
    },
    async putItem(_client: DynamoDBClient, TableName: string, item: DbItem) {
      mocked_db[TableName].push(item as DbItem);
    },
    async updateItem(_client: DynamoDBClient, TableName: string, keyName: string, keyValue: string, Update: Record<string, NativeAttributeValue>) {
      const itemIndex = mocked_db[TableName].findIndex((item) => (item as unknown as Record<string, DbValue>)[keyName] === keyValue);

      if (itemIndex >= 0) {
        const item = mocked_db[TableName][itemIndex];
        mocked_db[TableName][itemIndex] = { ...item, ...Update };
      }
    },
    async deleteItem(_client: DynamoDBClient, TableName: string, keyName: string, keyValue: string) {
      const itemIndex = mocked_db[TableName].findIndex((item) => (item as unknown as Record<string, DbValue>)[keyName] === keyValue);

      if (itemIndex >= 0) {
        mocked_db[TableName].splice(itemIndex, 1);
      }
    },
    async loadItem<T extends DbItem>(_client: DynamoDBClient, TableName: string, keyName: string, keyValue: string) {
      const item = mocked_db[TableName].find((item) => (item as unknown as Record<string, DbValue>)[keyName] === keyValue);

      if (!item) {
        return null;
      }

      return item as unknown as T;
    },
    async loadItems(_client: DynamoDBClient, TableName: string) {
      return mocked_db[TableName];
    },
    async itemExists(_client: DynamoDBClient, TableName: string, keyName: string, keyValue: string) {
      const item = mocked_db[TableName].find((item) => (item as unknown as Record<string, DbValue>)[keyName] === keyValue);
      return !!item;
    }
  };
});

let db: DynamoDatabaseAdapter | null = null;

describe('DynamoDatabaseAdapter', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig();
  });

  afterEach(async (): Promise<void> => {
    mocked_db['files-crud-user'] = [];
    mocked_db['files-crud-jwtkey'] = [];
    mocked_db['files-crud-failedloginattempts'] = [];
    mocked_keys['files-crud-user'] = 'username';
    mocked_keys['files-crud-jwtkey'] = 'kid';
    mocked_keys['files-crud-failedloginattempts'] = 'username';
    mocked_tables.splice(0, mocked_tables.length);
    mocked_index = 0;
    await db?.close();
  });

  test('DynamoDatabaseAdapter->constructor works correctly, default conf.', async (): Promise<void> => {
    loadConfig({ database: { name: 'dynamodb' } });

    db = new DynamoDatabaseAdapter();

    expect(db.getConf().region).toBe('eu-central-1');
    expect((db.getConf().credentials as Credentials)?.accessKeyId).toBe('fallback-key');
    expect((db.getConf().credentials as Credentials)?.secretAccessKey).toBe('fallback-secret');
  });

  test('DynamoDatabaseAdapter->constructor works correctly, global conf.', async (): Promise<void> => {
    loadConfig({ database: { name: 'dynamodb' }, region: 'globalRegion', accessKeyId: 'globalKey', secretAccessKey: 'globalSecret' });

    db = new DynamoDatabaseAdapter();

    expect(db.getConf().region).toBe('globalRegion');
    expect((db.getConf().credentials as Credentials)?.accessKeyId).toBe('globalKey');
    expect((db.getConf().credentials as Credentials)?.secretAccessKey).toBe('globalSecret');
  });

  test('DynamoDatabaseAdapter->constructor works correctly, specific conf.', async (): Promise<void> => {
    loadConfig({
      region: 'globalRegion',
      accessKeyId: 'globalKey',
      secretAccessKey: 'globalSecret',
      database: { name: 'dynamodb', region: 'specificRegion', accessKeyId: 'specificKey', secretAccessKey: 'specificSecret' }
    });

    db = new DynamoDatabaseAdapter();

    expect(db.getConf().region).toBe('specificRegion');
    expect((db.getConf().credentials as Credentials)?.accessKeyId).toBe('specificKey');
    expect((db.getConf().credentials as Credentials)?.secretAccessKey).toBe('specificSecret');
  });

  test('DynamoDatabaseAdapter->open creates client correctly.', async (): Promise<void> => {
    db = new DynamoDatabaseAdapter();

    await db.open();

    expect(db.getClient()).toBeInstanceOf(DynamoDBClient);
  });

  test('DynamoDatabaseAdapter->close destroys client correctly.', async (): Promise<void> => {
    db = new DynamoDatabaseAdapter();
    await db.open();

    await db.close();

    expect(db.getClient()).toBeNull();
  });

  test('DynamoDatabaseAdapter->init initializes user table.', async (): Promise<void> => {
    mocked_keys['files-crud-user'] = '';
    delete mocked_db['files-crud-user'];
    db = new DynamoDatabaseAdapter();
    await db.open();

    await db.init<User>('user_', testUser);

    expect(mocked_tables).toEqual(['files-crud-user']);
    expect(mocked_keys['files-crud-user']).toBe('username');
  });

  test('DynamoDatabaseAdapter->init does nothing if table exists.', async (): Promise<void> => {
    mocked_keys['files-crud-user'] = '';
    db = new DynamoDatabaseAdapter();
    await db.open();

    await db.init<User>('user_', testUser);

    expect(mocked_tables).toEqual([]);
    expect(mocked_keys['files-crud-user']).toBe('');
  });

  test('DynamoDatabaseAdapter->add adds item, user.', async (): Promise<void> => {
    db = new DynamoDatabaseAdapter();
    await db.open();

    await db.add<User>('user_', testUser);

    expect(mocked_db['files-crud-user'][0]).toEqual(testUser);
  });

  test('DynamoDatabaseAdapter->add adds item, jwtKey.', async (): Promise<void> => {
    const jwtKey = { kid: 'id', key: 'key' };
    db = new DynamoDatabaseAdapter();
    await db.open();

    await db.add<JwtKey>('jwtKey', jwtKey);

    expect(mocked_db['files-crud-jwtkey'][0]).toEqual(jwtKey);
  });

  test('DynamoDatabaseAdapter->update updates item, without key change.', async (): Promise<void> => {
    db = new DynamoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);

    await db.update('user_', 'username', testUser.username, { hashVersion: 'newVersion', salt: 'newSalt', hash: 'newHash' });

    expect((mocked_db['files-crud-user'][0] as User).hashVersion).toBe('newVersion');
    expect((mocked_db['files-crud-user'][0] as User).salt).toBe('newSalt');
    expect((mocked_db['files-crud-user'][0] as User).hash).toBe('newHash');
  });

  test('DynamoDatabaseAdapter->update updates item, with key change.', async (): Promise<void> => {
    db = new DynamoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);

    await db.update('user_', 'username', testUser.username, { username: 'newName' });

    expect((mocked_db['files-crud-user'][0] as User).username).toBe('newName');
  });

  test('DynamoDatabaseAdapter->findOne finds one.', async (): Promise<void> => {
    db = new DynamoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);

    const user = await db.findOne<User>('user_', 'username', testUser.username);

    expect(user).toEqual(testUser);
  });

  test('DynamoDatabaseAdapter->findAll finds all.', async (): Promise<void> => {
    const otherUser = { ...testUser, username: 'other' };
    db = new DynamoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);
    await db.add<User>('user_', otherUser);

    const items = await db.findAll<User>('user_');

    expect(items[0]).toEqual(testUser);
    expect(items[1]).toEqual(otherUser);
  });

  test('DynamoDatabaseAdapter->exists returns true if item exists.', async (): Promise<void> => {
    db = new DynamoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);

    const exists = await db.exists('user_', 'username', testUser.username);

    expect(exists).toBe(true);
  });

  test('DynamoDatabaseAdapter->exists returns false if item does not exist.', async (): Promise<void> => {
    db = new DynamoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);

    const exists = await db.exists('user_', 'username', 'other');

    expect(exists).toBe(false);
  });

  test('DynamoDatabaseAdapter->delete deletes item.', async (): Promise<void> => {
    const otherUser = { ...testUser, username: 'other' };
    db = new DynamoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);
    await db.add<User>('user_', otherUser);

    await db.delete('user_', 'username', testUser.username);

    expect(mocked_db['files-crud-user'].length).toBe(1);
    expect(mocked_db['files-crud-user'][0]).toEqual(otherUser);
  });
});
