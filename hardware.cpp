#include "hardware.hpp"

#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <fstream>
#ifdef _WIN32
#include <cstdlib>
#include <windows.h>
#else
#include <sys/utsname.h>
#endif
#include <hwloc.h>
#include <omp.h>

namespace {
std::string detect_os_name() {
#ifdef _WIN32
    return "Windows";
#else
    struct utsname system_info {};
    return uname(&system_info) == 0
               ? std::string(system_info.sysname) + " " + system_info.release
               : "Unknown";
#endif
}

std::string detect_cpu_model() {
#ifdef _WIN32
    const char* env_cpu = std::getenv("PROCESSOR_IDENTIFIER");
    return env_cpu ? std::string(env_cpu) : "Unknown";
#else
    std::ifstream cpuinfo("/proc/cpuinfo");
    std::string line;
    while (std::getline(cpuinfo, line)) {
        const std::string prefix = "model name\t: ";
        if (line.rfind(prefix, 0) == 0) return line.substr(prefix.size());
    }
    return "Unknown";
#endif
}
}

HardwareTopology detect_hardware_topology() {
    HardwareTopology topology;
    topology.os_name = detect_os_name();
    topology.cpu_model = detect_cpu_model();
    hwloc_topology_t hwloc_topology = nullptr;
    if (hwloc_topology_init(&hwloc_topology) != 0 ||
        hwloc_topology_load(hwloc_topology) != 0) {
        if (hwloc_topology) hwloc_topology_destroy(hwloc_topology);
        return topology;
    }

    topology.physical_cores = hwloc_get_nbobjs_by_type(hwloc_topology, HWLOC_OBJ_CORE);
    topology.logical_processors = hwloc_get_nbobjs_by_type(hwloc_topology, HWLOC_OBJ_PU);
    const hwloc_obj_t root = hwloc_get_root_obj(hwloc_topology);
#ifdef _WIN32
    // hwloc reports only usable memory on Windows; use GlobalMemoryStatusEx
    // for the true installed physical RAM (same value as Task Manager shows).
    {
        MEMORYSTATUSEX mem_status {};
        mem_status.dwLength = sizeof(mem_status);
        if (GlobalMemoryStatusEx(&mem_status))
            topology.total_memory = static_cast<long long>(mem_status.ullTotalPhys);
        else if (root)
            topology.total_memory = root->total_memory; // fallback
    }
#else
    if (root) topology.total_memory = root->total_memory;
#endif

    const hwloc_obj_type_t cache_types[] = {
        HWLOC_OBJ_L1CACHE, HWLOC_OBJ_L2CACHE, HWLOC_OBJ_L3CACHE};
    for (const hwloc_obj_type_t cache_type : cache_types) {
        const int cache_count = hwloc_get_nbobjs_by_type(hwloc_topology, cache_type);
        for (int index = 0; index < cache_count; ++index) {
            const hwloc_obj_t cache = hwloc_get_obj_by_type(hwloc_topology, cache_type, index);
            if (cache && cache->attr)
                topology.cache_sizes[cache->attr->cache.depth].insert(cache->attr->cache.size);
        }
    }
    hwloc_topology_destroy(hwloc_topology);
    return topology;
}

std::vector<int> generate_thread_counts(const HardwareTopology& topology) {
    const int physical = std::max(1, topology.physical_cores);
    const int logical = std::max(physical, topology.logical_processors);
    std::set<int> counts;
    for (int count = 1; count < physical; count *= 2) {
        counts.insert(count);
        if (count > physical / 2) break;
    }
    counts.insert(physical);
    counts.insert(physical + (logical - physical) / 2);
    counts.insert(logical);
    counts.insert(logical + logical / 2);
    counts.insert(logical * 2);
    return {counts.begin(), counts.end()};
}

void print_hardware(const HardwareTopology& topology) {
    std::cout << "Hardware: " << topology.os_name << " | " << topology.cpu_model << "\n"
              << "  Physical cores: " << topology.physical_cores << "\n"
              << "  Logical processors: " << topology.logical_processors << "\n"
              << "  Total RAM: " << std::fixed << std::setprecision(2)
              << static_cast<double>(topology.total_memory) / (1024.0 * 1024.0 * 1024.0)
              << " GiB\n";
    for (const auto& [level, sizes] : topology.cache_sizes) {
        std::cout << "  L" << level << " cache: ";
        bool first = true;
        for (const auto size : sizes) {
            if (!first) std::cout << ", ";
            std::cout << (size >= 1024 * 1024 ? size / (1024 * 1024) : size / 1024)
                      << (size >= 1024 * 1024 ? " MiB" : " KiB");
            first = false;
        }
        std::cout << "\n";
    }
}
