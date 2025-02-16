import { loadDb } from '@/database';
import { versions, current } from './passwordHashing/versions';
import Database from '@/types/database/Database';
import { extractSub, issueToken, verifyToken } from './jwt';
import { countAttempt, handleLocking, resetAttempts } from './locking';
import User from '@/types/user/User';

const invalidCredentials = 'INVALID_CREDENTIALS';
const attemptsExceeded = 'ATTEMPTS_EXCEEDED';

const updateHash = async function (db: Database, id: string, password: string): Promise<void> {
  const hashVersion = current.version;
  const [salt, hash] = await current.hashPassword(password);
  await db.updateHash(id, hashVersion, salt, hash);
};

const authenticate = async function (db: Database, username: string, password: string): Promise<User | null> {
  const user = await db.getUserByUsername(username);
  if (!user) {
    await countAttempt(db, username);
    return null;
  }
  const { hashVersion, salt, hash } = user;
  const hashing = versions[hashVersion];
  const valid = await hashing.checkPassword(password, salt, hash);
  if (!valid) {
    await countAttempt(db, username);
    return null;
  }
  if (hashing.version !== current.version) {
    await updateHash(db, username, password);
  }
  await resetAttempts(db, username);
  return user;
};

const login = async function (username: string, password: string): Promise<string> {
  const db = await loadDb();
  const locked = await handleLocking(db, username);
  if (locked) {
    return attemptsExceeded;
  }
  const user = await authenticate(db, username, password);
  return user ? issueToken(user.id) : invalidCredentials;
};

const checkPassword = async function (username: string, password: string): Promise<string> {
  const db = await loadDb();
  const authenticated = await authenticate(db, username, password);
  return authenticated ? '' : invalidCredentials;
};

const authorize = async function (jwt: string | null): Promise<User | null> {
  const db = await loadDb();
  const valid = verifyToken(jwt);
  if (!valid) {
    return null;
  }
  const id = extractSub(jwt as string);
  return await db.getUserById(id);
};

const changePassword = async function (id: string, password: string): Promise<string> {
  const db = await loadDb();
  await updateHash(db, id, password);
  return '';
};

export { login, checkPassword, authorize, changePassword, invalidCredentials, attemptsExceeded };
