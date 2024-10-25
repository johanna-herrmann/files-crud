import fs from 'fs/promises';

const exists = async function (path: string): Promise<boolean> {
  try {
    await fs.stat(path);

    return true;
  } catch {
    return false;
  }
};

const isFile = async function (path: string): Promise<boolean> {
  if (!(await exists(path))) {
    return false;
  }

  const stats = await fs.stat(path);
  return stats.isFile();
};

const isDirectory = async function (path: string): Promise<boolean> {
  if (!(await exists(path))) {
    return false;
  }

  const stats = await fs.stat(path);
  return stats.isDirectory();
};

export { exists, isFile, isDirectory };
