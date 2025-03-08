import paths from 'path';
import express from 'express';
import { loadLogger } from '@/logging';
import { Request } from '@/types/server/Request';

const sanitizePath = function (path: string): string {
  return paths.join(paths.sep, paths.normalize(path)).substring(1).replace('\0', '');
};

const resolvePath = function (req: Request): string {
  const params = req.params as Record<string, string | string[]>;
  if (!params.path) {
    return '';
  }
  const pathValue = params.path;
  if (typeof pathValue === 'string') {
    return sanitizePath(pathValue);
  }
  return sanitizePath(pathValue.join('/'));
};

const getToken = function (req: Request): string {
  return req.headers.authorization?.replace(/^bearer /iu, '') ?? '';
};

const sendUnauthorized = function (res: express.Response, message: string): void {
  const logger = loadLogger();
  const statusCode = 401;
  res.statusCode = statusCode;
  const fullMessage = `Unauthorized. ${message.replace(/\.$/, '')}.`;
  logger.error(fullMessage, { statusCode });
  res.json({ error: fullMessage });
};

const sendNotFound = function (res: express.Response, method: string, path: string): void {
  const logger = loadLogger();
  const statusCode = 404;
  res.statusCode = statusCode;
  const message = `Cannot ${method.toUpperCase()} ${path}`;
  logger.error(message, { statusCode });
  res.json({ error: message });
};

const sendError = function (res: express.Response, message: string, error?: Error): void {
  const logger = loadLogger();
  const statusCode = error ? 500 : 400;
  res.statusCode = statusCode;
  const messageWithoutDetails = `Error. ${message.replace(/\.$/, '')}.`;
  if (!!error) {
    const errorDetails = JSON.stringify(error.stack ?? error.message ?? '-no details-')
      .replace(/"/g, '')
      .replace(/\\n/g, '\n');
    const messageWithDetails = `${message.replace(/\.$/, '')}: ${errorDetails}`;
    logger.error(messageWithDetails, { statusCode });
  } else {
    logger.error(messageWithoutDetails, { statusCode });
  }
  res.json({ error: messageWithoutDetails });
};

const sendValidationError = function (res: express.Response, schema: Record<string, string>, value: Record<string, unknown>): void {
  const logger = loadLogger();
  res.statusCode = 400;
  logger.error('validation error', { schema, value, status: 400 });
  res.json({ error: 'Validation Error.', schema, value });
};

const sendOK = function (res: express.Response, body?: Record<string, unknown>): void {
  res.statusCode = 200;
  res.json(body ?? {});
};

export { sanitizePath, resolvePath, getToken, sendUnauthorized, sendNotFound, sendError, sendValidationError, sendOK };
