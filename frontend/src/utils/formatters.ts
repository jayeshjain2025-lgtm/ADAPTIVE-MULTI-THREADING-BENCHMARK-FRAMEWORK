export function formatTime(microseconds: number): string {
  if (microseconds == null || isNaN(microseconds)) return 'N/A';
  if (microseconds < 1000) {
    return `${microseconds.toLocaleString()} µs`;
  }
  const ms = microseconds / 1000;
  if (ms < 1000) {
    return `${ms.toFixed(2)} ms`;
  }
  const s = ms / 1000;
  return `${s.toFixed(2)} s`;
}

export function formatBytes(bytes: number): string {
  if (bytes == null || isNaN(bytes)) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export function formatPercent(value: number, decimals: number = 1): string {
  if (value == null || isNaN(value)) return 'N/A';
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (value == null || isNaN(value)) return 'N/A';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

// OS Friendly display names
export function getFriendlyOSName(osString: string): string {
  if (!osString) return 'Unknown OS';
  if (osString.includes('WSL2') || osString.includes('microsoft')) return 'Linux (WSL2)';
  if (osString.includes('fc44') || osString.includes('fc') || osString.toLowerCase().includes('fedora')) return 'Linux (Fedora Native)';
  if (osString.toLowerCase().includes('windows')) return 'Windows (Native)';
  if (osString.toLowerCase().includes('darwin') || osString.toLowerCase().includes('macos')) return 'macOS (Darwin)';
  if (osString.toLowerCase().includes('ubuntu')) return 'Linux (Ubuntu)';
  if (osString.toLowerCase().includes('debian')) return 'Linux (Debian)';
  if (osString.toLowerCase().includes('linux')) return 'Linux (Native)';
  return osString;
}

export function getShortOSName(osString: string): string {
  if (!osString) return 'Unknown OS';
  if (osString.includes('WSL2') || osString.includes('microsoft')) return 'WSL2';
  if (osString.includes('fc44') || osString.toLowerCase().includes('fedora')) return 'Fedora Native';
  if (osString.toLowerCase().includes('windows')) return 'Windows';
  if (osString.toLowerCase().includes('darwin') || osString.toLowerCase().includes('macos')) return 'macOS';
  if (osString.toLowerCase().includes('ubuntu')) return 'Ubuntu';
  if (osString.toLowerCase().includes('debian')) return 'Debian';
  if (osString.toLowerCase().includes('linux')) return 'Linux';
  return osString;
}


// Deterministic OS color mapping: ensures Windows, Linux Native, WSL2, macOS have constant, deliberate colors everywhere
// Configured with high-contrast pairs tailored for dark mode vs light mode
interface OSColorEntry {
  match: (s: string) => boolean;
  darkColor: string;
  lightColor: string;
}

const KNOWN_OS_COLORS: OSColorEntry[] = [
  // WSL2: Crisp Sky Blue in dark mode / Saturated Sapphire Blue in light mode
  {
    match: (s) => s.includes('WSL2') || s.includes('microsoft'),
    darkColor: '#38bdf8', // Sky 400
    lightColor: '#0284c7', // Sky 600 (rich, high contrast on light backgrounds)
  },
  // Linux Native / Fedora: Luminescent Emerald in dark mode / Deep Forest Emerald in light mode
  {
    match: (s) => s.includes('fc44') || s.includes('fc') || s.toLowerCase().includes('fedora') || s.toLowerCase().includes('linux'),
    darkColor: '#4ade80', // Green 400
    lightColor: '#059669', // Emerald 600 (crisp, deep contrast)
  },
  // Windows Native: Royal Blue in dark mode / Deep Cobalt in light mode
  {
    match: (s) => s.toLowerCase().includes('windows'),
    darkColor: '#60a5fa', // Blue 400
    lightColor: '#2563eb', // Blue 600
  },
  // macOS: Warm Amber in dark mode / Deep Ochre in light mode
  {
    match: (s) => s.toLowerCase().includes('darwin') || s.toLowerCase().includes('macos') || s.toLowerCase().includes('apple'),
    darkColor: '#fbbf24', // Amber 400
    lightColor: '#d97706', // Amber 600
  },
  // FreeBSD / BSD: Coral Red in dark mode / Deep Crimson in light mode
  {
    match: (s) => s.toLowerCase().includes('bsd'),
    darkColor: '#f87171', // Red 400
    lightColor: '#dc2626', // Red 600
  },
];

// Fallback high-contrast engineering colors
const FALLBACK_PALETTE_DARK = [
  '#38bdf8', // Sky Blue
  '#4ade80', // Emerald Green
  '#fbbf24', // Amber
  '#a78bfa', // Violet
  '#f472b6', // Pink
  '#2dd4bf', // Teal
  '#fb923c', // Orange
];

const FALLBACK_PALETTE_LIGHT = [
  '#0284c7', // Deep Sky
  '#059669', // Deep Emerald
  '#d97706', // Deep Amber
  '#7c3aed', // Deep Violet
  '#db2777', // Deep Rose/Pink
  '#0d9488', // Deep Teal
  '#ea580c', // Deep Orange
];

/**
 * Returns a consistent, distinct color for an OS across all charts, tables, and panels.
 * Adapts dynamically between Dark mode and Light mode palettes.
 */
export function getOSColor(osNameOrIndex: string | number, isDark?: boolean): string {
  // If isDark is not passed, check the <html> classList directly in browser environment
  const activeDark = isDark !== undefined
    ? isDark
    : (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true);

  const fallbackList = activeDark ? FALLBACK_PALETTE_DARK : FALLBACK_PALETTE_LIGHT;

  if (typeof osNameOrIndex === 'number') {
    return fallbackList[osNameOrIndex % fallbackList.length];
  }

  const osStr = String(osNameOrIndex || '');
  for (const entry of KNOWN_OS_COLORS) {
    if (entry.match(osStr)) {
      return activeDark ? entry.darkColor : entry.lightColor;
    }
  }

  // Hash-based deterministic fallback for any arbitrary OS string
  let hash = 0;
  for (let i = 0; i < osStr.length; i++) {
    hash = (hash << 5) - hash + osStr.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % fallbackList.length;
  return fallbackList[idx];
}

