import type { BenchmarkRecord } from '../types/benchmark';

export interface ParseResult {
  records: BenchmarkRecord[];
  errors: string[];
  osList: string[];
}

export function parseJsonlContent(content: string, fileName?: string): ParseResult {
  const lines = content.split(/\r?\n/);
  const records: BenchmarkRecord[] = [];
  const errors: string[] = [];
  const osSet = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const parsed = JSON.parse(line);

      // Validate required structure and field names
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !parsed.hardware?.os ||
        !parsed.workload?.name ||
        parsed.configuration?.thread_count === undefined ||
        !parsed.measurements ||
        !parsed.derived
      ) {
        errors.push(`Line ${i + 1} in ${fileName || 'input'} missing required fields.`);
        continue;
      }

      const record: BenchmarkRecord = {
        session_id: Number(parsed.session_id) || Date.now(),
        hardware: {
          os: String(parsed.hardware.os),
          cpu_model: String(parsed.hardware.cpu_model || 'Unknown CPU'),
          physical_cores: Number(parsed.hardware.physical_cores) || 0,
          logical_processors: Number(parsed.hardware.logical_processors) || 0,
          total_memory_bytes: Number(parsed.hardware.total_memory_bytes) || 0,
        },
        workload: {
          name: String(parsed.workload.name),
          type: String(parsed.workload.type || ''),
        },
        configuration: {
          thread_count: Number(parsed.configuration.thread_count),
        },
        measurements: {
          wall_time_microseconds: Number(parsed.measurements.wall_time_microseconds) || 0,
          cpu_utilization_percent: Number(parsed.measurements.cpu_utilization_percent) || 0,
          peak_memory_bytes: Number(parsed.measurements.peak_memory_bytes) || 0,
          voluntary_context_switches: Number(parsed.measurements.voluntary_context_switches) || 0,
          involuntary_context_switches: Number(parsed.measurements.involuntary_context_switches) || 0,
        },
        derived: {
          speedup: Number(parsed.derived.speedup) || 1,
          efficiency: Number(parsed.derived.efficiency) || 1,
          correct: Boolean(parsed.derived.correct),
        },
      };

      records.push(record);
      osSet.add(record.hardware.os);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Line ${i + 1} syntax error: ${errorMsg}`);
    }
  }

  return {
    records,
    errors,
    osList: Array.from(osSet),
  };
}

export function mergeBenchmarkDatasets(
  currentRecords: BenchmarkRecord[],
  newRecords: BenchmarkRecord[]
): BenchmarkRecord[] {
  // Deduplicate by composite key: session_id + os + workload + thread_count
  const recordMap = new Map<string, BenchmarkRecord>();

  for (const rec of currentRecords) {
    const key = `${rec.session_id}_${rec.hardware.os}_${rec.workload.name}_${rec.configuration.thread_count}`;
    recordMap.set(key, rec);
  }

  for (const rec of newRecords) {
    const key = `${rec.session_id}_${rec.hardware.os}_${rec.workload.name}_${rec.configuration.thread_count}`;
    recordMap.set(key, rec);
  }

  return Array.from(recordMap.values());
}
