#include "benchmark_driver.hpp"
#include "results.hpp"

#include <iomanip>
#include <iostream>
#include <algorithm>
#include <vector>

namespace {
constexpr int trial_count = 5;

long long median(std::vector<long long> values) {
    std::sort(values.begin(), values.end());
    return values[values.size() / 2];
}

double median(std::vector<double> values) {
    std::sort(values.begin(), values.end());
    return values[values.size() / 2];
}

Measurements median_measurements(const std::vector<Measurements>& trials) {
    std::vector<long long> wall_times, peak_memory, voluntary_switches, involuntary_switches;
    std::vector<double> cpu_utilization;
    for (const auto& measurement : trials) {
        wall_times.push_back(measurement.wall_time_microseconds);
        cpu_utilization.push_back(measurement.cpu_utilization_percent);
        peak_memory.push_back(measurement.peak_memory_bytes);
        voluntary_switches.push_back(measurement.voluntary_context_switches);
        involuntary_switches.push_back(measurement.involuntary_context_switches);
    }
    return {median(wall_times), median(cpu_utilization), median(peak_memory),
            median(voluntary_switches), median(involuntary_switches)};
}
}

void run_benchmark(Workload& workload, const HardwareTopology& topology,
                   const std::vector<int>& thread_counts,
                   const std::filesystem::path& results_path,
                   long long session_id) {
    const WorkloadDescription details = workload.description();
    std::cout << "\nWorkload: " << details.name << " (" << details.type << ")\n";
    for (const auto& [name, value] : details.parameters)
        std::cout << "  " << name << ": " << value << "\n";
    std::cout << "Threads\tWall time (us)\tCPU %\tCumulative peak RSS (KiB)\tVol CS\tInvol CS\tSpeedup\tEfficiency\tCorrect?\n";

    long long baseline_time = 0;
    for (const int threads : thread_counts) {
        std::vector<Measurements> trial_measurements;
        bool success = true;
        bool correct = true;
        for (int trial = 0; trial < trial_count; ++trial) {
            const ResourceSnapshot start = capture_resources();
            success = workload.run(threads);
            const ResourceSnapshot end = capture_resources();
            if (!success) break;
            trial_measurements.push_back(measure_resources(start, end));
            if (threads != 1 && !workload.verify()) correct = false;
        }
        if (!success || trial_measurements.empty()) continue;

        BenchmarkRun run;
        run.session_id = session_id;
        run.hardware = topology;
        run.workload = details;
        run.thread_count = threads;
        run.measurements = median_measurements(trial_measurements);
        if (threads == 1) {
            baseline_time = run.measurements.wall_time_microseconds;
            run.correct = true;
        } else {
            run.correct = correct;
        }
        run.speedup = baseline_time > 0
            ? static_cast<double>(baseline_time) / run.measurements.wall_time_microseconds : 0.0;
        run.efficiency = run.speedup / threads;
        append_run(run, results_path);
        std::cout << threads << "\t" << run.measurements.wall_time_microseconds << "\t"
                  << std::setprecision(1) << run.measurements.cpu_utilization_percent << "\t"
                  << (run.measurements.peak_memory_bytes >= 0
                      ? std::to_string(run.measurements.peak_memory_bytes / 1024) : "N/A") << "\t"
                  << (run.measurements.voluntary_context_switches >= 0
                      ? std::to_string(run.measurements.voluntary_context_switches) : "N/A") << "\t"
                  << (run.measurements.involuntary_context_switches >= 0
                      ? std::to_string(run.measurements.involuntary_context_switches) : "N/A") << "\t"
                  << std::setprecision(3) << run.speedup << "\t" << run.efficiency << "\t"
                  << (threads == 1 ? "baseline" : (run.correct ? "yes" : "MISMATCH")) << "\n";
    }
}
