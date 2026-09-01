cmake_minimum_required(VERSION 3.16)
project(adaptive_multithreading_benchmark LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(OpenMP REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(HWLOC REQUIRED IMPORTED_TARGET hwloc)

add_executable(adaptive_benchmark
    main.cpp
    hardware.cpp
    metrics.cpp
    results.cpp
    benchmark_driver.cpp
    workloads/matrix_workload.cpp
    workloads/prime_workload.cpp
    workloads/merge_sort_workload.cpp
    workloads/image_workload.cpp
    workloads/compression_workload.cpp
)
target_link_libraries(adaptive_benchmark PRIVATE
    OpenMP::OpenMP_CXX
    PkgConfig::HWLOC
)

if(WIN32)
    target_link_libraries(adaptive_benchmark PRIVATE Psapi)
endif()