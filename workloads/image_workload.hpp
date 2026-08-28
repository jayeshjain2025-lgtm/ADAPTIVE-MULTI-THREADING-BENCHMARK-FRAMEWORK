#pragma once

#include "../benchmark_types.hpp"
#include <cstdint>
#include <vector>

class ImageWorkload final : public Workload {
public:
    ImageWorkload(int width, int height);
    WorkloadDescription description() const override;
    bool run(int threads) override;
    bool verify() const override;

private:
    static constexpr int channels = 3;
    int width;
    int height;
    std::vector<std::uint8_t> input;
    std::vector<std::uint8_t> baseline;
    std::vector<std::uint8_t> current;
};
