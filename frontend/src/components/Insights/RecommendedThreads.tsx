import React, { useState } from 'react';
import type { BenchmarkRecord } from '../../types/benchmark';
import { computeRecommendations } from '../../utils/analysis';
import { getFriendlyOSName, getOSColor } from '../../utils/formatters';
import { useTheme } from '../../context/useTheme';

interface RecommendedThreadsProps {
  records: BenchmarkRecord[];
  selectedWorkload: string;
}

export const RecommendedThreads: React.FC<RecommendedThreadsProps> = ({
  records,
  selectedWorkload,
}) => {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'selected' | 'all'>('selected');
  const recommendations = computeRecommendations(records);

  if (!recommendations.length) return null;

  const currentRecs = recommendations.filter((r) => r.workloadName === selectedWorkload);

  return (
    <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2737] rounded-lg p-5 lg:p-6 space-y-5 shadow-xs transition-colors">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-[#1f2737] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Concurrency Recommendations
            </span>
            <span className="text-slate-300 dark:text-[#334155] font-mono">/</span>
            <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
              70% Peak Efficiency Cutoff
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Recommends the thread count where parallel efficiency drops below 70% of peak observed efficiency for that workload and operating system.
          </p>
        </div>

        {/* Toggle between Selected vs All */}
        <div className="flex items-center bg-slate-100 dark:bg-[#0d1017] p-1 rounded-md border border-slate-200 dark:border-[#222a3a] text-xs font-mono">
          <button
            onClick={() => setViewMode('selected')}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === 'selected'
                ? 'bg-white dark:bg-[#1e2638] text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {selectedWorkload}
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === 'all'
                ? 'bg-white dark:bg-[#1e2638] text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All 5 Workloads Matrix
          </button>
        </div>
      </div>

      {viewMode === 'selected' ? (
        /* Clean Row of Recommendation Cards with generous padding */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentRecs.map((rec) => {
            const osColor = getOSColor(rec.os, isDark);
            const threshold = rec.peakEfficiency * 0.7;

            return (
              <div
                key={rec.os}
                className="bg-slate-50/70 dark:bg-[#151a26] border border-slate-200 dark:border-[#222b3b] rounded-md p-5 flex flex-col justify-between"
              >
                <div>
                  {/* OS title */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-[#202838]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs flex-shrink-0"
                        style={{ backgroundColor: osColor }}
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate" title={rec.os}>
                        {getFriendlyOSName(rec.os)}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      T_peak = {rec.peakThreadCount}
                    </span>
                  </div>

                  {/* Prominent Recommended Metric */}
                  <div className="flex items-baseline justify-between py-1 mb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Recommended Threads
                      </span>
                      <div className="font-mono text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-baseline gap-1.5 mt-0.5">
                        <span>{rec.recommendedThreadCount}</span>
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">threads</span>
                      </div>
                    </div>

                    {rec.speedupAtRecommended && (
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                          Speedup Achieved
                        </span>
                        <div className="font-mono text-lg font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                          {rec.speedupAtRecommended.toFixed(2)}x
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Numerical Grid in JetBrains Mono */}
                  <div className="bg-slate-100/80 dark:bg-[#0f131c] border border-slate-200 dark:border-[#1d2433] rounded p-3 text-[11px] font-mono space-y-1.5">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Observed Peak Efficiency:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {(rec.peakEfficiency * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>70% Drop-off Threshold:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        {(threshold * 100).toFixed(1)}%
                      </span>
                    </div>
                    {rec.dropEfficiency && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Efficiency at Recommended:</span>
                        <span className="text-slate-900 dark:text-slate-100 font-bold">
                          {(rec.dropEfficiency * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-[#202838] text-[11px] font-mono text-slate-600 dark:text-slate-400 leading-snug">
                  {rec.reason}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Full Matrix View */
        <div className="overflow-x-auto rounded border border-slate-200 dark:border-[#222b3b]">
          <table className="w-full text-left">
            <thead className="bg-slate-100 dark:bg-[#0f131c] text-slate-600 dark:text-slate-400 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-[#222b3b]">
              <tr>
                <th className="py-2.5 px-3.5">Workload</th>
                <th className="py-2.5 px-3.5">Platform</th>
                <th className="py-2.5 px-3.5 text-right">Peak Efficiency</th>
                <th className="py-2.5 px-3.5 text-right">70% Threshold</th>
                <th className="py-2.5 px-3.5 text-center">Recommended</th>
                <th className="py-2.5 px-3.5 text-right">Speedup</th>
                <th className="py-2.5 px-3.5">Scaling Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#1e2637] font-mono text-[11px]">
              {recommendations.map((rec, i) => {
                const threshold = rec.peakEfficiency * 0.7;
                const osColor = getOSColor(rec.os, isDark);
                return (
                  <tr
                    key={i}
                    className={`hover:bg-slate-50 dark:hover:bg-[#161c28] transition-colors ${
                      rec.workloadName === selectedWorkload ? 'bg-sky-50/50 dark:bg-[#151d2c]' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-sans text-slate-800 dark:text-slate-200 font-medium">
                      {rec.workloadName}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: osColor }} />
                        {getFriendlyOSName(rec.os)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-emerald-600 dark:text-emerald-400">
                      {(rec.peakEfficiency * 100).toFixed(1)}% (T={rec.peakThreadCount})
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-amber-600 dark:text-amber-400">
                      {(threshold * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded bg-sky-100 dark:bg-[#1f293d] border border-sky-300 dark:border-[#2e3c54] text-sky-700 dark:text-sky-300 font-bold">
                        {rec.recommendedThreadCount} T
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-slate-900 dark:text-slate-200 font-bold">
                      {rec.speedupAtRecommended ? `${rec.speedupAtRecommended.toFixed(2)}x` : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 text-[11px]">
                      {rec.reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

  );
};
