import mockFS from 'mock-fs';
import { loadConfig } from '@/config/config';
import { assertOK, buildResponse, buildSimpleRequest } from '#/server/expressTestUtils';
import { staticMiddleware } from '@/server/middleware/static';
import Request from '@/types/server/Request';
import express from 'express';

jest.mock('express', () => {
  const actual = jest.requireActual('express');
  return {
    ...actual,
    static(root: string) {
      return function (req: Request, res: express.Response) {
        res.statusCode = 200;
        res.json({ root, handler: 'http1', path: req.path });
      };
    }
  };
});

jest.mock('http2-express-autopush', () => {
  return function (root: string) {
    return [
      function (req: Request, res: express.Response) {
        res.statusCode = 200;
        res.json({ root, handler: 'http2', path: req.path });
      }
    ];
  };
});

describe('staticMiddleware', (): void => {
  beforeEach(async (): Promise<void> => {
    mockFS({ './test': 'test content' });
  });

  beforeEach(async (): Promise<void> => {
    mockFS.restore();
  });

  test('calls next if webRoot is undefined.', async (): Promise<void> => {
    let next = false;
    const req = buildSimpleRequest();
    const res = buildResponse();

    staticMiddleware(req, res, () => (next = true));

    expect(next).toBe(true);
    expect(res.statusCode).toBe(-1);
  });

  test('calls next, after config has changed to no webRoot.', async (): Promise<void> => {
    loadConfig({ webRoot: './', server: { useHttps: true, useHttp2: false } });
    let req = buildSimpleRequest();
    let res = buildResponse();
    let next = false;
    staticMiddleware(req, res, () => (next = true));
    loadConfig({});
    req = buildSimpleRequest();
    res = buildResponse();
    next = false;
    staticMiddleware(req, res, () => (next = true));

    expect(next).toBe(true);
    expect(res.statusCode).toBe(-1);
  });

  test('calls http1 handler, if useHttp2 is false.', async (): Promise<void> => {
    loadConfig({ webRoot: './', server: { useHttps: true, useHttp2: false } });
    let next = false;
    const req = buildSimpleRequest();
    const res = buildResponse();

    staticMiddleware(req, res, () => (next = true));

    expect(next).toBe(false);
    assertOK(res, { root: './', handler: 'http1', path: '/test' });
  });

  test('calls http1 handler, if useHttp2 is true, but req is not http2 request.', async (): Promise<void> => {
    loadConfig({ webRoot: './', server: { useHttps: true, useHttp2: true } });
    let next = false;
    const req = buildSimpleRequest();
    const res = buildResponse(true);

    staticMiddleware(req, res, () => (next = true));

    expect(next).toBe(false);
    assertOK(res, { root: './', handler: 'http1', path: '/test' });
  });

  test('calls http1 handler, if useHttp2 is true, but res is not http2 response.', async (): Promise<void> => {
    loadConfig({ webRoot: './', server: { useHttps: true, useHttp2: true } });
    let next = false;
    const req = buildSimpleRequest(true);
    const res = buildResponse();

    staticMiddleware(req, res, () => (next = true));

    expect(next).toBe(false);
    assertOK(res, { root: './', handler: 'http1', path: '/test' });
  });

  test('calls http1 handler, after config has changed from no webRoot.', async (): Promise<void> => {
    loadConfig({});
    let req = buildSimpleRequest();
    let res = buildResponse();
    let next = false;
    staticMiddleware(req, res, () => (next = true));
    loadConfig({ webRoot: './', server: { useHttps: true, useHttp2: false } });
    req = buildSimpleRequest();
    res = buildResponse();
    next = false;
    staticMiddleware(req, res, () => (next = true));

    expect(next).toBe(false);
    assertOK(res, { root: './', handler: 'http1', path: '/test' });
  });

  test('calls http1 handler with new path, after config has changed from old webRoot.', async (): Promise<void> => {
    loadConfig({ webRoot: './old', server: { useHttps: true, useHttp2: false } });
    let req = buildSimpleRequest();
    let res = buildResponse();
    let next = false;
    staticMiddleware(req, res, () => (next = true));
    loadConfig({ webRoot: './new', server: { useHttps: true, useHttp2: false } });
    req = buildSimpleRequest();
    res = buildResponse();
    next = false;
    staticMiddleware(req, res, () => (next = true));

    expect(next).toBe(false);
    assertOK(res, { root: './new', handler: 'http1', path: '/test' });
  });

  test('calls http2 handler, if useHttp2 is true, and req and res are http2 request and response.', async (): Promise<void> => {
    loadConfig({ webRoot: './', server: { useHttps: true, useHttp2: true } });
    let next = false;
    const req = buildSimpleRequest(true);
    const res = buildResponse(true);

    staticMiddleware(req, res, () => (next = true));

    expect(next).toBe(false);
    assertOK(res, { root: './', handler: 'http2', path: '/test' });
  });

  test('calls http2 handler, after config has changed from no webRoot.', async (): Promise<void> => {
    loadConfig({});
    let req = buildSimpleRequest(true);
    let res = buildResponse(true);
    let next = false;
    staticMiddleware(req, res, () => (next = true));
    loadConfig({ webRoot: './', server: { useHttps: true, useHttp2: true } });
    req = buildSimpleRequest(true);
    res = buildResponse(true);
    next = false;
    staticMiddleware(req, res, () => (next = true));

    expect(next).toBe(false);
    assertOK(res, { root: './', handler: 'http2', path: '/test' });
  });

  test('calls http2 handler with new path, after config has changed from old webRoot.', async (): Promise<void> => {
    loadConfig({ webRoot: './old', server: { useHttps: true, useHttp2: true } });
    let req = buildSimpleRequest(true);
    let res = buildResponse(true);
    let next = false;
    staticMiddleware(req, res, () => (next = true));
    loadConfig({ webRoot: './new', server: { useHttps: true, useHttp2: true } });
    req = buildSimpleRequest(true);
    res = buildResponse(true);
    next = false;
    staticMiddleware(req, res, () => (next = true));

    expect(next).toBe(false);
    assertOK(res, { root: './new', handler: 'http2', path: '/test' });
  });
});
