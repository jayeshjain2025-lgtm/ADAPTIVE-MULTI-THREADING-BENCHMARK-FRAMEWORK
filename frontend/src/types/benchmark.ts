export interface HardwareInfo {
  os: string;
  cpu_model: string;
  physical_cores: number;
  logical_processors: number;
  total_memory_bytes: number;
}

export interface WorkloadInfo {
  name: string;
  type: string;
}

export interface ConfigurationInfo {
  thread_count: number;
}

export interface MeasurementsInfo {
  wall_time_microseconds: number;
  cpu_utilization_percent: number;
  peak_memory_bytes: number;
  voluntary_context_switches: number;
  involuntary_context_switches: number;
}

export interface DerivedInfo {
  speedup: number;
  efficiency: number;
  correct: boolean;
}

export interface BenchmarkRecord {
  session_id: number;
  hardware: HardwareInfo;
  workload: WorkloadInfo;
  configuration: ConfigurationInfo;
  measurements: MeasurementsInfo;
  derived: DerivedInfo;
}

export interface UploadedFileMeta {
  id: string;
  name: string;
  size: number;
  recordCount: number;
  detectedOS: string[];
}

export interface WorkloadRecommendation {
  os: string;
  workloadName: string;
  peakEfficiency: number;
  peakThreadCount: number;
  recommendedThreadCount: number | null; // where efficiency drops below 70% of peak
  dropEfficiency: number | null;
  speedupAtRecommended: number | null;
  reason: string;
}

export interface OSComparisonStats {
  os: string;
  hardware: HardwareInfo;
  avgSpeedup: number;
  avgEfficiency: number;
  avgCpuUtilization: number;
  avgInvoluntarySwitches: number;
  avgVoluntarySwitches: number;
  workloadStats: Record<string, {
    maxSpeedup: number;
    peakEfficiency: number;
    maxThreadCount: number;
    avgCpuUtilization: number;
    involuntarySwitchesAtMax: number;
  }>;
}

export interface WorkloadAnomaly {
  id: string;
  workload: string;
  os: string;
  type: 'sub_1x_speedup' | 'sub_15pct_efficiency';
  threadCount: number;
  allThreadCounts?: number[];
  speedup: number;
  efficiency: number;
  message: string;
  likelyCause: string;
  singleLine: string;
}

export interface ClassifiedWorkload {
  name: string;
  category: 'compute_bound' | 'io_memory_bound';
  peakSpeedup: number;
  peakThreadCount: number;
  plateauThreadCount: number;
  gainBeyond6: number;
  relativeGain: number;
  bullets: string[];
  description?: string;
}


