import Request from '@/types/Request';
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

const assertError = function (next: boolean, res: express.Response, message: string) {
  expect(next).toBe(false);
  expect(res.statusCode).toBe(401);
  expect(lastMessage).toBe(JSON.stringify({ error: `Unauthorized. ${message}.` }));
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
  assertError,
  resetLastMessage
};
