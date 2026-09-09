import React, { useState } from 'react';
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

interface GroupedBarChartProps {
  records: BenchmarkRecord[];
}

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({ records }) => {
  const [metric, setMetric] = useState<'speedup' | 'efficiency' | 'wall_time_microseconds'>('speedup');

  const highestCommonThreads = findHighestCommonThreadCount(records);
  const osList = getDistinctOSList(records);

  if (!records.length || highestCommonThreads === null) {
    return null;
  }

  const barData = prepareGroupedBarData(records, highestCommonThreads, metric);

  const axisStroke = '#475569';
  const gridStroke = '#1c2333';

  return (
    <div className="bg-[#121620] border border-[#1f2737] rounded-lg p-5 lg:p-6 space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f2737] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
              Cross-Platform Workload Comparison
            </span>
            <span className="text-[#334155] font-mono">/</span>
            <span className="font-mono text-[11px] text-sky-400">
              Highest Common Concurrency: T = {highestCommonThreads}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Grouped side-by-side comparison across all 5 benchmark suites evaluated at the highest common thread count ({highestCommonThreads} threads) across active platforms.
          </p>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center bg-[#0d1017] p-1 rounded-md border border-[#222a3a] text-xs font-mono">
          <button
            onClick={() => setMetric('speedup')}
            className={`px-3 py-1 rounded transition-colors ${
              metric === 'speedup'
                ? 'bg-[#1e2638] text-slate-100 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Speedup
          </button>
          <button
            onClick={() => setMetric('efficiency')}
            className={`px-3 py-1 rounded transition-colors ${
              metric === 'efficiency'
                ? 'bg-[#1e2638] text-slate-100 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Efficiency
          </button>
          <button
            onClick={() => setMetric('wall_time_microseconds')}
            className={`px-3 py-1 rounded transition-colors ${
              metric === 'wall_time_microseconds'
                ? 'bg-[#1e2638] text-slate-100 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Wall Time (ms)
          </button>
        </div>
      </div>

      <div className="h-80 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 10, right: 15, left: -5, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 2" stroke={gridStroke} />
            <XAxis
              dataKey="workload"
              stroke={axisStroke}
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Inter' }}
              interval={0}
            />
            <YAxis
              stroke={axisStroke}
              tick={{ fill: axisStroke, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              tickFormatter={(val) => {
                if (metric === 'speedup') return `${val}x`;
                if (metric === 'efficiency') return `${(val * 100).toFixed(0)}%`;
                return `${val}ms`;
              }}
              width={55}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="bg-[#0f131a] border border-[#232b3b] rounded p-2.5 text-xs text-slate-200 space-y-2">
                    <div className="font-mono text-[11px] text-slate-300 border-b border-[#232b3b] pb-1 flex justify-between gap-4">
                      <span>{label}</span>
                      <span className="text-sky-400">T = {highestCommonThreads}</span>
                    </div>
                    {payload.map((entry: any, index: number) => {
                      const osName = entry.dataKey;
                      const raw = entry.payload?.[`${osName}_raw`];
                      const osColor = getOSColor(osName);

                      return (
                        <div key={index} className="flex justify-between items-center gap-4">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <span
                              className="w-2 h-2 rounded-xs inline-block"
                              style={{ backgroundColor: osColor }}
                            />
                            {getFriendlyOSName(osName)}:
                          </span>
                          <div className="text-right font-mono">
                            <span className="font-bold text-slate-100">
                              {metric === 'speedup' && `${Number(entry.value).toFixed(2)}x`}
                              {metric === 'efficiency' && `${(Number(entry.value) * 100).toFixed(1)}%`}
                              {metric === 'wall_time_microseconds' && `${Number(entry.value).toFixed(1)} ms`}
                            </span>
                            {raw && (
                              <div className="text-[10px] text-slate-400">
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
                <span className="text-[11px] text-slate-300 font-mono mr-3">
                  {getFriendlyOSName(value)}
                </span>
              )}
            />
            {osList.map((os) => (
              <Bar
                key={os}
                dataKey={os}
                fill={getOSColor(os)}
                radius={[2, 2, 0, 0]}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
