import crypto from 'crypto';
import fs from 'fs/promises';
import request from 'supertest';
import express from 'express';
import { loadConfig } from '@/config/config';
import { uploadFileMiddleware, parseSizeLimit } from '@/server/middleware/upload';
import { Request } from '@/types/server/Request';
import { UploadRequest } from '@/types/server/UploadRequest';

describe('uploadFileMiddleware', (): void => {
  test('Sets file attributes correctly.', async (): Promise<void> => {
    const app = express();
    app.use(uploadFileMiddleware);
    app.post('/api/upload', (req: Request, res: express.Response) => {
      const { data, mimetype, md5 } = (req as UploadRequest).files?.file ?? { data: Buffer.from(''), mimetype: '' };
      res.status(200).json({ mimetype, content: data.subarray(0, 16).toString('base64'), md5 });
    });
    const content = (await fs.readFile(__filename)).subarray(0, 16).toString('base64');

    const response = await request(app).post('/api/upload').attach('file', __filename);

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(response.body.content).toBe(content);
    expect(response.body.md5).toBe(
      crypto
        .createHash('md5')
        .update(await fs.readFile(__filename))
        .digest()
        .toString('hex')
    );
    expect(response.body.mimetype).toBe('video/mp2t');
  });

  test('aborts due to exceeded file size limit.', async (): Promise<void> => {
    loadConfig({ server: { fileSizeLimit: 12 } });
    const app = express();
    app.use(uploadFileMiddleware);
    app.post('/api/upload', (_: Request, res: express.Response) => {
      res.status(200).json({});
    });

    const response = await request(app).post('/api/upload').attach('file', __filename);

    expect(response.statusCode).toBe(413);
    expect(response.body).toEqual({ error: 'Error. File is to big. Limit: 12 bytes' });
  });

  describe('app->parseSizeLimit', (): void => {
    test('parses real number correctly', async (): Promise<void> => {
      const result = parseSizeLimit(42);

      expect(result).toBe(42);
    });

    test('parses string-number correctly', async (): Promise<void> => {
      const result = parseSizeLimit('1234');

      expect(result).toBe(1234);
    });

    test('parses ...k correctly', async (): Promise<void> => {
      const result = parseSizeLimit('12k');

      expect(result).toBe(12 * 1024);
    });

    test('parses ...m correctly', async (): Promise<void> => {
      const result = parseSizeLimit('12m');

      expect(result).toBe(12 * 1024 * 1024);
    });

    test('parses ...g correctly', async (): Promise<void> => {
      const result = parseSizeLimit('12g');

      expect(result).toBe(12 * 1024 * 1024 * 1024);
    });

    test('parses ...t correctly', async (): Promise<void> => {
      const result = parseSizeLimit('12t');

      expect(result).toBe(12 * 1024 * 1024 * 1024 * 1024);
    });

    test('parses ...p correctly', async (): Promise<void> => {
      const result = parseSizeLimit('12p');

      expect(result).toBe(12 * 1024 * 1024 * 1024 * 1024 * 1024);
    });

    test('parses ...e correctly', async (): Promise<void> => {
      const result = parseSizeLimit('12e');

      expect(result).toBe(12 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024);
    });

    test('parses ...G (uppercase) correctly', async (): Promise<void> => {
      const result = parseSizeLimit('12G');

      expect(result).toBe(12 * 1024 * 1024 * 1024);
    });
  });
});
