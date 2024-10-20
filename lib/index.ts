import ExampleInterface from './types/ExampleInterface';

const giveText = function (example: ExampleInterface): string {
  return example.text;
};

const example = { text: 'this is a test' };

console.log(giveText(example));

export { giveText };
