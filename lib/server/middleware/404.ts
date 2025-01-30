import Request from '@/types/server/Request';
import express from 'express';
import { sendNotFound } from '@/server/util';

const notFoundMiddleware = function (req: Request, res: express.Response) {
  const { method, path } = req;
  sendNotFound(res, method, path);
};

export { notFoundMiddleware };
