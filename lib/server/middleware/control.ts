import express from 'express';
import { getToken, sendUnauthorized } from '@/server/util';
import { loadLogger } from '@/logging';
import { Request } from '@/types/server/Request';

let controlToken = '';

const setControlToken = function (token: string): void {
  controlToken = token;
};

const getControlToken = function (): string {
  return controlToken;
};

const warnOnExternalAccess = function (req: Request): void {
  const internalIpv4Regex = /^127\.0\.0\.\d+$/;
  const internalIpv6Regex = /^[0:]+:1$/;
  const ip = (req.headers['X-Forwarded-For'] as string | undefined) ?? req.socket?.remoteAddress ?? '127.0.0.1';
  if (!internalIpv4Regex.test(ip) && !internalIpv6Regex.test(ip)) {
    loadLogger().warn(`External control access. It's recommended to prevent this, using reverse proxy.`, { ip });
  }
};

const controlMiddleware = function (req: Request, res: express.Response, next: express.NextFunction): void {
  warnOnExternalAccess(req);
  const token = getToken(req);
  if (token === controlToken) {
    return next();
  }
  sendUnauthorized(res, 'Forbidden control access');
};

export { controlMiddleware, setControlToken, getControlToken };
