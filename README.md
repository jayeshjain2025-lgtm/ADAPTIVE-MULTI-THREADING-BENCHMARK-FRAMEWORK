# Adaptive Multi-Threading Benchmark Framework

This project measures how different workloads behave as the OpenMP thread count changes. It detects the machine topology with hwloc, runs every workload with the same set of thread counts, records one structured result per run, and generates a table and recommendation report from the persisted results.

## Build and Run

The recommended build uses CMake because it discovers OpenMP and hwloc for the current platform:

```bash
cmake -S . -B build
cmake --build build
./build/adaptive_benchmark
```

The direct Linux build is:

```bash
g++ -std=c++20 -fopenmp -O2 \
  main.cpp hardware.cpp metrics.cpp results.cpp benchmark_driver.cpp \
  workloads/*.cpp \
  $(pkg-config --cflags --libs hwloc) \
  -o adaptive_benchmark
./adaptive_benchmark
```

See [SETUP.md](SETUP.md) for dependency installation on Linux, Windows, and macOS.

## Project Layout

- `main.cpp` detects hardware, creates workloads, and runs each workload for every thread count.
- `workloads/` contains the individual workload implementations.
- `benchmark_types.hpp` defines the shared data model and workload interface.
- `benchmark_driver.cpp` contains the workload-independent timing loop.
- `metrics.cpp` collects platform-specific process metrics.
- `hardware.cpp` detects CPU topology, cache sizes, and RAM with hwloc.
- `results.cpp` persists records and generates the table and recommendations.
- `results.jsonl` stores one JSON record per completed run.

## Workloads

Every workload implements the same interface:

- `description()` returns its name, type, and parameters.
- `run(threads)` executes the workload using the requested OpenMP thread count.
- `verify()` compares the current result with the single-thread baseline.

This lets the benchmark driver measure different algorithms without duplicating the thread loop.

### 1. Matrix Multiplication

**Implementation:** `workloads/matrix_workload.cpp`

Multiplies two synthetic integer matrices. The outer matrix-row loop uses OpenMP `parallel for`, so different threads calculate separate output rows.

Parameters:

- `rows`: rows in the first matrix and result.
- `inner`: columns in the first matrix and rows in the second matrix.
- `columns`: columns in the second matrix and result.

The result is verified by comparing every output element with the single-thread baseline. This workload is compute-heavy and usually benefits from several threads until memory bandwidth, cache behavior, or available cores limits further gains.

### 2. Prime Generation

**Implementation:** `workloads/prime_workload.cpp`

Uses a segmented Sieve of Eratosthenes. The range is split into independent segments, and OpenMP assigns segments to threads. Each run counts the primes in the requested range.

Parameter:

- `limit`: upper bound of the generated range.

Correctness is verified by comparing the prime count with the single-thread baseline. This is close to embarrassingly parallel, although each segment still performs memory allocation and composite marking.

### 3. Merge Sort

**Implementation:** `workloads/merge_sort_workload.cpp`

Sorts deterministic synthetic integer data using recursive divide-and-conquer. Large recursive branches are launched as OpenMP tasks and synchronized with `taskwait`.

Parameter:

- `elements`: number of values to sort.

Correctness is verified by comparing the complete sorted vector with the single-thread baseline. This workload demonstrates task scheduling and can expose task-creation overhead or load-balancing effects that a flat `parallel for` does not show.

### 4. Image Processing

**Implementation:** `workloads/image_workload.cpp`

Processes a synthetic RGB image with a boundary-safe 3x3 box blur. Pixels are independent output elements, so rows are distributed with OpenMP `parallel for`.

Parameters:

- `width`: image width in pixels.
- `height`: image height in pixels.
- `channels`: number of color channels; currently 3 for RGB.

Correctness is verified by comparing every blurred pixel and channel with the single-thread baseline. This is compute- and memory-intensive, making it useful for observing cache and memory-bandwidth limits.

### 5. Compression

**Implementation:** `workloads/compression_workload.cpp`

Compresses synthetic bytes using block-based run-length encoding. Blocks are encoded in parallel, then written sequentially to a temporary file and read back for decompression.

Parameters:

- `input bytes`: size of the synthetic input.
- `format`: compression format, currently run-length encoding.

Correctness is verified by decoding the data read from disk and comparing it with the original input and single-thread baseline. Because file output is sequential and I/O-bound, adding threads may produce little improvement after the encoding portion is saturated.

## Thread Counts

The hardware layer detects physical cores and logical processors. The policy creates a sorted, duplicate-free list containing:

- Powers of two up to the physical-core count.
- The physical-core count.
- A midpoint between physical and logical processors.
- The logical-processor count.
- 1.5x and 2x the logical-processor count for oversubscription tests.

For an 8-core, 16-logical-processor machine, this becomes:

```text
1, 2, 4, 8, 12, 16, 24, 32
```

Oversubscription values are intentional. They show whether extra software threads help when all hardware execution contexts are already occupied, or whether scheduling overhead makes the run slower.

## Result Data Model

Each completed workload/thread combination produces one `BenchmarkRun` record. The record has five conceptual areas.

### Session

- `session_id`: timestamp-based identifier shared by all runs from one program execution. It separates one benchmark session from older persisted sessions.

### Hardware

- `os`: operating system name and release. This identifies the environment in which the run occurred.
- `cpu_model`: CPU model string. Different processors can produce different scaling behavior even with the same core count.
- `physical_cores`: physical CPU cores detected by hwloc. This is the main reference point for compute scaling.
- `logical_processors`: hardware execution contexts, including SMT threads. OpenMP can schedule up to this many useful hardware contexts before oversubscription begins.
- `total_memory_bytes`: installed memory reported by hwloc. It gives context for workloads that allocate large matrices, images, or compression buffers.
- Cache sizes: detected L1, L2, and L3 cache information. Cache capacity helps explain why a workload may speed up or slow down when its working set changes.

Hardware values are context, not measurements of the workload itself. They make results comparable across machines and sessions.

### Workload

- `name`: human-readable workload name used to group results.
- `type`: algorithm or workload category, such as `compute`, `segmented sieve`, or `parallel block RLE with file I/O`.
- `parameters`: workload-specific settings. These are essential when comparing results because a 1-million-element sort and a 100-million-element sort are different experiments.

### Configuration

- `thread_count`: number of OpenMP threads requested for that run. Comparing this field with wall time and efficiency shows how scaling changes as parallelism increases.

### Measurements

- `wall_time_microseconds`: elapsed real time for the workload run. Lower is better for a fixed workload and input.
- `cpu_utilization_percent`: total process CPU time divided by wall time, expressed relative to one logical processor. `100%` is approximately one fully busy logical processor; `800%` is approximately eight; `1600%` is approximately sixteen on this machine. Values above 100% are expected for multithreaded work.
- `peak_memory_bytes`: process resident-memory high-water mark. On Linux this comes from `ru_maxrss`, so it is the maximum RSS reached by the process, not just memory allocated by the current workload. It can remain elevated after an earlier workload.
- `voluntary_context_switches`: switches where the process yielded or waited voluntarily, often because of I/O or synchronization.
- `involuntary_context_switches`: switches where the operating system preempted the process. Rising values can indicate contention or oversubscription.

Unavailable platform metrics are represented as `null` in JSON and displayed as `N/A` rather than causing the run to fail.

### Derived

- `speedup`: single-thread wall time divided by this run's wall time. A value of `2.0` means the run is twice as fast as the baseline.
- `efficiency`: speedup divided by thread count. A value of `1.0` means ideal linear scaling; lower values indicate parallel overhead, contention, or hardware limits.
- `correct`: whether the workload output matched its single-thread baseline. Performance data should not be trusted when this is false.

## Persistence and Reporting

Results are appended to `results.jsonl` as each run completes. JSON Lines means every line is one independent JSON object, so previous sessions remain available for later comparison.

After all five workloads finish, the program reads the records back from `results.jsonl` and prints:

1. A table containing workload, thread count, time, speedup, efficiency, and CPU utilization.
2. A recommendation for each workload.

Recommendations use a weighted score:

- Speedup: 50%, prioritizing reduced completion time.
- Efficiency: 30%, discouraging wasteful thread counts.
- CPU utilization: 20%, rewarding configurations that use available CPU capacity.

The recommendation is therefore not simply the fastest row. A high-thread configuration may have a slightly lower time but score worse because its efficiency falls sharply. Interpret recommendations only among rows where `correct` is true, and compare sessions only when hardware and workload parameters are equivalent.

## Interpreting a Run

A useful reading order is:

1. Check `correct` first.
2. Compare wall time against the one-thread baseline.
3. Check speedup to quantify the gain.
4. Check efficiency to see how much of the requested parallelism paid off.
5. Use CPU utilization to see how many logical processors were actually busy.
6. Use context switches and peak RSS to explain overhead or resource pressure.

For example, high CPU utilization with falling efficiency usually means the machine is busy but additional threads are competing for limited execution resources. A nearly flat compression curve with high memory usage and context switching suggests that the sequential file-I/O portion, rather than raw CPU capacity, is limiting performance.
