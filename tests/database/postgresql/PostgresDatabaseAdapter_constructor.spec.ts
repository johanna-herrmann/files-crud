import { PostgresDatabaseAdapter } from '@/database/postgresql/PostgresDatabaseAdapter';
import { loadConfig } from '@/config/config';
import PgDbConf from '@/types/database/PgDbConf';

let mock_providedConf: PgDbConf | undefined;

jest.mock('@/database/postgresql/pgWrapper', () => {
  // noinspection JSUnusedGlobalSymbols
  return {
    getNewClient(conf: PgDbConf) {
      mock_providedConf = conf;
    }
  };
});

describe('PostgresDatabaseAdapter->constructor works correctly', (): void => {
  afterEach(async (): Promise<void> => {
    mock_providedConf = undefined;
  });

  test('default config.', async (): Promise<void> => {
    loadConfig({ database: { name: 'postgresql' } });
    const conf = {
      host: 'localhost',
      port: 5432,
      database: 'files-crud',
      user: undefined,
      pass: undefined
    };

    const newDb = new PostgresDatabaseAdapter();

    expect(newDb.getConf()).toEqual(conf);
    expect(mock_providedConf).toEqual(conf);
  });

  test('specific config.', async (): Promise<void> => {
    const conf = {
      host: 'test',
      port: 1234,
      database: 'testDB',
      user: 'user',
      pass: 'pass'
    };
    loadConfig({ database: { name: 'postgresql', ...conf, db: conf.database } });

    const newDb = new PostgresDatabaseAdapter();

    const { pass, ...expectedConf } = conf;
    expect(newDb.getConf()).toEqual({ ...expectedConf, password: pass });
    expect(mock_providedConf).toEqual({ ...expectedConf, password: pass });
  });
});
