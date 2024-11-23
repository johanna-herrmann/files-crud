import Database from '@/types/Database';
import FailedLoginAttempts from '@/types/FailedLoginAttempts';
import User from '@/types/User';
import File from '@/types/File';

interface Tables {
  user: Record<string, User>;
  jwtKey: string[];
  failedLoginAttempts: Record<string, FailedLoginAttempts>;
  file: Record<string, File>;
}

const tables: Tables = {
  user: {},
  jwtKey: [],
  failedLoginAttempts: {},
  file: {}
};

class MemoryDatabase implements Database {
  public async open(): Promise<void> {
    // no-op: no opening needed
  }

  public async close(): Promise<void> {
    // no-op: no resources to close
  }

  public async addUser(user: User): Promise<void> {
    tables.user[user.username] = { ...user, meta: { ...user.meta } };
  }

  public async changeUsername(oldUsername: string, newUsername: string): Promise<void> {
    const user = tables.user[oldUsername];
    user.username = newUsername;
    tables.user[newUsername] = user;
    delete tables.user[oldUsername];
  }

  public async updateHash(username: string, hashVersion: string, salt: string, hash: string): Promise<void> {
    const user = tables.user[username];
    const modifiedUser = { ...user, hashVersion, salt, hash };
    tables.user[username] = modifiedUser;
  }

  public async makeUserAdmin(username: string): Promise<void> {
    const user = tables.user[username];
    user.admin = true;
  }

  public async makeUserNormalUser(username: string): Promise<void> {
    const user = tables.user[username];
    user.admin = false;
  }

  public async modifyUserMeta(username: string, meta?: Record<string, unknown>): Promise<void> {
    const user = tables.user[username];
    user.meta = meta;
  }

  public async removeUser(username: string): Promise<void> {
    delete tables.user[username];
  }

  public async getUser(username: string): Promise<User | null> {
    return tables.user[username] ?? null;
  }

  public async userExists(username: string): Promise<boolean> {
    return !!tables.user[username];
  }

  public async addJwtKeys(...keys: string[]): Promise<void> {
    keys.forEach((key) => tables.jwtKey.push(key));
  }

  public async getJwtKeys(): Promise<string[]> {
    return tables.jwtKey;
  }

  public async countLoginAttempt(username: string): Promise<void> {
    const attempts = tables.failedLoginAttempts[username] ?? { username, attempts: 0 };
    attempts.attempts++;
    tables.failedLoginAttempts[username] = attempts;
  }

  public async getLoginAttempts(username: string): Promise<number> {
    return tables.failedLoginAttempts[username]?.attempts ?? 0;
  }

  public async removeLoginAttempts(username: string): Promise<void> {
    delete tables.failedLoginAttempts[username];
  }

  public async addFile(file: File): Promise<void> {
    tables.file[file.path] = { ...file, meta: { ...file.meta } };
  }

  public async moveFile(oldPath: string, newPath: string, newOwner?: string): Promise<void> {
    const file = tables.file[oldPath];
    file.path = newPath;
    if (newOwner) {
      file.owner = newOwner;
    }
    tables.file[newPath] = file;
    delete tables.file[oldPath];
  }

  public async modifyFileMeta(path: string, meta?: Record<string, unknown>): Promise<void> {
    const file = tables.file[path];
    file.meta = meta;
  }

  public async removeFile(path: string): Promise<void> {
    delete tables.file[path];
  }

  public async getFile(path: string): Promise<File | null> {
    return tables.file[path] ?? null;
  }

  public async listFilesInFolder(path: string): Promise<string[]> {
    path = path.replace(/\/*$/gu, '');
    const folderRegex = new RegExp(`^${path}/[^/]+$`, 'u');
    return Object.keys(tables.file).filter((file) => folderRegex.test(file));
  }

  public async fileExists(path: string): Promise<boolean> {
    return !!tables.file[path];
  }
}

export { MemoryDatabase, tables };
