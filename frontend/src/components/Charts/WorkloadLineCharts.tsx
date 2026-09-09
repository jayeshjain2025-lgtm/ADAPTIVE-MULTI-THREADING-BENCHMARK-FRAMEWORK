import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { BenchmarkRecord } from '../../types/benchmark';
import { prepareLineChartData } from '../../utils/analysis';
import { getOSColor, getFriendlyOSName, formatTime } from '../../utils/formatters';
import { CustomChartTooltip } from './CustomChartTooltip';
import { Clock, Cpu, TrendingUp, Gauge } from 'lucide-react';

interface WorkloadLineChartsProps {
  records: BenchmarkRecord[];
  selectedWorkload: string;
}

export const WorkloadLineCharts: React.FC<WorkloadLineChartsProps> = ({
  records,
  selectedWorkload,
}) => {
  const [useLogScale, setUseLogScale] = useState(false);

  const { timeData, cpuData, speedupData, efficiencyData, threadCounts, osList } =
    prepareLineChartData(records, selectedWorkload);

  if (!records.length || !osList.length) {
    return (
      <div className="bg-[#121620] border border-[#1f2737] rounded-lg p-6 text-center text-slate-500 font-mono text-xs">
        NO TELEMETRY AVAILABLE FOR WORKLOAD: {selectedWorkload}
      </div>
    );
  }

  // Common technical styling
  const axisStroke = '#475569';
  const gridStroke = '#1c2333';

  return (
    <div className="bg-[#121620] border border-[#1f2737] rounded-lg p-5 lg:p-6 space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f2737] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
              Workload Scaling Performance
            </span>
            <span className="text-[#334155] font-mono">/</span>
            <span className="font-mono text-[11px] text-sky-400">
              {selectedWorkload}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing parallel speedup, wall clock execution time, CPU core utilization, and efficiency from {threadCounts[0]} to {threadCounts[threadCounts.length - 1]} threads across {osList.length} platforms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer font-mono bg-[#151a26] border border-[#232c3d] px-3 py-1.5 rounded-md hover:border-[#2f3b50] transition-colors">
            <input
              type="checkbox"
              checked={useLogScale}
              onChange={(e) => setUseLogScale(e.target.checked)}
              className="rounded bg-[#0d1017] border-[#2d3950] text-sky-500 focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-slate-300 text-[11px]">Logarithmic Time Scale</span>
          </label>
        </div>
      </div>

      {/* Clean 2x2 Equal-Sized Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Execution Time vs Threads */}
        <div className="bg-[#151a26] border border-[#222b3b] rounded-md p-5 flex flex-col justify-between h-[360px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <span className="font-mono text-xs font-bold text-slate-200 uppercase block">
                  Execution Time vs Threads
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  wall_time_microseconds (lower is better)
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-slate-500">time</span>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData} margin={{ top: 8, right: 15, left: -5, bottom: 15 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={gridStroke} />
                <XAxis
                  dataKey="thread_count"
                  stroke={axisStroke}
                  tick={{ fill: axisStroke, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  label={{
                    value: 'Thread Count',
                    position: 'insideBottom',
                    offset: -10,
                    fill: axisStroke,
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <YAxis
                  scale={useLogScale ? 'log' : 'auto'}
                  domain={useLogScale ? ['auto', 'auto'] : [0, 'auto']}
                  stroke={axisStroke}
                  tick={{ fill: axisStroke, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(val) => formatTime(val)}
                  width={65}
                />
                <Tooltip content={<CustomChartTooltip metricType="time" />} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  formatter={(value) => (
                    <span className="text-[11px] text-slate-300 font-mono mr-2">
                      {getFriendlyOSName(value)}
                    </span>
                  )}
                />
                {osList.map((os) => (
                  <Line
                    key={os}
                    type="monotone"
                    dataKey={os}
                    stroke={getOSColor(os)}
                    strokeWidth={2}
                    dot={{ fill: getOSColor(os), r: 3 }}
                    activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1.5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: CPU Usage vs Threads */}
        <div className="bg-[#151a26] border border-[#222b3b] rounded-md p-5 flex flex-col justify-between h-[360px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-400" />
              <div>
                <span className="font-mono text-xs font-bold text-slate-200 uppercase block">
                  CPU Utilization vs Threads
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  cpu_utilization_percent (100% = 1 core saturation)
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-slate-500">utilization</span>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cpuData} margin={{ top: 8, right: 15, left: -5, bottom: 15 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={gridStroke} />
                <XAxis
                  dataKey="thread_count"
                  stroke={axisStroke}
                  tick={{ fill: axisStroke, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  label={{
                    value: 'Thread Count',
                    position: 'insideBottom',
                    offset: -10,
                    fill: axisStroke,
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <YAxis
                  stroke={axisStroke}
                  tick={{ fill: axisStroke, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(val) => `${val}%`}
                  width={55}
                />
                <Tooltip content={<CustomChartTooltip metricType="cpu" />} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  formatter={(value) => (
                    <span className="text-[11px] text-slate-300 font-mono mr-2">
                      {getFriendlyOSName(value)}
                    </span>
                  )}
                />
                {osList.map((os) => (
                  <Line
                    key={os}
                    type="monotone"
                    dataKey={os}
                    stroke={getOSColor(os)}
                    strokeWidth={2}
                    dot={{ fill: getOSColor(os), r: 3 }}
                    activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1.5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Speedup vs Threads */}
        <div className="bg-[#151a26] border border-[#222b3b] rounded-md p-5 flex flex-col justify-between h-[360px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <div>
                <span className="font-mono text-xs font-bold text-slate-200 uppercase block">
                  Speedup vs Threads
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  derived.speedup (T₁ / Tₙ, higher is better)
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-slate-500">ratio</span>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={speedupData} margin={{ top: 8, right: 15, left: -5, bottom: 15 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={gridStroke} />
                <XAxis
                  dataKey="thread_count"
                  stroke={axisStroke}
                  tick={{ fill: axisStroke, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  label={{
                    value: 'Thread Count',
                    position: 'insideBottom',
                    offset: -10,
                    fill: axisStroke,
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <YAxis
                  stroke={axisStroke}
                  tick={{ fill: axisStroke, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(val) => `${val}x`}
                  width={45}
                />
                <Tooltip content={<CustomChartTooltip metricType="speedup" />} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  formatter={(value) => {
                    if (value === 'ideal_linear') return <span className="text-[10px] font-mono text-slate-500 italic">Ideal Linear</span>;
                    return (
                      <span className="text-[11px] text-slate-300 font-mono mr-2">
                        {getFriendlyOSName(value)}
                      </span>
                    );
                  }}
                />
                {/* Reference line: Ideal Linear Speedup */}
                <Line
                  type="monotone"
                  dataKey="ideal_linear"
                  name="Ideal Linear"
                  stroke="#475569"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  dot={false}
                />
                {osList.map((os) => (
                  <Line
                    key={os}
                    type="monotone"
                    dataKey={os}
                    stroke={getOSColor(os)}
                    strokeWidth={2}
                    dot={{ fill: getOSColor(os), r: 3 }}
                    activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1.5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Efficiency vs Threads */}
        <div className="bg-[#151a26] border border-[#222b3b] rounded-md p-5 flex flex-col justify-between h-[360px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-slate-400" />
              <div>
                <span className="font-mono text-xs font-bold text-slate-200 uppercase block">
                  Parallel Efficiency vs Threads
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  derived.efficiency (Speedup / Threads)
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-rose-400">70% target</span>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={efficiencyData} margin={{ top: 8, right: 15, left: -5, bottom: 15 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={gridStroke} />
                <XAxis
                  dataKey="thread_count"
                  stroke={axisStroke}
                  tick={{ fill: axisStroke, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  label={{
                    value: 'Thread Count',
                    position: 'insideBottom',
                    offset: -10,
                    fill: axisStroke,
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <YAxis
                  stroke={axisStroke}
                  tick={{ fill: axisStroke, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                  domain={[0, (dataMax: number) => Math.max(1.1, Number((dataMax * 1.1).toFixed(1)))]}
                  width={45}
                />
                <Tooltip content={<CustomChartTooltip metricType="efficiency" />} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  formatter={(value) => {
                    if (value === 'threshold_70') return null;
                    return (
                      <span className="text-[11px] text-slate-300 font-mono mr-2">
                        {getFriendlyOSName(value)}
                      </span>
                    );
                  }}
                />
                {/* 70% efficiency threshold line */}
                <ReferenceLine
                  y={0.7}
                  stroke="#f43f5e"
                  strokeDasharray="3 3"
                  label={{
                    value: '70% Threshold',
                    fill: '#f43f5e',
                    fontSize: 9,
                    position: 'insideTopRight',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                {/* 100% baseline */}
                <ReferenceLine y={1.0} stroke="#334155" strokeDasharray="2 2" />

                {osList.map((os) => (
                  <Line
                    key={os}
                    type="monotone"
                    dataKey={os}
                    stroke={getOSColor(os)}
                    strokeWidth={2}
                    dot={{ fill: getOSColor(os), r: 3 }}
                    activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1.5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
