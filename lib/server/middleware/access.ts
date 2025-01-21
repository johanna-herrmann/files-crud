import express from 'express';
import { OutgoingMessage } from 'http';
import onFinished from 'on-finished';
import { getFullConfig } from '@/config/config';
import { loadLogger } from '@/logging';
import Request from '@/types/server/Request';

const anonymizeIp = function (ip: string): string {
  const ipv4Regex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)\d{1,3}$/u;
  if (ipv4Regex.test(ip)) {
    return ip.replace(ipv4Regex, '$1_');
  }
  return `${ip.substring(0, ip.lastIndexOf(':') + 1)}_`;
};

const getIp = function (req: Request, ipLogging: 'full' | 'anonymous' | 'none'): string {
  if (ipLogging === 'none') {
    return '_';
  }
  const xForwardedFor = req.headers['X-Forwarded-For'];
  const xForwardedForSingle = typeof xForwardedFor === 'object' ? xForwardedFor[0] : xForwardedFor;
  const ip = xForwardedForSingle ?? req.socket.remoteAddress ?? '?';
  if (ipLogging === 'full') {
    return ip;
  }
  return anonymizeIp(ip);
};

const getContentLength = function (res: express.Response): number | undefined {
  const contentLengthHeader = res.getHeader('content-length');
  switch (typeof contentLengthHeader) {
    case 'number':
      return contentLengthHeader;
    case 'string':
      return contentLengthHeader ? Number(contentLengthHeader) : undefined;
    case 'object':
      return contentLengthHeader[0] ? Number(contentLengthHeader[0]) : undefined;
    case 'undefined':
    default:
      return undefined;
  }
};

const logAccessMiddleware = function (req: Request, res: express.Response, next: express.NextFunction) {
  const start = Date.now();
  const config = getFullConfig();
  const ipLogging = config.logging?.ipLogging as 'full' | 'anonymous' | 'none';
  const ip = getIp(req, ipLogging);
  const method = req.method;
  const path = req.path;
  const httpVersion = `HTTP/${req.httpVersion}`;
  const referer = req.headers.referer ?? '_';
  const userAgent = req.headers['user-agent'] ?? '_';

  onFinished<OutgoingMessage>(res, (): void => {
    const end = Date.now();
    const time = end - start;
    const contentLength = getContentLength(res);
    const statusCode = res.statusCode;

    loadLogger().access({ ip, method, path, httpVersion, statusCode, contentLength, referer, userAgent, time });
  });

  next();
};

export { logAccessMiddleware };
