import { Client, QueryResult, QueryResultRow } from 'pg';
import PgDbConf from '@/types/PgDbConf';
import PgDbValue from '@/types/PgDbValue';
import { testUser } from '#/testItems';
import { PostgresDatabaseAdapter } from '@/database/postgresql/PostgresDatabaseAdapter';
import { loadConfig } from '@/config';
import User from '@/types/User';

interface WhenThen {
  queryRegex: RegExp;
  values?: PgDbValue[];
  result: QueryResult | null;
}

interface MockedData {
  conf?: PgDbConf;
  client?: Client;
  connected?: boolean;
  definingQueries?: string[];
  writingQueries?: string[];
  values?: (string | number | boolean)[][];
}

const Mocked_Client = Client;
let mocked_data: MockedData = {};
const mocked_when_then: WhenThen = {
  queryRegex: /./,
  result: null
};

let db: PostgresDatabaseAdapter | null = null;

jest.mock('@/database/postgresql/pgWrapper', () => {
  // noinspection JSUnusedGlobalSymbols - used outside
  return {
    getNewClient(conf: PgDbConf) {
      const newClient = new Mocked_Client(conf);
      mocked_data.client = newClient;
      mocked_data.conf = conf;
      mocked_data.definingQueries = [];
      mocked_data.writingQueries = [];
      mocked_data.values = [];
      return newClient;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async connect(_client: Client) {
      mocked_data.connected = true;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async end(_client: Client) {
      mocked_data.connected = false;
    },
    async definingQuery(_client: Client, query: string) {
      mocked_data.definingQueries?.push(query);
    },
    async writingQuery(_client: Client, query: string, values?: (string | number | boolean)[]) {
      mocked_data.writingQueries?.push(query);
      mocked_data.values?.push(values ?? []);
    },
    async readingQuery<T extends QueryResultRow>(_client: Client, query: string, values?: (string | number | boolean)[]) {
      if (mocked_when_then.queryRegex.test(query) && JSON.stringify(mocked_when_then.values) === JSON.stringify(values)) {
        return mocked_when_then.result as unknown as T;
      }
      return null;
    }
  };
});

const expectQueryAndValues = function (
  queries: number,
  queriesWithValues: number,
  queryIndex: number,
  valuesIndex: number,
  queryRegex: RegExp,
  values: (string | number | boolean)[]
): void {
  expect(mocked_data.writingQueries?.length).toBe(queries);
  expect(mocked_data.values?.length).toBe(queriesWithValues);
  expect(mocked_data.writingQueries?.at(queryIndex)).toMatch(queryRegex);
  expect(mocked_data.values?.at(valuesIndex)).toEqual(values);
};

const when = function (queryRegex: RegExp, values?: PgDbValue[]) {
  mocked_when_then.queryRegex = queryRegex;
  mocked_when_then.values = values;
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    then(rows?: any) {
      if (!rows) {
        mocked_when_then.result = {
          command: '',
          fields: [],
          oid: 0,
          rowCount: 0,
          rows: []
        };
        return;
      }
      mocked_when_then.result = {
        command: '',
        fields: [],
        oid: 0,
        rowCount: rows.length,
        rows
      };
    }
  };
};

describe('PostgresDatabaseAdapter', (): void => {
  afterEach(async (): Promise<void> => {
    mocked_data = {};
    mocked_when_then.queryRegex = /./;
    mocked_when_then.values = undefined;
    mocked_when_then.result = null;
    await db?.close();
  });

  test('PostgresDatabaseAdapter->constructor works correctly, default config.', async (): Promise<void> => {
    const conf = {
      host: 'localhost',
      port: 5432,
      database: 'files-crud',
      user: undefined,
      pass: undefined
    };

    db = new PostgresDatabaseAdapter();

    expect(db.getConf()).toEqual(conf);
  });

  test('PostgresDatabaseAdapter->constructor works correctly, specific config.', async (): Promise<void> => {
    const conf = {
      host: 'test',
      port: 1234,
      database: 'testDB',
      user: 'user',
      pass: 'pass'
    };
    loadConfig({ database: { name: 'postgresql', ...conf, db: conf.database } });

    db = new PostgresDatabaseAdapter();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pass, ...expectedConf } = conf;
    expect(db.getConf()).toEqual({ ...expectedConf, password: conf.pass });
  });

  test('PostgresDatabaseAdapter->open connects to db.', async (): Promise<void> => {
    db = new PostgresDatabaseAdapter();

    await db.open();

    expect(mocked_data.client).toBeDefined();
    expect(mocked_data.connected).toBe(true);
  });

  test('PostgresDatabaseAdapter->close disconnects from db.', async (): Promise<void> => {
    db = new PostgresDatabaseAdapter();
    await db.open();

    await db.close();

    expect(mocked_data.connected).toBe(false);
  });

  test('PostgresDatabaseAdapter->init itializes user table.', async (): Promise<void> => {
    db = new PostgresDatabaseAdapter();
    await db.open();

    await db.init('user_', testUser);

    expect(mocked_data.definingQueries?.length).toBe(1);
    expect(mocked_data.definingQueries?.at(0)).toMatch(
      /^create table if not exists user_\s*\(username text, hashVersion text, salt text, hash text, admin Boolean, ownerId text, meta JSON\)$/iu
    );
  });

  test('PostgresDatabaseAdapter->add adds item.', async (): Promise<void> => {
    db = new PostgresDatabaseAdapter();
    await db.open();

    await db.add('user_', testUser);

    expectQueryAndValues(
      1,
      1,
      0,
      0,
      /^insert into user_\s*\(username, hashVersion, salt, hash, admin, ownerId, meta\) values\s*\(\$1, \$2, \$3, \$4, \$5, \$6, \$7\)$/iu,
      [testUser.username, testUser.hashVersion, testUser.salt, testUser.hash, testUser.admin, testUser.ownerId, JSON.stringify(testUser.meta)]
    );
  });

  test('PostgresDatabaseAdapter->update updates item, without key change.', async (): Promise<void> => {
    db = new PostgresDatabaseAdapter();
    await db.open();

    await db.update('user_', 'username', testUser.username, { hashVersion: 'newVersion', salt: 'newSalt', hash: 'newHash' });

    expectQueryAndValues(1, 1, 0, 0, /^update user_ set hashVersion=\$1, salt=\$2, hash=\$3 where username=\$4$/iu, [
      'newVersion',
      'newSalt',
      'newHash',
      testUser.username
    ]);
  });

  test('PostgresDatabaseAdapter->update updates item, with key change.', async (): Promise<void> => {
    db = new PostgresDatabaseAdapter();
    await db.open();

    await db.update('user_', 'username', testUser.username, { username: 'newUsername' });

    expectQueryAndValues(1, 1, 0, 0, /^update user_ set username=\$1 where username=\$2$/iu, ['newUsername', testUser.username]);
  });

  test('PostgresDatabaseAdapter->findOne finds one.', async (): Promise<void> => {
    db = new PostgresDatabaseAdapter();
    await db.open();
    when(/^select \* from user_ where username=\$1$/iu, [testUser.username]).then([testUser]);

    const user = await db.findOne<User>('user_', 'username', testUser.username);

    expect(user).toEqual(testUser);
  });

  test('PostgresDatabaseAdapter->findAll finds all.', async (): Promise<void> => {
    const otherUser = { ...testUser, username: 'other' };
    db = new PostgresDatabaseAdapter();
    await db.open();
    when(/^select \* from user_$/iu).then([testUser, otherUser]);

    const items = await db.findAll<User>('user_');

    expect(items.length).toBe(2);
    expect(items[0]).toEqual(testUser);
    expect(items[1]).toEqual(otherUser);
  });

  test('PostgresDatabaseAdapter->exists returns true if item exists.', async (): Promise<void> => {
    db = new PostgresDatabaseAdapter();
    await db.open();
    when(/^select \* from user_ where username=\$1$/iu, [testUser.username]).then([testUser]);

    const exists = await db.exists('user_', 'username', testUser.username);

    expect(exists).toBe(true);
  });

  test('PostgresDatabaseAdapter->exists returns false if item does not exist.', async (): Promise<void> => {
    db = new PostgresDatabaseAdapter();
    await db.open();
    when(/^select \* from user_ where username=\$1$/iu, ['other']).then();

    const exists = await db.exists('user_', 'username', 'other');

    expect(exists).toBe(false);
  });

  test('PostgresDatabaseAdapter->delete deletes item.', async (): Promise<void> => {
    db = new PostgresDatabaseAdapter();
    await db.open();

    await db.delete('user_', 'username', testUser.username);

    expectQueryAndValues(1, 1, 0, 0, /^delete from user_ where username=\$1$/iu, [testUser.username]);
  });
});
