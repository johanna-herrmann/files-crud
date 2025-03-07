import { User } from '@/types/user/User';

const testUser: User = {
  id: 'userId42',
  username: 'testUser',
  hashVersion: 'v1',
  salt: 'testSalt',
  hash: 'testHash',
  admin: false,
  meta: { testProp: 'testValue' }
};

export { testUser };
