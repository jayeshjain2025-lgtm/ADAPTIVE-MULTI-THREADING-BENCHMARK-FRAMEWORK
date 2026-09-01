#!/usr/bin/env bash
set -euo pipefail

if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y gcc-c++ cmake make pkgconf-pkg-config hwloc hwloc-devel
elif command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y g++ cmake make pkg-config libhwloc-dev
else
    printf 'Unsupported Linux package manager. Install C++20, OpenMP, CMake, pkg-config, and hwloc manually.\n' >&2
    exit 1
fi

printf '\nRequirements installed. Versions:\n'
g++ --version | head -n 1
cmake --version | head -n 1
pkg-config --modversion hwloc
