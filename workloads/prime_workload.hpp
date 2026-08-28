#pragma once

#include "../benchmark_types.hpp"
#include <vector>

class PrimeWorkload final : public Workload {
public:
    explicit PrimeWorkload(int limit);
    WorkloadDescription description() const override;
    bool run(int threads) override;
    bool verify() const override;

private:
    int limit;
    std::vector<int> base_primes;
    long long baseline_count = 0;
    long long current_count = 0;
};
