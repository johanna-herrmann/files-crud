import Request from '@/types/server/Request';
import express from 'express';

const getToken = function (req: Request): string {
  return req.headers.authorization?.replace(/^bearer /iu, '') ?? '';
};

const sendUnauthorized = function (res: express.Response, message: string): void {
  res.statusCode = 401;
  res.json({ error: `Unauthorized. ${message.replace(/\.$/, '')}.` });
};

const sendError = function (res: express.Response, message: string): void {
  res.statusCode = 400;
  res.json({ error: `Error. ${message.replace(/\.$/, '')}.` });
};

const sendOK = function (res: express.Response, body?: Record<string, unknown>): void {
  res.statusCode = 200;
  res.json(body ?? {});
};

export { getToken, sendUnauthorized, sendError, sendOK };
