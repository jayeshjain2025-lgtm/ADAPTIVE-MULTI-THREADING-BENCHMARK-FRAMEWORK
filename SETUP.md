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

### Step 1 — Install dependencies

Open PowerShell and run the install script. If your execution policy blocks
scripts, bypass it for the current session only:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install-windows.ps1
```

The script uses **winget** to install MSYS2 and then installs the UCRT64
GCC/OpenMP toolchain, CMake, pkg-config, hwloc, and make via pacman.

> **Prerequisite:** winget must be available. It ships with Windows 11 and
> Windows 10 21H2+. If the command is not found, install **App Installer**
> from the Microsoft Store and try again.

### Step 2 — Build and run

Open the **MSYS2 UCRT64** terminal (search "UCRT64" in the Start menu),
navigate to the project directory, and run the same commands as Linux:

```bash
cmake -S . -B build
cmake --build build
./build/adaptive_benchmark.exe
```

---

### Fallback — if the PowerShell script fails

Use this if PowerShell is blocked by execution policy, group policy, or winget
is unavailable.

**1.** Download and install MSYS2 manually from <https://www.msys2.org/>.
Accept the default installation path (`C:\msys64`).

**2.** Open the **MSYS2 UCRT64** terminal and install dependencies:

```bash
pacman --noconfirm -Syuu
pacman --noconfirm -Syuu
pacman --noconfirm -S --needed \
    mingw-w64-ucrt-x86_64-toolchain \
    mingw-w64-ucrt-x86_64-cmake \
    mingw-w64-ucrt-x86_64-hwloc \
    mingw-w64-ucrt-x86_64-pkgconf \
    make
```

Run `pacman -Syuu` twice so core packages update before the rest.

**3.** Then build and run exactly as above:

```bash
cmake -S . -B build
cmake --build build
./build/adaptive_benchmark.exe
```

---

## Output

The executable writes one JSON record per completed run to `results.jsonl`.
That file is append-only; on subsequent runs the persisted results table and
recommendations are generated from the full accumulated history.
To start fresh, delete `results.jsonl` before running the executable.
