import http from 'http';
import https from 'https';
import http2 from 'http2';
import fs from 'fs';
import { buildApp } from '@/server/app';
import { loadLogger } from '@/logging';
import { getFullConfig } from '@/config/config';
import Request from '@/types/server/Request';
import express from 'express';

const getFormattedTime = function (time: number): string {
  const units = ['ms', 's', 'm', 'h'];
  const boundaries = [1000, 60, 60];
  let unit = 0;
  let boundary = 0;
  let value = time;
  while (value >= boundaries[boundary] && unit < units.length - 1) {
    value /= boundaries[boundary];
    unit++;
    boundary++;
  }
  value = Math.round(value);
  return `${value} ${units[unit]}`;
};

const logStartedServer = function (
  serverType: 'http' | 'https' | 'https (http2)',
  host: string,
  port: number,
  webRoot: string | undefined,
  start: number,
  end: number
): void {
  const logger = loadLogger();
  const time = end - start;
  const formattedTime = getFormattedTime(time);
  logger.info(`Application started as ${serverType} server in ${formattedTime}.`, { host, port, webRoot });
};

const startRedirectingServer = function (host: string, port: number): void {
  const app = express();
  app.use((req: Request, res: express.Response): void => {
    res.redirect(`https://${host}:${port}${req.path}`);
  });
};

const startHttpServer = function (host: string, port: number, webRoot: string | undefined, start: number): void {
  const app = buildApp();
  const server = http.createServer(app);
  server.listen({ host: host, port }, () => {
    logStartedServer('http', host, port, webRoot, start, Date.now());
  });
};

const startHttpsServer = function (host: string, port: number, webRoot: string | undefined, start: number): void {
  startRedirectingServer(host, port);
  const config = getFullConfig();
  const sslKeyPath = config.server?.sslKeyPath as string;
  const sslCertPath = config.server?.sslCertPath as string;
  const key = fs.readFileSync(sslKeyPath, 'utf8');
  const cert = fs.readFileSync(sslCertPath, 'utf8');
  const app = buildApp();
  const server = config.server?.useHttp2 ? http2.createSecureServer({ key, cert, allowHTTP1: true }, app) : https.createServer({ key, cert }, app);
  server.listen({ host, port }, () => {
    logStartedServer(config.server?.useHttp2 ? 'https (http2)' : 'https', host, port, webRoot, start, Date.now());
  });
};

const startServer = function (start: number): void {
  const config = getFullConfig();
  const useHttps = config.server?.useHttps as boolean;
  const host = config.server?.host as string;
  const port = config.server?.port as number;
  const webRoot = config.webRoot;
  if (useHttps) {
    return startHttpsServer(host, port, webRoot, start);
  }
  startHttpServer(host, port, webRoot, start);
};

export { startServer };
