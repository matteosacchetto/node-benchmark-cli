import { program } from 'commander';
import { main } from './main';

program
  .option('-v, --verbose', 'verbose output', false)
  .option('-n, --num_runs <n>', 'number of runs of each configuration', '1')
  .argument(
    '[dir]',
    'the root directory where the programs to brenchmark are',
    '.'
  )
  .action(async (dir, options) => {
    const n = parseInt(options.num_runs);
    await main(dir, options.verbose, n);
  });

await program.parseAsync(process.argv);
