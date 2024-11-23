import { MongoDatabase } from '@/database/mongodb/MongoDatabase';
import User from '@/types/User';
import File from '@/types/File';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: null | MongoMemoryServer;
let uri = '';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const UserModel = new MongoDatabase('').getConf()[1];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FileModel = new MongoDatabase('').getConf()[4];

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
    ownerId: 'testOwnerId',
    meta: { testProp: 'testValue' }
  };

  const testFile = {
    path: 'test/path',
    folder: 'test',
    file: 'path',
    owner: 'testOwner',
    realName: 'testRealName',
    meta: { testProp: 'testValue' }
  };

  const expectUserModelAndSchema = function (db: MongoDatabase): void {
    expect(db.getConf()[1].modelName).toBe('User');
    expect(db.getConf()[1].schema.obj.username).toEqual({ type: String, default: '' });
    expect(db.getConf()[1].schema.obj.hashVersion).toEqual({ type: String, default: '' });
    expect(db.getConf()[1].schema.obj.salt).toEqual({ type: String, default: '' });
    expect(db.getConf()[1].schema.obj.hash).toEqual({ type: String, default: '' });
    expect(db.getConf()[1].schema.obj.ownerId).toEqual({ type: String, default: '' });
    expect(db.getConf()[1].schema.obj.admin).toEqual({ type: Boolean, default: false });
    expect(db.getConf()[1].schema.obj.meta).toEqual(Object);
  };

  const expectJwtKeyModelAndSchema = function (db: MongoDatabase): void {
    expect(db.getConf()[2].modelName).toBe('JwtKey');
    expect(db.getConf()[2].schema.obj.key).toEqual({ type: String, default: '' });
  };

  const expectFailedLoginAttemptsModelAndSchema = function (db: MongoDatabase): void {
    expect(db.getConf()[3].modelName).toBe('FailedLoginAttempts');
    expect(db.getConf()[3].schema.obj.username).toEqual({ type: String, default: '' });
    expect(db.getConf()[3].schema.obj.attempts).toEqual({ type: Number, default: 0 });
  };

  const expectFileModelAndSchema = function (db: MongoDatabase): void {
    expect(db.getConf()[4].modelName).toBe('File');
    expect(db.getConf()[4].schema.obj.path).toEqual({ type: String, default: '' });
    expect(db.getConf()[4].schema.obj.owner).toEqual({ type: String, default: '' });
    expect(db.getConf()[4].schema.obj.realName).toEqual({ type: String, default: '' });
    expect(db.getConf()[4].schema.obj.meta).toEqual(Object);
  };

  const prepareDbForUser = async function (user?: User): Promise<[MongoDatabase, typeof UserModel]> {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    const User = db.getConf()[1];
    await db.addUser(user ?? testUser);

    return [db, User];
  };

  const prepareDbForFile = async function (file?: File): Promise<[MongoDatabase, typeof FileModel]> {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    const File = db.getConf()[4];
    await db.addFile(file ?? testFile);

    return [db, File];
  };

  test('MongoDatabase->constructor works correctly.', async (): Promise<void> => {
    const url = 'mongodb://localhost:27017/db';

    const db = new MongoDatabase(url);

    expect(db.getConf()[0]).toBe(url);
    expectUserModelAndSchema(db);
    expectJwtKeyModelAndSchema(db);
    expectFailedLoginAttemptsModelAndSchema(db);
    expectFileModelAndSchema(db);
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
    expect(user?.ownerId).toBe(testUser.ownerId);
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

  test('MongoDatabase->modifyUserMeta modifies meta.', async (): Promise<void> => {
    const [db, User] = await prepareDbForUser();

    await db.modifyUserMeta(testUser.username, { testProp2: 'testValue2', testProp: undefined });

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

  test('MongoDatabase->userExists returns true if user exists.', async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [db, _] = await prepareDbForUser();

    const exists = await db.userExists(testUser.username);

    expect(exists).toBe(true);
  });

  test('MongoDatabase->userExists returns false if user does not exist.', async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [db, _] = await prepareDbForUser();

    const exists = await db.userExists('other');

    expect(exists).toBe(false);
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

  test('MongoDatabase->getLoginAttempts returns attempts for username.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    await db.countLoginAttempt(testUser.username);
    await db.countLoginAttempt(testUser.username);

    const attempts = await db.getLoginAttempts(testUser.username);

    expect(attempts).toBe(2);
  });

  test('MongoDatabase->getLoginAttempts returns 0 if no item exists for username.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();

    const attempts = await db.getLoginAttempts(testUser.username);

    expect(attempts).toBe(0);
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

  test('MongoDatabase->addFile adds File.', async (): Promise<void> => {
    const db = new MongoDatabase(`${uri}db`);
    await db.open();
    const File = db.getConf()[4];

    await db.addFile(testFile);

    const file = await File.findOne({ path: testFile.path });
    expect(file?.path).toBe(testFile.path);
    expect(file?.owner).toBe(testFile.owner);
    expect(file?.realName).toBe(testFile.realName);
    expect(file?.meta).toEqual(testFile.meta);
  });

  test('MongoDatabase->moveFile changes path, keeping the owner.', async (): Promise<void> => {
    const [db, File] = await prepareDbForFile();

    await db.moveFile(testFile.path, 'newPath');

    const file = await File.findOne({ path: 'newPath' });
    expect(file?.path).toBe('newPath');
    expect(file?.owner).toBe(testFile.owner);
    expect(await File.findOne({ path: testFile.path })).toBeNull();
  });

  test('MongoDatabase->moveFile changes path, also changing the owner.', async (): Promise<void> => {
    const [db, File] = await prepareDbForFile();

    await db.moveFile(testFile.path, 'newPath', 'newOwner');

    const file = await File.findOne({ path: 'newPath' });
    expect(file?.path).toBe('newPath');
    expect(file?.owner).toBe('newOwner');
    expect(await File.findOne({ path: testFile.path })).toBeNull();
  });

  test('MongoDatabase->modifyFileMeta modifies meta.', async (): Promise<void> => {
    const [db, File] = await prepareDbForFile();

    await db.modifyFileMeta(testFile.path, { testProp2: 'testValue2', testProp: undefined });

    const file = await File.findOne({ path: testFile.path });
    expect(file?.meta?.testProp).toBeNull();
    expect(file?.meta?.testProp2).toBe('testValue2');
  });

  test('MongoDatabase->removeFile removes file.', async (): Promise<void> => {
    const [db, File] = await prepareDbForFile();
    await db.addFile({ ...testFile, path: 'other' });

    await db.removeFile(testFile.path);

    expect(await File.findOne({ path: testFile.path })).toBeNull();
    expect((await File.findOne({ path: 'other' }))?.path).toBe('other');
  });

  test('MongoDatabase->getFile gets file.', async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [db, _] = await prepareDbForFile();

    const file = await db.getFile(testFile.path);

    expect(file?.path).toBe(testFile.path);
    expect(file?.owner).toBe(testFile.owner);
    expect(file?.realName).toBe(testFile.realName);
    expect(file?.meta).toEqual(testFile.meta);
  });

  test('MongoDatabase->listFilesInFolder lists files.', async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [db, _] = await prepareDbForFile();
    await db.addFile({ ...testFile, path: 'test/path3', file: 'path3' });
    await db.addFile({ ...testFile, path: 'test/path2', file: 'path2' });
    await db.addFile({ ...testFile, path: 'test/sub/subSub', folder: 'test/sub', file: 'subSub' });
    await db.addFile({ ...testFile, path: 'other/path', folder: 'other' });

    const files = await db.listFilesInFolder('test');

    expect(files).toEqual(['path', 'path2', 'path3']);
  });

  test('MongoDatabase->fileExists returns true if file exists.', async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [db, _] = await prepareDbForFile();

    const exists = await db.fileExists(testFile.path);

    expect(exists).toBe(true);
  });

  test('MongoDatabase->fileExists returns false if file does not exist.', async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [db, _] = await prepareDbForFile();

    const exists = await db.fileExists('other');

    expect(exists).toBe(false);
  });

  test('MongoDatabase also works with authentication.', async (): Promise<void> => {
    await mongod?.stop();
    const mongodWithAuth = await MongoMemoryServer.create({
      auth: {
        enable: true,
        customRootName: 'user',
        customRootPwd: 'pass'
      }
    });
    const url = 'mongodb://localhost:27017/db';

    const db = new MongoDatabase(url, 'user', 'pass');

    expect(db.getConf()[0]).toBe(url);
    expectUserModelAndSchema(db);
    expectJwtKeyModelAndSchema(db);
    expectFailedLoginAttemptsModelAndSchema(db);
    await mongodWithAuth.stop();
  });
});
