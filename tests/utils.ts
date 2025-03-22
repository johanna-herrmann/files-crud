import fs from 'fs/promises';

const exists = async function (path: string): Promise<boolean> {
  try {
    await fs.stat(path);
    return true;
  } catch {
    return false;
  }
};

export { exists };
