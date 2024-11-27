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

export { testUser, testFile };
