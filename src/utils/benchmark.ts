import { BecnhmarkSettings } from '@/types';
import { validateBenchmark } from '@/validation/benchmark-validation';
import { dirname, join } from 'path';

export const loadBenchmarkFile = async (filePath: string) => {
  const fullPath = join(process.cwd(), filePath);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = await import(fullPath);
    const validConfig: BecnhmarkSettings[] = await validateBenchmark(
      config.default
    );
    return {
      cwd: dirname(fullPath),
      config: validConfig,
    };
  } catch (e) {
    if (e instanceof Error) {
      throw new Error(`${fullPath}\n${e.message}`);
    }

    throw e;
  }
};
