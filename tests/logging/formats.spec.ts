import { accessLogFormats, logFormats } from '@/logging/formats';

const BOTTOM_LINE = '\u2500'.repeat(process.stdout.columns || 80);

const timestamp = '42';
const level = 'testLevel';
const message = 'testMessage';
const sourcePath = '/path/to/file';
const error = new Error('test error message');

const ip = '127.0.0.1';
const method = 'GET';
const path = '/image.png';
const httpVersion = 'HTTP/2.0';
const statusCode = 200;
const contentLength = '815';
const referer = 'http://i.am.from/here';
const userAgent = 'testUserAgent';

describe('logging formats', (): void => {
  test('humanReadableLine returns human readable line without errorMessage.', async (): Promise<void> => {
    const result = logFormats.humanReadableLine({ timestamp, level, message, sourcePath });

    expect(result).toBe(`${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}`);
  });

  test('humanReadableLine returns human readable line with errorMessage.', async (): Promise<void> => {
    const result = logFormats.humanReadableLine({ timestamp, level, message, sourcePath, error });

    expect(result).toBe(`${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message} - ${error.message}`);
  });

  test('humanReadableBlock returns human readable block without error message.', async (): Promise<void> => {
    const result = logFormats.humanReadableBlock({ timestamp, level, message, sourcePath });

    expect(result).toBe(`${timestamp}\n[${sourcePath}]\n${level.toUpperCase()}:\n${message}\n${BOTTOM_LINE}\n`);
  });

  test('humanReadableBlock returns human readable block with error message.', async (): Promise<void> => {
    const result = logFormats.humanReadableBlock({ timestamp, level, message, sourcePath, error });

    expect(result).toBe(`${timestamp}\n[${sourcePath}]\n${level.toUpperCase()}:\n${message}\n${error.message}\n${BOTTOM_LINE}\n`);
  });

  test('coloredHumanReadableLine returns colored human readable line on debug.', async (): Promise<void> => {
    const result = logFormats.coloredHumanReadableLine({ timestamp, level: 'debug', message, sourcePath });

    expect(result).toBe(`\x1B[34m${timestamp} [${sourcePath}] DEBUG: ${message}\x1B[39m`);
  });

  test('coloredHumanReadableLine returns colored human readable line on info.', async (): Promise<void> => {
    const result = logFormats.coloredHumanReadableLine({ timestamp, level: 'info', message, sourcePath });

    expect(result).toBe(`\x1B[32m${timestamp} [${sourcePath}] INFO: ${message}\x1B[39m`);
  });

  test('coloredHumanReadableLine returns colored human readable line on warn.', async (): Promise<void> => {
    const result = logFormats.coloredHumanReadableLine({ timestamp, level: 'warn', message, sourcePath });

    expect(result).toBe(`\x1B[33m${timestamp} [${sourcePath}] WARN: ${message}\x1B[39m`);
  });

  test('coloredHumanReadableLine returns colored human readable line on error without error message.', async (): Promise<void> => {
    const result = logFormats.coloredHumanReadableLine({ timestamp, level: 'error', message, sourcePath });

    expect(result).toBe(`\x1B[31m${timestamp} [${sourcePath}] ERROR: ${message}\x1B[39m`);
  });

  test('coloredHumanReadableLine returns colored human readable line on error with error message.', async (): Promise<void> => {
    const result = logFormats.coloredHumanReadableLine({ timestamp, level: 'error', message, sourcePath, error });

    expect(result).toBe(`\x1B[31m${timestamp} [${sourcePath}] ERROR: ${message} - ${error.message}\x1B[39m`);
  });

  test('coloredHumanReadableBlock returns colored human readable block on debug.', async (): Promise<void> => {
    const result = logFormats.coloredHumanReadableBlock({ timestamp, level: 'debug', message, sourcePath });

    expect(result).toBe(`\x1B[34m${timestamp}\n[${sourcePath}]\nDEBUG:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`);
  });

  test('coloredHumanReadableBlock returns colored human readable block on info.', async (): Promise<void> => {
    const result = logFormats.coloredHumanReadableBlock({ timestamp, level: 'info', message, sourcePath });

    expect(result).toBe(`\x1B[32m${timestamp}\n[${sourcePath}]\nINFO:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`);
  });

  test('coloredHumanReadableBlock returns colored human readable block on warn.', async (): Promise<void> => {
    const result = logFormats.coloredHumanReadableBlock({ timestamp, level: 'warn', message, sourcePath });

    expect(result).toBe(`\x1B[33m${timestamp}\n[${sourcePath}]\nWARN:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`);
  });

  test('coloredHumanReadableBlock returns colored human readable block on error without error message.', async (): Promise<void> => {
    const result = logFormats.coloredHumanReadableBlock({ timestamp, level: 'error', message, sourcePath });

    expect(result).toBe(`\x1B[31m${timestamp}\n[${sourcePath}]\nERROR:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`);
  });

  test('coloredHumanReadableBlock returns colored human readable block on error with error message.', async (): Promise<void> => {
    const result = logFormats.coloredHumanReadableBlock({ timestamp, level: 'error', message, sourcePath, error });

    expect(result).toBe(`\x1B[31m${timestamp}\n[${sourcePath}]\nERROR:\n${message}\n${error.message}\x1B[39m\n${BOTTOM_LINE}\n`);
  });

  test('json returns json without error message.', async (): Promise<void> => {
    const result = logFormats.json({ timestamp, level: 'info', message, sourcePath });

    expect(JSON.parse(result)).toEqual({ timestamp, source: sourcePath, level: 'info', message });
  });

  test('json returns json with error message.', async (): Promise<void> => {
    const result = logFormats.json({ timestamp, level: 'error', message, sourcePath, error });

    expect(JSON.parse(result)).toEqual({
      timestamp,
      source: sourcePath,
      level: 'error',
      message,
      errorMessage: error.message
    });
  });

  test('accessClassic returns string like nginx would (kinda (-ish)).', async (): Promise<void> => {
    const result = accessLogFormats.classic({ ip, timestamp, method, path, httpVersion, statusCode, contentLength, referer, userAgent });

    expect(result).toBe('127.0.0.1 - [42] "GET /image.png HTTP/2.0" 200 815 "http://i.am.from/here" "testUserAgent"');
  });

  test('accessJson returns json.', async (): Promise<void> => {
    const result = accessLogFormats.json({ ip, timestamp, method, path, httpVersion, statusCode, contentLength, referer, userAgent });

    expect(JSON.parse(result)).toEqual({
      ip,
      timestamp,
      method,
      path,
      httpVersion,
      statusCode,
      contentLength,
      referer,
      userAgent
    });
  });
});
