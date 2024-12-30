import { formats } from '@/logging/formats';

const BOTTOM_LINE = '\u2500'.repeat(process.stdout.columns || 80);

const timestamp = 42;
const level = 'testLevel';
const message = 'testMessage';
const sourcePath = '/path/to/file';
const error = new Error('test error message');

describe('logging formats', (): void => {
  test('humanReadableLine returns human readable line without errorMessage.', async (): Promise<void> => {
    const result = formats.humanReadableLine.transform({ timestamp, level, message, sourcePath }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(`${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message}`);
  });

  test('humanReadableLine returns human readable line with errorMessage.', async (): Promise<void> => {
    const result = formats.humanReadableLine.transform({ timestamp, level, message, sourcePath, error }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(
      `${timestamp} [${sourcePath}] ${level.toUpperCase()}: ${message} - ${error.message}`
    );
  });

  test('humanReadableBlock returns human readable block without error message.', async (): Promise<void> => {
    const result = formats.humanReadableBlock.transform({ timestamp, level, message, sourcePath }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(
      `${timestamp}\n[${sourcePath}]\n${level.toUpperCase()}:\n${message}\n${BOTTOM_LINE}\n`
    );
  });

  test('humanReadableBlock returns human readable block with error message.', async (): Promise<void> => {
    const result = formats.humanReadableBlock.transform({ timestamp, level, message, sourcePath, error }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(
      `${timestamp}\n[${sourcePath}]\n${level.toUpperCase()}:\n${message}\n${error.message}\n${BOTTOM_LINE}\n`
    );
  });

  test('coloredHumanReadableLine returns colored human readable line on debug.', async (): Promise<void> => {
    const result = formats.coloredHumanReadableLine.transform({ timestamp, level: 'debug', message, sourcePath }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(`\x1B[34m${timestamp} [${sourcePath}] DEBUG: ${message}\x1B[39m`);
  });

  test('coloredHumanReadableLine returns colored human readable line on info.', async (): Promise<void> => {
    const result = formats.coloredHumanReadableLine.transform({ timestamp, level: 'info', message, sourcePath }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(`\x1B[32m${timestamp} [${sourcePath}] INFO: ${message}\x1B[39m`);
  });

  test('coloredHumanReadableLine returns colored human readable line on warn.', async (): Promise<void> => {
    const result = formats.coloredHumanReadableLine.transform({ timestamp, level: 'warn', message, sourcePath }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(`\x1B[33m${timestamp} [${sourcePath}] WARN: ${message}\x1B[39m`);
  });

  test('coloredHumanReadableLine returns colored human readable line on error without error message.', async (): Promise<void> => {
    const result = formats.coloredHumanReadableLine.transform({ timestamp, level: 'error', message, sourcePath }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(`\x1B[31m${timestamp} [${sourcePath}] ERROR: ${message}\x1B[39m`);
  });

  test('coloredHumanReadableLine returns colored human readable line on error with error message.', async (): Promise<void> => {
    const result = formats.coloredHumanReadableLine.transform({ timestamp, level: 'error', message, sourcePath, error }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(`\x1B[31m${timestamp} [${sourcePath}] ERROR: ${message} - ${error.message}\x1B[39m`);
  });

  test('coloredHumanReadableBlock returns colored human readable block on debug.', async (): Promise<void> => {
    const result = formats.coloredHumanReadableBlock.transform({ timestamp, level: 'debug', message, sourcePath }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(
      `\x1B[34m${timestamp}\n[${sourcePath}]\nDEBUG:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`
    );
  });

  test('coloredHumanReadableBlock returns colored human readable block on info.', async (): Promise<void> => {
    const result = formats.coloredHumanReadableBlock.transform({ timestamp, level: 'info', message, sourcePath }) as Record<symbol, string>;

    console.log({ result });
    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(
      `\x1B[32m${timestamp}\n[${sourcePath}]\nINFO:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`
    );
  });

  test('coloredHumanReadableBlock returns colored human readable block on warn.', async (): Promise<void> => {
    const result = formats.coloredHumanReadableBlock.transform({ timestamp, level: 'warn', message, sourcePath }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(
      `\x1B[33m${timestamp}\n[${sourcePath}]\nWARN:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`
    );
  });

  test('coloredHumanReadableBlock returns colored human readable block on error without error message.', async (): Promise<void> => {
    const result = formats.coloredHumanReadableBlock.transform({ timestamp, level: 'error', message, sourcePath }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(
      `\x1B[31m${timestamp}\n[${sourcePath}]\nERROR:\n${message}\x1B[39m\n${BOTTOM_LINE}\n`
    );
  });

  test('coloredHumanReadableBlock returns colored human readable block on error with error message.', async (): Promise<void> => {
    const result = formats.coloredHumanReadableBlock.transform({ timestamp, level: 'error', message, sourcePath, error }) as Record<symbol, string>;

    expect(result[Object.getOwnPropertySymbols(result)[0]]).toBe(
      `\x1B[31m${timestamp}\n[${sourcePath}]\nERROR:\n${message}\n${error.message}\x1B[39m\n${BOTTOM_LINE}\n`
    );
  });

  test('json returns json without error message.', async (): Promise<void> => {
    const result = formats.json.transform({ timestamp, level: 'info', message, sourcePath }) as Record<symbol, string>;

    expect(JSON.parse(result[Object.getOwnPropertySymbols(result)[0]])).toEqual({ timestamp, source: sourcePath, level: 'info', message });
  });

  test('json returns json with error message.', async (): Promise<void> => {
    const result = formats.json.transform({ timestamp, level: 'error', message, sourcePath, error }) as Record<symbol, string>;

    expect(JSON.parse(result[Object.getOwnPropertySymbols(result)[0]])).toEqual({
      timestamp,
      source: sourcePath,
      level: 'error',
      message,
      errorMessage: error.message
    });
  });
});
