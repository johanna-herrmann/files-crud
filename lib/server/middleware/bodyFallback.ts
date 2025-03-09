import express from 'express';
import { Request } from '@/types/server/Request';

const bodyFallbackMiddleware = function (req: Request, _: express.Response, next: express.NextFunction) {
  req.body = req.body ?? {};
  next();
};

export { bodyFallbackMiddleware };
