#include "benchmark_driver.hpp"
#include "hardware.hpp"
#include "results.hpp"
#include "workloads/compression_workload.hpp"
#include "workloads/image_workload.hpp"
#include "workloads/matrix_workload.hpp"
#include "workloads/merge_sort_workload.hpp"
#include "workloads/prime_workload.hpp"

#include <chrono>

int main() {
    const std::filesystem::path results_path = "results.jsonl";
    const HardwareTopology topology = detect_hardware_topology();
    const std::vector<int> thread_counts = generate_thread_counts(topology);
    const long long session_id = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    print_hardware(topology);

    MatrixWorkload matrix(900, 1600, 900);
    run_benchmark(matrix, topology, thread_counts, results_path, session_id);

    PrimeWorkload primes(50000000);
    run_benchmark(primes, topology, thread_counts, results_path, session_id);

    MergeSortWorkload merge_sort(1000000);
    run_benchmark(merge_sort, topology, thread_counts, results_path, session_id);

    ImageWorkload image(2048, 2048);
    run_benchmark(image, topology, thread_counts, results_path, session_id);

    CompressionWorkload compression(64 * 1024 * 1024);
    run_benchmark(compression, topology, thread_counts, results_path, session_id);

    const std::vector<BenchmarkRun> persisted_runs = load_runs(results_path);
    print_results_table(persisted_runs);
    print_recommendations(persisted_runs);

    return 0;
}
