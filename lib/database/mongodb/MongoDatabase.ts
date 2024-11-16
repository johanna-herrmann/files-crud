import mongoose from 'mongoose';
import User from '@/types/User';
import Database from '@/types/Database';

const userSchema = new mongoose.Schema({
  username: { type: String, default: '' },
  hashVersion: { type: String, default: '' },
  salt: { type: String, default: '' },
  hash: { type: String, default: '' },
  sectionId: { type: String, default: '' },
  admin: { type: Boolean, default: false },
  meta: Object
});

const jwtKeySchema = new mongoose.Schema({
  key: { type: String, default: '' }
});

const failedLoginAttemptsSchema = new mongoose.Schema({
  username: { type: String, default: '' },
  attempts: { type: Number, default: 0 }
});

class MongoDatabase implements Database {
  private readonly url: string;
  private readonly user?: string;
  private readonly pass?: string;
  private readonly User = mongoose.model('User', userSchema);
  private readonly JwtKey = mongoose.model('JwtKey', jwtKeySchema);
  private readonly FailedLoginAttempts = mongoose.model('FailedLoginAttempts', failedLoginAttemptsSchema);

  constructor(url: string, user?: string, pass?: string) {
    this.url = url;
    this.user = user;
    this.pass = pass;
  }

  public getConf(): [string, typeof this.User, typeof this.JwtKey, typeof this.FailedLoginAttempts] {
    return [this.url, this.User, this.JwtKey, this.FailedLoginAttempts];
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

  public async modifyMeta(username: string, meta?: Record<string, unknown>): Promise<void> {
    await this.User.findOneAndUpdate({ username }, { meta });
  }

  public async removeUser(username: string): Promise<void> {
    await this.User.findOneAndDelete({ username });
  }

  public async getUser(username: string): Promise<User | null> {
    return await this.User.findOne({ username });
  }

  public async addJwtKeys(...keys: string[]): Promise<void> {
    for (const key of keys) {
      await new this.JwtKey({ key }).save();
    }
  }

  public async getJwtKeys(): Promise<string[]> {
    return (await this.JwtKey.find()).map((key) => key.key);
  }

  public async countLoginAttempt(username: string): Promise<void> {
    const attempts = await this.FailedLoginAttempts.findOne({ username });
    if (!attempts) {
      await new this.FailedLoginAttempts({ username, attempts: 1 }).save();
      return;
    }

    attempts.attempts++;

    await attempts.save();
  }

  public async getLoginAttempts(username: string): Promise<number> {
    const attempts = await this.FailedLoginAttempts.findOne({ username });
    return attempts ? attempts.attempts : 0;
  }

  public async removeLoginAttempts(username: string): Promise<void> {
    await this.FailedLoginAttempts.findOneAndDelete({ username });
  }
}

export { MongoDatabase };
