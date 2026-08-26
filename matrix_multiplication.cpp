#include <algorithm>
#include <random>
#include <filesystem>
#include <fstream>
#include <chrono>
#include <iostream>
#include <set>
#include <string>
#include <utility>
#include <vector>
#include <omp.h>

namespace fs = std::filesystem;

struct HardwareTopology {
    int physical_cores = 0;
    int logical_processors = 0;
};

std::string read_value(const fs::path& path) {
    std::ifstream input(path);
    std::string value;
    std::getline(input, value);
    return value;
}

HardwareTopology detect_hardware_topology() {
    HardwareTopology topology;
    std::set<std::pair<std::string, std::string>> physical_cores;
    const fs::path cpu_root = "/sys/devices/system/cpu";

    try {
        for (const auto& entry : fs::directory_iterator(cpu_root)) {
            const std::string name = entry.path().filename().string();
            if (name.rfind("cpu", 0) != 0 || name.size() == 3 ||
                name.find_first_not_of("0123456789", 3) != std::string::npos) {
                continue;
            }

            if (!fs::exists(entry.path() / "online") ||
                read_value(entry.path() / "online") == "1") {
                ++topology.logical_processors;
            }

            const fs::path cpu_topology = entry.path() / "topology";
            physical_cores.emplace(
                read_value(cpu_topology / "physical_package_id"),
                read_value(cpu_topology / "core_id"));
        }
    } catch (const fs::filesystem_error&) {
        topology = {};
    }

    topology.physical_cores = static_cast<int>(physical_cores.size());
    if (topology.logical_processors == 0) {
        topology.logical_processors = omp_get_num_procs();
    }
    if (topology.physical_cores == 0) {
        topology.physical_cores = topology.logical_processors;
    }
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

class Matrix {
public:
    // Fix: heap-allocated (via vector) instead of a fixed int mat[500][500]
    // stack array. Same [i][j] access pattern as before, but now the size
    // is only limited by available heap memory, not the stack, so this
    // scales to much larger matrices later without crashing.
    std::vector<std::vector<int>> mat;
    int r = 0; // active rows
    int c = 0; // active columns

    int num_generator() {
        static std::random_device rd;
        static std::mt19937 gen(rd());
        std::uniform_int_distribution<> distr(1, 1000);
        return distr(gen);
    }

    // Builds matrix and stores active dimensions
    void matrix_builder(int rows, int cols) {
        r = rows;
        c = cols;
        mat.assign(r, std::vector<int>(c)); // allocate on the heap
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                mat[i][j] = num_generator();
            }
        }
    }

    // Multiplication function. `threads` controls how many OpenMP threads
    // run this call. Pass 1 for a serial baseline.
    bool multiply(const Matrix& other, Matrix& result, int threads) {
        if (this->c != other.r) {
            std::cout << "Error: Dimension mismatch for multiplication!\n";
            return false;
        }

        result.r = this->r;
        result.c = other.c;
        result.mat.assign(result.r, std::vector<int>(result.c, 0));

        // Parallelize the outer (row) loop only. Each thread computes a
        // disjoint set of rows of `result`, so there's no shared-write
        // race between threads — no reduction or locking needed.
        // num_threads(threads) scopes the thread count to just this call,
        // so nothing leaks into the next multiply() call with a different
        // thread count.
        #pragma omp parallel for num_threads(threads) schedule(static)
        for (int i = 0; i < this->r; i++) {
            for (int j = 0; j < other.c; j++) {
                int sum = 0;
                for (int k = 0; k < this->c; k++) {
                    sum += this->mat[i][k] * other.mat[k][j];
                }
                result.mat[i][j] = sum;
            }
        }
        return true;
    }

    void print_matrix(int display_rows, int display_cols) {
        for (int i = 0; i < display_rows && i < r; i++) {
            for (int j = 0; j < display_cols && j < c; j++) {
                std::cout << mat[i][j] << "\t";
            }
            std::cout << "\n";
        }
    }

    // Exact equality check against another matrix — used to verify a
    // multi-threaded run produced the same result as the 1-thread baseline.
    bool equals(const Matrix& other) const {
        if (r != other.r || c != other.c) return false;
        for (int i = 0; i < r; i++)
            for (int j = 0; j < c; j++)
                if (mat[i][j] != other.mat[i][j]) return false;
        return true;
    }
};

int main() {
    Matrix m1, m2;

    // Keep matrix size fixed across all thread-count runs so thread count
    // is the only variable changing between them.
    m1.matrix_builder(300, 400);
    m2.matrix_builder(400, 300);

    std::cout << "Matrix 1 (First 3x4 elements):\n";
    m1.print_matrix(3, 4);
    std::cout << "\nMatrix 2 (First 4x3 elements):\n";
    m2.print_matrix(4, 3);

    const HardwareTopology topology = detect_hardware_topology();
    const std::vector<int> thread_counts = generate_thread_counts(topology);

    Matrix baseline_result; // result from the 1-thread run, used to verify correctness
    bool have_baseline = false;

    std::cout << "\n" << "Threads" << "\t" << "Time (microseconds)" << "\t" << "Correct?" << "\n";

    for (int t : thread_counts) {
        Matrix res;

        auto start = std::chrono::high_resolution_clock::now();
        bool success = m1.multiply(m2, res, t);
        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

        if (!success) continue;

        std::string correctness;
        if (t == 1) {
            // First run establishes the ground truth every other thread
            // count gets checked against.
            baseline_result = res;
            have_baseline = true;
            correctness = "baseline";
        } else if (have_baseline) {
            correctness = res.equals(baseline_result) ? "yes" : "MISMATCH";
        } else {
            correctness = "no baseline yet";
        }

        std::cout << t << "\t\t" << duration.count() << "\t\t\t" << correctness << "\n";
    }

    return 0;
}