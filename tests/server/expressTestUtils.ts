import Request from '@/types/server/Request';
import express from 'express';

let lastMessage = '{}';

const buildRequestForUserAction = function (
  token: string,
  action: string,
  usernameParam: string | undefined,
  body: Record<string, unknown>
): Request {
  return {
    headers: { authorization: token ? `Bearer ${token}` : '' },
    params: { action, username: usernameParam },
    body
  } as unknown as Request;
};

const buildRequestForFileAction = function (token: string, action: string, pathParam: string | undefined, body: Record<string, unknown>): Request {
  return {
    headers: { authorization: token ? `Bearer ${token}` : '' },
    params: { action, path: pathParam?.split('/') },
    body
  } as unknown as Request;
};

const buildRequestForAccessLogging = function (ip: string, referer?: string, userAgent?: string, xForwardedFor?: string | string[]): Request {
  return {
    socket: {
      remoteAddress: ip
    },
    method: 'GET',
    path: '/image.png',
    httpVersion: 'HTTP/2.0',
    headers: {
      'X-Forwarded-For': xForwardedFor,
      referer,
      'user-agent': userAgent
    }
  } as unknown as Request;
};

const buildSimpleRequest = function (): Request {
  return {
    method: 'GET',
    path: '/test'
  } as unknown as Request;
};

const buildResponse = function (): express.Response {
  const res = {
    statusCode: -1,
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
  expect(lastMessage).toBe(JSON.stringify({ error: 'Not Found: /test' }));
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
