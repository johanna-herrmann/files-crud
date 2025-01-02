import Request from '@/server/Request';
import express from 'express';
import { sendError, sendOK } from '@/server/util';
import { addUser, register, userAlreadyExists } from '@/user';

interface RegisterUserBody {
  username: string;
  password: string;
  meta?: Record<string, unknown>;
}
type AddUserBody = RegisterUserBody & { admin: boolean };
interface ChangeUsernameBody {
  username: string;
  newUsername: string;
}

const registerHandler = async function (req: Request, res: express.Response): Promise<void> {
  const body = req.body as RegisterUserBody;
  const { username, password, meta } = body;

  const result = await register(username, password, meta ?? {});

  if (result === userAlreadyExists) {
    return sendError(res, `User ${username} exists already.`);
  }

  sendOK(res, { username });
};

const addUserHandler = async function (req: Request, res: express.Response): Promise<void> {
  const body = req.body as AddUserBody;
  const { username, password, meta, admin } = body;

  const added = await addUser(username, password, admin, meta ?? {});

  if (!added) {
    return sendError(res, `User ${username} exists already.`);
  }

  sendOK(res, { username });
};

export { registerHandler, addUserHandler };
