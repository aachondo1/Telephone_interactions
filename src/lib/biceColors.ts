/**
 * BICE Hipotecaria Color System
 * Based on official brandbook 2025
 * 
 * Primary: Navy #003A70 (Pantone 654 C)
 * Secondary: Cyan #00ABC8 (Pantone 3125 C)
 * Typography: Open Sans (digital), JetBrains Mono (numerals)
 */

export const BICE_COLORS = {
  // Primary brand palette
  navy: '#003A70',           // Pantone 654 C — main corporate blue
  navyDark: '#0a5396',       // Darker navy for hover/active states
  navyLight: '#1f6db1',      // Lighter navy for backgrounds
  navyTint: '#e8f0f8',       // Very light navy tint for backgrounds

  // Secondary accent palette
  cyan: '#00ABC8',           // Pantone 3125 C — brand cyan
  cyanLight: '#5cc9dd',      // Lighter cyan for secondary accents
  cyanTint: '#e6f7fa',       // Very light cyan tint for backgrounds

  // Semantic colors
  success: '#1d8e6e',        // For positive metrics
  successBg: '#e3f4ee',
  warning: '#b8761b',        // For caution alerts
  warningBg: '#fbf1de',
  alert: '#c0392b',          // For critical issues
  alertBg: '#fbe7e3',

  // Agent occupancy status colors
  productive: '#84BD00',      // Productivo - actively handling calls
  available: '#326295',       // Disponible - in queue ready to take calls
  pause: '#65646A',          // Pausa - on break/meal/meeting
  noResponse: '#ef4444',     // No Responde - not responding to alerts

  // Neutrals (cool grey scale to harmonize with navy)
  text: '#0a1828',           // Near-black with blue tint
  textSecondary: '#2c3e54',
  textMuted: '#5b6b7d',
  textLight: '#8a98a8',

  background: '#ffffff',
  backgroundSecondary: '#f5f7fa',
  backgroundTertiary: '#eaeef3',

  border: '#dde3eb',
  borderLight: '#c6d0db',
  borderDark: '#c6d0db',
};

/**
 * Tailwind color class helpers
 */
export const BICE_CLASSES = {
  // Text colors
  textNavy: 'text-bice-navy',
  textCyan: 'text-bice-cyan',
  textSuccess: 'text-bice-success',
  textWarning: 'text-bice-warning',
  textAlert: 'text-bice-alert',

  // Background colors
  bgNavy: 'bg-bice-navy',
  bgNavyTint: 'bg-bice-navy-tint',
  bgCyan: 'bg-bice-cyan',
  bgCyanTint: 'bg-bice-cyan-tint',
  bgSuccess: 'bg-bice-success-bg',
  bgWarning: 'bg-bice-warning-bg',
  bgAlert: 'bg-bice-alert-bg',

  // Border colors
  borderNavy: 'border-bice-navy',
  borderCyan: 'border-bice-cyan',

  // Button styles
  buttonPrimary: 'bg-bice-navy hover:bg-bice-navy-dark text-white font-medium rounded-lg transition-colors',
  buttonSecondary: 'bg-bice-cyan-tint hover:bg-bice-cyan text-bice-navy font-medium rounded-lg transition-colors',
  buttonOutline: 'bg-transparent border border-bice-navy text-bice-navy hover:bg-bice-navy-tint font-medium rounded-lg transition-colors',

  // Card styles
  cardBase: 'bg-white rounded-xl border border-slate-200 shadow-sm',
  cardHover: 'bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow',

  // Badge styles
  badgeSuccess: 'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-bice-success-bg text-bice-success text-xs font-semibold',
  badgeWarning: 'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-bice-warning-bg text-bice-warning text-xs font-semibold',
  badgeAlert: 'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-bice-alert-bg text-bice-alert text-xs font-semibold',
};

/**
 * Chart color palettes for Recharts
 */
export const CHART_COLORS = {
  primary: BICE_COLORS.navy,
  secondary: BICE_COLORS.cyan,
  accent: BICE_COLORS.cyanLight,
  success: BICE_COLORS.success,
  warning: BICE_COLORS.warning,
  alert: BICE_COLORS.alert,
  gridStroke: BICE_COLORS.borderLight,
  axisStroke: BICE_COLORS.textMuted,
};

/**
 * Isotipo (brand bars) motif
 * The 7 horizontal bars from the BICE logo can be rendered as:
 * - Sidebar accent
 * - Section divider
 * - Decorative element
 */
export const ISOTIPO_BARS = {
  count: 7,
  gap: 2,  // pixels between bars
  color: BICE_COLORS.navy,
  // SVG component snippet:
  svg: `<svg className="w-8 h-6" viewBox="0 0 28 24" fill="currentColor">
    <rect y="0" width="28" height="2" fill="currentColor" />
    <rect y="4" width="28" height="2" fill="currentColor" />
    <rect y="8" width="28" height="2" fill="currentColor" />
    <rect y="12" width="28" height="2" fill="currentColor" />
    <rect y="16" width="28" height="2" fill="currentColor" />
    <rect y="20" width="28" height="2" fill="currentColor" />
  </svg>`,
};

/**
 * Format helpers
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

export const formatPercent = (ratio: number, decimals = 1): string => {
  return `${(ratio * 100).toFixed(decimals)}%`;
};

export const formatNumber = (num: number): string => {
  return num.toLocaleString('es-CL');
};

/**
 * Status badge helpers
 */
export const getStatusColor = (value: number, thresholds = { good: 0.8, warning: 0.6 }) => {
  if (value >= thresholds.good) return BICE_COLORS.success;
  if (value >= thresholds.warning) return BICE_COLORS.warning;
  return BICE_COLORS.alert;
};

export const getStatusLabel = (value: number, thresholds = { good: 0.8, warning: 0.6 }) => {
  if (value >= thresholds.good) return 'Bueno';
  if (value >= thresholds.warning) return 'Advertencia';
  return 'Crítico';
};
