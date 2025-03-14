import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import mongoose from 'mongoose';
import { MongoDatabaseAdapter, MongoItem } from '@/database/mongodb/MongoDatabaseAdapter';
import { loadConfig } from '@/config/config';
import { testUser } from '#/testItems';
import { User } from '@/types/user/User';
import { JwtKey } from '@/types/user/JwtKey';
import { FailedLoginAttempts } from '@/types/user/FailedLoginAttempts';

const getUser = async function (db: MongoDatabaseAdapter | null, filter: Record<string, unknown>): Promise<User | null> {
  const collection = db?.getCollections()?.user_;
  const item = await collection?.findOne<MongoItem>(filter);
  if (!item) {
    return null;
  }
  delete item._id;
  return item as User;
};

describe('MongoDatabaseAdapter', (): void => {
  jest.setTimeout(60000);

  let container: StartedMongoDBContainer | null = null;
  let db: null | MongoDatabaseAdapter = null;
  let url = 'mongodb://localhost:27017/files-crud';

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:6.0.1').start();
    url = `${container.getConnectionString()}/files-crud`;
  });

  afterAll(async () => {
    container?.stop();
  });

  beforeEach(async (): Promise<void> => {
    loadConfig({ database: { name: 'mongodb', url } });
    db = new MongoDatabaseAdapter();
  });

  afterEach(async (): Promise<void> => {
    if (db?.getCollections()?.user_) {
      await db.getCollections().user_.deleteOne({ username: testUser.username });
      await db.getCollections().user_.deleteOne({ username: 'other' });
      await db.getCollections().user_.deleteOne({ username: 'newUsername' });
    }
    await db?.close();
  });

  test('MongoDatabaseAdapter->constructor works correctly, default conf.', async (): Promise<void> => {
    loadConfig({ database: { name: 'mongodb' } });
    const url = 'mongodb://localhost:27017/files-crud';

    const newDb = new MongoDatabaseAdapter();

    expect(newDb.getConf()).toEqual([url, '', '']);
  });

  test('MongoDatabaseAdapter->constructor works correctly, specific conf.', async (): Promise<void> => {
    loadConfig({ database: { name: 'mongodb', url: 'testUrl/db', user: 'user', pass: 'pass' } });

    const newDb = new MongoDatabaseAdapter();

    expect(newDb.getConf()).toEqual(['testUrl/db', 'user', 'pass']);
  });

  test('MongoDatabaseAdapter->open connects to db.', async (): Promise<void> => {
    await db?.open();

    expect(db?.getConnection()).toBeInstanceOf(mongoose.Connection);
    expect(db?.getSession()).toBeInstanceOf(mongoose.mongo.ClientSession);
  });

  test('MongoDatabaseAdapter->close disconnects from db.', async (): Promise<void> => {
    await db?.open();

    await db?.close();

    expect(db?.getConnection()).toBeNull();
    expect(db?.getSession()).toBeNull();
  });

  test('MongoDatabaseAdapter->init initializes user table.', async (): Promise<void> => {
    await db?.open();
    if ('user_' in (db?.getCollections() ?? {})) {
      await db?.getConnection()?.dropCollection('user_');
    }

    await db?.init<User>('user_', testUser);

    expect('user_' in (db?.getCollections() ?? {})).toBe(true);
    expect(db?.getCollections()?.user_?.collectionName).toBe('user_');
  });

  test('MongoDatabaseAdapter->init initializes jwtKey table.', async (): Promise<void> => {
    await db?.open();
    if ('jwtKey' in (db?.getCollections() ?? {})) {
      await db?.getConnection()?.dropCollection('jwtKey');
    }

    await db?.init<JwtKey>('jwtKey', { kid: '', key: '' });

    expect('jwtKey' in (db?.getCollections() ?? {})).toBe(true);
    expect(db?.getCollections()?.jwtKey?.collectionName).toBe('jwtKey');
  });

  test('MongoDatabaseAdapter->init initializes failedLoginAttempts table.', async (): Promise<void> => {
    await db?.open();
    if ('failedLoginAttempts' in (db?.getCollections() ?? {})) {
      await db?.getConnection()?.dropCollection('failedLoginAttempts');
    }

    await db?.init<FailedLoginAttempts>('failedLoginAttempts', { username: testUser.username, attempts: 0, lastAttempt: 0 });

    expect('failedLoginAttempts' in (db?.getCollections() ?? {})).toBe(true);
    expect(db?.getCollections()?.failedLoginAttempts?.collectionName).toBe('failedLoginAttempts');
  });

  test('MongoDatabaseAdapter->add adds item.', async (): Promise<void> => {
    await db?.open();
    await db?.init<User>('user_', testUser);

    await db?.add<User>('user_', testUser);

    const user = await getUser(db, { username: testUser.username });
    expect(user).toEqual(testUser);
  });

  test('MongoDatabaseAdapter->update updates item, without key change.', async (): Promise<void> => {
    await db?.open();
    await db?.init<User>('user_', testUser);
    await db?.add<User>('user_', testUser);

    await db?.update('user_', 'username', testUser.username, { hashVersion: 'newVersion', salt: 'newSalt', hash: 'newHash' });

    const user = await getUser(db, { username: testUser.username });
    expect(user?.hashVersion).toBe('newVersion');
    expect(user?.salt).toBe('newSalt');
    expect(user?.hash).toBe('newHash');
  });

  test('MongoDatabaseAdapter->update updates item, with key change.', async (): Promise<void> => {
    await db?.open();
    await db?.init<User>('user_', testUser);
    await db?.add<User>('user_', testUser);

    await db?.update('user_', 'username', testUser.username, { username: 'newUsername' });

    const userOld = await getUser(db, { username: testUser.username });
    const userNew = await getUser(db, { username: 'newUsername' });
    expect(userOld).toBeNull();
    expect(userNew?.username).toBe('newUsername');
  });

  test('MongoDatabaseAdapter->findOne finds one.', async (): Promise<void> => {
    await db?.open();
    await db?.init<User>('user_', testUser);
    await db?.add<User>('user_', testUser);

    const user = await db?.findOne<User>('user_', 'username', testUser.username);

    expect(user).toEqual(testUser);
  });

  test('MongoDatabaseAdapter->findAll finds all.', async (): Promise<void> => {
    const otherUser = { ...testUser, username: 'other' };
    await db?.open();
    await db?.init<User>('user_', testUser);
    await db?.add<User>('user_', testUser);
    await db?.add<User>('user_', otherUser);

    const items = await db?.findAll<User>('user_');

    expect(items?.length).toBe(2);
    expect(items?.at(0)).toEqual(testUser);
    expect(items?.at(1)).toEqual(otherUser);
  });

  test('MongoDatabaseAdapter->exists returns true if item exists.', async (): Promise<void> => {
    await db?.open();
    await db?.init<User>('user_', testUser);
    await db?.add<User>('user_', testUser);

    const exists = await db?.exists('user_', 'username', testUser.username);

    expect(exists).toBe(true);
  });

  test('MongoDatabaseAdapter->exists returns false if item does not exist.', async (): Promise<void> => {
    await db?.open();
    await db?.init<User>('user_', testUser);
    await db?.add<User>('user_', testUser);

    const exists = await db?.exists('user_', 'username', 'other');

    expect(exists).toBe(false);
  });

  test('MongoDatabaseAdapter->delete deletes item.', async (): Promise<void> => {
    const otherUser = { ...testUser, username: 'other' };
    await db?.open();
    await db?.init<User>('user_', testUser);
    await db?.add<User>('user_', testUser);
    await db?.add<User>('user_', otherUser);

    await db?.delete('user_', 'username', testUser.username);

    const user = await getUser(db, { username: testUser.username });
    const other = await getUser(db, { username: 'other' });
    expect(user).toBeNull();
    expect(other?.username).toBe('other');
  });
});
