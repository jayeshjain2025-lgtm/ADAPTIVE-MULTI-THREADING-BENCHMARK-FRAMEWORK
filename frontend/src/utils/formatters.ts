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
const KNOWN_OS_COLORS: Array<{ match: (s: string) => boolean; color: string }> = [
  // WSL2: Crisp Sky Blue
  {
    match: (s) => s.includes('WSL2') || s.includes('microsoft'),
    color: '#38bdf8',
  },
  // Linux Native / Fedora: High-contrast Emerald / Terminal Green
  {
    match: (s) => s.includes('fc44') || s.includes('fc') || s.toLowerCase().includes('fedora') || s.toLowerCase().includes('linux'),
    color: '#4ade80',
  },
  // Windows Native: Royal Cobalt Blue
  {
    match: (s) => s.toLowerCase().includes('windows'),
    color: '#60a5fa',
  },
  // macOS: Warm Amber Gold
  {
    match: (s) => s.toLowerCase().includes('darwin') || s.toLowerCase().includes('macos') || s.toLowerCase().includes('apple'),
    color: '#fbbf24',
  },
  // FreeBSD / BSD: Coral Red
  {
    match: (s) => s.toLowerCase().includes('bsd'),
    color: '#f87171',
  },
];

// Fallback high-contrast engineering colors
const FALLBACK_ENGINEERING_PALETTE = [
  '#38bdf8', // Sky Blue
  '#4ade80', // Emerald Green
  '#fbbf24', // Amber
  '#a78bfa', // Violet
  '#f472b6', // Pink
  '#2dd4bf', // Teal
  '#fb923c', // Orange
];

/**
 * Returns a consistent, distinct color for an OS across all charts, tables, and panels.
 */
export function getOSColor(osNameOrIndex: string | number): string {
  if (typeof osNameOrIndex === 'number') {
    return FALLBACK_ENGINEERING_PALETTE[osNameOrIndex % FALLBACK_ENGINEERING_PALETTE.length];
  }

  const osStr = String(osNameOrIndex || '');
  for (const entry of KNOWN_OS_COLORS) {
    if (entry.match(osStr)) {
      return entry.color;
    }
  }

  // Hash-based deterministic fallback for any arbitrary OS string
  let hash = 0;
  for (let i = 0; i < osStr.length; i++) {
    hash = (hash << 5) - hash + osStr.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % FALLBACK_ENGINEERING_PALETTE.length;
  return FALLBACK_ENGINEERING_PALETTE[idx];
}
