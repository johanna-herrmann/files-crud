import { assert } from 'assertthat';
import { giveText } from '../../lib';

suite('index tests for example', (): void => {
  test('returns correct text.', async (): Promise<void> => {
    const expected = 'some nice text';
    const example = { text: expected };

    const actual = giveText(example);

    assert.that(actual).is.equalTo(expected);
  });
});
