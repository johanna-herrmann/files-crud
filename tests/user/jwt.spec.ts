import { issueToken, verifyToken, getIndex, getKeys, KEYS, algorithm, extractSub, extractExp } from '@/user/jwt';
import jwt from 'jsonwebtoken';
import { loadConfig } from '@/config/config';

describe('jwt', (): void => {
  const fakeDate = new Date('2017-01-01');
  const fakeTime = fakeDate.getTime();

  const duranceMillis = 42 * 60 * 1000;

  beforeEach(async (): Promise<void> => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeDate);
    loadConfig({ tokenExpiresInMinutes: 42 });
  });

  afterEach((): void => {
    jest.useRealTimers();
  });

  test('initializes correctly.', async (): Promise<void> => {
    const keys = getKeys();

    expect(keys.length).toBe(KEYS);
  });

  test('issueToken issues token correctly.', async (): Promise<void> => {
    const token = issueToken('testUserId');

    const decoded = jwt.decode(token, { complete: true }) as jwt.JwtPayload;
    const index = getIndex();
    const key = getKeys()[index];
    const checkToken = jwt.sign({ sub: 'testUserId', iat: fakeTime, exp: fakeTime + duranceMillis } as Record<string, unknown>, key.key, {
      algorithm,
      keyid: key.kid
    });
    const checkDecoded = jwt.decode(checkToken, { complete: true }) as jwt.JwtPayload;
    expect(decoded.header.alg).toBe('HS256');
    expect(decoded.header.typ).toBe('JWT');
    expect(decoded.header.kid).toBe(getKeys()[index].kid);
    expect(decoded.payload.sub).toBe('testUserId');
    expect(decoded.payload.iat).toBe(fakeTime);
    expect(decoded.payload.exp).toBe(fakeTime + duranceMillis);
    expect(decoded.signature).toBe(checkDecoded.signature);
  });

  test('verifyToken returns sub of valid token.', async (): Promise<void> => {
    const token = issueToken('testUserId');

    const result = verifyToken(token);

    expect(result).toBe('testUserId');
  });

  test('verifyToken returns empty string on expired token.', async (): Promise<void> => {
    const token = issueToken('testUserId');
    jest.setSystemTime(fakeTime + duranceMillis + 1);

    const result = verifyToken(token);

    expect(result).toBe('');
  });

  test('verifyToken returns empty string on invalid token.', async (): Promise<void> => {
    const token = issueToken('testUserId');

    const result = verifyToken(token.substring(0, token.length - 2));

    expect(result).toBe('');
  });

  test('verifyToken returns empty string on token with invalid algo.', async (): Promise<void> => {
    const token = issueToken('testUserId');
    const [header, payload, signature] = token.split('.');
    const changedHeaderObject = JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as Record<string, unknown>;
    changedHeaderObject.alg = 'other';
    const changedHeader = Buffer.from(JSON.stringify(changedHeaderObject), 'utf8').toString('base64url');
    const changedToken = [changedHeader, payload, signature].join('.');

    const result = verifyToken(changedToken);

    expect(result).toBe('');
  });

  test('verifyToken returns empty string on empty token.', async (): Promise<void> => {
    const result = verifyToken('');

    expect(result).toBe('');
  });

  test('verifyToken returns empty string on nullish token.', async (): Promise<void> => {
    const result = verifyToken(null);

    expect(result).toBe('');
  });

  test('extractSub returns id.', async (): Promise<void> => {
    const token = issueToken('testUserId');

    const id = extractSub(token);

    expect(id).toBe('testUserId');
  });

  test('extractExp returns expiration time.', async (): Promise<void> => {
    const token = issueToken('testUserId');

    const exp = extractExp(token);

    expect(exp).toBe(fakeTime + duranceMillis);
  });
});
