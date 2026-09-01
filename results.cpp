#include "results.hpp"

#include <algorithm>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <regex>
#include <sstream>
#include <stdexcept>

namespace {
std::string quote(const std::string& value) {
    std::string escaped;
    for (const char character : value) {
        if (character == '\\' || character == '"') escaped += '\\';
        escaped += character;
    }
    return "\"" + escaped + "\"";
}

template <typename Number>
bool number(const std::string& line, const std::string& key, Number& value) {
    std::regex pattern("\\\"" + key + "\\\"\\s*:\\s*(-?[0-9]+(?:\\.[0-9]+)?)");
    std::smatch match;
    if (!std::regex_search(line, match, pattern)) return false;
    std::istringstream input(match[1].str());
    input >> value;
    return !input.fail();
}

bool text(const std::string& line, const std::string& key, std::string& value) {
    std::regex pattern("\\\"" + key + "\\\"\\s*:\\s*\\\"([^\\\"]*)\\\"");
    std::smatch match;
    if (!std::regex_search(line, match, pattern)) return false;
    value = match[1].str();
    return true;
}

bool boolean(const std::string& line, const std::string& key, bool& value) {
    std::regex pattern("\\\"" + key + "\\\"\\s*:\\s*(true|false)");
    std::smatch match;
    if (!std::regex_search(line, match, pattern)) return false;
    value = match[1].str() == "true";
    return true;
}
}

void append_run(const BenchmarkRun& run, const std::filesystem::path& path) {
    std::ofstream output(path, std::ios::app);
    if (!output) throw std::runtime_error("Unable to open results file: " + path.string());
    output << "{\"session_id\":" << run.session_id << ",\"hardware\":{"
           << "\"os\":" << quote(run.hardware.os_name)
           << ",\"cpu_model\":" << quote(run.hardware.cpu_model)
           << ",\"physical_cores\":" << run.hardware.physical_cores
           << ",\"logical_processors\":" << run.hardware.logical_processors
           << ",\"total_memory_bytes\":" << run.hardware.total_memory << "},"
           << "\"workload\":{\"name\":" << quote(run.workload.name)
           << ",\"type\":" << quote(run.workload.type) << "},"
           << "\"configuration\":{\"thread_count\":" << run.thread_count << "},"
           << "\"measurements\":{\"wall_time_microseconds\":" << run.measurements.wall_time_microseconds
           << ",\"cpu_utilization_percent\":" << run.measurements.cpu_utilization_percent
           << ",\"peak_memory_bytes\":" << run.measurements.peak_memory_bytes
           << ",\"voluntary_context_switches\":" << run.measurements.voluntary_context_switches
           << ",\"involuntary_context_switches\":" << run.measurements.involuntary_context_switches << "},"
           << "\"derived\":{\"speedup\":" << run.speedup
           << ",\"efficiency\":" << run.efficiency
           << ",\"correct\":" << (run.correct ? "true" : "false") << "}}\n";
}

std::vector<BenchmarkRun> load_runs(const std::filesystem::path& path) {
    std::ifstream input(path);
    std::vector<BenchmarkRun> runs;
    std::string line;
    while (std::getline(input, line)) {
        BenchmarkRun run;
        if (number(line, "session_id", run.session_id) &&
            text(line, "os", run.hardware.os_name) && text(line, "cpu_model", run.hardware.cpu_model) &&
            text(line, "name", run.workload.name) && text(line, "type", run.workload.type) &&
            number(line, "physical_cores", run.hardware.physical_cores) &&
            number(line, "logical_processors", run.hardware.logical_processors) &&
            number(line, "total_memory_bytes", run.hardware.total_memory) &&
            number(line, "thread_count", run.thread_count) &&
            number(line, "wall_time_microseconds", run.measurements.wall_time_microseconds) &&
            number(line, "cpu_utilization_percent", run.measurements.cpu_utilization_percent) &&
            number(line, "peak_memory_bytes", run.measurements.peak_memory_bytes) &&
            number(line, "voluntary_context_switches", run.measurements.voluntary_context_switches) &&
            number(line, "involuntary_context_switches", run.measurements.involuntary_context_switches) &&
            number(line, "speedup", run.speedup) && number(line, "efficiency", run.efficiency) &&
            boolean(line, "correct", run.correct)) runs.push_back(run);
    }
    return runs;
}

void print_results_table(const std::vector<BenchmarkRun>& runs) {
    std::cout << "\nPersisted results table\nWorkload\tThreads\tTime (us)\tSpeedup\tEfficiency\tCPU %\n";
    for (const auto& run : runs)
        std::cout << run.workload.name << "\t" << run.thread_count << "\t"
                  << run.measurements.wall_time_microseconds << "\t" << std::fixed
                  << std::setprecision(3) << run.speedup << "\t" << run.efficiency << "\t"
                  << std::setprecision(1) << run.measurements.cpu_utilization_percent << "\n";
}

void print_recommendations(const std::vector<BenchmarkRun>& runs) {
    std::set<std::string> names;
    for (const auto& run : runs) names.insert(run.workload.name);
    std::cout << "\nRecommendations\nScore weights: speedup 50%, efficiency 30%, CPU utilization 20%.\n";
    for (const auto& name : names) {
        const BenchmarkRun* best = nullptr;
        double best_score = -1.0;
        double max_speedup = 0.0, max_efficiency = 0.0, max_cpu = 0.0;
        for (const auto& run : runs) if (run.workload.name == name) {
            max_speedup = std::max(max_speedup, run.speedup);
            max_efficiency = std::max(max_efficiency, run.efficiency);
            max_cpu = std::max(max_cpu, run.measurements.cpu_utilization_percent);
        }
        for (const auto& run : runs) if (run.workload.name == name) {
            const double score = 0.5 * run.speedup / max_speedup +
                0.3 * run.efficiency / max_efficiency +
                0.2 * run.measurements.cpu_utilization_percent / max_cpu;
            if (score > best_score) { best_score = score; best = &run; }
        }
        if (best) std::cout << name << ": recommend " << best->thread_count
            << " threads (score " << std::setprecision(3) << best_score << ").\n";
    }
}
