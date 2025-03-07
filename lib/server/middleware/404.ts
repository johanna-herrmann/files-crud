import express from 'express';
import { sendNotFound } from '@/server/util';
import { Request } from '@/types/server/Request';

const notFoundMiddleware = function (req: Request, res: express.Response) {
  const { method, path } = req;
  sendNotFound(res, method, path);
};

export { notFoundMiddleware };
