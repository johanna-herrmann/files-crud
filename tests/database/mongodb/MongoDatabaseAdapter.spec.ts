import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MongoDatabaseAdapter, schemata } from '@/database/mongodb/MongoDatabaseAdapter';
import { loadConfig } from '@/config/config';
import { testUser } from '#/testItems';
import { User } from '@/types/user/User';

let db: MongoDatabaseAdapter | null = null;
let mongod: null | MongoMemoryServer;
let uri = '';

const userSchema = {
  id: { type: String, default: '' },
  username: { type: String, default: '' },
  hashVersion: { type: String, default: '' },
  salt: { type: String, default: '' },
  hash: { type: String, default: '' },
  admin: { type: Boolean, default: '' },
  meta: Object
};

describe('MongoDatabaseAdapter', (): void => {
  beforeEach(async (): Promise<void> => {
    loadConfig();
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    loadConfig({ database: { name: 'mongodb', url: uri } });
    schemata['user_'] = userSchema;
  });

  afterEach(async (): Promise<void> => {
    await db?.close();
    await mongod?.stop();
    mongod = null;
  });

  test('MongoDatabaseAdapter->constructor works correctly, default conf.', async (): Promise<void> => {
    loadConfig({ database: { name: 'mongodb' } });
    const url = 'mongodb://localhost:27017/files-crud';

    db = new MongoDatabaseAdapter();

    expect(db.getConf()).toEqual([url, '', '']);
  });

  test('MongoDatabaseAdapter->constructor works correctly, specific conf.', async (): Promise<void> => {
    loadConfig({ database: { name: 'mongodb', url: 'testUrl/db', user: 'user', pass: 'pass' } });

    db = new MongoDatabaseAdapter();

    expect(db.getConf()).toEqual(['testUrl/db', 'user', 'pass']);
  });

  test('MongoDatabaseAdapter->open connects to db.', async (): Promise<void> => {
    db = new MongoDatabaseAdapter();
    const uriRegex = /^mongodb:\/\/(127\.0\.0\.1|localhost):(\d+)\/$/u;

    await db.open();

    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.host).toBe(uri.replace(uriRegex, '$1'));
    expect(mongoose.connection.port).toBe(parseInt(uri.replace(uriRegex, '$2')));
    expect(mongoose.connection.db?.databaseName).toBe('test');
  });

  test('MongoDatabaseAdapter->close disconnects from db.', async (): Promise<void> => {
    db = new MongoDatabaseAdapter();
    await db.open();

    await db.close();

    expect(mongoose.connection.readyState).toBe(0);
  });

  test('MongoDatabaseAdapter->init initializes user table.', async (): Promise<void> => {
    delete schemata['user_'];
    db = new MongoDatabaseAdapter();
    await db.open();

    await db.init<User>('user_', testUser, 'id');

    expect(schemata['user_']).toEqual(userSchema);
  });

  test('MongoDatabaseAdapter->add adds item.', async (): Promise<void> => {
    db = new MongoDatabaseAdapter();
    await db.open();

    await db.add<User>('user_', testUser);

    const Model = db.getModel('user_');
    const user = await Model.findOne<User>({ username: testUser.username });
    expect(user?.id).toBe(testUser.id);
    expect(user?.username).toBe(testUser.username);
    expect(user?.admin).toBe(testUser.admin);
    expect(user?.meta).toEqual(testUser.meta);
    expect(user?.hashVersion).toBe(testUser.hashVersion);
    expect(user?.salt).toBe(testUser.salt);
    expect(user?.hash).toBe(testUser.hash);
  });

  test('MongoDatabaseAdapter->update updates item, without key change.', async (): Promise<void> => {
    db = new MongoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);

    await db.update('user_', 'username', testUser.username, { hashVersion: 'newVersion', salt: 'newSalt', hash: 'newHash' });

    const Model = db.getModel('user_');
    const user = await Model.findOne<User>({ username: testUser.username });
    expect(user?.hashVersion).toBe('newVersion');
    expect(user?.salt).toBe('newSalt');
    expect(user?.hash).toBe('newHash');
  });

  test('MongoDatabaseAdapter->update updates item, with key change.', async (): Promise<void> => {
    db = new MongoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);

    await db.update('user_', 'username', testUser.username, { username: 'newUsername' });

    const Model = db.getModel('user_');
    const userOld = await Model.findOne<User>({ username: testUser.username });
    const userNew = await Model.findOne<User>({ username: 'newUsername' });
    expect(userOld).toBeNull();
    expect(userNew?.username).toBe('newUsername');
  });

  test('MongoDatabaseAdapter->findOne finds one.', async (): Promise<void> => {
    db = new MongoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);

    const user = await db.findOne<User>('user_', 'username', testUser.username);

    expect(user).toEqual(testUser);
  });

  test('MongoDatabaseAdapter->findAll finds all.', async (): Promise<void> => {
    const otherUser = { ...testUser, username: 'other' };
    db = new MongoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);
    await db.add<User>('user_', otherUser);

    const items = await db.findAll<User>('user_');

    expect(items.length).toBe(2);
    expect(items[0]).toEqual(testUser);
    expect(items[1]).toEqual(otherUser);
  });

  test('MongoDatabaseAdapter->exists returns true if item exists.', async (): Promise<void> => {
    db = new MongoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);

    const exists = await db.exists('user_', 'username', testUser.username);

    expect(exists).toBe(true);
  });

  test('MongoDatabaseAdapter->exists returns false if item does not exist.', async (): Promise<void> => {
    db = new MongoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);

    const exists = await db.exists('user_', 'username', 'other');

    expect(exists).toBe(false);
  });

  test('MongoDatabaseAdapter->delete deletes item.', async (): Promise<void> => {
    const otherUser = { ...testUser, username: 'other' };
    db = new MongoDatabaseAdapter();
    await db.open();
    await db.add<User>('user_', testUser);
    await db.add<User>('user_', otherUser);

    await db.delete('user_', 'username', testUser.username);

    const Model = db.getModel('user_');
    const user = await Model.findOne<User>({ username: testUser.username });
    const other = await Model.findOne<User>({ username: 'other' });
    expect(user).toBeNull();
    expect(other?.username).toBe('other');
  });
});
