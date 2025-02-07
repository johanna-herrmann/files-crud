import { issueToken, verifyToken, getIndex, getKeys, KEYS, algorithm, extractSub, extractExp } from '@/user/jwt';
import jwt from 'jsonwebtoken';
import { loadConfig } from '@/config/config';

describe('jwt', (): void => {
  const sub = 'testUserId';
  const iat = 120;
  const fakeTime = iat * 1000;
  const validity = 42;
  const exp = iat + validity;
  const fakeTimeExpired = exp * 1000 + 1;

  beforeEach(async (): Promise<void> => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeTime);
    loadConfig({ tokenExpiresInSeconds: validity });
  });

  afterEach((): void => {
    jest.useRealTimers();
  });

  test('initializes correctly.', async (): Promise<void> => {
    const keys = getKeys();

    expect(keys.length).toBe(KEYS);
  });

  test('issueToken issues token correctly, with expiring.', async (): Promise<void> => {
    const token = issueToken(sub);

    const decoded = jwt.decode(token, { complete: true }) as jwt.JwtPayload;
    const index = getIndex();
    const key = getKeys()[index];
    const checkToken = jwt.sign({ sub, iat, exp } as Record<string, unknown>, key.key, {
      algorithm,
      keyid: key.kid
    });
    const checkDecoded = jwt.decode(checkToken, { complete: true }) as jwt.JwtPayload;
    expect(decoded.header.alg).toBe('HS256');
    expect(decoded.header.typ).toBe('JWT');
    expect(decoded.header.kid).toBe(getKeys()[index].kid);
    expect(decoded.payload.sub).toBe(sub);
    expect(decoded.payload.iat).toBe(iat);
    expect(decoded.payload.exp).toBe(exp);
    expect(decoded.signature).toBe(checkDecoded.signature);
  });

  test('issueToken issues token correctly, without expiring.', async (): Promise<void> => {
    loadConfig({ tokenExpiresInSeconds: 0 });

    const token = issueToken(sub);

    const decoded = jwt.decode(token, { complete: true }) as jwt.JwtPayload;
    const index = getIndex();
    const key = getKeys()[index];
    const checkToken = jwt.sign({ sub, iat } as Record<string, unknown>, key.key, {
      algorithm,
      keyid: key.kid
    });
    const checkDecoded = jwt.decode(checkToken, { complete: true }) as jwt.JwtPayload;
    expect(decoded.header.alg).toBe('HS256');
    expect(decoded.header.typ).toBe('JWT');
    expect(decoded.header.kid).toBe(getKeys()[index].kid);
    expect(decoded.payload.sub).toBe(sub);
    expect(decoded.payload.iat).toBe(iat);
    expect(decoded.payload.exp).toBeUndefined();
    expect(decoded.signature).toBe(checkDecoded.signature);
  });

  test('verifyToken returns sub of valid token.', async (): Promise<void> => {
    const token = issueToken(sub);

    const result = verifyToken(token);

    expect(result).toBe(sub);
  });

  test('verifyToken returns sub of valid token, no expiration.', async (): Promise<void> => {
    loadConfig({ tokenExpiresInSeconds: 0 });
    jest.setSystemTime(fakeTimeExpired);

    const token = issueToken(sub);

    const result = verifyToken(token);

    expect(result).toBe(sub);
  });

  test('verifyToken returns empty string on expired token.', async (): Promise<void> => {
    const token = issueToken(sub);
    jest.setSystemTime(fakeTimeExpired);

    const result = verifyToken(token);

    expect(result).toBe('');
  });

  test('verifyToken returns empty string on invalid token.', async (): Promise<void> => {
    const token = issueToken(sub);

    const result = verifyToken(token.substring(0, token.length - 2));

    expect(result).toBe('');
  });

  test('verifyToken returns empty string on token with invalid algo.', async (): Promise<void> => {
    const token = issueToken(sub);
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
    const token = issueToken(sub);

    const id = extractSub(token);

    expect(id).toBe(sub);
  });

  test('extractExp returns expiration time.', async (): Promise<void> => {
    const token = issueToken(sub);

    const exp = extractExp(token);

    expect(exp).toBe(exp);
  });

  test('extractExp returns expiration time, fallback to 0.', async (): Promise<void> => {
    loadConfig({ tokenExpiresInSeconds: 0 });

    const token = issueToken(sub);

    const exp = extractExp(token);

    expect(exp).toBe(0);
  });
});
