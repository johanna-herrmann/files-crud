import Request from '@/types/server/Request';
import express from 'express';
import { sendNotFound } from '@/server/util';

const notFoundMiddleware = function (req: Request, res: express.Response) {
  const path = req.path;
  sendNotFound(res, path);
};

export { notFoundMiddleware };
