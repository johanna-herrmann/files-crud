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
    params: { action, path: pathParam },
    body
  } as unknown as Request;
};

const buildRequestForAccessLogging = function (ip: string, referer?: string, userAgent?: string): Request {
  return {
    socket: {
      remoteAddress: ip
    },
    method: 'GET',
    path: '/image.png',
    httpVersion: 'HTTP/2.0',
    headers: {
      referer,
      'user-agent': userAgent
    }
  } as unknown as Request;
};

const buildResponse = function (): express.Response {
  return {
    statusCode: -1,
    json(obj: unknown) {
      lastMessage = JSON.stringify(obj);
      return this;
    }
  } as unknown as express.Response;
};

const assertPass = function (next: boolean, res: express.Response) {
  expect(next).toBe(true);
  expect(res.statusCode).toBe(-1);
  expect(lastMessage).toBe('{}');
};

const assertUnauthorized = function (next: boolean, res: express.Response, message: string) {
  expect(next).toBe(false);
  expect(res.statusCode).toBe(401);
  expect(lastMessage).toBe(JSON.stringify({ error: `Unauthorized. ${message}.` }));
};

const assertError = function (res: express.Response, message: string) {
  expect(res.statusCode).toBe(400);
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
  buildResponse,
  assertPass,
  assertUnauthorized,
  assertError,
  assertOK,
  resetLastMessage
};
