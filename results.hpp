#pragma once

#include "benchmark_types.hpp"
#include <filesystem>
#include <vector>

void append_run(const BenchmarkRun& run, const std::filesystem::path& path);
std::vector<BenchmarkRun> load_runs(const std::filesystem::path& path);
void print_results_table(const std::vector<BenchmarkRun>& runs);
void print_recommendations(const std::vector<BenchmarkRun>& runs);
