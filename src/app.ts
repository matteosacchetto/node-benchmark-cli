import { InvalidArgumentError, program } from 'commander';
import { main } from './main';

const positiveInt = (value: string) => {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10);
  if (
    parsedValue.toString() !== value.trim() ||
    isNaN(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > 1000
  ) {
    throw new InvalidArgumentError(
      'Number must be an integer between 1 and 1000'
    );
  }
  return parsedValue;
};

program
  .option('-v, --verbose', 'verbose output', false)
  .option(
    '-n, --num_runs <n>',
    'number of runs of each configuration',
    positiveInt,
    1
  )
  .argument(
    '[dir]',
    'the root directory where the programs to brenchmark are',
    '.'
  )
  .action(async (dir, options) => {
    await main(dir, options.verbose, options.num_runs);
  });

await program.parseAsync(process.argv);
