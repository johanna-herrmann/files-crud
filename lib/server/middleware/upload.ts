import express from 'express';
import fileUpload from 'express-fileupload';
import { getFullConfig } from '@/config/config';
import { Request } from '@/types/server/Request';

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
  // noinspection JSUnusedGlobalSymbols
  const uploadConfig = {
    abortOnLimit: true,
    responseOnLimit: `uploaded file is to big. Limit: ${fileSize}`,
    limits: { fileSize, files: 1 },
    limitHandler(_: Request, res: express.Response): void {
      res.status(413).json({ error: `Error. File is to big. Limit: ${fileSize} bytes` });
    }
  };
  fileUpload(uploadConfig)(req, res, next);
};

export { uploadFileMiddleware, parseSizeLimit };
