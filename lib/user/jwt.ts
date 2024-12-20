import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { loadDb, closeDb } from '@/database';
import JwtKey from '@/types/JwtKey';

const KEY_LENGTH = 32;
const KEYS = 20;
const TTL = 30 * 60 * 1000; // 30 minutes;

const algorithm = 'HS256';

const keys: JwtKey[] = [];

let index = 0;

const initKeys = async function (): Promise<void> {
  try {
    const db = await loadDb();
    keys.push(...(await db.getJwtKeys()));
    if (keys.length === 0) {
      const newKeys: string[] = [];
      for (let i = 1; i <= KEYS; i++) {
        newKeys.push(crypto.randomBytes(KEY_LENGTH).toString('base64'));
      }
      await db.addJwtKeys(...newKeys);
      keys.push(...(await db.getJwtKeys()));
    }
  } finally {
    await closeDb();
  }
};

const getRandomKey = function (): JwtKey {
  index = Math.round(Math.random() * (KEYS - 1));
  return keys[index];
};

const issueToken = function (username: string): string {
  const { kid, key } = getRandomKey();
  // noinspection JSDeprecatedSymbols - this is not the string.sub function, it's just an object-property.
  return jwt.sign({ sub: username, iat: Date.now() }, key, { algorithm, keyid: kid });
};

const verifyToken = function (token: string | null): string {
  if (!token) {
    return '';
  }
  const decoded = jwt.decode(token, { complete: true }) as jwt.JwtPayload;
  if (decoded?.header.alg !== algorithm) {
    return '';
  }
  const key = keys.find((key) => key.kid === decoded.header.kid);
  if (!key) {
    return '';
  }
  try {
    jwt.verify(token, key.key, { complete: true });
  } catch {
    return '';
  }
  if (decoded.payload.iat + TTL < Date.now()) {
    return '';
  }
  return decoded.payload.sub;
};

const extractUsername = function (token: string): string {
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  return decoded.sub ?? '';
};

const getIndex = function (): number {
  return index;
};

const getKeys = function (): JwtKey[] {
  return keys;
};

initKeys().then();

export { issueToken, verifyToken, extractUsername, getIndex, getKeys, KEYS, TTL, algorithm };
