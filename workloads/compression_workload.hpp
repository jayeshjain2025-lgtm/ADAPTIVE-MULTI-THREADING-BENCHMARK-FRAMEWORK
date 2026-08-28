#pragma once

#include "../benchmark_types.hpp"
#include <cstdint>
#include <filesystem>
#include <vector>

class CompressionWorkload final : public Workload {
public:
    explicit CompressionWorkload(std::size_t byte_count);
    WorkloadDescription description() const override;
    bool run(int threads) override;
    bool verify() const override;

private:
    static constexpr std::size_t block_size = 64 * 1024;
    std::vector<std::uint8_t> input;
    std::vector<std::uint8_t> baseline;
    std::vector<std::uint8_t> current;
    std::filesystem::path output_path;
};
