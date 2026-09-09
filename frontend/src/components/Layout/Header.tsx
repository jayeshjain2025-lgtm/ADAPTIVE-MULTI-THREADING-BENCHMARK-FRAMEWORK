import React from 'react';
import type { BenchmarkRecord } from '../../types/benchmark';
import { getDistinctOSList } from '../../utils/analysis';
import { getFriendlyOSName, getOSColor, formatBytes } from '../../utils/formatters';
import { Terminal, RefreshCw, X, Database } from 'lucide-react';

interface HeaderProps {
  records: BenchmarkRecord[];
  onLoadSamples: () => void;
  onClearData: () => void;
  isLoadingSamples?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  records,
  onLoadSamples,
  onClearData,
  isLoadingSamples = false,
}) => {
  const osList = getDistinctOSList(records);

  const hardwareSummary = osList.map((os) => {
    const match = records.find((r) => r.hardware.os === os);
    return match ? match.hardware : null;
  }).filter(Boolean);

  return (
    <header className="bg-[#10141d] border-b border-[#1f2737] px-4 py-2.5 z-20">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Direct technical identifier */}
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="font-mono font-bold tracking-tight text-slate-200">
            C++ BENCHMARK TELEMETRY
          </span>
          <span className="text-[#334155] font-mono">/</span>
          <span className="font-mono text-[11px] text-slate-400">
            MULTI-THREADED SCALING ANALYZER
          </span>
        </div>

        {/* Center/Right: Hardware topology chips & actions */}
        <div className="flex flex-wrap items-center gap-2">
          {hardwareSummary.map((hw, idx) => {
            const osColor = getOSColor(hw!.os);
            return (
              <div
                key={idx}
                className="bg-[#151a26] border border-[#232c3d] rounded px-2.5 py-1 text-[11px] flex items-center gap-2"
                title={`${hw!.os} | ${hw!.cpu_model}`}
              >
                <span
                  className="w-2 h-2 rounded-sm inline-block"
                  style={{ backgroundColor: osColor }}
                />
                <span className="font-medium text-slate-200">{getFriendlyOSName(hw!.os)}</span>
                <span className="text-[#334155]">·</span>
                <span className="text-slate-400 font-mono text-[10px] truncate max-w-[130px]">
                  {hw!.cpu_model}
                </span>
                <span className="text-[#334155]">·</span>
                <span className="text-slate-300 font-mono text-[10px]">
                  {hw!.physical_cores}C/{hw!.logical_processors}T
                </span>
                <span className="text-[#334155]">·</span>
                <span className="text-slate-400 font-mono text-[10px]">
                  {formatBytes(hw!.total_memory_bytes)}
                </span>
              </div>
            );
          })}

          {records.length > 0 && (
            <div className="bg-[#151a26] border border-[#232c3d] rounded px-2.5 py-1 text-[11px] text-slate-300 flex items-center gap-1.5 font-mono">
              <Database className="w-3 h-3 text-slate-400" />
              <span className="text-slate-200 font-semibold">{records.length}</span>
              <span className="text-slate-500">records</span>
            </div>
          )}

          {/* Utility buttons */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={onLoadSamples}
              disabled={isLoadingSamples}
              className="px-2.5 py-1 rounded bg-[#1c2333] hover:bg-[#252f44] border border-[#2d3950] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Load pre-recorded WSL2 & Fedora datasets"
            >
              <RefreshCw className={`w-3 h-3 text-slate-400 ${isLoadingSamples ? 'animate-spin' : ''}`} />
              <span>Load Sample Data</span>
            </button>
            {records.length > 0 && (
              <button
                onClick={onClearData}
                className="px-2 py-1 rounded bg-[#151a26] hover:bg-rose-950/40 border border-[#232c3d] hover:border-rose-900/60 text-slate-400 hover:text-rose-300 text-xs transition-colors"
                title="Clear current dataset"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
