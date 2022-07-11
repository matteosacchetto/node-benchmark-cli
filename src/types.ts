export type ProgramStats = {
  cpu: number;
  memory: number;
};

export type AggregatedStats = {
  avgCpu: number;
  varianceCpu: number;
  avgMemory: number;
  varianceMemory: number;
  time: number;
};

export type FullAggregatedStats = AggregatedStats & {
  name: string;
  path: string;
  config: number;
};

export type ExtendedFullAggregatedStats = FullAggregatedStats & {
  varianceTime?: number;
};

export type BecnhmarkSettings = {
  name: string;
  build?: string | CallableFunction;
  run: string;
  cleanup?: string | CallableFunction;
};

export type BecnhmarkConfig = {
  cwd: string;
  config: BecnhmarkSettings[];
};
