import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { loadDb, closeDb } from '@/database';
import JwtKey from '@/types/user/JwtKey';
import { getFullConfig } from '@/config/config';

const KEY_LENGTH = 32;
const KEYS = 20;

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

const issueToken = function (id: string): string {
  const { kid, key } = getRandomKey();
  const config = getFullConfig();
  const iat = Date.now();
  const exp = iat + (config.tokenExpiresInMinutes as number) * 60 * 1000;
  const sub = id;
  const payload = { sub, iat, exp } as Record<string, unknown>;
  const header = { algorithm, keyid: kid } as SignOptions;
  return jwt.sign(payload, key, header);
};

const verifyToken = function (token: string | null): string {
  const config = getFullConfig();
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
  if (decoded.payload.exp < Date.now()) {
    return '';
  }
  return decoded.payload.sub;
};

const extractSub = function (token: string): string {
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  return decoded.sub ?? '';
};

const extractExp = function (token: string): number {
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  return decoded.exp ?? 0;
};

const getIndex = function (): number {
  return index;
};

const getKeys = function (): JwtKey[] {
  return keys;
};

initKeys().then();

export { issueToken, verifyToken, extractSub, extractExp, getIndex, getKeys, KEYS, algorithm };
