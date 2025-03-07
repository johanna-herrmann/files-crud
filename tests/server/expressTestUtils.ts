import express from 'express';
import { Request } from '@/types/server/Request';

let lastMessage = '{}';

const buildRequestForUserAction = function (token: string, action: string, idParam: string | undefined, body: Record<string, unknown>): Request {
  return {
    headers: { authorization: token ? `Bearer ${token}` : '' },
    params: { action, id: idParam },
    body
  } as unknown as Request;
};

const buildRequestForControlAction = function (ip: string, xForwardedFor?: string, token?: string): Request {
  return { headers: { authorization: token, ['X-Forwarded-For']: xForwardedFor }, socket: { remoteAddress: ip } } as unknown as Request;
};

const buildRequestForFileAction = function (token: string, action: string, pathParam: string | undefined, body: Record<string, unknown>): Request {
  return {
    headers: { authorization: token ? `Bearer ${token}` : '' },
    params: { action, path: pathParam ? pathParam?.split('/') : undefined },
    body
  } as unknown as Request;
};

const buildRequestForAccessLogging = function (
  ip: string,
  referer?: string,
  userAgent?: string,
  xForwardedFor?: string | string[],
  path?: string
): Request {
  return {
    socket: {
      remoteAddress: ip
    },
    method: 'GET',
    path: path ?? '/image.png',
    httpVersion: '2.0',
    headers: {
      'X-Forwarded-For': xForwardedFor,
      referer,
      'user-agent': userAgent
    }
  } as unknown as Request;
};

const buildSimpleRequest = function (withStream?: boolean): Request {
  return {
    method: 'GET',
    path: '/test',
    headers: { origin: '127.0.0.1' },
    stream: withStream ? '-' : undefined
  } as unknown as Request;
};

const buildResponse = function (withStream?: boolean): express.Response {
  const res = {
    statusCode: -1,
    stream: withStream ? '-' : undefined,
    json(obj: unknown) {
      lastMessage = JSON.stringify(obj);
      return this;
    }
  } as unknown as express.Response;
  (res as express.Response & { headers: Record<string, unknown> }).headers = {};
  res.setHeader = (name: string, value: unknown) => {
    (res as express.Response & { headers: Record<string, unknown> }).headers[name.toLowerCase()] = value;
    return res;
  };
  res.getHeader = (name: string) => {
    return (res as express.Response & { headers: Record<string, unknown> }).headers[name] as string | number | string[] | undefined;
  };
  return res;
};

const assertPass = function (next: boolean, res: express.Response) {
  expect(next).toBe(true);
  expect(res.statusCode).toBe(-1);
  expect(lastMessage).toBe('{}');
};

const assertUnauthorized = function (next: boolean | undefined, res: express.Response, message: string) {
  if (typeof next === 'boolean') {
    expect(next).toBe(false);
  }
  expect(res.statusCode).toBe(401);
  expect(lastMessage).toBe(JSON.stringify({ error: `Unauthorized. ${message}.` }));
};

const assert404 = function (res: express.Response) {
  expect(res.statusCode).toBe(404);
  expect(lastMessage).toBe(JSON.stringify({ error: 'Cannot GET /test' }));
};

const assertError = function (res: express.Response, message: string, errorGiven?: boolean) {
  expect(res.statusCode).toBe(errorGiven ? 500 : 400);
  expect(lastMessage).toBe(JSON.stringify({ error: `Error. ${message}.` }));
};

const assertOK = function (res: express.Response, body?: Record<string, unknown>) {
  expect(res.statusCode).toBe(200);
  expect(lastMessage).toBe(JSON.stringify(body ?? {}));
};

const resetLastMessage = function () {
  lastMessage = '{}';
};

export {
  buildRequestForUserAction,
  buildRequestForControlAction,
  buildRequestForFileAction,
  buildRequestForAccessLogging,
  buildSimpleRequest,
  buildResponse,
  assertPass,
  assertUnauthorized,
  assert404,
  assertError,
  assertOK,
  resetLastMessage
};
