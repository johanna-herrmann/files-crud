import DatabaseType from '@/types/database/Database';
import DatabaseAdapter from '@/types/database/DatabaseAdapter';
import { getFullConfig } from '@/config/config';
import { MongoDatabaseAdapter } from '@/database/mongodb/MongoDatabaseAdapter';
import { PostgresDatabaseAdapter } from '@/database/postgresql/PostgresDatabaseAdapter';
import { DynamoDatabaseAdapter } from '@/database/dynamodb/DynamoDatabaseAdapter';
import { MemoryDatabaseAdapter } from '@/database/memdb/MemoryDatabaseAdapter';
import { getLogger } from '@/logging';
import { Logger } from '@/logging/Logger';
import User from '@/types/user/User';
import UserListItem from '@/types/user/UserListItem';
import { v4 } from 'uuid';
import JwtKey from '@/types/user/JwtKey';
import FailedLoginAttempts from '@/types/user/FailedLoginAttempts';

class Database implements DatabaseType {
  private readonly db: DatabaseAdapter;
  private readonly logger: Logger | null;

  constructor() {
    const config = getFullConfig();
    this.logger = getLogger();
    this.logger?.info('Initializing DB.', { db: config.database?.name as string });
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
    await this.db.init<User>('user_', { id: '', username: '', admin: false, hashVersion: '', salt: '', hash: '', meta: {} }, 'id');
    await this.db.init<FailedLoginAttempts>('failedLoginAttempts', { username: '', attempts: 0, lastAttempt: 0 }, 'username');
    await this.db.init<JwtKey>('jwtKey', { kid: '', key: '' }, 'kid');
    this.logger?.info('DB initialized.');
  }

  public async addUser(user: User): Promise<void> {
    await this.db.add<User>('user_', user);
  }

  public async changeUsername(id: string, username: string): Promise<void> {
    await this.db.update('user_', 'id', id, { username });
  }

  public async updateHash(id: string, hashVersion: string, salt: string, hash: string): Promise<void> {
    await this.db.update('user_', 'id', id, { hashVersion, salt, hash });
  }

  public async makeUserAdmin(id: string): Promise<void> {
    await this.db.update('user_', 'id', id, { admin: true });
  }

  public async makeUserNormalUser(id: string): Promise<void> {
    await this.db.update('user_', 'id', id, { admin: false });
  }

  public async modifyUserMeta(id: string, meta: Record<string, unknown>): Promise<void> {
    await this.db.update('user_', 'id', id, { meta });
  }

  public async removeUser(id: string): Promise<void> {
    await this.db.delete('user_', 'id', id);
  }

  public async getUserById(id: string): Promise<User | null> {
    return await this.db.findOne<User>('user_', 'id', id);
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    return await this.db.findOne<User>('user_', 'username', username);
  }

  public async getUsers(): Promise<UserListItem[]> {
    const users = await this.db.findAll<User>('user_');
    return users.map(({ id, username, admin }) => ({ id, username, admin }));
  }

  public async userExistsById(id: string): Promise<boolean> {
    return this.db.exists('user_', 'id', id);
  }

  public async userExistsByUsername(username: string): Promise<boolean> {
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
