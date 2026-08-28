#pragma once

#include <chrono>
#include <map>
#include <set>
#include <string>
#include <vector>

struct HardwareTopology {
    std::string os_name;
    std::string cpu_model;
    int physical_cores = 0;
    int logical_processors = 0;
    unsigned long long total_memory = 0;
    std::map<int, std::set<unsigned long long>> cache_sizes;
};

struct WorkloadDescription {
    std::string name;
    std::string type;
    std::map<std::string, std::string> parameters;
};

struct Measurements {
    long long wall_time_microseconds = 0;
    double cpu_utilization_percent = -1.0;
    long long peak_memory_bytes = -1;
    long long voluntary_context_switches = -1;
    long long involuntary_context_switches = -1;
};

struct BenchmarkRun {
    long long session_id = 0;
    HardwareTopology hardware;
    WorkloadDescription workload;
    int thread_count = 0;
    Measurements measurements;
    double speedup = 0.0;
    double efficiency = 0.0;
    bool correct = false;
};

struct ResourceSnapshot {
    std::chrono::steady_clock::time_point time;
    long long cpu_time_microseconds = -1;
    long long peak_memory_bytes = -1;
    long long voluntary_context_switches = -1;
    long long involuntary_context_switches = -1;
};

class Workload {
public:
    virtual ~Workload() = default;
    virtual WorkloadDescription description() const = 0;
    virtual bool run(int threads) = 0;
    virtual bool verify() const = 0;
};
