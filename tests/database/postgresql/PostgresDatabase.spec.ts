import { Client, QueryResult, QueryResultRow } from 'pg';
import { PostgresDatabase } from '@/database/postgresql/PostgresDatabase';
import PgDbConf from '@/types/PgDbConf';
import { testUser, testFile } from '#/testItems';

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
  definingQueries?: string[];
  writingQueries?: string[];
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

const mocked_id = 'test-id';
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

jest.mock('@/database/postgresql/pgWrapper', () => {
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
    async connect(_: Client) {
      mocked_data.connected = true;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async end(_: Client) {
      mocked_data.connected = false;
    },
    async definingQuery(_: Client, query: string) {
      mocked_data.definingQueries?.push(query);
    },
    async writingQuery(_: Client, query: string, values?: (string | number | boolean)[]) {
      mocked_data.writingQueries?.push(query);
      mocked_data.values?.push(values ?? []);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async readingQuery<T extends QueryResultRow>(_: Client, query: string, values?: (string | number | boolean)[]) {
      if (mocked_when_then.queryRegex.test(query) && JSON.stringify(mocked_when_then.values) === JSON.stringify(values)) {
        return mocked_when_then.result;
      }
      return null;
    }
  };
});

const fakeDate = new Date('2017-01-01');
const fakeTime = fakeDate.getTime();

describe('PostgresDatabase', (): void => {
  beforeEach(async (): Promise<void> => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeDate);
    mocked_index = 0;
  });

  afterEach(async (): Promise<void> => {
    mocked_data = {};
    mocked_when_then.queryRegex = /./;
    mocked_when_then.values = undefined;
    mocked_when_then.result = null;
    jest.useRealTimers();
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

  const when = function (queryRegex: RegExp, values?: Value[]) {
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
    expect(mocked_data.definingQueries?.length).toBe(4);
    expect(mocked_data.definingQueries?.at(0)).toMatch(
      /^create table if not exists user_\s*\(username text, hashVersion text, salt text, hash text, admin Boolean, sectionId text, meta JSON\)$/iu
    );
    expect(mocked_data.definingQueries?.at(1)).toMatch(/^create table if not exists jwtKey\s*\(id text, key text\)$/iu);
    expect(mocked_data.definingQueries?.at(2)).toMatch(
      /^create table if not exists failedLoginAttempts\s*\(username text, attempts int, lastAttempt bigint\)$/iu
    );
    expect(mocked_data.definingQueries?.at(3)).toMatch(/^create table if not exists file\s*\(path text, owner text, realName text, meta JSON\)$/iu);
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
      1,
      1,
      0,
      0,
      /^insert into user_\s*\(username, hashVersion, salt, hash, admin, ownerId, meta\) values\s*\(\$1, \$2, \$3, \$4, \$5, \$6, \$7\)$/iu,
      [testUser.username, testUser.hashVersion, testUser.salt, testUser.hash, testUser.admin, testUser.ownerId, JSON.stringify(testUser.meta)]
    );
  });

  test('PostgresDatabase->changeUsername changes username.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.changeUsername(testUser.username, 'newUsername');

    expectQueryAndValues(1, 1, 0, 0, /^update user_ set username=\$1 where username=\$2$/iu, ['newUsername', testUser.username]);
  });

  test('PostgresDatabase->updateHash updates hash.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.updateHash(testUser.username, 'v2', 'newSalt', 'newHash');

    expectQueryAndValues(1, 1, 0, 0, /^update user_ set hashVersion=\$1, salt=\$2, hash=\$3 where username=\$4$/iu, [
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

    expectQueryAndValues(1, 1, 0, 0, /^update user_ set admin=\$1 where username=\$2$/iu, [true, testUser.username]);
  });

  test('PostgresDatabase->makeUserNormalUser makes user to normal user.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.makeUserNormalUser(testUser.username);

    expectQueryAndValues(1, 1, 0, 0, /^update user_ set admin=\$1 where username=\$2$/iu, [false, testUser.username]);
  });

  test('PostgresDatabase->modifyUserMeta modifies meta.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.modifyUserMeta(testUser.username, { k: 'v' });

    expectQueryAndValues(1, 1, 0, 0, /^update user_ set meta=\$1 where username=\$2$/iu, ['{"k":"v"}', testUser.username]);
  });

  test('PostgresDatabase->removeUser removes User.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.removeUser(testUser.username);

    expectQueryAndValues(1, 1, 0, 0, /^delete from user_ where username=\$1$/iu, [testUser.username]);
  });

  test('PostgresDatabase->getUser gets User.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from user_ where username=\$1$/iu, [testUser.username]).then([testUser]);

    const user = await db.getUser(testUser.username);

    expect(user).toEqual(testUser);
  });

  test('PostgresDatabase->getUsers gets Users.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from user_$/iu).then([testUser, { ...testUser, username: 'user2', admin: true }]);

    const userList = await db.getUsers();

    expect(userList[0]).toEqual({ username: testUser.username, admin: false });
    expect(userList[1]).toEqual({ username: 'user2', admin: true });
  });

  test('PostgresDatabase->userExists returns true if user exists.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from user_ where username=\$1$/iu, [testUser.username]).then([testUser]);

    const exists = await db.userExists(testUser.username);

    expect(exists).toBe(true);
  });

  test('PostgresDatabase->userExists returns false if user does not exist.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from user_ where username=\$1$/iu, [testUser.username]).then();

    const exists = await db.userExists(testUser.username);

    expect(exists).toBe(false);
  });

  test('PostgresDatabase->addJwtKeys adds keys.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.addJwtKeys('key1', 'key2');

    expectQueryAndValues(2, 2, 0, 0, /^insert into jwtKey\s*\(id, key\) values\s*\(\$1, \$2\)$/iu, [mocked_id + 0, 'key1']);
    expectQueryAndValues(2, 2, 1, 1, /^insert into jwtKey\s*\(id, key\) values\s*\(\$1, \$2\)$/iu, [mocked_id + 1, 'key2']);
  });

  test('PostgresDatabase->getJwtKeys gets keys.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from jwtKey$/iu).then([
      { id: '1', key: 'key1' },
      { id: '2', key: 'key2' }
    ]);

    const keys = await db.getJwtKeys();

    expect(keys[0]).toEqual({ id: '1', key: 'key1' });
    expect(keys[1]).toEqual({ id: '2', key: 'key2' });
  });

  test('PostgresDatabase->countFailedLoginAttempts creates new entity with attempts=1.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from failedLoginAttempts where username=\$1$/iu, [testUser.username]).then([]);

    await db.countLoginAttempt(testUser.username);

    expectQueryAndValues(1, 1, 0, 0, /^insert into failedLoginAttempts\s*\(username, attempts, lastAttempt\) values\s*\(\$1, \$2, \$3\)$/iu, [
      testUser.username,
      1,
      fakeTime
    ]);
  });

  test('PostgresDatabase->countFailedLoginAttempts increasing attempts in existing entity.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from failedLoginAttempts where username=\$1$/iu, [testUser.username]).then([{ username: testUser.username, attempts: 1 }]);

    await db.countLoginAttempt(testUser.username);

    expectQueryAndValues(1, 1, 0, 0, /^update failedLoginAttempts set attempts=\$1, lastAttempt=\$2 where username=\$3$/iu, [
      2,
      fakeTime,
      testUser.username
    ]);
  });

  test('PostgresDatabase->countFailedLoginAttempts increasing attempts in existing entity.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from failedLoginAttempts where username=\$1$/iu, [testUser.username]).then([
      { username: testUser.username, attempts: 1, lastAttempt: 0 }
    ]);
    jest.setSystemTime(42);

    await db.updateLastLoginAttempt(testUser.username);

    expectQueryAndValues(1, 1, 0, 0, /^update failedLoginAttempts set lastAttempt=\$1 where username=\$2$/iu, [42, testUser.username]);
  });

  test('PostgresDatabase->getLoginAttempts returns attempts for username.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from failedLoginAttempts where username=\$1$/iu, [testUser.username]).then([
      { username: testUser.username, attempts: 1, lastAttempt: 5 }
    ]);

    const attempts = await db.getLoginAttempts(testUser.username);

    expect(attempts?.attempts).toBe(1);
    expect(attempts?.lastAttempt).toBe(5);
  });

  test('PostgresDatabase->getLoginAttempts returns 0 if no item exists for username.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from failedLoginAttempts where username=\$1$/iu, [testUser.username]).then([]);

    const attempts = await db.getLoginAttempts(testUser.username);

    expect(attempts).toBeNull();
  });

  test('PostgresDatabase->removeLoginAttempts removes entity.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.removeLoginAttempts(testUser.username);

    expectQueryAndValues(1, 1, 0, 0, /^delete from failedLoginAttempts where username=\$1$/iu, [testUser.username]);
  });

  test('PostgresDatabase->addFile adds File.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.addFile(testFile);

    expectQueryAndValues(1, 1, 0, 0, /^insert into file\s*\(path, owner, realName, meta\) values\s*\(\$1, \$2, \$3, \$4\)$/iu, [
      testFile.path,
      testFile.owner,
      testFile.realName,
      JSON.stringify(testUser.meta)
    ]);
  });

  test('PostgresDatabase->moveFile changes path, keeping owner.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.moveFile(testFile.path, 'newPath');

    expectQueryAndValues(1, 1, 0, 0, /^update file set path=\$1 where path=\$2$/iu, ['newPath', testFile.path]);
  });

  test('PostgresDatabase->moveFile changes path, also changing owner.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.moveFile(testFile.path, 'newPath', 'newOwner');

    expectQueryAndValues(1, 1, 0, 0, /^update file set path=\$1, owner=\$2 where path=\$3$/iu, ['newPath', 'newOwner', testFile.path]);
  });

  test('PostgresDatabase->modifyFileMeta modifies meta.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.modifyFileMeta(testFile.path, { testProp: 'value2' });

    expectQueryAndValues(1, 1, 0, 0, /^update file set meta=\$1 where path=\$2$/iu, [JSON.stringify({ testProp: 'value2' }), testFile.path]);
  });

  test('PostgresDatabase->removeFile removes file.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();

    await db.removeFile(testFile.path);

    expectQueryAndValues(1, 1, 0, 0, /^delete from file where path=\$1$/iu, [testFile.path]);
  });

  test('PostgresDatabase->getFile gets File.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from file where path=\$1$/iu, [testFile.path]).then([testFile]);

    const file = await db.getFile(testFile.path);

    expect(file).toEqual(testFile);
  });

  test('PostgresDatabase->listFilesInFolder lists files.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select path from file where path~\$1 order by path$/iu, ['^test/([^/]+)$']).then([{ path: testFile.path }, { path: 'test/path2' }]);

    const files = await db.listFilesInFolder('test');

    expect(files).toEqual(['path', 'path2']);
  });

  test('PostgresDatabase->fileExists returns true if file exists.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from file where path=\$1$/iu, [testFile.path]).then([testFile]);

    const exists = await db.fileExists(testFile.path);

    expect(exists).toBe(true);
  });

  test('PostgresDatabase->fileExists returns false if file does not exist.', async (): Promise<void> => {
    const db = new PostgresDatabase(conf);
    await db.open();
    when(/^select \* from file where path=\$1$/iu, [testFile.path]).then();

    const exists = await db.fileExists(testFile.path);

    expect(exists).toBe(false);
  });
});
