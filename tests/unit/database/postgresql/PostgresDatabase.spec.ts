import { Client, QueryResult, QueryResultRow } from 'pg';
import { PostgresDatabase } from '@/database/postgresql/PostgresDatabase';
import PgDbConf from '@/types/PgDbConf';

type Value = string | number | boolean;

interface WhenThen {
  queryRegex: RegExp;
  values?: Value[];
  result: QueryResult | null;
}

interface MockedData {
  conf?: PgDbConf;
  client?: Client;
  connected?: boolean;
  queries?: string[];
  values?: (string | number | boolean)[][];
}

const conf = {
  host: 'localhost',
  port: 5432,
  database: 'db'
};

const Mocked_Client = Client;
let mocked_data: MockedData = {};
const mocked_when_then: WhenThen = {
  queryRegex: /./,
  result: null
};

jest.mock('@/database/postgresql/pgWrapper', () => {
  return {
    getNewClient(conf: PgDbConf) {
      const newClient = new Mocked_Client(conf);
      mocked_data.client = newClient;
      mocked_data.conf = conf;
      mocked_data.queries = [];
      mocked_data.values = [];
      return newClient;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async connect(_: Client) {
      mocked_data.connected = true;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async end(_: Client) {
      mocked_data.connected = false;
    },
    async definingQuery(_: Client, query: string) {
      mocked_data.queries?.push(query);
    },
    async writingQuery(_: Client, query: string, values?: (string | number | boolean)[]) {
      mocked_data.queries?.push(query);
      mocked_data.values?.push(values ?? []);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async readingQuery<T extends QueryResultRow>(_: Client, query: string, values?: (string | number | boolean)[]) {
      if (mocked_when_then.queryRegex.test(query) && JSON.stringify(mocked_when_then.values) === JSON.stringify(values)) {
        console.log({ result: mocked_when_then.result });
        return mocked_when_then.result;
      }
      console.log({ result: 'never' });
      return null;
    }
  };
});

describe('PostgresDatabase', (): void => {
  afterEach(async (): Promise<void> => {
    mocked_data = {};
    mocked_when_then.queryRegex = /./;
    mocked_when_then.values = undefined;
    mocked_when_then.result = null;
  });

  const testUser = {
    username: 'testUser',
    hashVersion: 'v1',
    salt: 'testSalt',
    hash: 'testHash',
    admin: false,
    sectionId: 'testSectionId',
    meta: { testProp: 'testValue' }
  };

  const expectQueryAndValues = function (
    queries: number,
    queriesWithValues: number,
    queryIndex: number,
    valuesIndex: number,
    queryRegex: RegExp,
    values: (string | number | boolean)[]
  ): void {
    expect(mocked_data.queries?.length).toBe(queries);
    expect(mocked_data.values?.length).toBe(queriesWithValues);
    expect(mocked_data.queries?.at(queryIndex)).toMatch(queryRegex);
    expect(mocked_data.values?.at(valuesIndex)).toEqual(values);
  };

  const when = function (queryRegex: RegExp, values?: Value[]) {
    mocked_when_then.queryRegex = queryRegex;
    mocked_when_then.values = values;
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then(rows: any) {
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

  test('PostgresDatabase->constructor works correctly.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);

    expect(db.getConf()).toEqual(conf);
  });

  test('PostgresDatabase->open connects to db.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);

    await db.open();

    expect(mocked_data.client).toBeDefined();
    expect(mocked_data.conf).toEqual(conf);
    expect(mocked_data.connected).toBe(true);
    expect(mocked_data.queries?.length).toBe(3);
    expect(mocked_data.queries?.at(0)).toMatch(
      /^create table if not exists user_\s*\(username text, hashVersion text, salt text, hash text, admin Boolean, sectionId text, meta JSON\)$/iu
    );
    expect(mocked_data.queries?.at(1)).toMatch(/^create table if not exists jwtKey\s*\(key text\)$/iu);
    expect(mocked_data.queries?.at(2)).toMatch(/^create table if not exists failedLoginAttempts\s*\(username text, attempts int\)$/iu);
  });

  test('PostgresDatabase->close disconnects from db.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.close();

    expect(mocked_data.connected).toBe(false);
  });

  test('PostgresDatabase->addUser adds User.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.addUser(testUser);

    expectQueryAndValues(
      4,
      1,
      3,
      0,
      /^insert into user_\s*\(username, hashVersion, salt, hash, admin, sectionId, meta\) values\s*\(\$1, \$2, \$3, \$4, \$5, \$6, \$7\)$/iu,
      [testUser.username, testUser.hashVersion, testUser.salt, testUser.hash, testUser.admin, testUser.sectionId, JSON.stringify(testUser.meta)]
    );
  });

  test('PostgresDatabase->changeUsername changes username.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.changeUsername(testUser.username, 'newUsername');

    expectQueryAndValues(4, 1, 3, 0, /^update user_ set username=\$1 where username=\$2$/iu, ['newUsername', testUser.username]);
  });

  test('PostgresDatabase->updateHash updates hash.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.updateHash(testUser.username, 'v2', 'newSalt', 'newHash');

    expectQueryAndValues(4, 1, 3, 0, /^update user_ set hashVersion=\$1, salt=\$2, hash=\$3 where username=\$4$/iu, [
      'v2',
      'newSalt',
      'newHash',
      testUser.username
    ]);
  });

  test('PostgresDatabase->makeUserAdmin makes user to admin.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.makeUserAdmin(testUser.username);

    expectQueryAndValues(4, 1, 3, 0, /^update user_ set admin=\$1 where username=\$2$/iu, [true, testUser.username]);
  });

  test('PostgresDatabase->makeUserNormalUser makes user to normal user.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.makeUserNormalUser(testUser.username);

    expectQueryAndValues(4, 1, 3, 0, /^update user_ set admin=\$1 where username=\$2$/iu, [false, testUser.username]);
  });

  test('PostgresDatabase->modifyMeta modifies meta.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.modifyMeta(testUser.username, { k: 'v' });

    expectQueryAndValues(4, 1, 3, 0, /^update user_ set meta=\$1 where username=\$2$/iu, ['{"k":"v"}', testUser.username]);
  });

  test('PostgresDatabase->removeUser removes User.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.removeUser(testUser.username);

    expectQueryAndValues(4, 1, 3, 0, /^delete from user_ where username=\$1$/iu, [testUser.username]);
  });

  test('PostgresDatabase->getUser gets User.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from user_ where username=\$1$/iu, [testUser.username]).then([testUser]);

    const user = await db.getUser(testUser.username);

    expect(user).toEqual(testUser);
  });

  test('PostgresDatabase->addJwtKeys adds keys.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.addJwtKeys('key1', 'key2');

    expectQueryAndValues(5, 2, 3, 0, /^insert into jwtKey\s*\(key\) values\s*\(\$1\)$/iu, ['key1']);
    expectQueryAndValues(5, 2, 4, 1, /^insert into jwtKey\s*\(key\) values\s*\(\$1\)$/iu, ['key2']);
  });

  test('PostgresDatabase->getJwtKeys gets keys.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from jwtKey$/iu).then([{ key: 'key1' }, { key: 'key2' }]);

    const keys = await db.getJwtKeys();

    expect(keys).toEqual(['key1', 'key2']);
  });

  test('PostgresDatabase->countFailedLoginAttempts creates new entity with attempts=1.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from failedLoginAttempts where username=\$1$/iu, [testUser.username]).then([]);

    await db.countLoginAttempt(testUser.username);

    expectQueryAndValues(4, 1, 3, 0, /^insert into failedLoginAttempts\s*\(username, attempts\) values\s*\(\$1, \$2\)$/iu, [testUser.username, 1]);
  });

  test('PostgresDatabase->countFailedLoginAttempts increasing attempts in existing entity.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from failedLoginAttempts where username=\$1$/iu, [testUser.username]).then([{ username: testUser.username, attempts: 1 }]);

    await db.countLoginAttempt(testUser.username);

    expectQueryAndValues(4, 1, 3, 0, /^update failedLoginAttempts set attempts=\$1 where username=\$2$/iu, [2, testUser.username]);
  });

  test('PostgresDatabase->getLoginAttempts gets attempts.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from failedLoginAttempts where username=\$1$/iu, [testUser.username]).then([{ username: testUser.username, attempts: 1 }]);

    const attempts = await db.getLoginAttempts(testUser.username);

    expect(attempts).toBe(1);
  });

  test('PostgresDatabase->removeLoginAttempts removes entity.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.removeLoginAttempts(testUser.username);

    expectQueryAndValues(4, 1, 3, 0, /^delete from failedLoginAttempts where username=\$1$/iu, [testUser.username]);
  });
});
