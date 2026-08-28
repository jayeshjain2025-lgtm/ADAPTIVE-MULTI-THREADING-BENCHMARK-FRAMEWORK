#include "image_workload.hpp"

#include <omp.h>

ImageWorkload::ImageWorkload(int width, int height) : width(width), height(height),
    input(static_cast<std::size_t>(width) * height * channels) {
    for (std::size_t index = 0; index < input.size(); ++index)
        input[index] = static_cast<std::uint8_t>((index * 37 + index / width) % 256);
}

WorkloadDescription ImageWorkload::description() const {
    return {"Image processing", "synthetic RGB 3x3 blur", {
        {"width", std::to_string(width)},
        {"height", std::to_string(height)},
        {"channels", std::to_string(channels)}}};
}

bool ImageWorkload::run(int threads) {
    current.assign(input.size(), 0);
    #pragma omp parallel for num_threads(threads) schedule(static)
    for (int row = 0; row < height; ++row) {
        for (int column = 0; column < width; ++column) {
            for (int channel = 0; channel < channels; ++channel) {
                int sum = 0;
                int samples = 0;
                for (int row_offset = -1; row_offset <= 1; ++row_offset) {
                    const int source_row = row + row_offset;
                    if (source_row < 0 || source_row >= height) continue;
                    for (int column_offset = -1; column_offset <= 1; ++column_offset) {
                        const int source_column = column + column_offset;
                        if (source_column < 0 || source_column >= width) continue;
                        const std::size_t source =
                            (static_cast<std::size_t>(source_row) * width + source_column) * channels + channel;
                        sum += input[source];
                        ++samples;
                    }
                }
                const std::size_t destination =
                    (static_cast<std::size_t>(row) * width + column) * channels + channel;
                current[destination] = static_cast<std::uint8_t>(sum / samples);
            }
        }
    }
    if (threads == 1) baseline = current;
    return true;
}

bool ImageWorkload::verify() const { return current == baseline; }
