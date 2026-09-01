$ErrorActionPreference = 'Stop'

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'winget is required. Install App Installer from the Microsoft Store, then run this script again.'
}

winget install --id MSYS2.MSYS2 --exact --accept-source-agreements --accept-package-agreements

$msysRoot = 'C:\msys64'
$bash = Join-Path $msysRoot 'usr\bin\bash.exe'
if (-not (Test-Path $bash)) {
    throw "MSYS2 was not found at $msysRoot. Open the MSYS2 installer and use the default location."
}

& $bash -lc 'pacman --noconfirm -Syuu'
& $bash -lc 'pacman --noconfirm -Syuu'
& $bash -lc 'pacman --noconfirm -S --needed mingw-w64-ucrt-x86_64-toolchain mingw-w64-ucrt-x86_64-cmake mingw-w64-ucrt-x86_64-hwloc mingw-w64-ucrt-x86_64-pkgconf make'

Write-Host ''
Write-Host 'Requirements installed.'
Write-Host 'Build this project from the MSYS2 UCRT64 terminal with:'
Write-Host '  cmake -S . -B build'
Write-Host '  cmake --build build'
Write-Host '  ./build/adaptive_benchmark.exe'
