import express from 'express';
import autoPush from 'http2-express-autopush';
import { getFullConfig } from '@/config/config';
import Request from '@/types/server/Request';

let lastWebRoot: string | undefined;
let http1Handler: express.RequestHandler | undefined;
let http2Handler: express.RequestHandler | undefined;

const isHttp2RequestAndResponse = function (req: Request, res: express.Response): boolean {
  return !!req.stream && !!res.stream;
};

const getHttp1Handler = function (webRoot: string): express.RequestHandler {
  return !!http1Handler && webRoot === lastWebRoot ? http1Handler : express.static(webRoot);
};

const getHttp2Handler = function (webRoot: string): express.RequestHandler {
  // First handler returned by autoPush handles http2, second would handle http1, which is handled here already
  return !!http2Handler && webRoot === lastWebRoot ? http2Handler : autoPush(webRoot)[0];
};

const getHandlers = function (webRoot: string): [express.RequestHandler, express.RequestHandler] {
  http1Handler = getHttp1Handler(webRoot);
  http2Handler = getHttp2Handler(webRoot);
  lastWebRoot = webRoot;
  return [http1Handler, http2Handler];
};

const staticMiddleware = function (req: Request, res: express.Response, next: express.NextFunction): void {
  const config = getFullConfig();
  if (typeof config.webRoot === 'undefined') {
    return next();
  }
  const webRoot = `${config.webRoot}` || './';
  const [http1Handler, http2Handler] = getHandlers(webRoot);
  if (config.server?.useHttp2 && isHttp2RequestAndResponse(req, res)) {
    http2Handler(req, res, next);
    return;
  }
  http1Handler(req, res, next);
};

export { staticMiddleware };
