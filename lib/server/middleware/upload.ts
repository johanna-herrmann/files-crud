import express from 'express';
import fileUpload from 'express-fileupload';
import { getFullConfig } from '@/config/config';
import Request from '@/types/server/Request';

const TIMEOUT = 15 * 1000; // 15 seconds;

const parseSizeLimit = function (input: string | number): number {
  if (typeof input === 'number') {
    return input;
  }
  const lastChar = input.charAt(input.length - 1);
  if (/\d/.test(lastChar)) {
    return Number(input);
  }
  const number = Number(input.substring(0, input.length - 1));
  const units = ['k', 'm', 'g', 't', 'p', 'e'];
  return number * 1024 ** (units.indexOf(lastChar.toLowerCase()) + 1);
};

const uploadFileMiddleware = function (req: Request, res: express.Response, next: express.NextFunction): void {
  const config = getFullConfig();
  const fileSize = parseSizeLimit(config.server?.fileSizeLimit as string | number);
  const uploadConfig = {
    abortOnLimit: true,
    responseOnLimit: `uploaded file is to big. Limit: ${fileSize}`,
    limits: { fileSize, files: 1 },
    uploadTimeout: TIMEOUT
  };
  fileUpload(uploadConfig)(req, res, next);
};

export { uploadFileMiddleware, parseSizeLimit };
