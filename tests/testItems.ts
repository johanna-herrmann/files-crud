import { User } from '@/types/user/User';

const testUser: User = {
  id: '915477ce-f8e0-4ec0-8107-9e0be748f00a',
  username: 'testUser',
  hashVersion: 'v1',
  salt: 'testSalt',
  hash: 'testHash',
  admin: false,
  meta: { testProp: 'testValue' }
};

export { testUser };
