import mongoose from 'mongoose';
import User from '@/types/User';
import File from '@/types/File';
import Database from '@/types/Database';
import FailedLoginAttempts from '@/types/FailedLoginAttempts';
import { getCurrentTime } from './timeWrapper';
import UserListItem from '@/types/UserListItem';
import JwtKey from '@/types/JwtKey';
import { v4 } from 'uuid';

const userSchema = new mongoose.Schema({
  username: { type: String, default: '' },
  hashVersion: { type: String, default: '' },
  salt: { type: String, default: '' },
  hash: { type: String, default: '' },
  ownerId: { type: String, default: '' },
  admin: { type: Boolean, default: false },
  meta: Object
});

const jwtKeySchema = new mongoose.Schema({
  id: { type: String, default: '' },
  key: { type: String, default: '' }
});

const failedLoginAttemptsSchema = new mongoose.Schema({
  username: { type: String, default: '' },
  attempts: { type: Number, default: 0 },
  lastAttempt: { type: Number, default: 0 }
});

const fileSchema = new mongoose.Schema({
  path: { type: String, default: '' },
  owner: { type: String, default: '' },
  realName: { type: String, default: '' },
  meta: Object
});

class MongoDatabase implements Database {
  private readonly url: string;
  private readonly user?: string;
  private readonly pass?: string;
  private readonly User = mongoose.model('User', userSchema);
  private readonly JwtKey = mongoose.model('JwtKey', jwtKeySchema);
  private readonly FailedLoginAttempts = mongoose.model('FailedLoginAttempts', failedLoginAttemptsSchema);
  private readonly File = mongoose.model('File', fileSchema);

  constructor(url: string, user?: string, pass?: string) {
    this.url = url;
    this.user = user;
    this.pass = pass;
  }

  public getConf(): [string, typeof this.User, typeof this.JwtKey, typeof this.FailedLoginAttempts, typeof this.File] {
    return [this.url, this.User, this.JwtKey, this.FailedLoginAttempts, this.File];
  }

  public async open(): Promise<void> {
    await mongoose.connect(this.url, { user: this.user, pass: this.pass });
  }

  public async close(): Promise<void> {
    await mongoose.connection.close();
  }

  public async addUser(user: User): Promise<void> {
    await new this.User(user).save();
  }

  public async changeUsername(oldUsername: string, newUsername: string): Promise<void> {
    await this.User.findOneAndUpdate({ username: oldUsername }, { username: newUsername });
  }

  public async updateHash(username: string, hashVersion: string, salt: string, hash: string): Promise<void> {
    await this.User.findOneAndUpdate({ username }, { hashVersion, salt, hash });
  }

  public async makeUserAdmin(username: string): Promise<void> {
    await this.User.findOneAndUpdate({ username }, { admin: true });
  }

  public async makeUserNormalUser(username: string): Promise<void> {
    await this.User.findOneAndUpdate({ username }, { admin: false });
  }

  public async modifyUserMeta(username: string, meta?: Record<string, unknown>): Promise<void> {
    await this.User.findOneAndUpdate({ username }, { meta });
  }

  public async removeUser(username: string): Promise<void> {
    await this.User.findOneAndDelete({ username });
  }

  public async getUser(username: string): Promise<User | null> {
    return await this.User.findOne({ username });
  }

  public async getUsers(): Promise<UserListItem[]> {
    return (await this.User.find()).map(({ username, admin }) => ({ username, admin }));
  }

  public async userExists(username: string): Promise<boolean> {
    return !!(await this.User.exists({ username }));
  }

  public async addJwtKeys(...keys: string[]): Promise<void> {
    for (const key of keys) {
      await new this.JwtKey({ key, id: v4() }).save();
    }
  }

  public async getJwtKeys(): Promise<JwtKey[]> {
    return (await this.JwtKey.find()).map(({ id, key }) => ({ id, key }));
  }

  public async countLoginAttempt(username: string): Promise<void> {
    const lastAttempt = getCurrentTime();
    const attempts = await this.FailedLoginAttempts.findOne({ username });
    if (!attempts) {
      await new this.FailedLoginAttempts({ username, attempts: 1, lastAttempt }).save();
      return;
    }

    attempts.attempts++;
    attempts.lastAttempt = lastAttempt;

    await attempts.save();
  }

  public async updateLastLoginAttempt(username: string): Promise<void> {
    const lastAttempt = getCurrentTime();
    await this.FailedLoginAttempts.findOneAndUpdate({ username }, { lastAttempt });
  }

  public async getLoginAttempts(username: string): Promise<FailedLoginAttempts | null> {
    const attempts = await this.FailedLoginAttempts.findOne({ username });
    return attempts ?? null;
  }

  public async removeLoginAttempts(username: string): Promise<void> {
    await this.FailedLoginAttempts.findOneAndDelete({ username });
  }

  public async addFile(file: File): Promise<void> {
    await new this.File(file).save();
  }

  public async moveFile(oldPath: string, newPath: string, newOwner?: string): Promise<void> {
    const update = newOwner ? { path: newPath, owner: newOwner } : { path: newPath };
    await this.File.findOneAndUpdate({ path: oldPath }, update);
  }

  public async modifyFileMeta(path: string, meta?: Record<string, unknown>): Promise<void> {
    await this.File.findOneAndUpdate({ path }, { meta });
  }

  public async removeFile(path: string): Promise<void> {
    await this.File.findOneAndDelete({ path });
  }

  public async getFile(path: string): Promise<File | null> {
    return await this.File.findOne({ path });
  }

  public async listFilesInFolder(folder: string): Promise<string[]> {
    folder = folder.replace(/\/*$/gu, '');
    const regex = new RegExp(`^${folder}/([^/]+)$`, 'u');
    const files = await this.File.where('path').regex(regex).exec();
    return files.map((file) => file.path.replace(regex, '$1')).sort();
  }

  public async fileExists(path: string): Promise<boolean> {
    return !!(await this.File.exists({ path }));
  }
}

export { MongoDatabase };
