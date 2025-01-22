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

const reloadStorage = function (): void {
  storage = new Storage();
};

export { loadStorage, resetStorage, reloadStorage };
