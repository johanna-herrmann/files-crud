import Database from '@/types/Database';
import PgDbConf from '@/types/PgDbConf';
import { Client } from 'pg';
import { getNewClient, connect, end, definingQuery, writingQuery, readingQuery } from './pgWrapper';
import User from '@/types/User';
import FailedLoginAttempts from '@/types/FailedLoginAttempts';
import File from '@/types/File';
import UserListItem from '@/types/UserListItem';
import JwtKey from '@/types/JwtKey';
import FilePath from '@/types/FilePath';
import { v4 } from 'uuid';

const createTableIfNotExists = async function (client: Client, table: string, ...fields: string[]): Promise<void> {
  await definingQuery(client, `CREATE TABLE IF NOT EXISTS ${table}(${fields.join(', ')})`);
};

const createUserTableIfNotExists = async function (client: Client) {
  await createTableIfNotExists(
    client,
    'user_',
    'username text',
    'hashVersion text',
    'salt text',
    'hash text',
    'admin Boolean',
    'sectionId text',
    'meta JSON'
  );
};

const createJwtKeyTableIfNotExists = async function (client: Client) {
  await createTableIfNotExists(client, 'jwtKey', 'id text', 'key text');
};

const createFailedLoginAttemptsTableIfNotExists = async function (client: Client) {
  await createTableIfNotExists(client, 'failedLoginAttempts', 'username text', 'attempts int', 'lastAttempt bigint');
};

const createFileTableIfNotExists = async function (client: Client) {
  await createTableIfNotExists(client, 'file', 'path text', 'owner text', 'realName text', 'meta JSON');
};

// noinspection SqlNoDataSourceInspection
class PostgresDatabase implements Database {
  private readonly conf: PgDbConf;
  private client: Client | null = null;
  private connected = false;

  constructor(conf: PgDbConf) {
    this.conf = conf;
  }

  public getConf(): PgDbConf {
    return this.conf;
  }

  public async open(): Promise<void> {
    if (this.connected) {
      return;
    }
    this.client = this.client || getNewClient(this.conf);
    await connect(this.client);
    await createUserTableIfNotExists(this.client);
    await createJwtKeyTableIfNotExists(this.client);
    await createFailedLoginAttemptsTableIfNotExists(this.client);
    await createFileTableIfNotExists(this.client);
    this.connected = true;
  }

  public async close(): Promise<void> {
    if (this.connected) {
      await end(this.client);
      this.connected = false;
    }
  }

  public async addUser({ username, hashVersion, salt, hash, admin, ownerId, meta }: User): Promise<void> {
    const query = 'INSERT INTO user_(username, hashVersion, salt, hash, admin, ownerId, meta) VALUES($1, $2, $3, $4, $5, $6, $7)';
    const values = [username, hashVersion, salt, hash, admin, ownerId, JSON.stringify(meta)];
    await writingQuery(this.client, query, values);
  }

  public async changeUsername(oldUsername: string, newUsername: string): Promise<void> {
    const query = 'UPDATE user_ SET username=$1 WHERE username=$2';
    const values = [newUsername, oldUsername];
    await writingQuery(this.client, query, values);
  }

  public async updateHash(username: string, hashVersion: string, salt: string, hash: string): Promise<void> {
    const query = 'UPDATE user_ SET hashVersion=$1, salt=$2, hash=$3 WHERE username=$4';
    const values = [hashVersion, salt, hash, username];
    await writingQuery(this.client, query, values);
  }

  public async makeUserAdmin(username: string): Promise<void> {
    const query = 'UPDATE user_ SET admin=$1 WHERE username=$2';
    const values = [true, username];
    await writingQuery(this.client, query, values);
  }

  public async makeUserNormalUser(username: string): Promise<void> {
    const query = 'UPDATE user_ SET admin=$1 WHERE username=$2';
    const values = [false, username];
    await writingQuery(this.client, query, values);
  }

  public async modifyUserMeta(username: string, meta?: Record<string, unknown>): Promise<void> {
    const query = 'UPDATE user_ SET meta=$1 WHERE username=$2';
    const values = [meta ? JSON.stringify(meta) : '{}', username];
    await writingQuery(this.client, query, values);
  }

  public async removeUser(username: string): Promise<void> {
    const query = 'DELETE FROM user_ WHERE username=$1';
    const values = [username];
    await writingQuery(this.client, query, values);
  }

  public async getUser(username: string): Promise<User | null> {
    const query = 'SELECT * FROM user_ WHERE username=$1';
    const values = [username];
    const result = await readingQuery<User>(this.client, query, values);
    if (!result || result.rowCount !== 1) {
      return null;
    }
    return result.rows[0];
  }

  public async getUsers(): Promise<UserListItem[]> {
    const query = 'SELECT * FROM user_';
    const result = await readingQuery<User>(this.client, query);
    if (!result || result.rowCount === 0) {
      return [];
    }
    return result.rows.map(({ username, admin }) => ({ username, admin }));
  }

  public async userExists(username: string): Promise<boolean> {
    return !!(await this.getUser(username));
  }

  public async addJwtKeys(...keys: string[]): Promise<void> {
    for (const key of keys) {
      const query = 'INSERT INTO jwtKey(id, key) VALUES($1, $2)';
      const values = [v4(), key];
      await writingQuery(this.client, query, values);
    }
  }

  public async getJwtKeys(): Promise<JwtKey[]> {
    const query = 'SELECT * FROM jwtKey';
    const result = await readingQuery<JwtKey>(this.client, query);
    return result ? result.rows.map(({ id, key }) => ({ id, key })) : [];
  }

  public async countLoginAttempt(username: string): Promise<void> {
    const lastAttempt = Date.now();
    const attempts = await this.getLoginAttempts(username);
    if (!attempts) {
      await writingQuery(this.client, 'INSERT INTO failedLoginAttempts(username, attempts, lastAttempt) VALUES($1, $2, $3)', [
        username,
        1,
        lastAttempt
      ]);
      return;
    }
    await writingQuery(this.client, 'UPDATE failedLoginAttempts SET attempts=$1, lastAttempt=$2 WHERE username=$3', [
      attempts.attempts + 1,
      lastAttempt,
      username
    ]);
  }

  public async updateLastLoginAttempt(username: string): Promise<void> {
    const lastAttempt = Date.now();
    await writingQuery(this.client, 'UPDATE failedLoginAttempts SET lastAttempt=$1 WHERE username=$2', [lastAttempt, username]);
  }

  public async getLoginAttempts(username: string): Promise<FailedLoginAttempts | null> {
    const query = 'SELECT * FROM failedLoginAttempts WHERE username=$1';
    const values = [username];
    const result = await readingQuery<FailedLoginAttempts>(this.client, query, values);
    const attempts = result?.rows[0];
    return attempts ?? null;
  }

  public async removeLoginAttempts(username: string): Promise<void> {
    const query = 'DELETE FROM failedLoginAttempts WHERE username=$1';
    const values = [username];
    await writingQuery(this.client, query, values);
  }

  public async addFile({ path, owner, realName, meta }: File): Promise<void> {
    const query = 'INSERT INTO file(path, owner, realName, meta) VALUES($1, $2, $3, $4)';
    const values = [path, owner, realName, JSON.stringify(meta)];
    await writingQuery(this.client, query, values);
  }

  public async moveFile(oldPath: string, newPath: string, newOwner?: string): Promise<void> {
    const query = newOwner ? 'UPDATE file set path=$1, owner=$2 WHERE path=$3' : 'UPDATE file set path=$1 WHERE path=$2';
    const values = newOwner ? [newPath, newOwner, oldPath] : [newPath, oldPath];
    await writingQuery(this.client, query, values);
  }

  public async modifyFileMeta(path: string, meta?: Record<string, unknown>): Promise<void> {
    const query = 'UPDATE file SET meta=$1 WHERE path=$2';
    const values = [meta ? JSON.stringify(meta) : '{}', path];
    await writingQuery(this.client, query, values);
  }

  public async removeFile(path: string): Promise<void> {
    const query = 'DELETE FROM file WHERE path=$1';
    const values = [path];
    await writingQuery(this.client, query, values);
  }

  public async getFile(path: string): Promise<File | null> {
    const query = 'SELECT * FROM file WHERE path=$1';
    const values = [path];
    const result = await readingQuery<File>(this.client, query, values);
    if (!result || result.rowCount !== 1) {
      return null;
    }
    return result.rows[0];
  }

  public async listFilesInFolder(folder: string): Promise<string[]> {
    folder = folder.replace(/\/*$/gu, '');
    const regex = `^${folder}/([^/]+)$`;
    const query = 'SELECT path FROM file WHERE path~$1 ORDER BY path';
    const values = [regex];
    const result = await readingQuery<FilePath>(this.client, query, values);
    if (!result || result.rowCount === 0) {
      return [];
    }
    return result.rows.map((file) => file.path.replace(new RegExp(regex, 'u'), '$1'));
  }

  public async fileExists(path: string): Promise<boolean> {
    return !!(await this.getFile(path));
  }
}

export { PostgresDatabase };
