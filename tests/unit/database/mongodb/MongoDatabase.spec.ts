import { MongoDatabase } from '@/database/mongodb/MongoDatabase';
import User from '@/types/User';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: null | MongoMemoryServer;
let uri = '';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const UserModel = new MongoDatabase('').getConf()[1];

describe('MongoDatabase', (): void => {
  beforeEach(async (): Promise<void> => {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  });

  afterEach(async (): Promise<void> => {
    await mongod?.stop();
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

  const expectUserModelAndSchema = function (db: MongoDatabase): void {
    expect(db.getConf()[1].modelName).toBe('User');
    expect(db.getConf()[1].schema.obj.username).toEqual({ type: String, default: '' });
    expect(db.getConf()[1].schema.obj.hashVersion).toEqual({ type: String, default: '' });
    expect(db.getConf()[1].schema.obj.salt).toEqual({ type: String, default: '' });
    expect(db.getConf()[1].schema.obj.hash).toEqual({ type: String, default: '' });
    expect(db.getConf()[1].schema.obj.sectionId).toEqual({ type: String, default: '' });
    expect(db.getConf()[1].schema.obj.admin).toEqual({ type: Boolean, default: false });
    expect(db.getConf()[1].schema.obj.meta).toEqual(Object);
  };

  const expectJwtKeyModelAndSchema = function (db: MongoDatabase): void {
    expect(db.getConf()[2].modelName).toBe('JwtKey');
    expect(db.getConf()[2].schema.obj.key).toEqual({ type: String, default: '' });
  };

  const expectLockModelAndSchema = function (db: MongoDatabase): void {
    expect(db.getConf()[3].modelName).toBe('FailedLoginAttempts');
    expect(db.getConf()[3].schema.obj.username).toEqual({ type: String, default: '' });
    expect(db.getConf()[3].schema.obj.attempts).toEqual({ type: Number, default: 0 });
  };

  const prepareDbForUser = async function (user?: User): Promise<[MongoDatabase, typeof UserModel]> {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    const User = db.getConf()[1];
    await db.addUser(user ?? testUser);

    return [db, User];
  };

  test('MongoDatabase->constructor works correctly.', async (): Promise<void> => {
    const url = 'mongodb://localhost:27017/db';

    const db = new MongoDatabase(url);

    expect(db.getConf()[0]).toBe(url);
    expectUserModelAndSchema(db);
    expectJwtKeyModelAndSchema(db);
    expectLockModelAndSchema(db);
  });

  test('MongoDatabase->open connects to db.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    const uriRegex = /^mongodb:\/\/(127\.0\.0\.1|localhost):(\d+)\/$/u;

    await db.open();

    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.host).toBe(uri.replace(uriRegex, '$1'));
    expect(mongoose.connection.port).toBe(parseInt(uri.replace(uriRegex, '$2')));
    expect(mongoose.connection.db?.databaseName).toBe('db');
  });

  test('MongoDatabase->close disconnects from db.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();

    await db.close();

    expect(mongoose.connection.readyState).toBe(0);
  });

  test('MongoDatabase->addUser adds User.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    const User = db.getConf()[1];

    await db.addUser(testUser);

    const user = await User.findOne({ username: testUser.username });
    expect(user?.username).toBe(testUser.username);
    expect(user?.hashVersion).toBe(testUser.hashVersion);
    expect(user?.salt).toBe(testUser.salt);
    expect(user?.hash).toBe(testUser.hash);
    expect(user?.admin).toBe(testUser.admin);
    expect(user?.sectionId).toBe(testUser.sectionId);
    expect(user?.meta).toEqual(testUser.meta);
  });

  test('MongoDatabase->changeUsername changes username.', async (): Promise<void> => {
    const [db, User] = await prepareDbForUser();
    const newUsername = 'newUsername';

    await db.changeUsername(testUser.username, newUsername);

    const user = await User.findOne({ username: newUsername });
    expect(user?.username).toBe(newUsername);
  });

  test('MongoDatabase->updateHash updates hash.', async (): Promise<void> => {
    const [db, User] = await prepareDbForUser();

    await db.updateHash(testUser.username, 'v2', 'newSalt', 'newHash');

    const user = await User.findOne({ username: testUser.username });
    expect(user?.hashVersion).toBe('v2');
    expect(user?.salt).toBe('newSalt');
    expect(user?.hash).toBe('newHash');
  });

  test('MongoDatabase->makeUserAdmin makes user to admin.', async (): Promise<void> => {
    const [db, User] = await prepareDbForUser();

    await db.makeUserAdmin(testUser.username);

    const user = await User.findOne({ username: testUser.username });
    expect(user?.admin).toBe(true);
  });

  test('MongoDatabase->makeUserNormalUser makes user to normal user.', async (): Promise<void> => {
    const [db, User] = await prepareDbForUser({ ...testUser, admin: true });

    await db.makeUserNormalUser(testUser.username);

    const user = await User.findOne({ username: testUser.username });
    expect(user?.admin).toBe(false);
  });

  test('MongoDatabase->modifyUser modifies meta.', async (): Promise<void> => {
    const [db, User] = await prepareDbForUser();

    await db.modifyMeta(testUser.username, { testProp2: 'testValue2', testProp: undefined });

    const user = await User.findOne({ username: testUser.username });
    expect(user?.meta?.testProp).toBeNull();
    expect(user?.meta?.testProp2).toBe('testValue2');
  });

  test('MongoDatabase->removeUser removes user.', async (): Promise<void> => {
    const [db, User] = await prepareDbForUser();
    await db.addUser({ ...testUser, username: 'other' });

    await db.removeUser(testUser.username);

    expect(await User.countDocuments()).toBe(1);
    expect((await User.findOne({ username: 'other' }))?.username).toBe('other');
  });

  test('MongoDatabase->getUser gets user.', async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [db, _] = await prepareDbForUser();

    const user = await db.getUser(testUser.username);

    expect(user?.username).toBe(testUser.username);
  });

  test('MongoDatabase->addJwtKeys adds jwt keys.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    const JwtKey = db.getConf()[2];

    await db.addJwtKeys('key1', 'key2', 'key3');

    const keys = await JwtKey.find();
    expect(keys.length).toBe(3);
    expect(keys[0].key).toBe('key1');
    expect(keys[1].key).toBe('key2');
    expect(keys[2].key).toBe('key3');
  });

  test('MongoDatabase->getJwtKeys gets jwt keys.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    await db.addJwtKeys('key1', 'key2', 'key3');

    const keys = await db.getJwtKeys();

    expect(keys.length).toBe(3);
    expect(keys[0]).toBe('key1');
    expect(keys[1]).toBe('key2');
    expect(keys[2]).toBe('key3');
  });

  test('MongoDatabase->countLoginAttempt creates new item with attempts=1.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    const FailedLoginAttempts = db.getConf()[3];

    await db.countLoginAttempt(testUser.username);

    const failedLoginAttempts = await FailedLoginAttempts.findOne({ username: testUser.username });
    expect(failedLoginAttempts?.username).toBe(testUser.username);
    expect(failedLoginAttempts?.attempts).toBe(1);
  });

  test('MongoDatabase->countLoginAttempt increases attempts in existing item.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    const FailedLoginAttempts = db.getConf()[3];
    await db.countLoginAttempt(testUser.username);

    await db.countLoginAttempt(testUser.username);

    const failedLoginAttempts = await FailedLoginAttempts.findOne({ username: testUser.username });
    expect(failedLoginAttempts?.username).toBe(testUser.username);
    expect(failedLoginAttempts?.attempts).toBe(2);
  });

  test('MongoDatabase->getLoginAttempts gets attempts for username.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    await db.countLoginAttempt(testUser.username);
    await db.countLoginAttempt(testUser.username);

    const attempts = await db.getLoginAttempts(testUser.username);

    expect(attempts).toBe(2);
  });

  test('MongoDatabase->removeLoginAttempts removes item.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    const FailedLoginAttempts = db.getConf()[3];
    await db.countLoginAttempt(testUser.username);
    await db.countLoginAttempt('other');

    await db.removeLoginAttempts(testUser.username);

    expect(await FailedLoginAttempts.findOne({ username: testUser.username })).toBeNull();
    expect((await FailedLoginAttempts.findOne({ username: 'other' }))?.username).toBe('other');
  });
});
