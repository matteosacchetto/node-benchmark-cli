import chalk from 'chalk';
import { Table } from 'console-table-printer';
import figureSet from 'figures';
import ora from 'ora';
import { EOL } from 'os';
import { relative } from 'path';
import stripAnsi from 'strip-ansi';
import { benchmark, build, cleanup } from './benchmark/becnhmark';
import { loadPrograms } from './fs/programs-finder';
import {
  AggregatedStats,
  BecnhmarkConfig,
  ExtendedFullAggregatedStats,
  FullAggregatedStats,
} from './types';
import { loadBenchmarkFile } from './utils/benchmark';

const loader = async (
  message: string,
  fn: CallableFunction,
  spacing = 0,
  clear = false
) => {
  const spinner = ora({
    text: message,
    prefixText: ' '.repeat(spacing),
  }).start();
  try {
    const res = await fn();
    if (clear) spinner.stop();
    else spinner.succeed();
    return res;
  } catch (e) {
    spinner.fail();
    throw e;
  }
};

export const main = async (
  dir: string,
  verbose: boolean,
  numRunsPerTest: number
) => {
  try {
    const results: ExtendedFullAggregatedStats[] = [];
    // Load programs
    const configs: BecnhmarkConfig[] = await loader(
      `Loading programs [${dir}]`,
      async () => {
        const files = await loadPrograms(dir);
        const configs: BecnhmarkConfig[] = await Promise.all(
          files.map(async (el) => await loadBenchmarkFile(el))
        );
        return configs;
      }
    );

    if (configs.length === 0) {
      console.log(
        `  ${chalk.yellow(figureSet.warning)} Found ${
          configs.length
        } programs to benchmark`
      );
      return;
    } else {
      console.log(
        `  ${chalk.cyan.bold(figureSet.info)} Found ${
          configs.length
        } programs to benchmark (${
          configs.flatMap((x) => x.config).length
        } configurations in total)`
      );
    }

    const cwd = process.cwd();
    for (const config of configs) {
      process.chdir(config.cwd);
      for (const [i, settings] of config.config.entries()) {
        try {
          const relativeProgramCwd = `${relative(cwd, config.cwd)}`;
          console.log(
            `\n${chalk.cyan.bold(figureSet.triangleRight)} Benchmarking '${
              settings.name
            }' ${verbose ? `- config ${i} ` : ''}[${relativeProgramCwd}]`
          );
          if (settings.build) {
            await loader(
              'Build',
              async () => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                await build(settings.build!);
              },
              1
            );
          } else if (verbose) {
            console.log(
              `  ${chalk.yellow.bold(figureSet.arrowDown)} Build ${chalk.dim(
                '[SKIPPED]'
              )}`
            );
          }

          const localResults: FullAggregatedStats[] = [];
          for (let i = 0; i < numRunsPerTest; i++) {
            const info: FullAggregatedStats = await loader(
              'Run',
              async () => {
                const res: AggregatedStats = await benchmark(settings.run);
                const info = {
                  name: settings.name,
                  path: relative(cwd, config.cwd),
                  config: i,
                };
                Object.assign(info, res);
                return info;
              },
              1
            );
            localResults.push(info);
            await loader(
              'Cooldown',
              async () => {
                await new Promise((resolve) =>
                  setTimeout(() => resolve(true), 2000)
                );
              },
              1,
              true
            );
            // results.push(info);
          }
          const aggResults: ExtendedFullAggregatedStats = localResults.reduce(
            (a: FullAggregatedStats, b: FullAggregatedStats) => {
              return {
                name: a.name,
                config: a.config,
                path: a.path,
                avgCpu: a.avgCpu + b.avgCpu,
                varianceCpu: a.varianceCpu + b.varianceCpu,
                avgMemory: a.avgMemory + b.avgMemory,
                varianceMemory: a.varianceMemory + b.varianceMemory,
                time: a.time + b.time,
              };
            },
            {
              name: localResults[0].name,
              config: localResults[0].config,
              path: localResults[0].path,
              avgCpu: 0,
              varianceCpu: 0,
              avgMemory: 0,
              varianceMemory: 0,
              time: 0,
            }
          );
          aggResults.avgCpu = aggResults.avgCpu / localResults.length;
          aggResults.varianceCpu = aggResults.varianceCpu / localResults.length;
          aggResults.avgMemory = aggResults.avgMemory / localResults.length;
          aggResults.varianceMemory =
            aggResults.varianceMemory / localResults.length;
          aggResults.time = aggResults.time / localResults.length;
          aggResults.varianceTime =
            localResults
              .map((el) => el.time)
              .map((el) => (el - aggResults.time) ** 2)
              .reduce((a, b) => a + b, 0) / localResults.length;
          results.push(aggResults);

          if (settings.cleanup) {
            await loader(
              'Cleanup',
              async () => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                await cleanup(settings.cleanup!);
              },
              1
            );
          } else if (verbose) {
            console.log(
              `  ${chalk.yellow.bold(figureSet.arrowDown)} Cleanup ${chalk.dim(
                '[SKIPPED]'
              )}`
            );
          }
        } catch (e) {
          if (e instanceof Error)
            console.error(
              `    ${chalk.red(figureSet.cross)} ${e.message
                .split(EOL)
                .map((el) => `      ${el}`)
                .join(EOL)
                .trim()}`
            );
        }
      }
    }
    process.chdir(cwd);

    // Display results
    if (results.length > 0) {
      console.log(`\n${chalk.cyan.bold(figureSet.triangleRight)} Results`);
      // console.table(results);
      const table = new Table({
        columns: [
          { name: 'name', alignment: 'left' },
          { name: 'path', alignment: 'left' },
          { name: 'config', alignment: 'left' },
          { name: 'avgCpu', title: 'CPU (%)', alignment: 'left' },
          {
            name: 'avgMemory',
            title: 'memory (MB)',
            alignment: 'left',
          },
          {
            name: 'time',
            title: `time (ms) ${figureSet.arrowDown}`,
            alignment: 'left',
          },
        ],
        enabledColumns: ['name', 'path', 'avgCpu', 'avgMemory', 'time'],
      });
      table.addRows(
        results
          .sort((row1, row2) => row1.time - row2.time)
          .map((el) => {
            return {
              name: chalk.bold.cyan(`${el.name} (${numRunsPerTest})`),
              path: chalk.green(el.path),
              config: chalk.green(el.config),
              avgCpu:
                el.time < 40
                  ? chalk.bold.dim.yellow(
                      `${el.avgCpu.toFixed(3)} ± ${Math.sqrt(
                        el.varianceCpu
                      ).toFixed(3)}`
                    )
                  : chalk.bold.yellow(
                      `${el.avgCpu.toFixed(3)} ± ${Math.sqrt(
                        el.varianceCpu
                      ).toFixed(3)}`
                    ),
              avgMemory:
                el.time < 40
                  ? chalk.bold.dim.yellow(
                      `${el.avgMemory.toFixed(3)} ± ${Math.sqrt(
                        el.varianceMemory
                      ).toFixed(3)}`
                    )
                  : chalk.bold.yellow(
                      `${el.avgMemory.toFixed(3)} ± ${Math.sqrt(
                        el.varianceMemory
                      ).toFixed(3)}`
                    ),
              time: chalk.bold.yellow(
                `${el.time.toFixed(3)}${
                  el.varianceTime
                    ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      ` ± ${Math.sqrt(el.varianceTime!).toFixed(3)}`
                    : ''
                }`
              ),
            };
          })
      );
      let outputTable = table.render();
      if (!process.stdout.isTTY) {
        outputTable = stripAnsi(outputTable);
      }

      console.log(
        outputTable
          .split(EOL)
          .map((el) => `  ${el}`)
          .join(EOL)
      );
    }
  } catch (e) {
    if (e instanceof Error)
      console.error(
        `  ${chalk.red(figureSet.cross)} ${e.message
          .split(EOL)
          .map((el) => `    ${el}`)
          .join(EOL)
          .trim()}`
      );
  }
};
