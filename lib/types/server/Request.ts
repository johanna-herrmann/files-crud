import express from 'express';
import { ParsedQs } from 'qs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Request = express.Request<Record<string, any>, any, Record<string, unknown>, ParsedQs>;

export { Request };
