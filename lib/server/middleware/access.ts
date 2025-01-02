import Request from '@/types/Request';
import express from 'express';
import onFinished from 'on-finished';
import { OutgoingMessage } from 'http';
import { getConfig } from '@/config';
import { loadLogger } from '@/logging';

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
  const ip = req.socket.remoteAddress ?? '?';
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
  const config = getConfig();
  const ipLogging = config.logging?.ipLogging ?? 'anonymous';
  const ip = getIp(req, ipLogging);
  const method = req.method;
  const path = req.path;
  const httpVersion = req.httpVersion;
  const referer = req.headers.referer ?? '_';
  const userAgent = req.headers['user-agent'] ?? '_';

  onFinished<OutgoingMessage>(res, (): void => {
    const contentLength = getContentLength(res);
    const statusCode = res.statusCode;

    loadLogger().access({ ip, method, path, httpVersion, statusCode, contentLength, referer, userAgent });
  });

  next();
};

export { logAccessMiddleware };
