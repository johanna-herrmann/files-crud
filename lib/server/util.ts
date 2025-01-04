import Request from '@/types/server/Request';
import express from 'express';
import paths from 'path';

const resolvePath = function (req: Request): string {
  const params = req.params as Record<string, string>;
  const pathFirstPart = params.path ?? '-';
  const pathFurtherParts = params['0'].trim();
  if (pathFurtherParts.length === 0) {
    return pathFirstPart;
  }
  return paths.join(pathFirstPart, pathFurtherParts);
};

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

export { resolvePath, getToken, sendUnauthorized, sendError, sendOK };
