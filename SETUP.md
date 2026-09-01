# Setup

This project requires a C++20 compiler, OpenMP, CMake 3.16 or newer, pkg-config, and hwloc 2.x.

## Linux

Fedora/RHEL-like systems:

```bash
./install-linux.sh
```

Debian/Ubuntu systems are also supported by the script through `apt-get`.

Build and run:

```bash
cmake -S . -B build
cmake --build build
./build/adaptive_benchmark
```

## macOS

Install Homebrew first if it is not already installed, then run:

```bash
./install-macos.sh
cmake -S . -B build
cmake --build build
./build/adaptive_benchmark
```

The Homebrew `gcc` package supplies OpenMP support. If CMake chooses Apple Clang instead, configure with the Homebrew GCC compiler shown by `brew --prefix gcc`.

## Windows

Run PowerShell as a user allowed to install applications:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install-windows.ps1
```

The script installs MSYS2 and its UCRT64 GCC/OpenMP, CMake, pkg-config, hwloc, and make packages. Open the **MSYS2 UCRT64** terminal to build:

```bash
cd /c/path/to/ADAPTIVE\ MULTI-THREADING\ BENCHMARK\ FRAMEWORK
cmake -S . -B build
cmake --build build
./build/adaptive_benchmark.exe
```

## Output

The executable writes benchmark records to `results.jsonl`. That file is append-only JSON Lines and is read back to generate the results table and recommendations.
