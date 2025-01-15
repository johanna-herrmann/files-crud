import { loadConfig } from '@/config/config';
import Config from '@/types/config/Config';
import { showConfig } from '@/command/config';

describe('command: config', (): void => {
  const config: Config = {
    webRoot: '/web',
    server: {
      useHttps: true,
      port: 9001,
      sslCertPath: './cert.pem',
      sslKeyPath: './privateKey.pem'
    },
    defaultPermissions: '00d'
  };

  const propertiesNotation =
    'webRoot=/web\n' +
    'server.useHttps=true\n' +
    'server.port=9001\n' +
    'server.sslCertPath=./cert.pem\n' +
    'server.sslKeyPath=./privateKey.pem\n' +
    'defaultPermissions=00d\n';

  const stdout = process.stdout;
  const stderr = process.stderr;
  let outSpy: jest.Spied<typeof stdout.write>;
  let errSpy: jest.Spied<typeof stderr.write>;
  let printings: (string | Uint8Array)[] = [];
  let channels: ('out' | 'err')[] = [];

  beforeEach(async (): Promise<void> => {
    loadConfig(config);
    outSpy = jest.spyOn(stdout, 'write').mockImplementation((message: string | Uint8Array): boolean => {
      printings.push(message);
      channels.push('out');
      return true;
    });
    errSpy = jest.spyOn(stderr, 'write').mockImplementation((message: string | Uint8Array): boolean => {
      printings.push(message);
      channels.push('err');
      return true;
    });
  });

  afterEach(async (): Promise<void> => {
    loadConfig({});
    outSpy.mockRestore();
    errSpy.mockRestore();
    printings = [];
    channels = [];
  });

  test('shows config in json', async (): Promise<void> => {
    showConfig('json', true);

    expect(printings).toEqual([
      '{\n' +
        '    "webRoot": "/web",\n' +
        '    "server": {\n' +
        '        "useHttps": true,\n' +
        '        "port": 9001,\n' +
        '        "sslCertPath": "./cert.pem",\n' +
        '        "sslKeyPath": "./privateKey.pem"\n' +
        '    },\n' +
        '    "defaultPermissions": "00d"\n' +
        '}\n'
    ]);
    expect(channels).toEqual(['out']);
  });

  test('shows config in yaml', async (): Promise<void> => {
    showConfig('yaml', true);

    expect(printings).toEqual([
      'webRoot: /web\n' +
        'server:\n' +
        '    useHttps: true\n' +
        '    port: 9001\n' +
        '    sslCertPath: ./cert.pem\n' +
        '    sslKeyPath: ./privateKey.pem\n' +
        'defaultPermissions: 00d\n\n'
    ]);
    expect(channels).toEqual(['out']);
  });

  test('shows config in properties notation', async (): Promise<void> => {
    showConfig('properties', true);

    expect(printings).toEqual([propertiesNotation]);
    expect(channels).toEqual(['out']);
  });

  test('shows config in env notation', async (): Promise<void> => {
    showConfig('env', true);

    expect(printings).toEqual([
      'FILES_CRUD_WEB_ROOT=/web\n' +
        'FILES_CRUD_SERVER__USE_HTTPS=true\n' +
        'FILES_CRUD_SERVER__PORT=9001\n' +
        'FILES_CRUD_SERVER__SSL_CERT_PATH=./cert.pem\n' +
        'FILES_CRUD_SERVER__SSL_KEY_PATH=./privateKey.pem\n' +
        'FILES_CRUD_DEFAULT_PERMISSIONS=00d\n'
    ]);
    expect(channels).toEqual(['out']);
  });

  test('defaults to properties notation', async (): Promise<void> => {
    showConfig('someNonsense', true);

    expect(printings).toEqual([propertiesNotation]);
    expect(channels).toEqual(['out']);
  });

  test('full config', async (): Promise<void> => {
    loadConfig({});

    showConfig('properties', false);

    expect((printings[0] as string).split('\n').length).toBe(29);
    expect(channels).toEqual(['out']);
  });
});
