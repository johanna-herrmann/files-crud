import express from 'express';
import { ParsedQs } from 'qs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Request = express.Request<object, any, any, ParsedQs, Record<string, any>>;

export default Request;
