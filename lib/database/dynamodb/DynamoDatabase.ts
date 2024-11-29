import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { putItem, updateItem, deleteItem, loadItem, loadId, loadJwtKeys, loadUsers, loadFiles, itemExists } from './dynamoDbHelper';
import Database from '@/types/Database';
import File from '@/types/File';
import User from '@/types/User';
import FailedLoginAttempts from '@/types/FailedLoginAttempts';
import UserListItem from '@/types/UserListItem';
import JwtKey from '@/types/JwtKey';
import PathParts from '@/types/PathParts';
import { v4 } from 'uuid';

const getPathParts = function (path: string): PathParts {
  if (!path.includes('/')) {
    return { folder: '', filename: path };
  }
  const folder = path.substring(0, path.lastIndexOf('/'));
  const filename = path.substring(path.lastIndexOf('/') + 1);
  return { folder, filename };
};

class DynamoDatabase implements Database {
  private readonly config: DynamoDBClientConfig;
  private readonly userTableName: string;
  private readonly jwtKeyTableName: string;
  private readonly failedLoginAttemptsTableName: string;
  private readonly fileTableName: string;
  private client: DynamoDBClient | null = null;

  constructor(
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    userTableName: string,
    jwtKeyTableName: string,
    failedLoginAttemptsTableName: string,
    fileTableName: string
  ) {
    this.config = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    };
    this.userTableName = userTableName;
    this.jwtKeyTableName = jwtKeyTableName;
    this.failedLoginAttemptsTableName = failedLoginAttemptsTableName;
    this.fileTableName = fileTableName;
  }

  private ensureClient(): DynamoDBClient {
    if (this.client === null) {
      throw new Error('Client is null. Did not yet call open()? Did call close() already?');
    }
    return this.client;
  }

  public getConfig(): DynamoDBClientConfig {
    return this.config;
  }

  public getTableNames(): [string, string, string, string] {
    return [this.userTableName, this.jwtKeyTableName, this.failedLoginAttemptsTableName, this.fileTableName];
  }

  public getClient(): DynamoDBClient | null {
    return this.client;
  }

  public async open(): Promise<void> {
    this.client = new DynamoDBClient(this.config);
  }

  public async addUser(user: User): Promise<void> {
    await putItem(this.ensureClient(), this.userTableName, user, true);
  }

  public async changeUsername(oldUsername: string, newUsername: string): Promise<void> {
    const id = await loadId(this.ensureClient(), this.userTableName, 'username', oldUsername, 'username-index');
    await updateItem(this.ensureClient(), this.userTableName, 'id', id, { username: newUsername });
  }

  public async updateHash(username: string, hashVersion: string, salt: string, hash: string): Promise<void> {
    const id = await loadId(this.ensureClient(), this.userTableName, 'username', username, 'username-index');
    await updateItem(this.ensureClient(), this.userTableName, 'id', id, { hashVersion, salt, hash });
  }

  public async makeUserAdmin(username: string): Promise<void> {
    const id = await loadId(this.ensureClient(), this.userTableName, 'username', username, 'username-index');
    await updateItem(this.ensureClient(), this.userTableName, 'id', id, { admin: true });
  }

  public async makeUserNormalUser(username: string): Promise<void> {
    const id = await loadId(this.ensureClient(), this.userTableName, 'username', username, 'username-index');
    await updateItem(this.ensureClient(), this.userTableName, 'id', id, { admin: false });
  }

  public async modifyUserMeta(username: string, meta?: Record<string, unknown>): Promise<void> {
    const id = await loadId(this.ensureClient(), this.userTableName, 'username', username, 'username-index');
    await updateItem(this.ensureClient(), this.userTableName, 'id', id, { meta });
  }

  public async removeUser(username: string): Promise<void> {
    const id = await loadId(this.ensureClient(), this.userTableName, 'username', username, 'username-index');
    await deleteItem(this.ensureClient(), this.userTableName, 'id', id);
  }

  public async getUser(username: string): Promise<User | null> {
    return await loadItem<User>(this.ensureClient(), this.userTableName, 'username', username, 'username-index');
  }

  public async getUsers(): Promise<UserListItem[]> {
    return await loadUsers(this.ensureClient(), this.userTableName);
  }

  public async userExists(username: string): Promise<boolean> {
    return await itemExists(this.ensureClient(), this.userTableName, 'username', username, 'username-index');
  }

  public async addJwtKeys(...keys: string[]): Promise<void> {
    for (const key of keys) {
      await putItem(this.ensureClient(), this.jwtKeyTableName, { key, id: v4() });
    }
  }

  public async getJwtKeys(): Promise<JwtKey[]> {
    return await loadJwtKeys(this.ensureClient(), this.jwtKeyTableName);
  }

  public async countLoginAttempt(username: string): Promise<void> {
    const lastAttempt = Date.now();
    const item = await loadItem(this.ensureClient(), this.failedLoginAttemptsTableName, 'username', username);
    if (!item) {
      return await putItem(this.ensureClient(), this.failedLoginAttemptsTableName, { username, attempts: 1, lastAttempt });
    }
    const attempts = item as FailedLoginAttempts;
    attempts.attempts++;
    await updateItem(this.ensureClient(), this.failedLoginAttemptsTableName, 'username', username, { attempts: attempts.attempts, lastAttempt });
  }

  public async updateLastLoginAttempt(username: string): Promise<void> {
    const lastAttempt = Date.now();
    await updateItem(this.ensureClient(), this.failedLoginAttemptsTableName, 'username', username, { lastAttempt });
  }

  public async getLoginAttempts(username: string): Promise<FailedLoginAttempts | null> {
    return await loadItem<FailedLoginAttempts>(this.ensureClient(), this.failedLoginAttemptsTableName, 'username', username);
  }

  public async removeLoginAttempts(username: string): Promise<void> {
    await deleteItem(this.ensureClient(), this.failedLoginAttemptsTableName, 'username', username);
  }

  public async addFile(file: File): Promise<void> {
    const { folder, filename } = getPathParts(file.path);
    await putItem(this.ensureClient(), this.fileTableName, { ...file, folder, filename }, true);
  }

  public async moveFile(oldPath: string, newPath: string, owner?: string): Promise<void> {
    const path = newPath;
    const { folder, filename } = getPathParts(path);
    const update = owner ? { path, folder, filename, owner } : { path, folder, filename };
    const id = await loadId(this.ensureClient(), this.fileTableName, 'path', oldPath, 'path-index');
    await updateItem(this.ensureClient(), this.fileTableName, 'id', id, update);
  }

  public async modifyFileMeta(path: string, meta?: Record<string, unknown>): Promise<void> {
    const id = await loadId(this.ensureClient(), this.fileTableName, 'path', path, 'path-index');
    await updateItem(this.ensureClient(), this.fileTableName, 'id', id, { meta });
  }

  public async removeFile(path: string): Promise<void> {
    const id = await loadId(this.ensureClient(), this.fileTableName, 'path', path, 'path-index');
    await deleteItem(this.ensureClient(), this.fileTableName, 'id', id);
  }

  public async getFile(path: string): Promise<File | null> {
    return await loadItem<File>(this.ensureClient(), this.fileTableName, 'path', path, 'path-index');
  }

  public async listFilesInFolder(folder: string): Promise<string[]> {
    folder = folder.replace(/\/*$/gu, '');
    const files = await loadFiles(this.ensureClient(), this.fileTableName, folder);
    return files.sort();
  }

  public async fileExists(path: string): Promise<boolean> {
    return await itemExists(this.ensureClient(), this.fileTableName, 'path', path, 'path-index');
  }

  public async close(): Promise<void> {
    this.client?.destroy();
    this.client = null;
  }
}

export { DynamoDatabase };
