import { issueToken, verifyToken, getIndex, getKeys, KEYS, TTL, algorithm, extractId } from '@/user/jwt';
import jwt from 'jsonwebtoken';

describe('jwt', (): void => {
  const fakeDate = new Date('2017-01-01');
  const fakeDateExpired = new Date(fakeDate.getTime() + TTL + 1);
  const fakeTime = fakeDate.getTime();

  beforeEach(async (): Promise<void> => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeDate);
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
    // noinspection JSDeprecatedSymbols - this is not the string.sub function, it's just an object-property.
    const checkToken = jwt.sign({ sub: 'testUserId', iat: fakeTime }, key.key, { algorithm, keyid: key.kid });
    const checkDecoded = jwt.decode(checkToken, { complete: true }) as jwt.JwtPayload;
    expect(decoded.header.alg).toBe('HS256');
    expect(decoded.header.typ).toBe('JWT');
    expect(decoded.header.kid).toBe(getKeys()[index].kid);
    expect(decoded.payload.sub).toBe('testUserId');
    expect(decoded.payload.iat).toBe(fakeTime);
    expect(decoded.signature).toBe(checkDecoded.signature);
  });

  test('verifyToken returns sub of valid token.', async (): Promise<void> => {
    const token = issueToken('testUserId');

    const result = verifyToken(token);

    expect(result).toBe('testUserId');
  });

  test('verifyToken returns empty string on expired token.', async (): Promise<void> => {
    const token = issueToken('testUserId');
    jest.setSystemTime(fakeDateExpired);

    const result = verifyToken(token);

    expect(result).toBe('');
  });

  test('verifyToken returns empty string on invalid token.', async (): Promise<void> => {
    const token = issueToken('testUserId');
    jest.setSystemTime(fakeDateExpired);

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

  test('extractId returns id.', async (): Promise<void> => {
    const token = issueToken('testUserId');

    const id = extractId(token);

    expect(id).toBe('testUserId');
  });
});
