import User from './User';

interface Database {
  open: () => Promise<void>;

  close: () => Promise<void>;

  addUser: (user: User) => Promise<void>;

  changeUsername: (oldUsername: string, newUsername: string) => Promise<void>;

  updateHash: (username: string, hashVersion: string, salt: string, hash: string) => Promise<void>;

  makeUserAdmin: (username: string) => Promise<void>;

  makeUserNormalUser: (username: string) => Promise<void>;

  modifyMeta: (username: string, meta?: Record<string, unknown>) => Promise<void>;

  removeUser: (username: string) => Promise<void>;

  getUser: (username: string) => Promise<User | null>;

  addJwtKeys: (...keys: string[]) => Promise<void>;

  getJwtKeys: () => Promise<string[]>;

  countLoginAttempt: (username: string) => Promise<void>;

  getLoginAttempts: (username: string) => Promise<number>;

  removeLoginAttempts: (username: string) => Promise<void>;
}

export default Database;
