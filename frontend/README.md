# C++ Multi-Threaded Benchmark Analyzer Frontend

A modern, high-performance React + Vite + TypeScript dashboard built to visualize, compare, and analyze multi-threaded C++ benchmarking telemetry across operating systems (e.g., Linux WSL2, Native Fedora, Windows Native, macOS Darwin).

---

## Key Features

### 1. Multi-Platform Telemetry Ingestion
- **JSON Lines (.jsonl) Ingestion**: Drag-and-drop or upload multiple benchmark output files simultaneously.
- **In-Memory Merging**: Automatically normalizes and aligns datasets across disparate platforms without requiring a database backend.
- **Instant Sample Datasets**: Pre-loaded with verified benchmark telemetry (WSL2, Native Fedora, macOS) with instant one-click reloading.

### 2. Workload Suite Selector
Filter seamlessly between all 5 benchmark workloads:
- **Matrix multiplication**: $O(N^3)$ dense matrix multiply testing ALU throughput and cache memory bus saturation.
- **Prime generation**: Segmented Sieve of Eratosthenes evaluating integer arithmetic and L1/L2 cache locality.
- **Merge sort**: Task-based recursive divide-and-conquer testing OpenMP task scheduling overhead and lock synchronization.
- **Image processing**: 2D spatial convolution kernel (3x3 RGB blur) testing memory access stride and bandwidth saturation.
- **Compression**: Multi-threaded block run-length encoding with sequential file I/O output.

### 3. Four Interactive Line Charts (Recharts)
- **Execution Time vs Threads** (`measurements.wall_time_microseconds`): Microsecond wall-clock scaling curve.
- **CPU Utilization vs Threads** (`measurements.cpu_utilization_percent`): Core saturation relative to logical processors.
- **Speedup vs Threads** (`derived.speedup`): Parallel speedup compared against ideal theoretical linear scaling.
- **Parallel Efficiency vs Threads** (`derived.efficiency`): Scaling efficiency plotted against a 70% engineering threshold reference line.
- **Synchronized Hover Telemetry**: Displays exact wall time, CPU core load, and involuntary context switches per platform.

### 4. Cross-Platform Concurrency Comparison (Grouped Bar Chart)
- Evaluated side-by-side at the **highest common thread count** (e.g., $T=24$) across all active platforms.
- **Metric Selectors**: Toggle between **Speedup**, **Efficiency**, or **Wall Time (ms)**.
- **Logarithmic Scale Compression (`log₁₀` / `symlog`)**: Includes a dedicated `Scale: [ Log (log₁₀) ] [ Linear ]` switch.
  - In logarithmic mode, orders-of-magnitude gaps are reduced so that fast workloads (Merge sort: ~13ms–73ms, Image processing: ~8ms–119ms) and long workloads (Compression: ~530ms–8,477ms) are clearly visible and comparable side-by-side.
  - Generates equidistant milestone ticks (`0ms`, `10ms`, `50ms`, `200ms`, `1,000ms`, `5,000ms`, `10,000ms`).

### 5. Recommended Thread Count Engine
- Identifies concurrency tipping points per workload per OS where parallel efficiency drops below 70% of its peak observed value.
- Prevents wasteful oversubscription while maximizing parallel speedup.
- **Dual View**: Single-workload focus cards and all-5-workload matrix comparison.

### 6. Analytical Conclusions & Diagnostic Insights
- **Notable Performance Patterns**: Single-line concise callouts identifying bottlenecks (e.g., I/O write contention in Compression, high-thread memory bus saturation in Matrix multiplication) with top-3 default display and toggle.
- **Workload Classification**: Automatically categorizes suites into *Compute-bound* (scales well) and *I/O or memory-bound* (scales poorly) with bulleted peak metrics.
- **Cross-Platform Comparison Matrix**: Identifies performance winners and speedup margins per workload.

### 7. Telemetry Inspector Table
- **Clean Default View**: One row per platform showing averaged metrics (Mean Speedup, Mean Efficiency, Mean CPU Core %, Involuntary Context Switches) across all runs.
- **Expandable Detailed Breakdown**: Inspect granular per-run data points with live search and workload filters.

### 8. Dark Mode & Light Mode with Dual High-Contrast Palettes
- Seamless toggle between signature dark graphite theme and clean light theme (persisted in `localStorage`).
- **Adaptive Color Palettes**:
  - **Dark Mode**: Luminous neon colors (Cyan `#38bdf8` for WSL2, Lime Green `#4ade80` for Native Fedora).
  - **Light Mode**: Rich, saturated colors (Sapphire Blue `#0284c7` for WSL2, Forest Emerald `#059669` for Native Fedora) ensuring high WCAG contrast against white cards.

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Dev Server**: Vite 8
- **Styling**: Tailwind CSS v4
- **Charting**: Recharts
- **Icons**: Lucide React
- **Linter**: Oxlint

---

## Quick Start

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation & Development

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build & Lint

```bash
# Type-check and build for production
npm run build

# Run linter
npm run lint

# Preview production build locally
npm run preview
```
