import { MemoryDatabase, tables } from '@/database/memdb/MemoryDatabase';

describe('MemoryDatabase', (): void => {
  const testUser = {
    username: 'testUser',
    hashVersion: 'v1',
    salt: 'testSalt',
    hash: 'testHash',
    admin: false,
    ownerId: 'testSectionId',
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

  const fakeDate = new Date('2017-01-01');
  const fakeTime = fakeDate.getTime();

  beforeEach(async (): Promise<void> => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeDate);
  });

  afterEach((): void => {
    tables.user = {};
    tables.jwtKey = [];
    tables.failedLoginAttempts = {};
    tables.file = {};
    jest.useRealTimers();
  });

  test('MemoryDatabase->addUser adds user.', async (): Promise<void> => {
    const db = new MemoryDatabase();

    await db.addUser(testUser);

    const user = tables.user[testUser.username];
    expect(user?.username).toBe(testUser.username);
    expect(user?.hashVersion).toBe(testUser.hashVersion);
    expect(user?.salt).toBe(testUser.salt);
    expect(user?.hash).toBe(testUser.hash);
    expect(user?.admin).toBe(testUser.admin);
    expect(user?.ownerId).toBe(testUser.ownerId);
    expect(user?.meta).toEqual(testUser.meta);
    expect(user).not.toBe(testUser);
  });

  test('MemoryDatabase->changeUsername changes the username.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addUser(testUser);

    await db.changeUsername(testUser.username, 'newName');

    const user = tables.user['newName'];
    expect(user?.username).toBe('newName');
    expect(user?.hashVersion).toBe(testUser.hashVersion);
    expect(tables.user[testUser.username]).toBeUndefined();
  });

  test('MemoryDatabase->updateHash updates hash properties.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addUser(testUser);

    await db.updateHash(testUser.username, 'newVersion', 'newSalt', 'newHash');

    const user = tables.user[testUser.username];
    expect(user?.hashVersion).toBe('newVersion');
    expect(user?.salt).toBe('newSalt');
    expect(user?.hash).toBe('newHash');
  });

  test('MemoryDatabase->makeUserAdmin makes user to be an admin.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addUser(testUser);

    await db.makeUserAdmin(testUser.username);

    const user = tables.user[testUser.username];
    expect(user?.admin).toBe(true);
  });

  test('MemoryDatabase->makeUserNormalUser makes user to be a normal user.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addUser(testUser);
    tables.user[testUser.username].admin = true;

    await db.makeUserNormalUser(testUser.username);

    const user = tables.user[testUser.username];
    expect(user?.admin).toBe(false);
  });

  test('MemoryDatabase->modifyUserMeta modifies user metadata.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addUser(testUser);

    await db.modifyUserMeta(testUser.username, { k: 'v' });

    const user = tables.user[testUser.username];
    expect(user?.meta?.k).toBe('v');
    expect(user?.meta?.testProp).toBeUndefined();
  });

  test('MemoryDatabase->removeUser removesUser.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addUser(testUser);
    await db.addUser({ ...testUser, username: 'other' });

    await db.removeUser(testUser.username);

    const user = tables.user[testUser.username];
    const other = tables.user['other'];
    expect(other?.username).toBe('other');
    expect(user).toBeUndefined();
  });

  test('MemoryDatabase->getUser gets user.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addUser(testUser);

    const user = await db.getUser(testUser.username);

    expect(user?.username).toBe(testUser.username);
  });

  test('MemoryDatabase->getUsers gets users.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addUser(testUser);
    await db.addUser({ ...testUser, username: 'user2', admin: true });

    const userList = await db.getUsers();

    expect(userList[0]).toEqual({ username: testUser.username, admin: false });
    expect(userList[1]).toEqual({ username: 'user2', admin: true });
  });

  test('MemoryDatabase->userExists returns true if user exists.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addUser(testUser);

    const exists = await db.userExists(testUser.username);

    expect(exists).toBe(true);
  });

  test('MemoryDatabase->userExists returns false if user does not exist.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addUser(testUser);

    const exists = await db.userExists('other');

    expect(exists).toBe(false);
  });

  test('MemoryDatabase->addJwtKeys adds keys.', async (): Promise<void> => {
    const db = new MemoryDatabase();

    await db.addJwtKeys('key1', 'key2', 'key3');

    expect(tables.jwtKey.length).toBe(3);
    expect(tables.jwtKey[0]).toBe('key1');
    expect(tables.jwtKey[1]).toBe('key2');
    expect(tables.jwtKey[2]).toBe('key3');
  });

  test('MemoryDatabase->getJwtKeys gets keys.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addJwtKeys('key1', 'key2', 'key3');

    const keys = await db.getJwtKeys();

    expect(keys.length).toBe(3);
    expect(keys[0]).toBe('key1');
    expect(keys[1]).toBe('key2');
    expect(keys[2]).toBe('key3');
  });

  test('MemoryDatabase->countLoginAttempt creates new item with attempts=1.', async (): Promise<void> => {
    const db = new MemoryDatabase();

    await db.countLoginAttempt(testUser.username);

    expect(tables.failedLoginAttempts[testUser.username]?.attempts).toBe(1);
    expect(tables.failedLoginAttempts[testUser.username]?.lastAttempt).toBe(fakeTime);
  });

  test('MemoryDatabase->countLoginAttempt increases attempts in existing item.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.countLoginAttempt(testUser.username);
    tables.failedLoginAttempts[testUser.username].lastAttempt = 0;

    await db.countLoginAttempt(testUser.username);

    expect(tables.failedLoginAttempts[testUser.username]?.attempts).toBe(2);
    expect(tables.failedLoginAttempts[testUser.username]?.lastAttempt).toBe(fakeTime);
  });

  test('MemoryDatabase->getLoginAttempts returns attempts for username.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.countLoginAttempt(testUser.username);

    const attempts = await db.getLoginAttempts(testUser.username);

    expect(attempts?.attempts).toBe(1);
    expect(attempts?.lastAttempt).toBe(fakeTime);
  });

  test('MemoryDatabase->getLoginAttempts returns 0 if no item exists for username.', async (): Promise<void> => {
    const db = new MemoryDatabase();

    const attempts = await db.getLoginAttempts(testUser.username);

    expect(attempts).toBeNull();
  });

  test('MemoryDatabase->removeLoginAttempts removes attempts.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.countLoginAttempt(testUser.username);

    await db.removeLoginAttempts(testUser.username);

    expect(tables.failedLoginAttempts[testUser.username]).toBeUndefined();
  });

  test('MemoryDatabase->addFile adds file.', async (): Promise<void> => {
    const db = new MemoryDatabase();

    await db.addFile(testFile);

    const file = tables.file[testFile.path];
    expect(file?.path).toBe(testFile.path);
    expect(file?.owner).toBe(testFile.owner);
    expect(file?.realName).toBe(testFile.realName);
    expect(file?.meta).toEqual(testFile.meta);
    expect(file).not.toBe(testFile);
  });

  test('MemoryDatabase->moveFile changes path, keeping owner.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addFile(testFile);

    await db.moveFile(testFile.path, 'newPath');

    const file = tables.file['newPath'];
    expect(file?.path).toBe('newPath');
    expect(file?.owner).toBe(testFile.owner);
    expect(tables.file[testFile.path]).toBeUndefined();
  });

  test('MemoryDatabase->moveFile changes path, also changing owner.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addFile(testFile);

    await db.moveFile(testFile.path, 'newPath', 'newOwner');

    const file = tables.file['newPath'];
    expect(file?.path).toBe('newPath');
    expect(file?.owner).toBe('newOwner');
    expect(tables.file[testFile.path]).toBeUndefined();
  });

  test('MemoryDatabase->modifyFileMeta modifies file metadata.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addFile(testFile);

    await db.modifyFileMeta(testFile.path, { k: 'v' });

    const file = tables.file[testFile.path];
    expect(file?.meta?.k).toBe('v');
    expect(file?.meta?.testProp).toBeUndefined();
  });

  test('MemoryDatabase->removeFile removes file.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addFile(testFile);
    await db.addFile({ ...testFile, path: 'other' });

    await db.removeFile(testFile.path);

    const file = tables.file[testFile.path];
    const other = tables.file['other'];
    expect(file).toBeUndefined();
    expect(other?.path).toBe('other');
  });

  test('MemoryDatabase->getFile gets file.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addFile(testFile);

    const file = await db.getFile(testFile.path);

    expect(file?.path).toBe(testFile.path);
  });

  test('MemoryDatabase->listFilesInFolder lists files in folder.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addFile({ ...testFile, path: 'test/path2', file: 'path2' });
    await db.addFile(testFile);
    await db.addFile({ ...testFile, path: 'test/sub/subSub', folder: 'test/sub', file: 'subSub' });
    await db.addFile({ ...testFile, path: 'other', folder: '' });

    const files = await db.listFilesInFolder('test');

    expect(files).toEqual(['path', 'path2']);
  });

  test('MemoryDatabase->fileExists returns true if file exists.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addFile(testFile);

    const exists = await db.fileExists(testFile.path);

    expect(exists).toBe(true);
  });

  test('MemoryDatabase->fileExists returns false if file does not exist.', async (): Promise<void> => {
    const db = new MemoryDatabase();
    await db.addFile(testFile);

    const exists = await db.fileExists(testFile.path);

    expect(exists).toBe(true);
  });
});
