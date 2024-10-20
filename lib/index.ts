import ExampleInterface from './types/ExampleInterface';

const giveText = function (example: ExampleInterface): string {
  return example.text;
};

export { giveText };
