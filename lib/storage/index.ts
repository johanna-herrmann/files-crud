import { Storage } from './Storage';

let storage: Storage | null;

const loadStorage = function (): Storage {
  if (!!storage) {
    return storage;
  }
  return (storage = new Storage());
};

const resetStorage = function (): void {
  storage = null;
};

export { loadStorage, resetStorage };
