import React, { useState } from 'react';
import type { BenchmarkRecord } from '../../types/benchmark';
import {
  generateOSComparisonReport,
  detectAnomalies,
  classifyWorkloads,
} from '../../utils/analysis';
import { getFriendlyOSName, getOSColor } from '../../utils/formatters';
import {
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Cpu,
  HardDrive,
} from 'lucide-react';

interface WrittenConclusionProps {
  records: BenchmarkRecord[];
}

export const WrittenConclusion: React.FC<WrittenConclusionProps> = ({ records }) => {
  const [copied, setCopied] = useState(false);
  const [expandedOS, setExpandedOS] = useState<Set<string>>(new Set());
  const [showAllPatterns, setShowAllPatterns] = useState(false);
  const report = generateOSComparisonReport(records);
  const anomalies = detectAnomalies(records);
  const classification = classifyWorkloads(records);

  if (!records.length || !report.stats.length) return null;

  const handleCopy = () => {
    let fullReportText = `EXECUTIVE TELEMETRY SUMMARY:\n` +
      report.takeaways.map((t) => `• ${t}`).join('\n');

    if (anomalies.length > 0) {
      fullReportText += `\n\nNOTABLE PERFORMANCE PATTERNS:\n` +
        anomalies.map((a) => `• ${a.singleLine}`).join('\n');
    }

    fullReportText += `\n\nWORKLOAD SCALING CLASSIFICATION:\n` +
      `• Compute-bound: ${classification.computeBound.map((c) => `${c.name} (${c.peakSpeedup.toFixed(2)}x peak @ ${c.peakThreadCount}T)`).join(', ')}\n` +
      `• I/O or memory-bound: ${classification.ioMemoryBound.map((c) => `${c.name} (${c.peakSpeedup.toFixed(2)}x peak, plateaus @ ${c.plateauThreadCount}T)`).join(', ')}`;

    navigator.clipboard.writeText(fullReportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  const toggleOS = (os: string) => {
    setExpandedOS((prev) => {
      const next = new Set(prev);
      if (next.has(os)) {
        next.delete(os);
      } else {
        next.add(os);
      }
      return next;
    });
  };

  // Determine top (best) values per column across platforms
  const bestSpeedup = Math.max(...report.stats.map((s) => s.avgSpeedup));
  const bestEfficiency = Math.max(...report.stats.map((s) => s.avgEfficiency));
  const bestCpuUtil = Math.max(...report.stats.map((s) => s.avgCpuUtilization));
  // For involuntary context switches, fewer preemption interrupts is optimal
  const bestInvoluntarySwitches = Math.min(...report.stats.map((s) => s.avgInvoluntarySwitches));

  return (
    <div className="bg-[#121620] border border-[#1f2737] rounded-lg p-5 lg:p-6 space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f2737] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
              Analytical Conclusion
            </span>
            <span className="text-[#334155] font-mono">/</span>
            <span className="font-mono text-[11px] text-sky-400">
              Cross-Platform Scaling Evaluation
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated synthesis comparing mean speedup, parallel efficiency, CPU core saturation, and kernel thread preemption overhead across all 5 workloads.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1c2333] hover:bg-[#252f44] text-slate-300 hover:text-white text-xs font-mono border border-[#2d3950] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY REPORT'}</span>
        </button>
      </div>

      {/* Cross-Platform Metric Comparison Table: ONE row per OS with averaged values */}
      <div className="overflow-x-auto rounded border border-[#222b3b]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0f131c] text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-[#222b3b]">
            <tr>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Operating System / Platform</th>
              <th className="py-3 px-4 text-right">Mean Speedup</th>
              <th className="py-3 px-4 text-right">Mean Efficiency</th>
              <th className="py-3 px-4 text-right">Mean CPU Core %</th>
              <th className="py-3 px-4 text-right">Involuntary Switches</th>
              <th className="py-3 px-4 text-right">Breakdown</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2637] font-mono text-xs">
            {report.stats.map((stat, idx) => {
              const osColor = getOSColor(stat.os);
              const isExpanded = expandedOS.has(stat.os);

              const isBestSpeedup = Math.abs(stat.avgSpeedup - bestSpeedup) < 0.0001;
              const isBestEfficiency = Math.abs(stat.avgEfficiency - bestEfficiency) < 0.0001;
              const isBestCpuUtil = Math.abs(stat.avgCpuUtilization - bestCpuUtil) < 0.0001;
              const isBestInvoluntary = Math.abs(stat.avgInvoluntarySwitches - bestInvoluntarySwitches) < 0.0001;

              return (
                <React.Fragment key={stat.os}>
                  {/* Clean Averaged Row Per OS */}
                  <tr className="hover:bg-[#161c28] transition-colors">
                    {/* Leading Rank / Status Column */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider font-semibold ${
                          idx === 0
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-[#151a26] text-slate-400 border border-[#232c3d]'
                        }`}
                      >
                        {idx === 0 ? 'Top Performer' : `Platform #${idx + 1}`}
                      </span>
                    </td>

                    {/* OS / Platform Name & Hardware Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-xs flex-shrink-0"
                          style={{ backgroundColor: osColor }}
                        />
                        <div className="min-w-0">
                          <div className="font-sans font-semibold text-slate-100 text-xs truncate">
                            {getFriendlyOSName(stat.os)}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 truncate max-w-sm mt-0.5" title={stat.os}>
                            {stat.os} · {stat.hardware.cpu_model}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mean Speedup Column */}
                    <td
                      className={`py-3.5 px-4 text-right whitespace-nowrap ${
                        isBestSpeedup
                          ? 'bg-emerald-500/10 text-emerald-300 font-bold'
                          : 'text-slate-200'
                      }`}
                    >
                      <span>{stat.avgSpeedup.toFixed(2)}x</span>
                      {isBestSpeedup && report.stats.length > 1 && (
                        <span className="text-[9px] text-emerald-400 ml-1.5 font-normal uppercase">(Best)</span>
                      )}
                    </td>

                    {/* Mean Efficiency Column */}
                    <td
                      className={`py-3.5 px-4 text-right whitespace-nowrap ${
                        isBestEfficiency
                          ? 'bg-emerald-500/10 text-emerald-300 font-bold'
                          : 'text-slate-200'
                      }`}
                    >
                      <span>{(stat.avgEfficiency * 100).toFixed(1)}%</span>
                      {isBestEfficiency && report.stats.length > 1 && (
                        <span className="text-[9px] text-emerald-400 ml-1.5 font-normal uppercase">(Best)</span>
                      )}
                    </td>

                    {/* Mean CPU Core % Column */}
                    <td
                      className={`py-3.5 px-4 text-right whitespace-nowrap ${
                        isBestCpuUtil
                          ? 'bg-emerald-500/10 text-emerald-300 font-bold'
                          : 'text-slate-200'
                      }`}
                    >
                      <span>{stat.avgCpuUtilization.toFixed(0)}%</span>
                      {isBestCpuUtil && report.stats.length > 1 && (
                        <span className="text-[9px] text-emerald-400 ml-1.5 font-normal uppercase">(Best)</span>
                      )}
                    </td>

                    {/* Involuntary Context Switches Column (Lower is better) */}
                    <td
                      className={`py-3.5 px-4 text-right whitespace-nowrap ${
                        isBestInvoluntary
                          ? 'bg-emerald-500/10 text-emerald-300 font-bold'
                          : 'text-slate-200'
                      }`}
                    >
                      <span>{Math.round(stat.avgInvoluntarySwitches).toLocaleString()}</span>
                      {isBestInvoluntary && report.stats.length > 1 && (
                        <span className="text-[9px] text-emerald-400 ml-1.5 font-normal uppercase">(Best)</span>
                      )}
                    </td>

                    {/* Expandable Breakdown Toggle */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => toggleOS(stat.os)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                          isExpanded
                            ? 'bg-[#1e2638] text-sky-300 border border-sky-500/40'
                            : 'bg-[#151a26] text-slate-300 hover:text-white border border-[#232c3d] hover:border-[#2f3b50]'
                        }`}
                      >
                        <span>{isExpanded ? 'Hide breakdown' : 'Show detailed breakdown'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3 text-sky-400" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expandable Row per OS showing detailed per-workload breakdown */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="p-0 bg-[#0d1017]">
                        <div className="p-4 border-t border-b border-[#222b3b] space-y-2">
                          <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>Per-Workload Breakdown for {getFriendlyOSName(stat.os)}:</span>
                            <span className="text-slate-500 font-normal">{stat.os}</span>
                          </div>
                          <div className="overflow-x-auto rounded border border-[#1f2737]">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-[#141924] text-slate-400 font-mono text-[9px] uppercase border-b border-[#1f2737]">
                                <tr>
                                  <th className="py-2 px-3">Workload</th>
                                  <th className="py-2 px-3 text-right">Max Speedup</th>
                                  <th className="py-2 px-3 text-right">Peak Efficiency</th>
                                  <th className="py-2 px-3 text-center">Max Tested Threads</th>
                                  <th className="py-2 px-3 text-right">Mean CPU Core %</th>
                                  <th className="py-2 px-3 text-right">Invol Switches (Max T)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1b2230] font-mono text-[11px]">
                                {Object.entries(stat.workloadStats).map(([wName, wStat]) => (
                                  <tr key={wName} className="hover:bg-[#161c28] transition-colors">
                                    <td className="py-1.5 px-3 text-slate-200 font-sans font-medium">
                                      {wName}
                                    </td>
                                    <td className="py-1.5 px-3 text-right text-slate-100 font-bold">
                                      {wStat.maxSpeedup.toFixed(2)}x
                                    </td>
                                    <td className="py-1.5 px-3 text-right text-slate-100 font-bold">
                                      {(wStat.peakEfficiency * 100).toFixed(1)}%
                                    </td>
                                    <td className="py-1.5 px-3 text-center text-sky-300 font-semibold">
                                      {wStat.maxThreadCount} T
                                    </td>
                                    <td className="py-1.5 px-3 text-right text-emerald-400">
                                      {wStat.avgCpuUtilization.toFixed(0)}%
                                    </td>
                                    <td className="py-1.5 px-3 text-right text-slate-300">
                                      {wStat.involuntarySwitchesAtMax.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 1. Notable Performance Patterns (Single-line findings) */}
      {anomalies.length > 0 && (
        <div className="rounded-lg bg-[#18140c] border border-amber-500/40 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                Notable Performance Patterns
              </span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] uppercase font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {anomalies.length} {anomalies.length === 1 ? 'finding' : 'findings'}
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5 font-mono text-xs text-slate-200">
            {(showAllPatterns ? anomalies : anomalies.slice(0, 3)).map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 truncate py-0.5"
                title={a.singleLine}
              >
                <span className="text-amber-400 font-bold shrink-0">•</span>
                <span className="truncate">{a.singleLine}</span>
              </div>
            ))}
          </div>

          {anomalies.length > 3 && (
            <button
              onClick={() => setShowAllPatterns(!showAllPatterns)}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors pt-1"
            >
              <span>{showAllPatterns ? 'Show less' : `Show ${anomalies.length - 3} more`}</span>
              {showAllPatterns ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}

      {/* 2. Workload Classification: Groups into Compute-bound vs I/O or memory-bound */}
      <div className="rounded-lg bg-[#0f131c] border border-[#1f2737] p-4 sm:p-5 space-y-4">
        <div className="border-b border-[#1f2737] pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
              Workload Classification
            </span>
            <span className="text-[#334155] font-mono">/</span>
            <span className="font-mono text-[11px] text-sky-400">
              Scaling Behavior Taxonomy
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical grouping based on observed speedup trajectories across thread counts.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
          {/* Compute-bound (scales well) - 60% width */}
          <div className="lg:col-span-3 rounded-md bg-[#131824] border border-[#232d40] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-[#20293a] pb-2.5">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono text-xs font-bold text-emerald-300 uppercase tracking-wide">
                  Compute-bound (scales well)
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                {classification.computeBound.length} Workloads
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Workloads whose speedup keeps increasing up to at least{' '}
              <span className="font-mono text-emerald-300 font-semibold">8–12 threads</span>{' '}
              before plateauing. Sustains high multi-core scaling without serial bottlenecks.
            </p>

            <div className="space-y-2 pt-1">
              {classification.computeBound.map((item) => (
                <div
                  key={item.name}
                  className="rounded bg-[#0d111a] border border-[#1d2535] p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans font-semibold text-xs text-slate-100">
                      {item.name}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400 font-bold">
                      {item.peakSpeedup.toFixed(2)}x peak
                    </span>
                  </div>
                  <ul className="space-y-0.5 text-[11px] font-mono text-slate-300">
                    {item.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-bold leading-none">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* I/O or memory-bound (scales poorly) - 40% width, natural height */}
          <div className="lg:col-span-2 rounded-md bg-[#16141a] border border-[#2e2636] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-[#2b2233] pb-2.5">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wide">
                  I/O or memory-bound (scales poorly)
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {classification.ioMemoryBound.length} Workload
                {classification.ioMemoryBound.length === 1 ? '' : 's'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Workloads whose speedup plateaus or drops early (
              <span className="font-mono text-amber-300 font-semibold">before 6 threads</span>
              ). Suffers from serial I/O bottlenecks, lock contention, or memory bus limits.
            </p>

            <div className="space-y-2 pt-1">
              {classification.ioMemoryBound.map((item) => (
                <div
                  key={item.name}
                  className="rounded bg-[#110e14] border border-[#261f2d] p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans font-semibold text-xs text-slate-100">
                      {item.name}
                    </span>
                    <span className="font-mono text-[11px] text-amber-400 font-bold">
                      {item.peakSpeedup.toFixed(2)}x peak
                    </span>
                  </div>
                  <ul className="space-y-0.5 text-[11px] font-mono text-slate-300">
                    {item.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-bold leading-none">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Contextual summary line */}
            <div className="pt-2.5 border-t border-[#261f2d] text-[11px] text-slate-400 font-mono flex items-start gap-1.5">
              <span className="text-amber-400 font-bold leading-none mt-0.5">•</span>
              <span>
                Only {classification.ioMemoryBound.length} of{' '}
                {classification.computeBound.length + classification.ioMemoryBound.length} workloads
                showed I/O-bound characteristics in this benchmark run.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Executive Telemetry Summary: Concise Key Takeaway Bullets (<15 words each) */}
      <div className="p-4 sm:p-5 rounded-md bg-[#10141e] border border-[#1e2636] space-y-3">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 border-b border-[#1e2636] pb-2 flex items-center justify-between">
          <span>Executive Telemetry Summary</span>
          <span className="font-mono text-[10px] text-slate-500 font-normal">Key Takeaways</span>
        </div>

        <ul className="space-y-2 text-xs sm:text-[13px] font-mono text-slate-200">
          {(report.takeaways || report.paragraphs || []).map((takeaway, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-sky-400 font-bold leading-none mt-0.5">•</span>
              <span className="text-slate-200">{takeaway}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
};
