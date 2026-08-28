#pragma once

#include "benchmark_types.hpp"
#include "metrics.hpp"
#include <filesystem>

void run_benchmark(Workload& workload, const HardwareTopology& topology,
                   const std::vector<int>& thread_counts,
                   const std::filesystem::path& results_path,
                   long long session_id = 0);
