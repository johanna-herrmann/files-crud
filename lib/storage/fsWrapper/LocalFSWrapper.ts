import FSWrapper from '@/types/FSWrapper';
import fs from 'fs/promises';
import { exists, isFile, isDirectory } from './LocalFSWrapperHelper';

class LocalFSWrapper implements FSWrapper {
  private readonly root: string;

  public constructor(root: string) {
    this.root = `/${root.replace(/(^\/+|\/+$)/gu, '')}`;
  }

  private resolvePath(path: string): string {
    return `${this.root}/${path.replace(/^\/+/gu, '')}`;
  }

  public getRoot(): string {
    return this.root;
  }

  public async writeFile(path: string, data: string | Buffer, encoding?: BufferEncoding): Promise<void> {
    await fs.writeFile(this.resolvePath(path), data, encoding);
  }

  public async readFile(path: string, encoding?: BufferEncoding): Promise<Buffer | string> {
    return await fs.readFile(this.resolvePath(path), encoding);
  }

  public async mkdir(path: string): Promise<void> {
    await fs.mkdir(this.resolvePath(path), { recursive: true });
  }

  public async readdir(path: string): Promise<string[]> {
    return await fs.readdir(this.resolvePath(path));
  }

  public async copyFile(from: string, to: string): Promise<void> {
    const resolvedTo = this.resolvePath(to);
    await fs.writeFile(resolvedTo, '');
    await fs.copyFile(this.resolvePath(from), resolvedTo);
  }

  public async unlink(path: string): Promise<void> {
    await fs.unlink(this.resolvePath(path));
  }

  public async rmdir(path: string): Promise<void> {
    await fs.rmdir(this.resolvePath(path));
  }

  public async rmRf(path: string): Promise<void> {
    await fs.rm(this.resolvePath(path), { force: true, recursive: true });
  }

  public async rename(from: string, to: string): Promise<void> {
    await fs.rename(this.resolvePath(from), this.resolvePath(to));
  }

  public async exists(path: string): Promise<boolean> {
    return await exists(this.resolvePath(path));
  }

  public async isFile(path: string): Promise<boolean> {
    return await isFile(this.resolvePath(path));
  }

  public async isDirectory(path: string): Promise<boolean> {
    return await isDirectory(this.resolvePath(path));
  }
}

export { LocalFSWrapper, exists, isFile, isDirectory };
