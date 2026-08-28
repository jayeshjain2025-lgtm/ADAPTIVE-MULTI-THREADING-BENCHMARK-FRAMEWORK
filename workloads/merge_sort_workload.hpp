#pragma once

#include "../benchmark_types.hpp"
#include <vector>

class MergeSortWorkload final : public Workload {
public:
    explicit MergeSortWorkload(int element_count);
    WorkloadDescription description() const override;
    bool run(int threads) override;
    bool verify() const override;

private:
    static constexpr std::size_t task_cutoff = 2048;
    static void merge(std::vector<int>& values, std::vector<int>& temporary,
                      std::size_t first, std::size_t middle, std::size_t last);
    static void merge_sort_tasks(std::vector<int>& values,
                                 std::vector<int>& temporary,
                                 std::size_t first, std::size_t last);

    std::vector<int> input;
    std::vector<int> baseline;
    std::vector<int> current;
};
