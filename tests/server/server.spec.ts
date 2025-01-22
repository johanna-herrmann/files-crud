import http from 'http';
import http2 from 'http2';
import https from 'https';
import net from 'net';
import fs from 'fs';
import paths from 'path';
import express from 'express';
import { loadConfig } from '@/config/config';
import { startServer } from '@/server/server';
import { Logger } from '@/logging/Logger';
import { getControlToken, setControlToken } from '@/server/middleware/control';

interface CreateHttpsSslOptions {
  key: string;
  cert: string;
}

interface CreateHttp2SslOptions {
  key: string;
  cert: string;
  allowHTTP1: boolean;
}

let mocked_lastLoggedMessage = '';
let mocked_lastLoggedMeta: Record<string, unknown> | undefined;

jest.mock('@/logging/index', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    resetLogger() {},
    loadLogger(): Logger {
      return {
        info(message: string, meta?: Record<string, unknown>): Logger {
          mocked_lastLoggedMessage = message;
          mocked_lastLoggedMeta = meta;
          return this;
        }
      } as Logger;
    }
  };
});

jest.mock('@/server/app', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    buildApp(): express.Application {
      return { k: 'v' } as unknown as express.Application;
    }
  };
});

jest.mock('uuid', () => {
  const actual = jest.requireActual('uuid');
  return {
    ...actual,
    v4() {
      return 'mocked-uuid';
    }
  };
});

const key = 'privateKey.pem';
const cert = 'certificate.pem';

describe('startServer', (): void => {
  let fsReadSpy: jest.Spied<typeof fs.readFileSync>;
  let fsWriteSpy: jest.Spied<typeof fs.writeFileSync>;
  let httpSpy: jest.Spied<typeof http.createServer>;
  let httpsSpy: jest.Spied<typeof https.createServer>;
  let http2Spy: jest.Spied<typeof http2.createSecureServer>;
  let lastControlFilePath = '';
  let lastControlFileContent = '';

  beforeEach(async (): Promise<void> => {
    setControlToken('');
    jest.useFakeTimers();
    jest.setSystemTime(42);
    // @ts-expect-error // this is fine
    fsReadSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((path: string): string | Buffer => {
      if (/key.*\.pem/iu.test(path)) {
        return key;
      }
      if (/cert.*\.pem/iu.test(path)) {
        return cert;
      }
      return '-';
    });
    // @ts-expect-error // this is fine
    fsWriteSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation((path: string, content: string): void => {
      lastControlFilePath = path;
      lastControlFileContent = content;
    });
  });

  afterEach(async (): Promise<void> => {
    fsReadSpy.mockRestore();
    fsWriteSpy.mockRestore();
    httpSpy?.mockRestore();
    httpsSpy?.mockRestore();
    http2Spy?.mockRestore();
    mocked_lastLoggedMessage = '';
    mocked_lastLoggedMeta = undefined;
    lastControlFileContent = '';
    lastControlFilePath = '';
    jest.useRealTimers();
  });

  const assertControlPrepared = function (port: number, protocol: 'https' | 'http'): void {
    const token = 'mocked-uuid';
    expect(paths.resolve(lastControlFilePath)).toBe(paths.resolve('./.control.json'));
    expect(JSON.parse(lastControlFileContent)).toEqual({ port, protocol, token });
    expect(getControlToken()).toBe(token);
  };

  describe('starts http server', (): void => {
    let appProvided: express.Application | null = null;
    let listenOptionsProvided: net.ListenOptions | null = null;

    beforeEach(async (): Promise<void> => {
      httpSpy = jest
        .spyOn(http, 'createServer')
        // @ts-expect-error we know app is valid createServer argument
        .mockImplementation((app: express.Application): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> => {
          appProvided = app;
          return {
            listen(options: net.ListenOptions, callback: () => void) {
              listenOptionsProvided = options;
              callback();
            }
          } as http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
        });
    });

    test('with default config', async (): Promise<void> => {
      const host = '127.0.0.1';
      const port = 9000;

      startServer(0);

      expect(appProvided as unknown as express.Application).toEqual({ k: 'v' });
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.host).toBe(host);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.port).toBe(port);
      expect(mocked_lastLoggedMessage).toBe('Application started as http server in 42 ms.');
      expect(mocked_lastLoggedMeta).toEqual({ host, port, webRoot: undefined });
      assertControlPrepared(port, 'http');
    });

    test('with specific config', async (): Promise<void> => {
      const host = '0.0.0.0';
      const port = 9000;
      const webRoot = '/var/www';
      loadConfig({ server: { host, port }, webRoot });

      startServer(0);

      expect(appProvided as unknown as express.Application).toEqual({ k: 'v' });
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.host).toBe(host);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.port).toBe(port);
      expect(mocked_lastLoggedMessage).toBe('Application started as http server in 42 ms.');
      expect(mocked_lastLoggedMeta).toEqual({ host, port, webRoot });
      assertControlPrepared(port, 'http');
    });
  });

  describe('starts https server', (): void => {
    let appProvided: express.Application | null = null;
    let createOptionsProvided: CreateHttpsSslOptions | null = null;
    let listenOptionsProvided: net.ListenOptions | null = null;

    beforeEach(async (): Promise<void> => {
      httpsSpy = jest.spyOn(https, 'createServer').mockImplementation(
        // @ts-expect-error we know options and app are valid createSecureServer arguments
        (options: CreateHttpsSslOptions, app: express.Application): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> => {
          appProvided = app;
          createOptionsProvided = options;
          return {
            listen(options: net.ListenOptions, callback: () => void) {
              listenOptionsProvided = options;
              callback();
            }
          } as http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
        }
      );
    });

    test('with default config', async (): Promise<void> => {
      const host = '127.0.0.1';
      const port = 9000;
      loadConfig({ server: { useHttps: true } });

      startServer(0);

      expect(appProvided as unknown as express.Application).toEqual({ k: 'v' });
      expect((createOptionsProvided as unknown as CreateHttpsSslOptions)?.key).toBe(key);
      expect((createOptionsProvided as unknown as CreateHttpsSslOptions)?.cert).toBe(cert);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.host).toBe(host);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.port).toBe(port);
      expect(mocked_lastLoggedMessage).toBe('Application started as https server in 42 ms.');
      expect(mocked_lastLoggedMeta).toEqual({ host, port, webRoot: undefined });
      assertControlPrepared(port, 'https');
    });

    test('with specific config', async (): Promise<void> => {
      const host = '0.0.0.0';
      const port = 9000;
      const webRoot = '/var/www';
      loadConfig({
        webRoot,
        server: {
          useHttps: true,
          host,
          port,
          sslKeyPath: '/etc/ssl-conf/files-crud/key.pem',
          sslCertPath: '/etc/ssl-conf/files-crud/cert.pem'
        }
      });

      startServer(0);

      expect(appProvided as unknown as express.Application).toEqual({ k: 'v' });
      expect((createOptionsProvided as unknown as CreateHttpsSslOptions)?.key).toBe(key);
      expect((createOptionsProvided as unknown as CreateHttpsSslOptions)?.cert).toBe(cert);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.host).toBe(host);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.port).toBe(port);
      expect(mocked_lastLoggedMessage).toBe('Application started as https server in 42 ms.');
      expect(mocked_lastLoggedMeta).toEqual({ host, port, webRoot });
      assertControlPrepared(port, 'https');
    });
  });

  describe('starts http2 server', (): void => {
    let appProvided: express.Application | null = null;
    let createOptionsProvided: CreateHttp2SslOptions | null = null;
    let listenOptionsProvided: net.ListenOptions | null = null;

    beforeEach(async (): Promise<void> => {
      http2Spy = jest.spyOn(http2, 'createSecureServer').mockImplementation(
        // @ts-expect-error we know options and app are valid createSecureServer arguments
        (options: CreateHttp2SslOptions, app: express.Application): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> => {
          appProvided = app;
          createOptionsProvided = options;
          return {
            listen(options: net.ListenOptions, callback: () => void) {
              listenOptionsProvided = options;
              callback();
            }
          } as http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
        }
      );
    });

    test('with default config', async (): Promise<void> => {
      const host = '127.0.0.1';
      const port = 9000;
      loadConfig({ server: { useHttps: true, useHttp2: true } });

      startServer(0);

      expect(appProvided as unknown as express.Application).toEqual({ k: 'v' });
      expect((createOptionsProvided as unknown as CreateHttp2SslOptions)?.key).toBe(key);
      expect((createOptionsProvided as unknown as CreateHttp2SslOptions)?.cert).toBe(cert);
      expect((createOptionsProvided as unknown as CreateHttp2SslOptions)?.allowHTTP1).toBe(true);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.host).toBe(host);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.port).toBe(port);
      expect(mocked_lastLoggedMessage).toBe('Application started as https (http2) server in 42 ms.');
      expect(mocked_lastLoggedMeta).toEqual({ host, port, webRoot: undefined });
      assertControlPrepared(port, 'https');
    });

    test('with specific config', async (): Promise<void> => {
      const host = '0.0.0.0';
      const port = 9000;
      const webRoot = '/var/www';
      loadConfig({
        webRoot,
        server: {
          useHttps: true,
          useHttp2: true,
          host,
          port,
          sslKeyPath: '/etc/ssl-conf/files-crud/key.pem',
          sslCertPath: '/etc/ssl-conf/files-crud/cert.pem'
        }
      });

      startServer(0);

      expect(appProvided as unknown as express.Application).toEqual({ k: 'v' });
      expect((createOptionsProvided as unknown as CreateHttp2SslOptions)?.key).toBe(key);
      expect((createOptionsProvided as unknown as CreateHttp2SslOptions)?.cert).toBe(cert);
      expect((createOptionsProvided as unknown as CreateHttp2SslOptions)?.allowHTTP1).toBe(true);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.host).toBe(host);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.port).toBe(port);
      expect(mocked_lastLoggedMessage).toBe('Application started as https (http2) server in 42 ms.');
      expect(mocked_lastLoggedMeta).toEqual({ host, port, webRoot });
      assertControlPrepared(port, 'https');
    });
  });
});
