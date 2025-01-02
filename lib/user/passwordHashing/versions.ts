import PasswordHashing from '@/types/user/PasswordHashing';
import { v1PasswordHashing } from './v1';

const versions: Record<string, PasswordHashing> = {
  v1: v1PasswordHashing
};

const current = v1PasswordHashing;

export { versions, current };
