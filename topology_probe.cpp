#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <set>
#include <string>
#include <utility>

namespace fs = std::filesystem;

std::string read_value(const fs::path& path) {
    std::ifstream input(path);
    std::string value;
    std::getline(input, value);
    return value;
}

int main() {
    const fs::path cpu_root = "/sys/devices/system/cpu";
    std::set<std::pair<std::string, std::string>> physical_cores;
    std::set<int> logical_processors;
    std::map<int, std::set<std::string>> cache_sizes;

    for (const auto& entry : fs::directory_iterator(cpu_root)) {
        const std::string name = entry.path().filename().string();
        if (name.rfind("cpu", 0) != 0 || name.size() == 3 ||
            name.find_first_not_of("0123456789", 3) != std::string::npos) {
            continue;
        }

        const int processor = std::stoi(name.substr(3));
        if (!fs::exists(entry.path() / "online") ||
            read_value(entry.path() / "online") == "1") {
            logical_processors.insert(processor);
        }

        const fs::path topology = entry.path() / "topology";
        physical_cores.emplace(read_value(topology / "physical_package_id"),
                               read_value(topology / "core_id"));

        const fs::path cache_root = entry.path() / "cache";
        if (!fs::exists(cache_root)) continue;
        for (const auto& cache : fs::directory_iterator(cache_root)) {
            const std::string cache_name = cache.path().filename().string();
            if (cache_name.rfind("index", 0) != 0) continue;
            const std::string level = read_value(cache.path() / "level");
            const std::string size = read_value(cache.path() / "size");
            if (!level.empty() && !size.empty()) {
                cache_sizes[std::stoi(level)].insert(size);
            }
        }
    }

    std::ifstream meminfo("/proc/meminfo");
    std::string label;
    long long total_ram_kib = 0;
    while (meminfo >> label) {
        if (label == "MemTotal:") {
            meminfo >> total_ram_kib;
            break;
        }
        std::string ignored;
        std::getline(meminfo, ignored);
    }

    std::cout << "Physical cores: " << physical_cores.size() << '\n';
    std::cout << "Logical processors: " << logical_processors.size() << '\n';
    std::cout << "Cache sizes:\n";
    for (const auto& [level, sizes] : cache_sizes) {
        std::cout << "  L" << level << ": ";
        bool first = true;
        for (const std::string& size : sizes) {
            if (!first) std::cout << ", ";
            std::cout << size;
            first = false;
        }
        std::cout << '\n';
    }
    std::cout << "Total RAM: " << total_ram_kib / 1024 << " MiB\n";

    return physical_cores.empty() || logical_processors.empty() || total_ram_kib == 0;
}
