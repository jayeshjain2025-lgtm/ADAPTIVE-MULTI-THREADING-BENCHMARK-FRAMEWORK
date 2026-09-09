import React, { useState, useMemo } from 'react';
import type { BenchmarkRecord } from '../../types/benchmark';
import { formatTime, formatBytes, getFriendlyOSName, getOSColor } from '../../utils/formatters';
import { Database, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface DataTableProps {
  records: BenchmarkRecord[];
  selectedWorkload: string;
}

interface OSAveragedData {
  os: string;
  hardwareCpu: string;
  totalRecords: number;
  meanSpeedup: number;
  meanEfficiency: number;
  meanCpuUtilization: number;
  meanInvoluntarySwitches: number;
  totalInvoluntarySwitches: number;
  records: BenchmarkRecord[];
}

export const DataTable: React.FC<DataTableProps> = ({ records, selectedWorkload }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedOS, setExpandedOS] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorkload, setFilterWorkload] = useState<'all' | 'selected'>('all');

  // Compute averaged values across all workloads and thread counts per OS
  const osAveragedList: OSAveragedData[] = useMemo(() => {
    const osMap = new Map<string, BenchmarkRecord[]>();

    for (const r of records) {
      const list = osMap.get(r.hardware.os) || [];
      list.push(r);
      osMap.set(r.hardware.os, list);
    }

    const result: OSAveragedData[] = [];

    for (const [os, osRecords] of osMap.entries()) {
      const count = osRecords.length || 1;
      const totalSpeedup = osRecords.reduce((acc, r) => acc + r.derived.speedup, 0);
      const totalEfficiency = osRecords.reduce((acc, r) => acc + r.derived.efficiency, 0);
      const totalCpu = osRecords.reduce((acc, r) => acc + r.measurements.cpu_utilization_percent, 0);
      const totalInvoluntary = osRecords.reduce(
        (acc, r) => acc + r.measurements.involuntary_context_switches,
        0
      );

      result.push({
        os,
        hardwareCpu: osRecords[0]?.hardware?.cpu_model || 'Unknown CPU',
        totalRecords: osRecords.length,
        meanSpeedup: totalSpeedup / count,
        meanEfficiency: totalEfficiency / count,
        meanCpuUtilization: totalCpu / count,
        meanInvoluntarySwitches: totalInvoluntary / count,
        totalInvoluntarySwitches: totalInvoluntary,
        records: osRecords,
      });
    }

    // Sort by OS name for consistent display
    return result.sort((a, b) => a.os.localeCompare(b.os));
  }, [records]);

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

  const toggleAll = () => {
    if (expandedOS.size === osAveragedList.length) {
      setExpandedOS(new Set());
    } else {
      setExpandedOS(new Set(osAveragedList.map((o) => o.os)));
    }
  };

  if (!records.length) return null;

  return (
    <div className="bg-[#121620] border border-[#1f2737] rounded-lg overflow-hidden">
      {/* Outer Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 lg:px-6 py-3.5 flex items-center justify-between bg-[#121620] hover:bg-[#151a26] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 font-mono text-xs font-bold text-slate-300">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span className="uppercase tracking-wider">Telemetry Inspector</span>
          <span className="text-[#334155]">/</span>
          <span className="text-slate-400 font-normal">
            {osAveragedList.length} platform{osAveragedList.length > 1 ? 's' : ''} ({records.length} total datapoints)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
          <span>{isOpen ? 'COLLAPSE TABLE' : 'EXPAND TABLE'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 lg:p-6 border-t border-[#1f2737] space-y-4">
          {/* Subheader with global expand/collapse toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">
              Averaged summary across all workloads and thread counts. Expand any platform to inspect granular runs.
            </span>
            {osAveragedList.length > 1 && (
              <button
                onClick={toggleAll}
                className="px-2.5 py-1 rounded bg-[#1c2333] hover:bg-[#252f44] border border-[#2d3950] text-slate-300 text-[11px] transition-colors"
              >
                {expandedOS.size === osAveragedList.length
                  ? 'Collapse All Breakdowns'
                  : 'Expand All Breakdowns'}
              </button>
            )}
          </div>

          {/* Main Table: ONE row per OS with averaged metrics */}
          <div className="overflow-x-auto rounded border border-[#222b3b]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0f131c] text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-[#222b3b]">
                <tr>
                  <th className="py-3 px-4">Operating System / Platform</th>
                  <th className="py-3 px-4 text-center">Datapoints</th>
                  <th className="py-3 px-4 text-right">Mean Speedup</th>
                  <th className="py-3 px-4 text-right">Mean Efficiency</th>
                  <th className="py-3 px-4 text-right">Mean CPU Core %</th>
                  <th className="py-3 px-4 text-right">Involuntary Switches (Mean)</th>
                  <th className="py-3 px-4 text-right">Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2637] font-mono text-xs">
                {osAveragedList.map((item) => {
                  const isExpanded = expandedOS.has(item.os);
                  const osColor = getOSColor(item.os);

                  // Filter detailed records for this OS if expanded
                  const detailedRecords = item.records.filter((r) => {
                    if (filterWorkload === 'selected' && r.workload.name !== selectedWorkload) {
                      return false;
                    }
                    if (searchTerm) {
                      const term = searchTerm.toLowerCase();
                      const matchW = r.workload.name.toLowerCase().includes(term);
                      const matchT = String(r.configuration.thread_count).includes(term);
                      if (!matchW && !matchT) return false;
                    }
                    return true;
                  });

                  return (
                    <React.Fragment key={item.os}>
                      {/* Clean Averaged Row Per OS */}
                      <tr className="hover:bg-[#161c28] transition-colors">
                        {/* OS / Platform */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-xs flex-shrink-0"
                              style={{ backgroundColor: osColor }}
                            />
                            <div className="min-w-0">
                              <div className="font-sans font-semibold text-slate-100 text-xs truncate">
                                {getFriendlyOSName(item.os)}
                              </div>
                              <div
                                className="font-mono text-[10px] text-slate-400 truncate max-w-sm mt-0.5"
                                title={item.os}
                              >
                                {item.os} · {item.hardwareCpu}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Datapoints */}
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-[#151a26] border border-[#232c3d] text-[11px]">
                            {item.totalRecords} runs
                          </span>
                        </td>

                        {/* Mean Speedup */}
                        <td className="py-3.5 px-4 text-right text-slate-100 font-bold">
                          {item.meanSpeedup.toFixed(2)}x
                        </td>

                        {/* Mean Efficiency */}
                        <td className="py-3.5 px-4 text-right text-slate-100 font-bold">
                          {(item.meanEfficiency * 100).toFixed(1)}%
                        </td>

                        {/* Mean CPU Core % */}
                        <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">
                          {item.meanCpuUtilization.toFixed(0)}%
                        </td>

                        {/* Involuntary Context Switches (Mean) */}
                        <td className="py-3.5 px-4 text-right text-slate-200">
                          {Math.round(item.meanInvoluntarySwitches).toLocaleString()}
                        </td>

                        {/* Expandable Toggle Button */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => toggleOS(item.os)}
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

                      {/* Expandable Detailed Breakdown Sub-Table */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 bg-[#0d1017]">
                            <div className="p-4 border-t border-b border-[#222b3b] space-y-3">
                              {/* Sub-table filter bar */}
                              <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px]">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 font-bold uppercase">
                                    Granular Runs:
                                  </span>
                                  <span className="text-slate-300">
                                    {detailedRecords.length} of {item.records.length} records
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  {/* Search */}
                                  <div className="relative">
                                    <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
                                    <input
                                      type="text"
                                      placeholder="Filter workload/threads..."
                                      value={searchTerm}
                                      onChange={(e) => setSearchTerm(e.target.value)}
                                      className="bg-[#121620] border border-[#222a3a] rounded pl-7 pr-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400"
                                    />
                                  </div>

                                  {/* Filter by workload */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setFilterWorkload('all')}
                                      className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                                        filterWorkload === 'all'
                                          ? 'bg-[#1e2638] text-slate-100 font-semibold'
                                          : 'bg-[#121620] text-slate-400 hover:text-slate-200 border border-[#222a3a]'
                                      }`}
                                    >
                                      All Workloads
                                    </button>
                                    <button
                                      onClick={() => setFilterWorkload('selected')}
                                      className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                                        filterWorkload === 'selected'
                                          ? 'bg-[#1e2638] text-slate-100 font-semibold'
                                          : 'bg-[#121620] text-slate-400 hover:text-slate-200 border border-[#222a3a]'
                                      }`}
                                    >
                                      {selectedWorkload}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Detailed table */}
                              <div className="overflow-x-auto rounded border border-[#1f2737] max-h-72">
                                <table className="w-full text-left border-collapse">
                                  <thead className="bg-[#141924] text-slate-400 font-mono text-[9px] uppercase sticky top-0 border-b border-[#1f2737]">
                                    <tr>
                                      <th className="py-2 px-3">Workload</th>
                                      <th className="py-2 px-3 text-center">Threads</th>
                                      <th className="py-2 px-3 text-right">Wall Time</th>
                                      <th className="py-2 px-3 text-right">CPU %</th>
                                      <th className="py-2 px-3 text-right">Speedup</th>
                                      <th className="py-2 px-3 text-right">Efficiency</th>
                                      <th className="py-2 px-3 text-right">Invol Sw.</th>
                                      <th className="py-2 px-3 text-right">Peak RAM</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#1b2230] font-mono text-[11px]">
                                    {detailedRecords.map((r, i) => (
                                      <tr key={i} className="hover:bg-[#161c28] transition-colors">
                                        <td className="py-1.5 px-3 text-slate-300">
                                          <span>{r.workload.name}</span>
                                          <span className="text-[10px] text-slate-500 ml-1.5">
                                            [{r.workload.type}]
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-3 text-center text-sky-400 font-bold">
                                          {r.configuration.thread_count}
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-slate-200">
                                          {formatTime(r.measurements.wall_time_microseconds)}
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-emerald-400">
                                          {r.measurements.cpu_utilization_percent.toFixed(1)}%
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-slate-100 font-bold">
                                          {r.derived.speedup.toFixed(2)}x
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-slate-100 font-bold">
                                          {(r.derived.efficiency * 100).toFixed(1)}%
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-slate-400">
                                          {r.measurements.involuntary_context_switches}
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-slate-400">
                                          {formatBytes(r.measurements.peak_memory_bytes)}
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
        </div>
      )}
    </div>
  );
};
