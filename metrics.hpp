#pragma once

#include "benchmark_types.hpp"

ResourceSnapshot capture_resources();
Measurements measure_resources(const ResourceSnapshot& start,
                               const ResourceSnapshot& end);
