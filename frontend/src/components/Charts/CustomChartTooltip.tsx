import React from 'react';
import { formatTime, formatPercent, getFriendlyOSName, getOSColor } from '../../utils/formatters';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  metricType: 'time' | 'cpu' | 'speedup' | 'efficiency';
}

export const CustomChartTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  metricType,
}) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-[#0f131a] border border-[#232b3b] rounded p-2.5 text-xs text-slate-200 max-w-sm">
      <div className="border-b border-[#232b3b] pb-1 mb-2 font-mono text-[11px] text-slate-400 flex items-center justify-between">
        <span>THREADS: <strong className="text-slate-100">{label}</strong></span>
      </div>

      <div className="space-y-2">
        {payload.map((entry, index) => {
          if (entry.dataKey === 'ideal_linear' || entry.dataKey === 'threshold_70' || entry.dataKey === 'ideal_100') {
            return (
              <div key={index} className="flex justify-between items-center text-[10px] font-mono text-slate-500 italic">
                <span>{entry.name || entry.dataKey}:</span>
                <span>{entry.value}</span>
              </div>
            );
          }

          const osName = entry.dataKey;
          const meta = entry.payload?.[`${osName}_meta`];
          const osColor = getOSColor(osName);

          let formattedValue = entry.value;
          if (metricType === 'time') formattedValue = formatTime(entry.value);
          else if (metricType === 'cpu') formattedValue = formatPercent(entry.value);
          else if (metricType === 'speedup') formattedValue = `${Number(entry.value).toFixed(2)}x`;
          else if (metricType === 'efficiency') formattedValue = `${(Number(entry.value) * 100).toFixed(1)}%`;

          return (
            <div key={index} className="border-l-2 pl-2" style={{ borderColor: osColor }}>
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300 truncate max-w-[160px]" title={osName}>
                  {getFriendlyOSName(osName)}
                </span>
                <span className="font-mono font-bold text-slate-100 ml-2">{formattedValue}</span>
              </div>

              {meta && (
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-[10px] font-mono text-slate-400">
                  <div>Wall time: <span className="text-slate-200">{formatTime(meta.measurements.wall_time_microseconds)}</span></div>
                  <div>CPU: <span className="text-slate-200">{meta.measurements.cpu_utilization_percent.toFixed(0)}%</span></div>
                  <div>Speedup: <span className="text-slate-200">{meta.derived.speedup.toFixed(2)}x</span></div>
                  <div>Efficiency: <span className="text-slate-200">{(meta.derived.efficiency * 100).toFixed(1)}%</span></div>
                  <div className="col-span-2 text-[9px] text-slate-500 pt-0.5 border-t border-[#1a212f]">
                    Switches: vol {meta.measurements.voluntary_context_switches} · invol {meta.measurements.involuntary_context_switches}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
