#!/usr/bin/env bash
set -euo pipefail

if ! command -v brew >/dev/null 2>&1; then
    printf 'Homebrew is required. Install it from https://brew.sh, then run this script again.\n' >&2
    exit 1
fi

brew update
brew install gcc cmake pkg-config hwloc

printf '\nRequirements installed. Versions:\n'
clang++ --version | head -n 1
cmake --version | head -n 1
pkg-config --modversion hwloc
