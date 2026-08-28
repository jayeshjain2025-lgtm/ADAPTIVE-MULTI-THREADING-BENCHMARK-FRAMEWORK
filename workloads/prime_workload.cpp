#include "prime_workload.hpp"

#include <algorithm>
#include <cmath>
#include <omp.h>

PrimeWorkload::PrimeWorkload(int limit) : limit(limit) {
    const int root = static_cast<int>(std::sqrt(limit));
    std::vector<bool> is_prime(root + 1, true);
    is_prime[0] = is_prime[1] = false;
    for (int value = 2; value * value <= root; ++value) {
        if (!is_prime[value]) continue;
        for (int multiple = value * value; multiple <= root; multiple += value)
            is_prime[multiple] = false;
    }
    for (int value = 2; value <= root; ++value)
        if (is_prime[value]) base_primes.push_back(value);
}

WorkloadDescription PrimeWorkload::description() const {
    return {"Prime generation", "segmented sieve", {{"limit", std::to_string(limit)}}};
}

bool PrimeWorkload::run(int threads) {
    constexpr int segment_size = 32768;
    const int segment_count = (limit + segment_size) / segment_size;
    long long prime_count = 0;
    #pragma omp parallel for num_threads(threads) reduction(+:prime_count) schedule(static)
    for (int segment = 0; segment < segment_count; ++segment) {
        const int low = segment * segment_size;
        const int high = std::min(low + segment_size, limit + 1);
        std::vector<bool> is_prime(high - low, true);
        if (low == 0) {
            if (high > 0) is_prime[0] = false;
            if (high > 1) is_prime[1] = false;
        }
        for (const int prime : base_primes) {
            const long long first = std::max(1LL * prime * prime,
                ((low + prime - 1) / prime) * 1LL * prime);
            for (long long multiple = first; multiple < high; multiple += prime)
                is_prime[multiple - low] = false;
        }
        for (const bool value : is_prime)
            if (value) ++prime_count;
    }
    if (threads == 1) baseline_count = prime_count;
    else current_count = prime_count;
    return true;
}

bool PrimeWorkload::verify() const { return current_count == baseline_count; }
