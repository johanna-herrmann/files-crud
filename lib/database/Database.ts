import DatabaseType from '@/types/Database';
import DatabaseAdapter from '@/types/DatabaseAdapter';
import { getConfig } from '@/config';
import { MongoDatabaseAdapter } from '@/database/mongodb/MongoDatabaseAdapter';
import { PostgresDatabaseAdapter } from '@/database/postgresql/PostgresDatabaseAdapter';
import { DynamoDatabaseAdapter } from '@/database/dynamodb/DynamoDatabaseAdapter';
import { MemoryDatabaseAdapter } from '@/database/memdb/MemoryDatabaseAdapter';
import User from '@/types/User';
import UserListItem from '@/types/UserListItem';
import { v4 } from 'uuid';
import JwtKey from '@/types/JwtKey';
import FailedLoginAttempts from '@/types/FailedLoginAttempts';

class Database implements DatabaseType {
  private readonly db: DatabaseAdapter;

  constructor() {
    const config = getConfig();
    if (config.database?.name === 'mongodb') {
      this.db = new MongoDatabaseAdapter();
    } else if (config.database?.name === 'postgresql') {
      this.db = new PostgresDatabaseAdapter();
    } else if (config.database?.name === 'dynamodb') {
      this.db = new DynamoDatabaseAdapter();
    } else {
      this.db = new MemoryDatabaseAdapter();
    }
  }

  public getAdapter() {
    return this.db;
  }

  public async open(): Promise<void> {
    await this.db.open();
  }

  public async close(): Promise<void> {
    await this.db.close();
  }

  public async init(): Promise<void> {
    await this.db.init<User>('user_', { username: '', admin: false, hashVersion: '', salt: '', hash: '', ownerId: '', meta: {} });
    await this.db.init<FailedLoginAttempts>('failedLoginAttempts', { username: '', attempts: 0, lastAttempt: 0 });
    await this.db.init<JwtKey>('jwtKey', { kid: '', key: '' });
  }

  public async addUser(user: User): Promise<void> {
    await this.db.add<User>('user_', user);
  }

  public async changeUsername(oldUsername: string, username: string): Promise<void> {
    await this.db.update('user_', 'username', oldUsername, { username });
  }

  public async updateHash(username: string, hashVersion: string, salt: string, hash: string): Promise<void> {
    await this.db.update('user_', 'username', username, { hashVersion, salt, hash });
  }

  public async makeUserAdmin(username: string): Promise<void> {
    await this.db.update('user_', 'username', username, { admin: true });
  }

  public async makeUserNormalUser(username: string): Promise<void> {
    await this.db.update('user_', 'username', username, { admin: false });
  }

  public async modifyUserMeta(username: string, meta: Record<string, unknown>): Promise<void> {
    await this.db.update('user_', 'username', username, { meta });
  }

  public async removeUser(username: string): Promise<void> {
    await this.db.delete('user_', 'username', username);
  }

  public async getUser(username: string): Promise<User | null> {
    return await this.db.findOne<User>('user_', 'username', username);
  }

  public async getUsers(): Promise<UserListItem[]> {
    const users = await this.db.findAll<User>('user_');
    return users.map(({ username, admin }) => ({ username, admin }));
  }

  public async userExists(username: string): Promise<boolean> {
    return this.db.exists('user_', 'username', username);
  }

  public async addJwtKeys(...keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.db.add<JwtKey>('jwtKey', { kid: v4(), key });
    }
  }

  public async getJwtKeys(): Promise<JwtKey[]> {
    return await this.db.findAll<JwtKey>('jwtKey');
  }

  public async countLoginAttempt(username: string): Promise<void> {
    const lastAttempt = Date.now();
    if (await this.db.exists('failedLoginAttempts', 'username', username)) {
      const attemptsItem = await this.db.findOne<FailedLoginAttempts>('failedLoginAttempts', 'username', username);
      const attempts = attemptsItem?.attempts ?? 0;
      await this.db.update('failedLoginAttempts', 'username', username, { attempts: attempts + 1, lastAttempt });
      return;
    }
    await this.db.add<FailedLoginAttempts>('failedLoginAttempts', { username, attempts: 1, lastAttempt });
  }

  public async updateLastLoginAttempt(username: string): Promise<void> {
    await this.db.update('failedLoginAttempts', 'username', username, { lastAttempt: Date.now() });
  }

  public async getLoginAttempts(username: string): Promise<FailedLoginAttempts> {
    const nullObject = { username, attempts: 0, lastAttempt: -1 };
    const attemptsItem = await this.db.findOne<FailedLoginAttempts>('failedLoginAttempts', 'username', username);
    return attemptsItem ?? nullObject;
  }

  public async removeLoginAttempts(username: string): Promise<void> {
    return await this.db.delete('failedLoginAttempts', 'username', username);
  }
}

export { Database };
