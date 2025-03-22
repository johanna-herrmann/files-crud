import express from 'express';
import { sendError } from '@/server/util';
import { Request } from '@/types/server/Request';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorMiddleware = function (error: Error, _: Request, res: express.Response, __: express.NextFunction): void {
  sendError(res, 'Unexpected Error', error);
};

export { errorMiddleware };
