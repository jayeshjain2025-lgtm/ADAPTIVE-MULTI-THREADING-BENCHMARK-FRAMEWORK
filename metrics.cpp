#include "metrics.hpp"

#include <chrono>
#include <cstdint>

#if defined(_WIN32)
#include <windows.h>
#include <psapi.h>
#elif defined(__linux__) || defined(__APPLE__)
#include <sys/resource.h>
#if defined(__APPLE__)
#include <mach/mach.h>
#endif
#endif

namespace {
#if defined(_WIN32)
long long filetime_microseconds(const FILETIME& value) {
    ULARGE_INTEGER ticks;
    ticks.LowPart = value.dwLowDateTime;
    ticks.HighPart = value.dwHighDateTime;
    return static_cast<long long>(ticks.QuadPart / 10);
}
#endif

#if !defined(_WIN32)
long long timeval_microseconds(const timeval& value) {
    return static_cast<long long>(value.tv_sec) * 1000000LL + value.tv_usec;
}
#endif
}

ResourceSnapshot capture_resources() {
    ResourceSnapshot snapshot;
    snapshot.time = std::chrono::steady_clock::now();

#if defined(_WIN32)
    FILETIME creation_time, exit_time, kernel_time, user_time;
    if (GetProcessTimes(GetCurrentProcess(), &creation_time, &exit_time,
                        &kernel_time, &user_time)) {
        snapshot.cpu_time_microseconds = filetime_microseconds(kernel_time) +
                                         filetime_microseconds(user_time);
    }

    PROCESS_MEMORY_COUNTERS memory {};
    if (GetProcessMemoryInfo(GetCurrentProcess(), &memory, sizeof(memory)))
        snapshot.peak_memory_bytes = static_cast<long long>(memory.PeakWorkingSetSize);
#elif defined(__linux__) || defined(__APPLE__)
    struct rusage usage {};
    if (getrusage(RUSAGE_SELF, &usage) == 0) {
        snapshot.cpu_time_microseconds = timeval_microseconds(usage.ru_utime) +
                                         timeval_microseconds(usage.ru_stime);
        snapshot.voluntary_context_switches = usage.ru_nvcsw;
        snapshot.involuntary_context_switches = usage.ru_nivcsw;
#if defined(__APPLE__)
        snapshot.peak_memory_bytes = usage.ru_maxrss;
#else
        snapshot.peak_memory_bytes = usage.ru_maxrss * 1024LL;
#endif
    }
#endif

    return snapshot;
}

Measurements measure_resources(const ResourceSnapshot& start,
                               const ResourceSnapshot& end) {
    Measurements measurements;
    measurements.wall_time_microseconds = std::chrono::duration_cast<
        std::chrono::microseconds>(end.time - start.time).count();

    if (start.cpu_time_microseconds >= 0 && end.cpu_time_microseconds >= 0 &&
        measurements.wall_time_microseconds > 0) {
        measurements.cpu_utilization_percent =
            100.0 * (end.cpu_time_microseconds - start.cpu_time_microseconds) /
            measurements.wall_time_microseconds;
    }
    measurements.peak_memory_bytes = end.peak_memory_bytes;
    if (start.voluntary_context_switches >= 0 && end.voluntary_context_switches >= 0)
        measurements.voluntary_context_switches =
            end.voluntary_context_switches - start.voluntary_context_switches;
    if (start.involuntary_context_switches >= 0 && end.involuntary_context_switches >= 0)
        measurements.involuntary_context_switches =
            end.involuntary_context_switches - start.involuntary_context_switches;
    return measurements;
}
