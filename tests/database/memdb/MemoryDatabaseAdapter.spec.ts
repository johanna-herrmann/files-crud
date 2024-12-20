import { MemoryDatabaseAdapter, data } from '@/database/memdb/MemoryDatabaseAdapter';
import { testUser } from '#/testItems';
import User from '@/types/User';

describe('MongoDatabaseAdapter', (): void => {
  afterEach((): void => {
    data.user_ = [];
    data.jwtKey = [];
    data.failedLoginAttempts = [];
  });

  test('MemoryDatabaseAdapter->init initializes user table item.', async (): Promise<void> => {
    delete data.user_;
    const db = new MemoryDatabaseAdapter();

    await db.init<User>('user_', testUser);

    expect(data.user_?.length).toBe(0);
  });

  test('MemoryDatabaseAdapter->add adds item.', async (): Promise<void> => {
    const db = new MemoryDatabaseAdapter();

    await db.add<User>('user_', testUser);

    const user = data.user_.find((item) => (item as User)?.username === testUser.username);
    expect(user).toEqual(testUser);
    expect(user).not.toBe(testUser);
  });

  test('MemoryDatabaseAdapter->update updates item, without key change.', async (): Promise<void> => {
    const db = new MemoryDatabaseAdapter();
    await db.add<User>('user_', testUser);

    await db.update('user_', 'username', testUser.username, { hashVersion: 'newVersion', salt: 'newSalt', hash: 'newHash' });

    const user = data.user_.find((item) => (item as User)?.username === testUser.username) as User | undefined;
    expect(user?.hashVersion).toBe('newVersion');
    expect(user?.salt).toBe('newSalt');
    expect(user?.hash).toBe('newHash');
  });

  test('MemoryDatabaseAdapter->update updates item, with key change.', async (): Promise<void> => {
    const db = new MemoryDatabaseAdapter();
    await db.add<User>('user_', testUser);

    await db.update('user_', 'username', testUser.username, { username: 'newUsername' });

    const userOld = data.user_.find((item) => (item as User)?.username === testUser.username) as User | undefined;
    const userNew = data.user_.find((item) => (item as User)?.username === 'newUsername') as User | undefined;
    expect(userOld).toBeUndefined();
    expect(userNew?.username).toBe('newUsername');
    expect(data.user_.length).toBe(1);
  });

  test('MemoryDatabaseAdapter->findOne finds one.', async (): Promise<void> => {
    const db = new MemoryDatabaseAdapter();
    await db.add<User>('user_', testUser);

    const item = await db.findOne<User>('user_', 'username', testUser.username);

    expect(item).toEqual(testUser);
  });

  test('MemoryDatabaseAdapter->findAll finds all.', async (): Promise<void> => {
    const secondUser = { ...testUser, username: 'other' };
    const db = new MemoryDatabaseAdapter();
    await db.add<User>('user_', testUser);
    await db.add<User>('user_', secondUser);

    const items = await db.findAll<User>('user_');

    expect(items.length).toBe(2);
    expect(items[0]).toEqual(testUser);
    expect(items[1]).toEqual(secondUser);
  });

  test('MemoryDatabaseAdapter->exists returns true if item exists.', async (): Promise<void> => {
    const db = new MemoryDatabaseAdapter();
    await db.add<User>('user_', testUser);

    const exists = await db.exists('user_', 'username', testUser.username);

    expect(exists).toBe(true);
  });

  test('MemoryDatabaseAdapter->exists returns false if item does not exist.', async (): Promise<void> => {
    const db = new MemoryDatabaseAdapter();
    await db.add<User>('user_', testUser);

    const exists = await db.exists('user_', 'username', 'other');

    expect(exists).toBe(false);
  });

  test('MemoryDatabaseAdapter->delete deletes item.', async (): Promise<void> => {
    const otherUser = { ...testUser, username: 'other' };
    const db = new MemoryDatabaseAdapter();
    await db.add<User>('user_', testUser);
    await db.add<User>('user_', otherUser);

    await db.delete('user_', 'username', testUser.username);

    const user = data.user_.find((item) => (item as User)?.username === testUser.username) as User | undefined;
    const other = data.user_.find((item) => (item as User)?.username === 'other') as User | undefined;
    expect(user).toBeUndefined();
    expect(other).toEqual(otherUser);
    expect(data.user_.length).toBe(1);
  });
});
