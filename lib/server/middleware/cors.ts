import express from 'express';
import cors from 'cors';
import { getFullConfig } from '@/config/config';
import Request from '@/types/server/Request';

const corsMiddleware = function (req: Request, res: express.Response, next: express.NextFunction): void {
  const config = getFullConfig();
  if (!config.server?.cors) {
    return next();
  }
  cors(config.server?.cors)(req, res, next);
};

export { corsMiddleware };
