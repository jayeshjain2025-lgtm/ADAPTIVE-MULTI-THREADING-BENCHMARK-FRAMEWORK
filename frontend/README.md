# C++ Multi-Threaded Benchmark Analyzer Frontend

A modern React + Vite + TypeScript dashboard built to visualize, compare, and analyze multi-threaded C++ benchmarking telemetry across operating systems (e.g. Linux WSL2, Native Fedora, Windows, macOS).

## Key Features

1. **Multi-File JSONL Upload & In-Memory Merging**:
   - Drag-and-drop or file picker for multiple `results.jsonl` files.
   - Parses line-by-line JSON and merges datasets across different OS runs in memory.
   - Pre-loaded with real benchmark sample datasets (WSL2 + Native Fedora) with instant one-click reloading.

2. **Workload Selector**:
   - Filter between all 5 benchmark workloads:
     - `Matrix multiplication` (compute)
     - `Prime generation` (segmented sieve)
     - `Merge sort` (task-based divide and conquer)
     - `Image processing` (synthetic RGB 3x3 blur)
     - `Compression` (parallel block RLE with file I/O)

3. **Four Recharts Line Charts**:
   - **Execution Time vs Threads** (`measurements.wall_time_microseconds`) with optional logarithmic scale.
   - **CPU Usage vs Threads** (`measurements.cpu_utilization_percent`).
   - **Speedup vs Threads** (`derived.speedup`) with theoretical linear scaling reference.
   - **Efficiency vs Threads** (`derived.efficiency`) with 70% threshold indicator.
   - One distinct colored line per `hardware.os` present.

4. **Cross-OS Grouped Bar Chart**:
   - Evaluated side-by-side at the **highest common thread count** across all uploaded OSes.
   - One bar group per workload.
   - Metric toggles: Speedup, Efficiency, or Wall Time (ms).

5. **Recommended Thread Count Panel**:
   - Identifies concurrency tipping points per workload per OS: the `thread_count` where `derived.efficiency` drops below 70% of its peak observed value.
   - Dual view: Current Workload focus card or All 5 Workloads matrix table.

6. **Auto-Generated Analytical Conclusion**:
   - Compares OSes on mean speedup and efficiency across all workloads.
   - Evaluates performance root causes, citing `cpu_utilization_percent` and context switch preemption (`voluntary_context_switches` and `involuntary_context_switches`).

7. **Raw Telemetry Inspector**:
   - Filterable, searchable raw data table with live search and workload filtering.

## Quick Start

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev

# Build for production
npm run build
```
