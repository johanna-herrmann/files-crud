/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  transform: {
    '^.+\\.ts?$': 'ts-jest'
  },
  clearMocks: true,
  testMatch: ['**/tests/unit/**/*.spec.ts'],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/lib/$1',
    '#/(.*)': '<rootDir>/tests/unit/$1'
  }
};
