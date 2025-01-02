import Database from '@/types/database/Database';

const THRESHOLD = 5;
const TTL_MIN = 15 * 1000; // 15 seconds
const TTL_MAX = 30 * 60 * 1000; // 30 Minutes

const countAttempt = async function (db: Database, username: string): Promise<void> {
  await db.countLoginAttempt(username);
};

const resetAttempts = async function (db: Database, username: string): Promise<void> {
  await db.removeLoginAttempts(username);
};

const handleLocking = async function (db: Database, username: string): Promise<boolean> {
  const attempts = await db.getLoginAttempts(username);
  if (!attempts || attempts.attempts < THRESHOLD) {
    return false;
  }
  const factor = 2 ** (attempts.attempts - THRESHOLD);
  const ttl = Math.min(TTL_MIN * factor, TTL_MAX);
  if (attempts.lastAttempt + ttl > Date.now()) {
    await db.updateLastLoginAttempt(username);
    return true;
  }
  return false;
};

export { countAttempt, resetAttempts, handleLocking, THRESHOLD, TTL_MIN, TTL_MAX };
