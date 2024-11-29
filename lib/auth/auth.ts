import { v4 } from 'uuid';
import { loadDb, closeDb } from '@/database/db';
import { versions, current } from './passwordHashing/versions';
import Database from '@/types/Database';
import { issueToken } from './jwt';
import { countAttempt, handleLocking, resetAttempts } from './locking';

const invalidCredentials = 'INVALID_CREDENTIALS';
const lockedExceeded = 'ATTEMPTS_EXCEEDED';

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
    const locked = await handleLocking(db, username);
    if (locked) {
      return lockedExceeded;
    }
    const user = await db.getUser(username);
    if (!user) {
      await countAttempt(db, username);
      return invalidCredentials;
    }
    const { hashVersion, salt, hash } = user;
    const hashing = versions[hashVersion];
    const valid = await hashing.checkPassword(password, salt, hash);
    if (!valid) {
      await countAttempt(db, username);
      return invalidCredentials;
    }
    if (hashing.version !== current.version) {
      await updateHash(db, username, password);
    }
    await resetAttempts(db, username);
    return issueToken(username);
  } finally {
    await closeDb();
  }
};

export { register, login, invalidCredentials, lockedExceeded };
