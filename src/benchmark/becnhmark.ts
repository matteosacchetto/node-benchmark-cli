import { AggregatedStats, ProgramStats } from '@/types';
import { spawn, exec as execSync } from 'child_process';
import { parseArgsStringToArgv } from 'string-argv';
import pidtree from 'pidtree';
import pidusage, { Status } from 'pidusage';
import { promisify } from 'util';

const exec = promisify(execSync);

export const build = async (buildCmdOrFunction: string | CallableFunction) => {
  if (typeof buildCmdOrFunction === 'string') {
    await exec(buildCmdOrFunction);
  } else if (typeof buildCmdOrFunction === 'function') {
    await buildCmdOrFunction();
  }
};

const collectStats = async (
  pid: number | undefined,
  stats: Array<ProgramStats>
) => {
  try {
    if (pid) {
      const pids = await pidtree(pid, { root: true });
      const tmpStats = await pidusage(pids);
      const res = Object.values(tmpStats)
        .map((el: Status) => {
          const newEl: ProgramStats = {
            cpu: el.cpu,
            memory: el.memory,
          };

          return newEl;
        })
        .reduce(
          (a: ProgramStats, b: ProgramStats) => {
            const res = {
              cpu: a.cpu + b.cpu,
              memory: b.memory + b.memory,
            };

            return res;
          },
          {
            cpu: 0,
            memory: 0,
          }
        );
      stats.push(res);
    }
  } catch (e) {
    // Ignore errors
  }
};

/**
 * This function receives a cmd and benchmarks its performance
 *
 * @param runCmd the command to run
 * @returns the average statsistics about cpu and memory consumption + the time it run
 */
export const benchmark = async (runCmd: string): Promise<AggregatedStats> => {
  const cmd = parseArgsStringToArgv(runCmd);
  return new Promise((resolve, reject) => {
    const program = spawn(cmd[0], cmd.splice(1), {
      cwd: process.cwd(),
      stdio: ['ignore', 'ignore', 'pipe'],
      timeout: 30 * 60 * 1000,
    });
    const pid = program.pid;
    let startTime = 0;
    let finishTime = 0;
    const stats: ProgramStats[] = [];

    program.on('spawn', () => {
      startTime = performance.now();
    });

    program.stderr.on('data', (data) => {
      clearInterval(interval);
      reject(new Error(data));
    });

    program.on('error', (err) => {
      clearInterval(interval);
      reject(err);
    });

    program.on('exit', async (code: number) => {
      finishTime = performance.now();
      clearInterval(interval);
      if (code === 0) {
        const avgCpu =
          stats
            .map((el: ProgramStats) => el.cpu)
            .reduce((a: number, b: number) => a + b, 0) /
          Math.max(stats.length, 1);

        const avgMemory =
          stats
            .map((el: ProgramStats) => el.memory / 2 ** 20)
            .reduce((a: number, b: number) => a + b, 0) /
          Math.max(stats.length, 1);
        const res: AggregatedStats = {
          avgCpu,
          varianceCpu:
            stats
              .map((el: ProgramStats) => el.cpu)
              .map((el) => (el - avgCpu) ** 2)
              .reduce((a: number, b: number) => a + b, 0) /
            Math.max(stats.length, 1),
          avgMemory,
          varianceMemory:
            stats
              .map((el: ProgramStats) => el.memory / 2 ** 20)
              .map((el) => (el - avgMemory) ** 2)
              .reduce((a: number, b: number) => a + b, 0) /
            Math.max(stats.length, 1),
          time: finishTime - startTime,
        };
        resolve(res);
      } else {
        reject(new Error(`${runCmd} - terminated with code ${code}`));
      }
    });

    const interval = setInterval(async () => {
      await collectStats(pid, stats);
    }, 40);
  });
};

export const cleanup = async (
  cleanupCmdOrFunction: string | CallableFunction
) => {
  if (typeof cleanupCmdOrFunction === 'string') {
    await exec(cleanupCmdOrFunction);
  } else if (typeof cleanupCmdOrFunction === 'function') {
    await cleanupCmdOrFunction();
  }
};
