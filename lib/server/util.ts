import Request from '@/types/Request';
import express from 'express';

const getToken = function (req: Request): string {
  return req.headers.authorization?.replace(/^bearer /iu, '') ?? '';
};

const sendUnauthorized = function (res: express.Response, message: string): void {
  res.statusCode = 401;
  res.json({ error: `Unauthorized. ${message.replace(/\.$/, '')}.` });
};

export { getToken, sendUnauthorized };
