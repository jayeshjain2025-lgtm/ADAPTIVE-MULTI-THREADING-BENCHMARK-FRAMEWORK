import React from 'react';
import type { BenchmarkRecord } from '../../types/benchmark';
import { getDistinctOSList } from '../../utils/analysis';
import { getFriendlyOSName, getOSColor, formatBytes } from '../../utils/formatters';
import { Terminal, RefreshCw, X, Database, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/useTheme';

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
  const { isDark, toggleTheme } = useTheme();
  const osList = getDistinctOSList(records);

  const hardwareSummary = osList.map((os) => {
    const match = records.find((r) => r.hardware.os === os);
    return match ? match.hardware : null;
  }).filter(Boolean);

  return (
    <header className="bg-white dark:bg-[#10141d] border-b border-slate-200 dark:border-[#1f2737] px-4 py-2.5 z-20 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Direct technical identifier */}
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="font-mono font-bold tracking-tight text-slate-800 dark:text-slate-200">
            C++ BENCHMARK TELEMETRY
          </span>
          <span className="text-slate-300 dark:text-[#334155] font-mono">/</span>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            MULTI-THREADED SCALING ANALYZER
          </span>
        </div>

        {/* Center/Right: Hardware topology chips & actions */}
        <div className="flex flex-wrap items-center gap-2">
          {hardwareSummary.map((hw, idx) => {
            const osColor = getOSColor(hw!.os, isDark);
            return (
              <div
                key={idx}
                className="bg-slate-100 dark:bg-[#151a26] border border-slate-200 dark:border-[#232c3d] rounded px-2.5 py-1 text-[11px] flex items-center gap-2 transition-colors"
                title={`${hw!.os} | ${hw!.cpu_model}`}
              >
                <span
                  className="w-2 h-2 rounded-sm inline-block"
                  style={{ backgroundColor: osColor }}
                />
                <span className="font-medium text-slate-700 dark:text-slate-200">{getFriendlyOSName(hw!.os)}</span>
                <span className="text-slate-300 dark:text-[#334155]">·</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px] truncate max-w-[130px]">
                  {hw!.cpu_model}
                </span>
                <span className="text-slate-300 dark:text-[#334155]">·</span>
                <span className="text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                  {hw!.physical_cores}C/{hw!.logical_processors}T
                </span>
                <span className="text-slate-300 dark:text-[#334155]">·</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                  {formatBytes(hw!.total_memory_bytes)}
                </span>
              </div>
            );
          })}

          {records.length > 0 && (
            <div className="bg-slate-100 dark:bg-[#151a26] border border-slate-200 dark:border-[#232c3d] rounded px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-mono transition-colors">
              <Database className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{records.length}</span>
              <span className="text-slate-400 dark:text-slate-500">records</span>
            </div>
          )}

          {/* Utility buttons */}
          <div className="flex items-center gap-1.5 ml-1">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#1c2333] dark:hover:bg-[#252f44] border border-slate-300 dark:border-[#2d3950] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-mono text-[11px]">Dark</span>
                </>
              )}
            </button>

            <button
              onClick={onLoadSamples}
              disabled={isLoadingSamples}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#1c2333] dark:hover:bg-[#252f44] border border-slate-300 dark:border-[#2d3950] text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Load pre-recorded WSL2 & Fedora datasets"
            >
              <RefreshCw className={`w-3 h-3 text-slate-500 dark:text-slate-400 ${isLoadingSamples ? 'animate-spin' : ''}`} />
              <span>Load Sample Data</span>
            </button>
            {records.length > 0 && (
              <button
                onClick={onClearData}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-rose-50 dark:bg-[#151a26] dark:hover:bg-rose-950/40 border border-slate-300 hover:border-rose-300 dark:border-[#232c3d] dark:hover:border-rose-900/60 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300 text-xs transition-colors"
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
