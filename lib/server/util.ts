import Request from '@/types/server/Request';
import express from 'express';
import { loadLogger } from '@/logging';

const logger = loadLogger();

const resolvePath = function (req: Request): string {
  const params = req.params as Record<string, string[]>;
  return params.path.join('/');
};

const getToken = function (req: Request): string {
  return req.headers.authorization?.replace(/^bearer /iu, '') ?? '';
};

const sendUnauthorized = function (res: express.Response, message: string): void {
  const statusCode = 401;
  res.statusCode = statusCode;
  const fullMessage = `Unauthorized. ${message.replace(/\.$/, '')}.`;
  logger.error(fullMessage, undefined, { statusCode });
  res.json({ error: fullMessage });
};

const sendNotFound = function (res: express.Response, path: string): void {
  const statusCode = 404;
  res.statusCode = statusCode;
  const message = `Not Found: ${path}`;
  logger.error(message, undefined, { statusCode });
  res.json({ error: message });
};

const sendError = function (res: express.Response, message: string, error?: Error): void {
  const statusCode = error ? 500 : 400;
  res.statusCode = statusCode;
  const fullMessage = `Error. ${message.replace(/\.$/, '')}.`;
  logger.error(fullMessage, error, { statusCode });
  if (!!error) {
    logger.debug('Details about previous error.', { stack: error.stack });
  }
  res.json({ error: fullMessage });
};

const sendOK = function (res: express.Response, body?: Record<string, unknown>): void {
  res.statusCode = 200;
  res.json(body ?? {});
};

export { resolvePath, getToken, sendUnauthorized, sendNotFound, sendError, sendOK };
