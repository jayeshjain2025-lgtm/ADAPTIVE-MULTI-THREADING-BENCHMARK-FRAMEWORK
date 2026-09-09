import type {
  BenchmarkRecord,
  WorkloadRecommendation,
  OSComparisonStats,
  WorkloadAnomaly,
  ClassifiedWorkload,
} from '../types/benchmark';
import { getShortOSName } from './formatters';

export const WORKLOAD_NAMES = [
  'Matrix multiplication',
  'Prime generation',
  'Merge sort',
  'Image processing',
  'Compression',
] as const;

export type WorkloadName = typeof WORKLOAD_NAMES[number];

/**
 * Returns distinct OS list from records
 */
export function getDistinctOSList(records: BenchmarkRecord[]): string[] {
  const set = new Set<string>();
  records.forEach((r) => set.add(r.hardware.os));
  return Array.from(set).sort();
}

/**
 * Returns distinct workload list from records
 */
export function getDistinctWorkloads(records: BenchmarkRecord[]): string[] {
  const set = new Set<string>();
  records.forEach((r) => set.add(r.workload.name));
  return Array.from(set).sort();
}

/**
 * Prepare data for the 4 line charts for a selected workload.
 * Groups by thread_count, with metrics per OS.
 */
export function prepareLineChartData(
  records: BenchmarkRecord[],
  selectedWorkload: string
) {
  const filtered = records.filter((r) => r.workload.name === selectedWorkload);
  const threadCounts = Array.from(new Set(filtered.map((r) => r.configuration.thread_count))).sort(
    (a, b) => a - b
  );

  const distinctOS = getDistinctOSList(filtered);

  const timeData: any[] = [];
  const cpuData: any[] = [];
  const speedupData: any[] = [];
  const efficiencyData: any[] = [];

  for (const tc of threadCounts) {
    const timeRow: any = { thread_count: tc };
    const cpuRow: any = { thread_count: tc };
    const speedupRow: any = { thread_count: tc, ideal_linear: tc };
    const efficiencyRow: any = { thread_count: tc, threshold_70: 0.7, ideal_100: 1.0 };

    for (const os of distinctOS) {
      const match = filtered.find(
        (r) => r.configuration.thread_count === tc && r.hardware.os === os
      );

      if (match) {
        timeRow[os] = match.measurements.wall_time_microseconds;
        cpuRow[os] = match.measurements.cpu_utilization_percent;
        speedupRow[os] = match.derived.speedup;
        efficiencyRow[os] = match.derived.efficiency;

        // Context metadata for custom tooltip
        timeRow[`${os}_meta`] = match;
        cpuRow[`${os}_meta`] = match;
        speedupRow[`${os}_meta`] = match;
        efficiencyRow[`${os}_meta`] = match;
      }
    }

    timeData.push(timeRow);
    cpuData.push(cpuRow);
    speedupData.push(speedupRow);
    efficiencyData.push(efficiencyRow);
  }

  return {
    timeData,
    cpuData,
    speedupData,
    efficiencyData,
    threadCounts,
    osList: distinctOS,
  };
}

/**
 * Calculate highest common thread count across all OSes.
 */
export function findHighestCommonThreadCount(records: BenchmarkRecord[]): number | null {
  const osList = getDistinctOSList(records);
  if (osList.length === 0) return null;

  // For each OS, get distinct thread counts
  const osThreadSets = osList.map((os) => {
    const counts = records
      .filter((r) => r.hardware.os === os)
      .map((r) => r.configuration.thread_count);
    return new Set(counts);
  });

  // Find intersection of thread counts
  const firstSet = osThreadSets[0];
  const commonThreads: number[] = [];

  for (const tc of firstSet) {
    const inAll = osThreadSets.every((set) => set.has(tc));
    if (inAll) {
      commonThreads.push(tc);
    }
  }

  if (commonThreads.length === 0) {
    // Fallback: maximum thread count present in the dataset
    return Math.max(...records.map((r) => r.configuration.thread_count));
  }

  return Math.max(...commonThreads);
}

/**
 * Prepare data for grouped bar chart comparing all OSes side-by-side at highest common thread count
 */
export function prepareGroupedBarData(
  records: BenchmarkRecord[],
  targetThreadCount: number,
  metric: 'speedup' | 'efficiency' | 'wall_time_microseconds' = 'speedup'
) {
  const workloads = getDistinctWorkloads(records);
  const osList = getDistinctOSList(records);

  return workloads.map((wName) => {
    const row: any = {
      workload: wName,
    };

    for (const os of osList) {
      const match = records.find(
        (r) =>
          r.workload.name === wName &&
          r.hardware.os === os &&
          r.configuration.thread_count === targetThreadCount
      );

      if (match) {
        if (metric === 'speedup') {
          row[os] = match.derived.speedup;
        } else if (metric === 'efficiency') {
          row[os] = match.derived.efficiency;
        } else if (metric === 'wall_time_microseconds') {
          // Convert to milliseconds for clean readable bar values
          row[os] = match.measurements.wall_time_microseconds / 1000;
        }
        row[`${os}_raw`] = match;
      } else {
        row[os] = 0;
      }
    }

    return row;
  });
}

/**
 * Requirement 5: "A 'Recommended Thread Count' panel per workload per OS:
 * the thread_count where derived.efficiency drops below 70% of its peak value for that workload+OS."
 */
export function computeRecommendations(records: BenchmarkRecord[]): WorkloadRecommendation[] {
  const osList = getDistinctOSList(records);
  const workloads = getDistinctWorkloads(records);
  const recommendations: WorkloadRecommendation[] = [];

  for (const os of osList) {
    for (const wName of workloads) {
      const subset = records
        .filter((r) => r.hardware.os === os && r.workload.name === wName)
        .sort((a, b) => a.configuration.thread_count - b.configuration.thread_count);

      if (subset.length === 0) continue;

      // Find peak efficiency
      let peakEfficiency = -Infinity;
      let peakThreadCount = subset[0].configuration.thread_count;

      for (const rec of subset) {
        if (rec.derived.efficiency > peakEfficiency) {
          peakEfficiency = rec.derived.efficiency;
          peakThreadCount = rec.configuration.thread_count;
        }
      }

      const threshold70 = 0.7 * peakEfficiency;

      // Find first thread count where efficiency drops below 70% of peak value
      const dropRecord = subset.find((rec) => rec.derived.efficiency < threshold70);

      if (dropRecord) {
        recommendations.push({
          os,
          workloadName: wName,
          peakEfficiency,
          peakThreadCount,
          recommendedThreadCount: dropRecord.configuration.thread_count,
          dropEfficiency: dropRecord.derived.efficiency,
          speedupAtRecommended: dropRecord.derived.speedup,
          reason: `Efficiency fell to ${(dropRecord.derived.efficiency * 100).toFixed(1)}% (below 70% of peak ${(peakEfficiency * 100).toFixed(1)}%) at ${dropRecord.configuration.thread_count} threads.`,
        });
      } else {
        // Did not drop below 70% of peak within tested threads
        const maxTested = subset[subset.length - 1];
        recommendations.push({
          os,
          workloadName: wName,
          peakEfficiency,
          peakThreadCount,
          recommendedThreadCount: maxTested.configuration.thread_count,
          dropEfficiency: maxTested.derived.efficiency,
          speedupAtRecommended: maxTested.derived.speedup,
          reason: `Maintained high efficiency (>= ${(threshold70 * 100).toFixed(1)}%) through all tested threads (up to ${maxTested.configuration.thread_count} threads).`,
        });
      }
    }
  }

  return recommendations;
}

/**
 * Requirement 6: "An auto-generated written conclusion section comparing OSes on average
 * derived.speedup and derived.efficiency across all workloads, stating in plain sentences
 * which OS performed best and why (cite cpu_utilization_percent or context switches if the difference is explained by that)."
 */
export function generateOSComparisonReport(records: BenchmarkRecord[]) {
  const osList = getDistinctOSList(records);
  const workloads = getDistinctWorkloads(records);

  if (osList.length === 0) {
    return {
      summary: 'No benchmark data uploaded.',
      details: [],
      winner: null,
      stats: [],
      takeaways: [] as string[],
      paragraphs: [] as string[],
    };

  }

  // Calculate stats per OS
  const statsList: OSComparisonStats[] = osList.map((os) => {
    const osRecords = records.filter((r) => r.hardware.os === os);
    const hardware = osRecords[0]?.hardware || {
      os,
      cpu_model: 'Unknown',
      physical_cores: 0,
      logical_processors: 0,
      total_memory_bytes: 0,
    };

    const totalSpeedup = osRecords.reduce((acc, r) => acc + r.derived.speedup, 0);
    const totalEfficiency = osRecords.reduce((acc, r) => acc + r.derived.efficiency, 0);
    const totalCpuUtil = osRecords.reduce((acc, r) => acc + r.measurements.cpu_utilization_percent, 0);
    const totalInvoluntary = osRecords.reduce((acc, r) => acc + r.measurements.involuntary_context_switches, 0);
    const totalVoluntary = osRecords.reduce((acc, r) => acc + r.measurements.voluntary_context_switches, 0);

    const count = osRecords.length || 1;

    const workloadStats: OSComparisonStats['workloadStats'] = {};
    for (const wName of workloads) {
      const wRecords = osRecords.filter((r) => r.workload.name === wName);
      if (wRecords.length > 0) {
        const maxSpeedup = Math.max(...wRecords.map((r) => r.derived.speedup));
        const peakEff = Math.max(...wRecords.map((r) => r.derived.efficiency));
        const maxThreadRec = wRecords.reduce((prev, curr) =>
          curr.configuration.thread_count > prev.configuration.thread_count ? curr : prev
        );
        const avgCpu =
          wRecords.reduce((a, b) => a + b.measurements.cpu_utilization_percent, 0) / wRecords.length;

        workloadStats[wName] = {
          maxSpeedup,
          peakEfficiency: peakEff,
          maxThreadCount: maxThreadRec.configuration.thread_count,
          avgCpuUtilization: avgCpu,
          involuntarySwitchesAtMax: maxThreadRec.measurements.involuntary_context_switches,
        };
      }
    }

    return {
      os,
      hardware,
      avgSpeedup: totalSpeedup / count,
      avgEfficiency: totalEfficiency / count,
      avgCpuUtilization: totalCpuUtil / count,
      avgInvoluntarySwitches: totalInvoluntary / count,
      avgVoluntarySwitches: totalVoluntary / count,
      workloadStats,
    };
  });

  // Sort by composite score (speedup * efficiency)
  const sortedStats = [...statsList].sort((a, b) => {
    return b.avgSpeedup * b.avgEfficiency - a.avgSpeedup * a.avgEfficiency;
  });

  const best = sortedStats[0];
  const second = sortedStats.length > 1 ? sortedStats[1] : null;

  // Requirement 3: Short bulleted list of key findings only — one bullet per takeaway, each under 15 words.
  const takeaways: string[] = [];

  // Workload scaling extremes
  const allWorkloadPeaks = workloads.map((w) => {
    const vals = records.filter((r) => r.workload.name === w).map((r) => r.derived.speedup);
    return { name: w, peak: vals.length ? Math.max(...vals) : 1 };
  }).sort((a, b) => b.peak - a.peak);

  const bestWorkload = allWorkloadPeaks[0];
  const worstWorkload = allWorkloadPeaks[allWorkloadPeaks.length - 1];

  if (!second) {
    // Single OS
    const bestShort = getShortOSName(best.os);
    takeaways.push(`${bestShort}: ${best.avgSpeedup.toFixed(2)}x avg speedup, ${(best.avgEfficiency * 100).toFixed(1)}% avg efficiency`);
    takeaways.push(`Sustained average CPU core utilization of ${best.avgCpuUtilization.toFixed(1)}% across scaling runs`);
    if (bestWorkload && worstWorkload) {
      takeaways.push(`${bestWorkload.name} scaled highest (${bestWorkload.peak.toFixed(1)}x peak); ${worstWorkload.name} scaled lowest (${worstWorkload.peak.toFixed(1)}x)`);
    }
    takeaways.push(`Averaged ${Math.round(best.avgInvoluntarySwitches).toLocaleString()} involuntary context switches per run`);
  } else {
    // Multi-OS
    const bestShort = getShortOSName(best.os);
    const secondShort = getShortOSName(second.os);

    // Bullet 1: Overall winner
    takeaways.push(`${bestShort} wins overall: ${best.avgSpeedup.toFixed(2)}x avg speedup vs ${second.avgSpeedup.toFixed(2)}x (${secondShort})`);

    // Bullet 2: CPU utilization
    takeaways.push(`${bestShort} sustains higher CPU utilization: ${best.avgCpuUtilization.toFixed(1)}% vs ${second.avgCpuUtilization.toFixed(1)}%`);

    // Bullet 3: Context switch disparity if significant
    if (second.avgInvoluntarySwitches > best.avgInvoluntarySwitches * 1.5) {
      takeaways.push(`${secondShort} suffered ${Math.round(second.avgInvoluntarySwitches).toLocaleString()} involuntary switches/run vs ${Math.round(best.avgInvoluntarySwitches).toLocaleString()} on ${bestShort}`);
    }

    // Bullet 4: Best and worst scaling workloads
    if (bestWorkload && worstWorkload) {
      takeaways.push(`${bestWorkload.name} scales best (${bestWorkload.peak.toFixed(1)}x peak); ${worstWorkload.name} scales worst (${worstWorkload.peak.toFixed(1)}x)`);
    }
  }

  return {
    summary: takeaways.map((t) => `• ${t}`).join('\n'),
    paragraphs: takeaways,
    takeaways,
    winner: best.os,
    stats: sortedStats,
  };
}


/**
 * Requirement: ANOMALY CALLOUTS
 * Scan each workload's speedup values across thread counts.
 * If any workload's speedup ever drops below 1.0x (slower than single-threaded)
 * or efficiency drops below 15% at any point, produce an informational anomaly callout.
 */
export function detectAnomalies(records: BenchmarkRecord[]): WorkloadAnomaly[] {
  const anomalies: WorkloadAnomaly[] = [];

  // 1. Sub-1.0x Speedup (slower than single-threaded baseline)
  const sub1xRecords = records.filter((r) => r.derived.speedup < 1.0);
  const sub1xMap = new Map<string, BenchmarkRecord[]>();
  for (const r of sub1xRecords) {
    const key = `${r.workload.name}||${r.hardware.os}`;
    if (!sub1xMap.has(key)) sub1xMap.set(key, []);
    sub1xMap.get(key)!.push(r);
  }

  for (const [key, items] of sub1xMap.entries()) {
    const [wName, os] = key.split('||');
    items.sort((a, b) => a.configuration.thread_count - b.configuration.thread_count);

    for (const item of items) {
      const shortOS = getShortOSName(os);
      let conciseCause = 'Thread synchronization overhead exceeds parallel gain';
      if (wName === 'Compression') {
        conciseCause = 'I/O contention, not CPU-bound';
      } else if (wName === 'Merge sort') {
        conciseCause = 'Partitioning sync overhead exceeds single-threaded sort';
      }

      const singleLine = `${wName} @ ${item.configuration.thread_count} threads (${shortOS}): ${item.derived.speedup.toFixed(2)}x speedup — ${conciseCause}`;

      anomalies.push({
        id: `sub1x-${wName}-${os}-${item.configuration.thread_count}`,
        workload: wName,
        os,
        type: 'sub_1x_speedup',
        threadCount: item.configuration.thread_count,
        speedup: item.derived.speedup,
        efficiency: item.derived.efficiency,
        message: `${wName} shows sub-1x speedup (${item.derived.speedup.toFixed(2)}x) at ${item.configuration.thread_count} threads`,
        likelyCause: conciseCause,
        singleLine,
      });
    }
  }

  // 2. Parallel Efficiency Drops Below 15% (< 0.15)
  const lowEffRecords = records.filter((r) => r.derived.efficiency < 0.15);
  const lowEffMap = new Map<string, BenchmarkRecord[]>();
  for (const r of lowEffRecords) {
    const key = `${r.workload.name}||${r.hardware.os}`;
    if (!lowEffMap.has(key)) lowEffMap.set(key, []);
    lowEffMap.get(key)!.push(r);
  }

  for (const [key, items] of lowEffMap.entries()) {
    const [wName, os] = key.split('||');
    items.sort((a, b) => a.configuration.thread_count - b.configuration.thread_count);
    const first = items[0];
    const worst = items.reduce((prev, curr) => curr.derived.efficiency < prev.derived.efficiency ? curr : prev);
    const threadCounts = Array.from(new Set(items.map((i) => i.configuration.thread_count))).sort((a, b) => a - b);
    const shortOS = getShortOSName(os);

    const minT = threadCounts[0];
    const maxT = threadCounts[threadCounts.length - 1];
    const threadStr = minT === maxT ? `${minT} threads` : `${minT}–${maxT} threads`;
    const minEff = worst.derived.efficiency;
    const effStr = `${(minEff * 100).toFixed(1)}% ${minT !== maxT ? 'min ' : ''}efficiency`;

    let conciseCause = 'Thread contention & cache thrashing';
    if (wName === 'Compression') {
      conciseCause = 'I/O serialization & write contention';
    } else if (wName === 'Matrix multiplication') {
      conciseCause = 'Memory bandwidth saturation beyond physical cores';
    } else if (wName === 'Merge sort') {
      conciseCause = 'Memory bus contention & barrier sync';
    } else if (wName === 'Prime generation' || wName === 'Image processing') {
      conciseCause = 'Over-subscription & thread preemption';
    }

    const singleLine = `${wName} @ ${threadStr} (${shortOS}): ${effStr} — ${conciseCause}`;

    anomalies.push({
      id: `loweff-${wName}-${os}-${first.configuration.thread_count}`,
      workload: wName,
      os,
      type: 'sub_15pct_efficiency',
      threadCount: first.configuration.thread_count,
      allThreadCounts: threadCounts,
      speedup: first.derived.speedup,
      efficiency: worst.derived.efficiency,
      message: `${wName} efficiency drops below 15% at ${threadStr}`,
      likelyCause: conciseCause,
      singleLine,
    });
  }

  return anomalies;
}

/**
 * Requirement: WORKLOAD CLASSIFICATION
 * Groups the workloads into two categories based on their scaling behavior:
 * - "Compute-bound (scales well)": workloads whose speedup keeps increasing up to at least 8-12 threads before plateauing
 * - "I/O or memory-bound (scales poorly)": workloads whose speedup plateaus or drops early (before 6 threads)
 */
export function classifyWorkloads(records: BenchmarkRecord[]): {
  computeBound: ClassifiedWorkload[];
  ioMemoryBound: ClassifiedWorkload[];
} {
  const workloads = getDistinctWorkloads(records);
  const computeBound: ClassifiedWorkload[] = [];
  const ioMemoryBound: ClassifiedWorkload[] = [];

  for (const wName of workloads) {
    const wRecs = records.filter((r) => r.workload.name === wName);
    if (wRecs.length === 0) continue;

    // Aggregate average speedup per thread count
    const tcMap = new Map<number, number[]>();
    for (const r of wRecs) {
      const tc = r.configuration.thread_count;
      if (!tcMap.has(tc)) tcMap.set(tc, []);
      tcMap.get(tc)!.push(r.derived.speedup);
    }

    const sortedTcs = Array.from(tcMap.keys()).sort((a, b) => a - b);
    const avgSpeedups = sortedTcs.map((tc) => {
      const vals = tcMap.get(tc)!;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { tc, speedup: avg };
    });

    const maxSpeedupObj = avgSpeedups.reduce((prev, curr) =>
      curr.speedup > prev.speedup ? curr : prev
    );
    const peakSpeedup = maxSpeedupObj.speedup;
    const peakThreadCount = maxSpeedupObj.tc;

    // Check speedup at <= 6 threads vs >= 8 threads
    const le6 = avgSpeedups.filter((x) => x.tc <= 6);
    const ge8 = avgSpeedups.filter((x) => x.tc >= 8);
    const maxLe6 = le6.length ? Math.max(...le6.map((x) => x.speedup)) : 1.0;
    const maxGe8 = ge8.length ? Math.max(...ge8.map((x) => x.speedup)) : maxLe6;

    const gainBeyond6 = maxGe8 - maxLe6;
    const relativeGain = maxLe6 > 0 ? gainBeyond6 / maxLe6 : 0;

    // Find earliest thread count where speedup reaches >= 90% of peak speedup
    const plateauObj = avgSpeedups.find((x) => x.speedup >= 0.9 * peakSpeedup) || maxSpeedupObj;
    const plateauThreadCount = plateauObj.tc;

    // Classification criteria:
    // Compute-bound (scales well): speedup keeps increasing up to at least 8-12 threads before plateauing
    // I/O or memory-bound (scales poorly): speedup plateaus or drops early (before 6 threads)
    const isComputeBound =
      peakThreadCount >= 8 &&
      (gainBeyond6 > 0.35 || relativeGain > 0.15) &&
      peakSpeedup >= 1.8;

    if (isComputeBound) {
      computeBound.push({
        name: wName,
        category: 'compute_bound',
        peakSpeedup,
        peakThreadCount,
        plateauThreadCount,
        gainBeyond6,
        relativeGain,
        bullets: [
          `Peak ${peakSpeedup.toFixed(2)}x @ ${peakThreadCount} threads`,
          `+${(relativeGain * 100).toFixed(0)}% speedup beyond 6 threads`,
          'No serial bottlenecks',
        ],
        description: `Peak ${peakSpeedup.toFixed(2)}x @ ${peakThreadCount}T · +${(relativeGain * 100).toFixed(0)}% beyond 6T`,
      });
    } else {
      ioMemoryBound.push({
        name: wName,
        category: 'io_memory_bound',
        peakSpeedup,
        peakThreadCount,
        plateauThreadCount,
        gainBeyond6,
        relativeGain,
        bullets: [
          `Peak ${peakSpeedup.toFixed(2)}x (plateaus @ ${plateauThreadCount} threads)`,
          `Only +${(Math.max(0, relativeGain) * 100).toFixed(0)}% speedup beyond 6 threads`,
          'I/O lock contention & write serialization',
        ],
        description: `Peak ${peakSpeedup.toFixed(2)}x (plateaus @ ${plateauThreadCount}T) · Limited by I/O write contention`,
      });
    }
  }

  // Sort by peak speedup descending
  computeBound.sort((a, b) => b.peakSpeedup - a.peakSpeedup);
  ioMemoryBound.sort((a, b) => b.peakSpeedup - a.peakSpeedup);

  return { computeBound, ioMemoryBound };
}


