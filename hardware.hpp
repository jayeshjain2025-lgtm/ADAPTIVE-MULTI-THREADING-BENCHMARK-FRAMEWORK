#pragma once

#include "benchmark_types.hpp"

HardwareTopology detect_hardware_topology();
std::vector<int> generate_thread_counts(const HardwareTopology& topology);
void print_hardware(const HardwareTopology& topology);
