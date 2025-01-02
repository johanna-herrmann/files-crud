import { Database } from '@/database/Database';
import { data, MemoryDatabaseAdapter } from '@/database/memdb/MemoryDatabaseAdapter';
import { expectKeys } from '#/database/expectKeys';
import { loadConfig } from '@/config';
import User from '@/types/user/User';
import FailedLoginAttempts from '@/types/user/FailedLoginAttempts';
import { testUser } from '#/testItems';
import { MongoDatabaseAdapter } from '@/database/mongodb/MongoDatabaseAdapter';
import { PostgresDatabaseAdapter } from '@/database/postgresql/PostgresDatabaseAdapter';
import { DynamoDatabaseAdapter } from '@/database/dynamodb/DynamoDatabaseAdapter';

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

describe('Database', (): void => {
  const fakeDate = new Date('2017-01-01');
  const fakeTime = fakeDate.getTime();

  beforeEach(async (): Promise<void> => {
    loadConfig();
    jest.useFakeTimers();
    jest.setSystemTime(fakeDate);
    mocked_index = 0;
  });

  afterEach((): void => {
    data.user_ = [];
    data.jwtKey = [];
    data.failedLoginAttempts = [];
    jest.useRealTimers();
  });

  test('Database->constructor uses MemoryDatabaseAdapter.', async (): Promise<void> => {
    const db = new Database();

    expect(db.getAdapter()).toBeInstanceOf(MemoryDatabaseAdapter);
  });

  test('Database->constructor uses MongoDatabaseAdapter.', async (): Promise<void> => {
    loadConfig({ database: { name: 'mongodb' } });
    const db = new Database();

    expect(db.getAdapter()).toBeInstanceOf(MongoDatabaseAdapter);
  });

  test('Database->constructor uses PostgresDatabaseAdapter.', async (): Promise<void> => {
    loadConfig({ database: { name: 'postgresql' } });
    const db = new Database();

    expect(db.getAdapter()).toBeInstanceOf(PostgresDatabaseAdapter);
  });

  test('Database->constructor uses DynamoDatabaseAdapter.', async (): Promise<void> => {
    loadConfig({ database: { name: 'dynamodb' } });
    const db = new Database();

    expect(db.getAdapter()).toBeInstanceOf(DynamoDatabaseAdapter);
  });

  test('Database->open connects to db.', async (): Promise<void> => {
    const db = new Database();

    await db.open();

    expect((db.getAdapter() as MemoryDatabaseAdapter).isConnected()).toBe(true);
  });

  test('Database->close disconnects from db.', async (): Promise<void> => {
    const db = new Database();
    await db.open();

    await db.close();

    expect((db.getAdapter() as MemoryDatabaseAdapter).isConnected()).toBe(false);
  });

  test('Database->init initializes tables.', async (): Promise<void> => {
    delete data.user_;
    delete data.jwtKey;
    delete data.failedLoginAttempts;
    const db = new Database();

    await db.init();

    expect(Object.keys(data)).toEqual(['user_', 'failedLoginAttempts', 'jwtKey']);
  });

  test('Database->addUser adds user.', async (): Promise<void> => {
    const db = new Database();

    await db.addUser(testUser);

    const user = data.user_.find((item) => (item as User)?.username === testUser.username);
    expect(user).toEqual(testUser);
  });

  test('Database->changeUsername changes the username.', async (): Promise<void> => {
    const db = new Database();
    await db.addUser(testUser);

    await db.changeUsername(testUser.username, 'newName');

    const user = data.user_.find((item) => (item as User)?.username === 'newName') as User | undefined;
    expect(user?.username).toBe('newName');
  });

  test('Database->updateHash updates hash properties.', async (): Promise<void> => {
    const db = new Database();
    await db.addUser(testUser);

    await db.updateHash(testUser.username, 'newVersion', 'newSalt', 'newHash');

    const user = data.user_.find((item) => (item as User)?.username === testUser.username) as User | undefined;
    expect(user?.hashVersion).toBe('newVersion');
    expect(user?.salt).toBe('newSalt');
    expect(user?.hash).toBe('newHash');
  });

  test('Database->makeUserAdmin makes user to be an admin.', async (): Promise<void> => {
    const db = new Database();
    await db.addUser(testUser);

    await db.makeUserAdmin(testUser.username);

    const user = data.user_.find((item) => (item as User)?.username === testUser.username) as User | undefined;
    expect(user?.admin).toBe(true);
  });

  test('Database->makeUserNormalUser makes user to be a normal user.', async (): Promise<void> => {
    const db = new Database();
    await db.addUser(testUser);
    (data.user_[0] as User).admin = true;

    await db.makeUserNormalUser(testUser.username);

    const user = data.user_.find((item) => (item as User)?.username === testUser.username) as User | undefined;
    expect(user?.admin).toBe(false);
  });

  test('Database->modifyUserMeta modifies user metadata.', async (): Promise<void> => {
    const db = new Database();
    await db.addUser(testUser);

    await db.modifyUserMeta(testUser.username, { k: 'v' });

    const user = data.user_.find((item) => (item as User)?.username === testUser.username) as User | undefined;
    expect(user?.meta?.k).toBe('v');
    expect(user?.meta?.testProp).toBeUndefined();
  });

  test('Database->removeUser removesUser.', async (): Promise<void> => {
    const db = new Database();
    await db.addUser(testUser);
    await db.addUser({ ...testUser, username: 'other' });

    await db.removeUser(testUser.username);

    const user = data.user_.find((item) => (item as User)?.username === testUser.username) as User | undefined;
    const other = data.user_.find((item) => (item as User)?.username === 'other') as User | undefined;
    expect(user).toBeUndefined();
    expect(other).toEqual({ ...testUser, username: 'other' });
    expect(data.user_.length).toBe(1);
  });

  test('Database->getUser gets user.', async (): Promise<void> => {
    const db = new Database();
    await db.addUser(testUser);

    const user = await db.getUser(testUser.username);

    expect(user?.username).toBe(testUser.username);
  });

  test('Database->getUsers gets users.', async (): Promise<void> => {
    const db = new Database();
    await db.addUser(testUser);
    await db.addUser({ ...testUser, username: 'user2', admin: true });

    const userList = await db.getUsers();

    expect(userList[0]).toEqual({ username: testUser.username, admin: false });
    expect(userList[1]).toEqual({ username: 'user2', admin: true });
  });

  test('Database->userExists returns true if user exists.', async (): Promise<void> => {
    const db = new Database();
    await db.addUser(testUser);

    const exists = await db.userExists(testUser.username);

    expect(exists).toBe(true);
  });

  test('Database->userExists returns false if user does not exist.', async (): Promise<void> => {
    const db = new Database();
    await db.addUser(testUser);

    const exists = await db.userExists('other');

    expect(exists).toBe(false);
  });

  test('Database->addJwtKeys adds keys.', async (): Promise<void> => {
    const db = new Database();

    await db.addJwtKeys('key1', 'key2', 'key3');

    expect(data.jwtKey.length).toBe(3);
    expect(data.jwtKey[0]).toEqual({ kid: mocked_id + 0, key: 'key1' });
    expect(data.jwtKey[1]).toEqual({ kid: mocked_id + 1, key: 'key2' });
    expect(data.jwtKey[2]).toEqual({ kid: mocked_id + 2, key: 'key3' });
  });

  test('Database->getJwtKeys gets keys.', async (): Promise<void> => {
    const db = new Database();
    await db.addJwtKeys('key1', 'key2', 'key3');

    const keys = await db.getJwtKeys();

    expectKeys(keys, mocked_id);
  });

  test('Database->countLoginAttempt creates new item with attempts=1.', async (): Promise<void> => {
    const db = new Database();

    await db.countLoginAttempt(testUser.username);

    const attempts = data.failedLoginAttempts.find((item) => (item as FailedLoginAttempts)?.username === testUser.username) as
      | FailedLoginAttempts
      | undefined;
    expect(attempts?.attempts).toBe(1);
    expect(attempts?.lastAttempt).toBe(fakeTime);
  });

  test('Database->countLoginAttempt increases attempts in existing item.', async (): Promise<void> => {
    const db = new Database();
    await db.countLoginAttempt(testUser.username);

    await db.countLoginAttempt(testUser.username);

    const attempts = data.failedLoginAttempts.find((item) => (item as FailedLoginAttempts)?.username === testUser.username) as
      | FailedLoginAttempts
      | undefined;
    expect(attempts?.attempts).toBe(2);
    expect(attempts?.lastAttempt).toBe(fakeTime);
  });

  test('Database->updateLastLoginAttempt updates lastAttempt only.', async (): Promise<void> => {
    const db = new Database();
    await db.countLoginAttempt(testUser.username);
    jest.setSystemTime(42);

    await db.updateLastLoginAttempt(testUser.username);

    const attempts = data.failedLoginAttempts.find((item) => (item as FailedLoginAttempts)?.username === testUser.username) as
      | FailedLoginAttempts
      | undefined;
    expect(attempts?.attempts).toBe(1);
    expect(attempts?.lastAttempt).toBe(42);
  });

  test('Database->getLoginAttempts returns attempts for username.', async (): Promise<void> => {
    const db = new Database();
    await db.countLoginAttempt(testUser.username);

    const attempts = await db.getLoginAttempts(testUser.username);

    expect(attempts?.attempts).toBe(1);
    expect(attempts?.lastAttempt).toBe(fakeTime);
  });

  test('Database->getLoginAttempts returns null object if no item exists for username.', async (): Promise<void> => {
    const db = new Database();

    const attempts = await db.getLoginAttempts(testUser.username);

    expect(attempts).toEqual({ username: testUser.username, attempts: 0, lastAttempt: -1 });
  });

  test('Database->removeLoginAttempts removes attempts.', async (): Promise<void> => {
    const db = new Database();
    await db.countLoginAttempt(testUser.username);

    await db.removeLoginAttempts(testUser.username);

    expect(data.failedLoginAttempts.length).toBe(0);
  });
});
