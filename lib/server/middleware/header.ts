import express from 'express';
import { getConfig } from '@/config/config';
import { Request } from '@/types/server/Request';

const headerMiddleware = function (_: Request, res: express.Response, next: express.NextFunction): void {
  const config = getConfig();
  res.setHeader('x-powered-by', '_');
  res.setHeader('Server', '_');
  if (config.server?.useHttps && config.server?.hsts) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  if (config.server?.noRobots) {
    res.setHeader('X-Robots-Tag', 'none');
  }
  next();
};

export { headerMiddleware };
