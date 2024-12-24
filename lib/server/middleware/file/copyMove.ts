import Request from '@/types/Request';
import express from 'express';
import { fileDeleteMiddleware, fileSaveMiddleware, loadMiddleware } from '@/server/middleware/file/file';
type Body = Record<string, string>;

const fileCopyMoveMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const actualNext = next;
  const action = (req.params as Record<string, string>).action ?? 'copy';
  const body = req.body as Body;
  const path = body.path ?? '-';
  const targetPath = body.targetPath ?? '--';

  // check for source read permission
  (req.params as Record<string, string>).path = path;
  next = async () => {
    // check for target write permission
    (req.params as Record<string, string>).path = targetPath;
    next = async () => {
      // check for source delete permission on move action
      (req.params as Record<string, string>).path = path;
      await fileDeleteMiddleware(req, res, actualNext);
    };
    await fileSaveMiddleware(req, res, action === 'copy' ? actualNext : next);
  };
  await loadMiddleware(req, res, next);
};

export { fileCopyMoveMiddleware };
