import JwtKey from '@/types/JwtKey';

const expectKeys = function (keys: JwtKey[], mockedId: string): void {
  expect(keys.length).toBe(3);
  expect(keys[0]).toEqual({ id: mockedId + 0, key: 'key1' });
  expect(keys[1]).toEqual({ id: mockedId + 1, key: 'key2' });
  expect(keys[2]).toEqual({ id: mockedId + 2, key: 'key3' });
};

export { expectKeys };
