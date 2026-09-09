import React, { useState, useEffect, useCallback } from 'react';
import type { BenchmarkRecord, UploadedFileMeta } from './types/benchmark';
import { parseJsonlContent, mergeBenchmarkDatasets } from './utils/parser';
import { WORKLOAD_NAMES } from './utils/analysis';
import { Header } from './components/Layout/Header';
import { TopControlBar } from './components/Controls/TopControlBar';
import { WorkloadLineCharts } from './components/Charts/WorkloadLineCharts';
import { GroupedBarChart } from './components/Charts/GroupedBarChart';
import { RecommendedThreads } from './components/Insights/RecommendedThreads';
import { WrittenConclusion } from './components/Insights/WrittenConclusion';
import { DataTable } from './components/DataViewer/DataTable';

interface FileDataset {
  meta: UploadedFileMeta;
  records: BenchmarkRecord[];
}

export function App() {
  const [fileDatasets, setFileDatasets] = useState<Record<string, FileDataset>>({});
  const [selectedWorkload, setSelectedWorkload] = useState<string>(WORKLOAD_NAMES[0]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);

  // Compute merged records from all loaded file datasets
  const allRecords = React.useMemo(() => {
    let merged: BenchmarkRecord[] = [];
    for (const dataset of Object.values(fileDatasets)) {
      merged = mergeBenchmarkDatasets(merged, dataset.records);
    }
    return merged;
  }, [fileDatasets]);

  const fileList = React.useMemo(() => {
    return Object.values(fileDatasets).map((d) => d.meta);
  }, [fileDatasets]);

  // Handler for uploading files
  const handleFilesUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newDatasets: Record<string, FileDataset> = {};
    const newErrors: string[] = [];

    for (const file of fileArray) {
      try {
        const text = await file.text();
        const parseResult = parseJsonlContent(text, file.name);

        if (parseResult.errors.length > 0) {
          newErrors.push(...parseResult.errors);
        }

        if (parseResult.records.length > 0) {
          const fileId = `${file.name}_${file.size}_${file.lastModified || Date.now()}`;
          newDatasets[fileId] = {
            meta: {
              id: fileId,
              name: file.name,
              size: file.size,
              recordCount: parseResult.records.length,
              detectedOS: parseResult.osList,
            },
            records: parseResult.records,
          };
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        newErrors.push(`Failed to read file ${file.name}: ${errMsg}`);
      }
    }

    if (newErrors.length > 0) {
      setParseErrors((prev) => [...prev, ...newErrors]);
    }

    if (Object.keys(newDatasets).length > 0) {
      setFileDatasets((prev) => ({ ...prev, ...newDatasets }));
    }
  }, []);

  // Handler to remove a file dataset
  const handleRemoveFile = useCallback((fileId: string) => {
    setFileDatasets((prev) => {
      const copy = { ...prev };
      delete copy[fileId];
      return copy;
    });
  }, []);

  // Handler to clear all data
  const handleClearData = useCallback(() => {
    setFileDatasets({});
    setParseErrors([]);
  }, []);

  // Handler to load built-in sample datasets (WSL2 + Fedora Linux)
  const handleLoadSamples = useCallback(async () => {
    setIsLoadingSamples(true);
    try {
      const samples = [
        { url: '/results-wsl2.jsonl', name: 'results-wsl2.jsonl' },
        { url: '/results-fedora.jsonl', name: 'results-fedora.jsonl' },
      ];

      const newDatasets: Record<string, FileDataset> = {};
      const newErrors: string[] = [];

      for (const sample of samples) {
        try {
          const res = await fetch(sample.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          const parsed = parseJsonlContent(text, sample.name);

          if (parsed.errors.length) {
            newErrors.push(...parsed.errors);
          }

          if (parsed.records.length) {
            const fileId = `sample_${sample.name}`;
            newDatasets[fileId] = {
              meta: {
                id: fileId,
                name: sample.name,
                size: text.length,
                recordCount: parsed.records.length,
                detectedOS: parsed.osList,
              },
              records: parsed.records,
            };
          }
        } catch (e) {
          console.warn(`Could not fetch ${sample.url}`, e);
        }
      }

      if (Object.keys(newDatasets).length > 0) {
        setFileDatasets(newDatasets);
      }
      if (newErrors.length > 0) {
        setParseErrors(newErrors);
      }
    } finally {
      setIsLoadingSamples(false);
    }
  }, []);

  // Automatically load sample datasets on initial startup
  useEffect(() => {
    handleLoadSamples();
  }, [handleLoadSamples]);

  return (
    <div className="min-h-screen bg-[#0c0f14] text-slate-200 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Utility Bar */}
      <Header
        records={allRecords}
        onLoadSamples={handleLoadSamples}
        onClearData={handleClearData}
        isLoadingSamples={isLoadingSamples}
      />

      {/* Main Single Column Layout: Clear Top-to-Bottom Reading Order */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Section 1: Ingestion & Workload Selector */}
        <section>
          <TopControlBar
            files={fileList}
            records={allRecords}
            selectedWorkload={selectedWorkload}
            onSelectWorkload={setSelectedWorkload}
            onFilesUpload={handleFilesUpload}
            onRemoveFile={handleRemoveFile}
            parseErrors={parseErrors}
            onClearErrors={() => setParseErrors([])}
          />
        </section>

        {allRecords.length === 0 ? (
          /* Empty State */
          <div className="border border-[#1f2737] rounded-lg p-10 text-center bg-[#121620] space-y-3">
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
              No Benchmark Data Loaded
            </div>
            <p className="text-xs text-slate-500 font-mono max-w-md mx-auto">
              Please drop .jsonl benchmark result files into the ingestion panel above or load the baseline benchmark dataset.
            </p>
            <button
              onClick={handleLoadSamples}
              className="px-4 py-2 rounded bg-[#1c2333] hover:bg-[#252f44] border border-[#2d3950] text-slate-200 text-xs font-mono transition-colors"
            >
              Load Sample Datasets (WSL2 + Fedora)
            </button>
          </div>
        ) : (
          <>
            {/* Section 2: Four Recharts Line Charts (Clean 2x2 Grid) */}
            <section>
              <WorkloadLineCharts
                records={allRecords}
                selectedWorkload={selectedWorkload}
              />
            </section>

            {/* Section 3: Grouped Bar Chart at Highest Common Thread Count */}
            <section>
              <GroupedBarChart records={allRecords} />
            </section>

            {/* Section 4: Concurrency Recommendation Cards in a Row */}
            <section>
              <RecommendedThreads
                records={allRecords}
                selectedWorkload={selectedWorkload}
              />
            </section>

            {/* Section 5: Analytical Conclusion Text */}
            <section>
              <WrittenConclusion records={allRecords} />
            </section>

            {/* Section 6: Raw Telemetry Inspector Table */}
            <section>
              <DataTable records={allRecords} selectedWorkload={selectedWorkload} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
