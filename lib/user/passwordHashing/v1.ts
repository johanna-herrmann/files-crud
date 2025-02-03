import crypto from 'crypto';
import PasswordHashing from '@/types/user/PasswordHashing';

const N = 131_072;
const R = 8;
const P = 1;
const HASH_LENGTH = 32;
const SALT_LENGTH = 16;

const scryptOptions: crypto.ScryptOptions = {
  N,
  r: R,
  p: P,
  maxmem: 168 * N * R
};

const scryptPromisified = function (password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, HASH_LENGTH, scryptOptions, (err: Error | null, derivedKey: Buffer) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey);
    });
  });
};

const v1PasswordHashing: PasswordHashing = {
  version: 'v1',

  async hashPassword(password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const hash = await scryptPromisified(password, salt);
    return [salt.toString('base64'), hash.toString('base64')];
  },

  async checkPassword(password, salt, hash) {
    const actualHash = await scryptPromisified(password, Buffer.from(salt, 'base64'));
    return hash === actualHash.toString('base64');
  }
};

export { v1PasswordHashing };
