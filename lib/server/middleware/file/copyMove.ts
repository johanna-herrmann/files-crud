import express from 'express';
import { fileDeleteMiddleware, fileSaveMiddleware, loadMiddleware } from '@/server/middleware/file/file';
import { authorize } from '@/user';
import { getToken, sendUnauthorized } from '@/server/util';
import { Request } from '@/types/server/Request';

const fileCopyMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const { path, targetPath, copyOwner } = req.body;
  const user = await authorize(getToken(req));

  if (!user?.admin && copyOwner) {
    return sendUnauthorized(res, 'Only admins are allowed to copy the owner');
  }

  req.body.userId = user?.id ?? 'public';

  req.params.path = (path as string).split('/');
  await loadMiddleware(req, res, async () => {
    req.params.path = (targetPath as string).split('/');
    await fileSaveMiddleware(req, res, next);
  });
};

const fileMoveMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const { path, targetPath } = req.body;

  req.params.path = (path as string).split('/');
  await fileDeleteMiddleware(req, res, async () => {
    req.params.path = (targetPath as string).split('/');
    await fileSaveMiddleware(req, res, next);
  });
};

export { fileCopyMiddleware, fileMoveMiddleware };
