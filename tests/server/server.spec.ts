import http from 'http';
import https from 'http2';
import net from 'net';
import express from 'express';
import mockFS from 'mock-fs';
import { loadConfig } from '@/config';
import { startServer } from '@/server/server';
import { Logger } from '@/logging/Logger';

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
  return {
    buildApp(): express.Application {
      return { k: 'v' } as unknown as express.Application;
    }
  };
});

describe('startServer', (): void => {
  let httpSpy: jest.Spied<typeof http.createServer>;
  let httpsSpy: jest.Spied<typeof https.createSecureServer>;

  beforeEach(async (): Promise<void> => {
    jest.useFakeTimers();
    jest.setSystemTime(42);
  });

  afterEach(async (): Promise<void> => {
    httpSpy?.mockRestore();
    httpsSpy?.mockRestore();
    mocked_lastLoggedMessage = '';
    mocked_lastLoggedMeta = undefined;
    jest.useRealTimers();
  });

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
      const port = 3000;

      startServer(0);

      expect(appProvided as unknown as express.Application).toEqual({ k: 'v' });
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.host).toBe(host);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.port).toBe(port);
      expect(mocked_lastLoggedMessage).toBe('Application started as http server in 42 ms.');
      expect(mocked_lastLoggedMeta).toEqual({ host, port, webRoot: undefined });
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
    });
  });

  describe('starts https server', (): void => {
    interface CreateOptions {
      key: string;
      cert: string;
      allowHTTP1: boolean;
    }

    const key = 'privateKey.pem';
    const cert = 'certificate.pem';

    let appProvided: express.Application | null = null;
    let createOptionsProvided: CreateOptions | null = null;
    let listenOptionsProvided: net.ListenOptions | null = null;

    beforeEach(async (): Promise<void> => {
      mockFS({
        '/opt/files-crud': { 'privateKey.pem': key, 'certificate.pem': cert },
        '/etc/ssl-conf/files-crud': { 'key.pem': key, 'cert.pem': cert }
      });
      httpsSpy = jest.spyOn(https, 'createSecureServer').mockImplementation(
        // @ts-expect-error we know options and app are valid createSecureServer arguments
        (options: CreateOptions, app: express.Application): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> => {
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

    afterEach(async (): Promise<void> => {
      mockFS.restore();
    });

    test('with default config', async (): Promise<void> => {
      const host = '127.0.0.1';
      const port = 3000;
      loadConfig({ server: { useHttps: true } });

      startServer(0);

      expect(appProvided as unknown as express.Application).toEqual({ k: 'v' });
      expect((createOptionsProvided as unknown as CreateOptions)?.key).toBe(key);
      expect((createOptionsProvided as unknown as CreateOptions)?.cert).toBe(cert);
      expect((createOptionsProvided as unknown as CreateOptions)?.allowHTTP1).toBe(true);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.host).toBe(host);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.port).toBe(port);
      expect(mocked_lastLoggedMessage).toBe('Application started as https server in 42 ms.');
      expect(mocked_lastLoggedMeta).toEqual({ host, port, webRoot: undefined });
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
      expect((createOptionsProvided as unknown as CreateOptions)?.key).toBe(key);
      expect((createOptionsProvided as unknown as CreateOptions)?.cert).toBe(cert);
      expect((createOptionsProvided as unknown as CreateOptions)?.allowHTTP1).toBe(true);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.host).toBe(host);
      expect((listenOptionsProvided as unknown as net.ListenOptions)?.port).toBe(port);
      expect(mocked_lastLoggedMessage).toBe('Application started as https server in 42 ms.');
      expect(mocked_lastLoggedMeta).toEqual({ host, port, webRoot });
    });
  });
});
