import JwtKey from '@/types/user/JwtKey';

const expectKeys = function (keys: JwtKey[], mockedId: string): void {
  expect(keys.length).toBe(3);
  expect(keys[0]).toEqual({ kid: mockedId + 0, key: 'key1' });
  expect(keys[1]).toEqual({ kid: mockedId + 1, key: 'key2' });
  expect(keys[2]).toEqual({ kid: mockedId + 2, key: 'key3' });
};

export { expectKeys };
