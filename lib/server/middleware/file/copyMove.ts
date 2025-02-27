import Request from '@/types/server/Request';
import express from 'express';
import { fileDeleteMiddleware, fileSaveMiddleware, loadMiddleware } from '@/server/middleware/file/file';
import { authorize } from '@/user';
import { getToken, sendUnauthorized } from '@/server/util';

const fileCopyMoveMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const actualNext = next;
  const action = (req.params as Record<string, string>).action ?? 'copy';
  const body = req.body;
  const path = (body.path as string) ?? '-';
  const targetPath = (body.targetPath as string) ?? '--';
  const copyOwner = (body.copyOwner as boolean) ?? false;
  const user = await authorize(getToken(req));
  if (!user?.admin && copyOwner) {
    return sendUnauthorized(res, 'Only admins are allowed to copy the owner');
  }
  if (!!user) {
    req.body.user = user;
  }

  (req.params as Record<string, string>)['0'] = '';

  // check for source read permission
  (req.params as Record<string, string[]>).path = path.split('/');
  next = async () => {
    // check for target write permission
    (req.params as Record<string, string[]>).path = targetPath.split('/');
    next = async () => {
      // check for source delete permission on move action
      (req.params as Record<string, string[]>).path = path.split('/');
      await fileDeleteMiddleware(req, res, actualNext);
    };
    await fileSaveMiddleware(req, res, action === 'copy' ? actualNext : next);
  };
  await loadMiddleware(req, res, next);
};

const fileCopyMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const { path, targetPath, copyOwner } = req.body;
  const user = await authorize(getToken(req));

  req.params.path = (path as string).split('/');
  await loadMiddleware(req, res, async () => {
    req.params.path = (targetPath as string).split('/');
    await fileSaveMiddleware(req, res, () => {
      if (!user?.admin && copyOwner) {
        return sendUnauthorized(res, 'Only admins are allowed to copy the owner');
      }
      req.body.userId = user?.id ?? 'public';
      next();
    });
  });
};

const fileMoveMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const { path, targetPath } = req.body;

  req.params.path = (path as string).split('/');
  await fileDeleteMiddleware(req, res, async () => {
    req.params.path = (targetPath as string).split('/');
    await fileSaveMiddleware(req, res, () => {
      next();
    });
  });
};

export { fileCopyMiddleware, fileMoveMiddleware };
