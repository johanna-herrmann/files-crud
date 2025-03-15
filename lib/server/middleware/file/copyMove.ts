import express from 'express';
import joi from 'joi';
import { fileDeleteMiddleware, fileSaveMiddleware, loadMiddleware } from '@/server/middleware/file/file';
import { authorize } from '@/user';
import { getToken, sendUnauthorized, sendValidationError } from '@/server/util';
import { Request } from '@/types/server/Request';

const pathConstraint = 'required string, not empty';
const copyOwnerConstraint = 'optional boolean';

const fileCopyMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const body = req.body ?? {};
  const bodySchema = joi.object({
    path: joi.string().required(),
    targetPath: joi.string().required(),
    copyOwner: joi.boolean()
  });
  const error = bodySchema.validate(body).error;
  if (error) {
    return sendValidationError(res, 'body', { path: pathConstraint, targetPath: pathConstraint, copyOwner: copyOwnerConstraint }, body);
  }

  const { path, targetPath, copyOwner } = body;
  const user = await authorize(getToken(req));

  if (!user?.admin && copyOwner) {
    return sendUnauthorized(res, 'Only admins are allowed to copy the owner');
  }

  body.userId = user?.id ?? 'public';
  req.body = body;

  req.params.path = (path as string).split('/');
  await loadMiddleware(req, res, async () => {
    req.params.path = (targetPath as string).split('/');
    await fileSaveMiddleware(req, res, next);
  });
};

const fileMoveMiddleware = async function (req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const body = req.body ?? {};
  const bodySchema = joi.object({
    path: joi.string().required(),
    targetPath: joi.string().required()
  });
  const error = bodySchema.validate(body).error;
  if (error) {
    return sendValidationError(res, 'body', { path: pathConstraint, targetPath: pathConstraint }, body);
  }

  const { path, targetPath } = body;

  req.params.path = (path as string).split('/');
  await fileDeleteMiddleware(req, res, async () => {
    req.params.path = (targetPath as string).split('/');
    await fileSaveMiddleware(req, res, next);
  });
};

export { fileCopyMiddleware, fileMoveMiddleware };
