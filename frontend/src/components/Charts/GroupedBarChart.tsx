import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { BenchmarkRecord } from '../../types/benchmark';
import {
  findHighestCommonThreadCount,
  prepareGroupedBarData,
  getDistinctOSList,
} from '../../utils/analysis';
import { getOSColor, getFriendlyOSName } from '../../utils/formatters';
import { useTheme } from '../../context/useTheme';

interface GroupedBarChartProps {
  records: BenchmarkRecord[];
}

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({ records }) => {
  const { isDark } = useTheme();
  const [metric, setMetric] = useState<'speedup' | 'efficiency' | 'wall_time_microseconds'>('speedup');
  const [scaleMode, setScaleMode] = useState<'log' | 'linear'>('log');

  const highestCommonThreads = findHighestCommonThreadCount(records);
  const osList = getDistinctOSList(records);

  const barData = useMemo(() => {
    if (!records.length || highestCommonThreads === null) return [];
    return prepareGroupedBarData(records, highestCommonThreads, metric);
  }, [records, highestCommonThreads, metric]);

  const isWallTime = metric === 'wall_time_microseconds';

  // Calculate maximum wall time value to dynamically generate the best scale domain and ticks
  const maxWallTime = useMemo(() => {
    if (!isWallTime) return 0;
    let max = 0;
    for (const row of barData) {
      for (const os of osList) {
        const val = Number(row[os]);
        if (!isNaN(val) && val > max) max = val;
      }
    }
    return max;
  }, [barData, osList, isWallTime]);

  // Logarithmic / symlog ticks spanning orders of magnitude
  const symlogTicks = useMemo(() => {
    if (!isWallTime) return undefined;
    const allMilestones = [10, 50, 200, 1000, 5000, 10000, 25000, 50000, 100000, 500000];
    const ticks = [0];
    for (const m of allMilestones) {
      ticks.push(m);
      if (m >= maxWallTime) break;
    }
    return ticks;
  }, [isWallTime, maxWallTime]);

  if (!records.length || highestCommonThreads === null) {
    return null;
  }

  const axisStroke = isDark ? '#475569' : '#64748b';
  const gridStroke = isDark ? '#1c2333' : '#e2e8f0';
  const tickFill = isDark ? '#94a3b8' : '#475569';

  return (
    <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2737] rounded-lg p-5 lg:p-6 space-y-5 shadow-xs transition-colors">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-[#1f2737] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Cross-Platform Workload Comparison
            </span>
            <span className="text-slate-300 dark:text-[#334155] font-mono">/</span>
            <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
              Highest Common Concurrency: T = {highestCommonThreads}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Grouped side-by-side comparison across all 5 benchmark suites evaluated at the highest common thread count ({highestCommonThreads} threads) across active platforms.
          </p>
        </div>

        {/* Right side controls: Scale Mode (when Wall Time) + Metric Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scale mode toggle for Wall Time */}
          {isWallTime && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0d1017] p-1 rounded-md border border-slate-200 dark:border-[#222a3a] text-xs font-mono">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold px-1.5">
                Scale:
              </span>
              <button
                onClick={() => setScaleMode('log')}
                className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
                  scaleMode === 'log'
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Logarithmic scale reduces gaps so fast and slow workloads are both visible"
              >
                Log (log₁₀)
              </button>
              <button
                onClick={() => setScaleMode('linear')}
                className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
                  scaleMode === 'linear'
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Linear scale shows absolute raw millisecond gap"
              >
                Linear
              </button>
            </div>
          )}

          {/* Metric Selector Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-[#0d1017] p-1 rounded-md border border-slate-200 dark:border-[#222a3a] text-xs font-mono">
            <button
              onClick={() => setMetric('speedup')}
              className={`px-3 py-1 rounded transition-colors ${
                metric === 'speedup'
                  ? 'bg-white dark:bg-[#1e2638] text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Speedup
            </button>
            <button
              onClick={() => setMetric('efficiency')}
              className={`px-3 py-1 rounded transition-colors ${
                metric === 'efficiency'
                  ? 'bg-white dark:bg-[#1e2638] text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Efficiency
            </button>
            <button
              onClick={() => setMetric('wall_time_microseconds')}
              className={`px-3 py-1 rounded transition-colors ${
                metric === 'wall_time_microseconds'
                  ? 'bg-white dark:bg-[#1e2638] text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Wall Time (ms)
            </button>
          </div>
        </div>
      </div>

      {/* Analytical Callout Banner when Log Scale is Active */}
      {isWallTime && scaleMode === 'log' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 text-[11px] font-mono text-sky-900 dark:text-sky-200">
          <span className="font-semibold uppercase tracking-wider text-[10px] bg-sky-600 text-white px-1.5 py-0.5 rounded">
            Scale Compressed (log₁₀)
          </span>
          <span>
            Orders-of-magnitude gaps are reduced so short workloads (Merge sort: ~13ms–73ms, Image processing: ~8ms–119ms) and long workloads (Compression: ~530ms–8,477ms) can be compared clearly across all 3 platforms.
          </span>
        </div>
      )}

      <div className="h-80 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 10, right: 15, left: -5, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 2" stroke={gridStroke} />
            <XAxis
              dataKey="workload"
              stroke={axisStroke}
              tick={{ fill: tickFill, fontSize: 11, fontFamily: 'Inter' }}
              interval={0}
            />
            <YAxis
              scale={isWallTime && scaleMode === 'log' ? 'symlog' : 'auto'}
              domain={isWallTime && scaleMode === 'log' && symlogTicks ? [0, symlogTicks[symlogTicks.length - 1]] : [0, 'auto']}
              ticks={isWallTime && scaleMode === 'log' ? symlogTicks : undefined}
              stroke={axisStroke}
              tick={{ fill: axisStroke, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              tickFormatter={(val) => {
                if (metric === 'speedup') return `${val}x`;
                if (metric === 'efficiency') return `${(val * 100).toFixed(0)}%`;
                return `${Number(val).toLocaleString()}ms`;
              }}
              width={65}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="bg-white dark:bg-[#0f131a] border border-slate-200 dark:border-[#232b3b] rounded p-2.5 text-xs text-slate-800 dark:text-slate-200 space-y-2 shadow-lg">
                    <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-[#232b3b] pb-1 flex justify-between gap-4">
                      <span className="font-semibold">{label}</span>
                      <span className="text-sky-600 dark:text-sky-400 font-bold">T = {highestCommonThreads}</span>
                    </div>
                    {payload.map((entry: any, index: number) => {
                      const osName = entry.dataKey;
                      const raw = entry.payload?.[`${osName}_raw`];
                      const osColor = getOSColor(osName, isDark);

                      return (
                        <div key={index} className="flex justify-between items-center gap-4">
                          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <span
                              className="w-2 h-2 rounded-xs inline-block"
                              style={{ backgroundColor: osColor }}
                            />
                            {getFriendlyOSName(osName)}:
                          </span>
                          <div className="text-right font-mono">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {metric === 'speedup' && `${Number(entry.value).toFixed(2)}x`}
                              {metric === 'efficiency' && `${(Number(entry.value) * 100).toFixed(1)}%`}
                              {metric === 'wall_time_microseconds' && `${Number(entry.value).toFixed(1)} ms`}
                            </span>
                            {raw && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {raw.measurements.cpu_utilization_percent.toFixed(0)}% CPU · {raw.measurements.involuntary_context_switches} invol sw
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              height={28}
              formatter={(value) => (
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-mono mr-3">
                  {getFriendlyOSName(value)}
                </span>
              )}
            />
            {osList.map((os) => (
              <Bar
                key={os}
                dataKey={os}
                fill={getOSColor(os, isDark)}
                radius={[2, 2, 0, 0]}
                maxBarSize={48}
                minPointSize={isWallTime && scaleMode === 'log' ? 4 : 0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

