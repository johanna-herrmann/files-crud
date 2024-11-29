import { v4 } from 'uuid';
import { loadDb, closeDb } from '@/database/db';
import { versions, current } from './passwordHashing/versions';
import Database from '@/types/Database';
import { issueToken } from './jwt';

const updateHash = async function (db: Database, username: string, password: string): Promise<void> {
  const hashVersion = current.version;
  const [salt, hash] = await current.hashPassword(password);
  await db.updateHash(username, hashVersion, salt, hash);
};

const register = async function (username: string, password: string, admin?: boolean, meta?: Record<string, unknown>): Promise<boolean> {
  try {
    const db = await loadDb();
    const exists = await db.userExists(username);
    if (exists) {
      return false;
    }
    const ownerId = v4();
    const hashVersion = current.version;
    const [salt, hash] = await current.hashPassword(password);
    const user = { username, hashVersion, salt, hash, ownerId, admin: admin ?? false, meta };
    await db.addUser(user);
  } finally {
    await closeDb();
  }
  return true;
};

const login = async function (username: string, password: string): Promise<string> {
  try {
    const db = await loadDb();
    const user = await db.getUser(username);
    if (!user) {
      return '';
    }
    const { hashVersion, salt, hash } = user;
    const hashing = versions[hashVersion];
    const valid = await hashing.checkPassword(password, salt, hash);
    if (!valid) {
      return '';
    }
    if (hashing.version !== current.version) {
      await updateHash(db, username, password);
    }
    return issueToken(username);
  } finally {
    await closeDb();
  }
};

export { register, login };
