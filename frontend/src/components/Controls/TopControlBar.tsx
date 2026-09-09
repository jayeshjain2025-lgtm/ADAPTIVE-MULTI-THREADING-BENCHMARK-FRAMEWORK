import React, { useRef, useState } from 'react';
import { WORKLOAD_NAMES } from '../../utils/analysis';
import type { UploadedFileMeta, BenchmarkRecord } from '../../types/benchmark';
import { formatBytes, getFriendlyOSName, getOSColor } from '../../utils/formatters';
import { Upload, Trash2, AlertCircle, Check } from 'lucide-react';

interface TopControlBarProps {
  files: UploadedFileMeta[];
  records: BenchmarkRecord[];
  selectedWorkload: string;
  onSelectWorkload: (workload: string) => void;
  onFilesUpload: (fileList: FileList | File[]) => void;
  onRemoveFile: (fileId: string) => void;
  parseErrors: string[];
  onClearErrors: () => void;
}

const WORKLOAD_CONFIG: Record<
  string,
  { typeTag: string; note: string }
> = {
  'Matrix multiplication': {
    typeTag: 'compute',
    note: 'O(N³) dense matrix multiply testing vectorization and raw ALU compute throughput.',
  },
  'Prime generation': {
    typeTag: 'segmented sieve',
    note: 'Segmented sieve evaluating 64-bit integer arithmetic and L1/L2 cache locality.',
  },
  'Merge sort': {
    typeTag: 'divide & conquer',
    note: 'Task-based recursive merge sort evaluating lock-free thread coordination overhead.',
  },
  'Image processing': {
    typeTag: '3x3 RGB blur',
    note: '2D spatial convolution kernel testing memory access stride and bandwidth saturation.',
  },
  Compression: {
    typeTag: 'block RLE + I/O',
    note: 'Multi-threaded block run-length encoding with sequential file output.',
  },
};

export const TopControlBar: React.FC<TopControlBarProps> = ({
  files,
  records,
  selectedWorkload,
  onSelectWorkload,
  onFilesUpload,
  onRemoveFile,
  parseErrors,
  onClearErrors,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesUpload(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesUpload(e.target.files);
      e.target.value = '';
    }
  };

  const activeConfig = WORKLOAD_CONFIG[selectedWorkload];

  return (
    <div className="bg-[#121620] border border-[#1f2737] rounded-lg p-5 lg:p-6 space-y-5">
      {/* 2-Column Responsive Layout: Upload (left) + Workload Selector (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Ingestion (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
              1. Telemetry Ingestion
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              JSONL Format
            </span>
          </div>

          {/* Drag & drop box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-sky-500 bg-[#172233] text-sky-300'
                : 'border-[#263246] bg-[#141924] hover:border-[#384863] text-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jsonl,.json,.txt"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-2 text-slate-300 text-xs font-medium">
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Drop .jsonl files here or <span className="text-sky-400 underline">browse</span></span>
            </div>
            <p className="text-[11px] font-mono text-slate-500 mt-1">
              Supports multiple OS run files simultaneously
            </p>
          </div>

          {/* Parse errors alert */}
          {parseErrors.length > 0 && (
            <div className="p-2.5 rounded bg-[#20151a] border border-rose-900/60 text-rose-300 text-xs space-y-1">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" /> Parse Issues ({parseErrors.length})
                </span>
                <button
                  onClick={onClearErrors}
                  className="text-[10px] text-rose-400 hover:underline font-mono"
                >
                  Dismiss
                </button>
              </div>
              <div className="max-h-16 overflow-y-auto text-[10px] font-mono text-rose-300/80 space-y-0.5">
                {parseErrors.slice(0, 2).map((err, i) => (
                  <div key={i} className="truncate">• {err}</div>
                ))}
              </div>
            </div>
          )}

          {/* Loaded files chip list */}
          {files.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Active Files ({files.length}):
              </div>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-[#151a26] border border-[#232c3d] rounded px-2.5 py-1 flex items-center gap-2 text-xs font-mono"
                  >
                    {file.detectedOS.length > 0 && (
                      <span
                        className="w-2 h-2 rounded-xs flex-shrink-0"
                        style={{ backgroundColor: getOSColor(file.detectedOS[0]) }}
                        title={getFriendlyOSName(file.detectedOS[0])}
                      />
                    )}
                    <span className="text-slate-200 text-[11px] truncate max-w-[130px]" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {formatBytes(file.size)} · {file.recordCount} rows
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(file.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors ml-1"
                      title="Remove file"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Workload Selector (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
              2. Workload Selector
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              5 Test Suites
            </span>
          </div>

          {/* Horizontal Tabs Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {WORKLOAD_NAMES.map((name) => {
              const isSelected = selectedWorkload === name;
              const config = WORKLOAD_CONFIG[name];
              const count = records.filter((r) => r.workload.name === name).length;

              return (
                <button
                  key={name}
                  onClick={() => onSelectWorkload(name)}
                  className={`p-2.5 rounded-md border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#1a2333] border-sky-400 text-slate-100 shadow-sm'
                      : 'bg-[#141924] border-[#222b3c] text-slate-400 hover:border-[#2f3b50] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className={`text-xs font-semibold leading-snug line-clamp-2 ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                      {name}
                    </span>
                    {isSelected && (
                      <Check className="w-3 h-3 text-sky-400 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                    <span className="text-sky-400/90 truncate">
                      {config?.typeTag}
                    </span>
                    {count > 0 && (
                      <span className="text-slate-500">
                        {count}p
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Workload Technical Note Banner */}
          <div className="bg-[#141924] border border-[#202738] rounded-md px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-slate-400 font-bold uppercase">Active Benchmark:</span>
              <span className="text-slate-200 font-semibold">{selectedWorkload}</span>
              <span className="text-slate-500">·</span>
              <span className="text-sky-400">[{activeConfig?.typeTag}]</span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-md">
              {activeConfig?.note}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
