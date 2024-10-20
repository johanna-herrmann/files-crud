import { giveText } from '../../../lib';

describe('index tests for example', (): void => {
  test('returns correct text.', async (): Promise<void> => {
    const expected = 'some nice text';
    const example = { text: expected };

    const actual = giveText(example);

    expect(actual).toBe(expected);
  });
});
