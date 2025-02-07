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
  const iat = Math.round(Date.now() / 1000);
  const validity = Math.abs(config.tokenExpiresInSeconds as number);
  const exp = validity ? iat + validity : undefined;
  const sub = id;
  const payload = exp ? ({ sub, iat, exp } as Record<string, unknown>) : ({ sub, iat } as Record<string, unknown>);
  const header = { algorithm, keyid: kid } as SignOptions;
  return jwt.sign(payload, key, header);
};

const verifyToken = function (token: string | null): boolean {
  if (!token) {
    return false;
  }
  const decoded = jwt.decode(token, { complete: true }) as jwt.JwtPayload;
  if (decoded?.header.alg !== algorithm) {
    return false;
  }
  const key = keys.find((key) => key.kid === decoded.header.kid);
  if (!key) {
    return false;
  }
  try {
    jwt.verify(token, key.key, { complete: true });
  } catch {
    return false;
  }
  return true;
};

const extractSub = function (token: string): string {
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  return decoded.sub ?? '';
};

const getExpiresAt = function (token: string): number {
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  const exp = decoded.exp ?? 0;
  return exp * 1000;
};

const getIndex = function (): number {
  return index;
};

const getKeys = function (): JwtKey[] {
  return keys;
};

initKeys().then();

export { issueToken, verifyToken, extractSub, getExpiresAt, getIndex, getKeys, KEYS, algorithm };
