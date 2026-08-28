#include "compression_workload.hpp"

#include <algorithm>
#include <fstream>
#include <omp.h>

namespace {
std::vector<std::uint8_t> encode_block(const std::vector<std::uint8_t>& input,
                                       std::size_t first, std::size_t last) {
    std::vector<std::uint8_t> encoded;
    for (std::size_t index = first; index < last;) {
        const std::uint8_t value = input[index];
        std::size_t run = 1;
        while (index + run < last && input[index + run] == value && run < 255) ++run;
        encoded.push_back(static_cast<std::uint8_t>(run));
        encoded.push_back(value);
        index += run;
    }
    return encoded;
}

std::vector<std::uint8_t> decode_bytes(const std::vector<std::uint8_t>& compressed,
                                       std::size_t expected_size) {
    std::vector<std::uint8_t> decoded;
    decoded.reserve(expected_size);
    for (std::size_t index = 0; index + 1 < compressed.size(); index += 2)
        decoded.insert(decoded.end(), compressed[index], compressed[index + 1]);
    return decoded;
}
}

CompressionWorkload::CompressionWorkload(std::size_t byte_count)
    : input(byte_count), output_path(std::filesystem::temp_directory_path() / "adaptive_benchmark.rle") {
    for (std::size_t index = 0; index < input.size(); ++index)
        input[index] = index % 4096 < 3000 ? static_cast<std::uint8_t>(index % 256)
                                          : static_cast<std::uint8_t>((index * 73) % 256);
}

WorkloadDescription CompressionWorkload::description() const {
    return {"Compression", "parallel block RLE with file I/O", {
        {"input bytes", std::to_string(input.size())},
        {"format", "run-length encoding"}}};
}

bool CompressionWorkload::run(int threads) {
    const std::size_t block_count = (input.size() + block_size - 1) / block_size;
    std::vector<std::vector<std::uint8_t>> blocks(block_count);
    #pragma omp parallel for num_threads(threads) schedule(static)
    for (std::size_t block = 0; block < block_count; ++block) {
        const std::size_t first = block * block_size;
        const std::size_t last = std::min(first + block_size, input.size());
        blocks[block] = encode_block(input, first, last);
    }

    std::ofstream output(output_path, std::ios::binary | std::ios::trunc);
    if (!output) return false;
    for (const auto& block : blocks)
        output.write(reinterpret_cast<const char*>(block.data()),
                     static_cast<std::streamsize>(block.size()));
    output.close();
    if (!output) return false;

    std::ifstream compressed(output_path, std::ios::binary);
    std::vector<std::uint8_t> file_data((std::istreambuf_iterator<char>(compressed)), {});
    if (!compressed.good() && !compressed.eof()) return false;

    current = decode_bytes(file_data, input.size());
    if (current.size() != input.size()) return false;
    if (threads == 1) baseline = current;
    return true;
}

bool CompressionWorkload::verify() const { return current == baseline && current == input; }
