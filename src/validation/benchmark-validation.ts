import { BecnhmarkSettings } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validateBenchmarkSettings = async (config: any) => {
  // Check properties
  const properties = ['name', 'build', 'run', 'cleanup'];
  const keys = Object.keys(config);
  for (const key of keys) {
    if (!properties.includes(key)) {
      throw new Error(`${key}: property not supported`);
    }
  }

  // Check types
  if (Object.hasOwn(config, 'name') && typeof config['name'] !== 'string') {
    throw new Error(`name: property must be a string [REQUIRED]`);
  }

  if (
    Object.hasOwn(config, 'build') &&
    typeof config['build'] !== 'string' &&
    typeof config['build'] !== 'function'
  ) {
    throw new Error(
      `build: property must be a string or a function [OPTIONAL]`
    );
  }

  if (typeof config['run'] !== 'string') {
    throw new Error(`run: property must be a string [REQUIRED]`);
  }

  if (
    Object.hasOwn(config, 'cleanup') &&
    typeof config['cleanup'] !== 'string' &&
    typeof config['cleanup'] !== 'function'
  ) {
    throw new Error(
      `cleanup: property must be a string or a function [OPTIONAL]`
    );
  }
};

export const validateBenchmark = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any
): Promise<BecnhmarkSettings[]> => {
  // Check if config is an object/array
  if (typeof config !== 'object') {
    throw new Error(`default: export must be an object or an array of objects`);
  }

  if (Array.isArray(config)) {
    if (config.length === 0) {
      throw new Error(`array: must not be empty`);
    }

    for (const settings of config) {
      await validateBenchmarkSettings(settings);
    }

    return config;
  } else {
    await validateBenchmarkSettings(config);
    return [config];
  }
};
