import { accessLogFormats, logFormats } from '@/logging/formats';

const BOTTOM_LINE = '\u2500'.repeat(process.stdout.columns || 80);

const timestamp = '42';
const level = 'testLevel';
const message = 'testMessage';
const sourcePath = '/path/to/file';
const meta = { k: 'v' };
const metaJson = JSON.stringify({ k: 'v' });

const ip = '127.0.0.1';
const method = 'GET';
const path = '/image.png';
const httpVersion = 'HTTP/2.0';
const statusCode = 200;
const contentLength = '815';
const referer = 'http://i.am.from/here';
const userAgent = 'testUserAgent';
const time = 23;

describe('logging formats', (): void => {
  describe('humanReadableLine returns human readable line', (): void => {
    test('without meta.', async (): Promise<void> => {
      const result = logFormats.humanReadableLine({ timestamp, level, message, sourcePath });

      expect(result).toBe(`${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}`);
    });

    test('with meta.', async (): Promise<void> => {
      const result = logFormats.humanReadableLine({ timestamp, level, message, sourcePath, meta });

      expect(result).toBe(`${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message} - ${metaJson}`);
    });
  });

  describe('humanReadableBlock returns human readable block', (): void => {
    test('without meta.', async (): Promise<void> => {
      const result = logFormats.humanReadableBlock({ timestamp, level, message, sourcePath });

      expect(result).toBe(`${timestamp}\n[${sourcePath}]\n${level.toUpperCase()}:\n${message}\n${BOTTOM_LINE}\n`);
    });

    test('with meta.', async (): Promise<void> => {
      const result = logFormats.humanReadableBlock({ timestamp, level, message, sourcePath, meta });

      expect(result).toBe(`${timestamp}\n[${sourcePath}]\n${level.toUpperCase()}:\n${message}\n${metaJson}\n${BOTTOM_LINE}\n`);
    });
  });

  describe('coloredHumanReadableLine returns colored human readable line', (): void => {
    test('without meta, on debug.', async (): Promise<void> => {
      const result = logFormats.coloredHumanReadableLine({ timestamp, level: 'debug', message, sourcePath });

      expect(result).toBe(`\x1B[34m${timestamp} [${sourcePath}] DEBUG: ${message}\x1B[39m`);
    });

    test('without meta, on info.', async (): Promise<void> => {
      const result = logFormats.coloredHumanReadableLine({ timestamp, level: 'info', message, sourcePath });

      expect(result).toBe(`\x1B[32m${timestamp} [${sourcePath}] INFO: ${message}\x1B[39m`);
    });

    test('without meta, on warn.', async (): Promise<void> => {
      const result = logFormats.coloredHumanReadableLine({ timestamp, level: 'warn', message, sourcePath });

      expect(result).toBe(`\x1B[33m${timestamp} [${sourcePath}] WARN: ${message}\x1B[39m`);
    });

    test('without meta, on error.', async (): Promise<void> => {
      const result = logFormats.coloredHumanReadableLine({ timestamp, level: 'error', message, sourcePath });

      expect(result).toBe(`\x1B[31m${timestamp} [${sourcePath}] ERROR: ${message}\x1B[39m`);
    });

    test('with meta.', async (): Promise<void> => {
      const result = logFormats.coloredHumanReadableLine({ timestamp, level: 'info', message, sourcePath, meta });

      expect(result).toBe(`\x1B[32m${timestamp} [${sourcePath}] INFO: ${message} - ${metaJson}\x1B[39m`);
    });
  });

  describe('coloredHumanReadableBlock returns colored human readable block', (): void => {
    test('without meta, on debug.', async (): Promise<void> => {
      const result = logFormats.coloredHumanReadableBlock({ timestamp, level: 'debug', message, sourcePath });

      expect(result).toBe(`\x1B[34m${timestamp}\n[${sourcePath}]\nDEBUG:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`);
    });

    test('without meta, on info.', async (): Promise<void> => {
      const result = logFormats.coloredHumanReadableBlock({ timestamp, level: 'info', message, sourcePath });

      expect(result).toBe(`\x1B[32m${timestamp}\n[${sourcePath}]\nINFO:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`);
    });

    test('without meta, on warn.', async (): Promise<void> => {
      const result = logFormats.coloredHumanReadableBlock({ timestamp, level: 'warn', message, sourcePath });

      expect(result).toBe(`\x1B[33m${timestamp}\n[${sourcePath}]\nWARN:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`);
    });

    test('without meta, on error.', async (): Promise<void> => {
      const result = logFormats.coloredHumanReadableBlock({ timestamp, level: 'error', message, sourcePath });

      expect(result).toBe(`\x1B[31m${timestamp}\n[${sourcePath}]\nERROR:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`);
    });

    test('with meta.', async (): Promise<void> => {
      const result = logFormats.coloredHumanReadableBlock({ timestamp, level: 'info', message, sourcePath, meta });

      expect(result).toBe(`\x1B[32m${timestamp}\n[${sourcePath}]\nINFO:\n${message}\n${metaJson}\x1B[39m\n${BOTTOM_LINE}\n`);
    });
  });

  describe('json returns json', (): void => {
    test('one-line, without meta.', async (): Promise<void> => {
      const result = logFormats.json({ timestamp, level, message, sourcePath });

      expect(JSON.parse(result)).toEqual({ timestamp, source: sourcePath, level, message });
    });

    test('one-line, with meta.', async (): Promise<void> => {
      const result = logFormats.json({ timestamp, level, message, sourcePath, meta });

      expect(JSON.parse(result)).toEqual({ timestamp, source: sourcePath, level, message, meta });
    });

    test('multiple-lines.', async (): Promise<void> => {
      const result = logFormats.json({ timestamp, level: 'error', message: 'line1\nline2\nline3', sourcePath, meta });

      expect(JSON.parse(result)).toEqual({ timestamp, source: sourcePath, level: 'error', message: ['line1', 'line2', 'line3'], meta });
    });
  });

  test('accessClassic returns string like nginx would (kinda (-ish)).', async (): Promise<void> => {
    const result = accessLogFormats.classic({ ip, timestamp, method, path, httpVersion, statusCode, contentLength, referer, userAgent, time });

    expect(result).toBe('127.0.0.1 - [42] "GET /image.png HTTP/2.0" 200 815 "http://i.am.from/here" "testUserAgent" - 23');
  });

  test('accessJson returns json.', async (): Promise<void> => {
    const result = accessLogFormats.json({ ip, timestamp, method, path, httpVersion, statusCode, contentLength, referer, userAgent, time });

    expect(JSON.parse(result)).toEqual({
      ip,
      timestamp,
      method,
      path,
      httpVersion,
      statusCode,
      contentLength,
      referer,
      userAgent,
      time
    });
  });
});
