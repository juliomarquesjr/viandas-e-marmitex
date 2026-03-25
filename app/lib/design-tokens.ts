/**
 * Design Tokens - CRM Viandas e Marmitex
 * 
 * Este arquivo contém todos os tokens do sistema de design.
 * Baseado no plano de redesign inspirado em HubSpot/Salesforce.
 */

// =============================================================================
// CORES
// =============================================================================

export const colors = {
  // Cores Primárias (Brand)
  primary: {
    DEFAULT: '#2563eb', // blue-600
    hover: '#1d4ed8', // blue-700
    light: '#dbeafe', // blue-100
    lighter: '#eff6ff', // blue-50
    dark: '#1e40af', // blue-800
  },

  // Cores de Status
  status: {
    success: {
      DEFAULT: '#10b981', // emerald-500
      light: '#d1fae5', // emerald-100
      dark: '#059669', // emerald-600
    },
    warning: {
      DEFAULT: '#f59e0b', // amber-500
      light: '#fef3c7', // amber-100
      dark: '#d97706', // amber-600
    },
    error: {
      DEFAULT: '#ef4444', // red-500
      light: '#fee2e2', // red-100
      dark: '#dc2626', // red-600
    },
    info: {
      DEFAULT: '#3b82f6', // blue-500
      light: '#dbeafe', // blue-100
      dark: '#2563eb', // blue-600
    },
  },

  // Cores Neutras (UI)
  neutral: {
    background: '#f8fafc', // slate-50
    surface: '#ffffff',
    border: '#e2e8f0', // slate-200
    borderDark: '#cbd5e1', // slate-300
  },

  // Texto
  text: {
    primary: '#0f172a', // slate-900
    secondary: '#64748b', // slate-500
    muted: '#94a3b8', // slate-400
    inverse: '#ffffff',
  },

  // Cores de ação
  action: {
    hover: '#f1f5f9', // slate-100
    selected: '#eff6ff', // blue-50
    disabled: '#f1f5f9', // slate-100
  },
} as const;

// =============================================================================
// TIPOGRAFIA
// =============================================================================

export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },

  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2rem', // 32px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

// =============================================================================
// ESPAÇAMENTOS
// =============================================================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  DEFAULT: '0.375rem', // 6px
  md: '0.5rem', // 8px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// =============================================================================
// SOMBRAS
// =============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  card: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  dropdown: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  modal: '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

// =============================================================================
// TRANSIÇÕES
// =============================================================================

export const transitions = {
  fast: '150ms ease',
  DEFAULT: '200ms ease',
  slow: '300ms ease',
  color: 'color 150ms ease, background-color 150ms ease, border-color 150ms ease',
  transform: 'transform 200ms ease',
  all: 'all 200ms ease',
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

export const zIndex = {
  dropdown: 50,
  sticky: 100,
  fixed: 200,
  modalBackdrop: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// =============================================================================
// COMPONENTES - Tamanhos específicos
// =============================================================================

export const components = {
  // Botões
  button: {
    sizes: {
      sm: {
        height: '32px',
        paddingX: '12px',
        fontSize: '0.875rem', // 14px
      },
      md: {
        height: '40px',
        paddingX: '16px',
        fontSize: '0.875rem', // 14px
      },
      lg: {
        height: '48px',
        paddingX: '24px',
        fontSize: '1rem', // 16px
      },
    },
  },

  // Inputs
  input: {
    height: '40px',
    paddingX: '12px',
    fontSize: '0.875rem', // 14px
  },

  // Cards
  card: {
    padding: '20px',
    borderRadius: '12px',
  },

  // Sidebar
  sidebar: {
    width: '260px',
    widthCollapsed: '72px',
  },

  // Header
  header: {
    height: '64px',
  },

  // Tabela
  table: {
    rowHeight: '56px',
    cellPaddingX: '16px',
    cellPaddingY: '12px',
  },

  // Badge
  badge: {
    sizes: {
      sm: {
        height: '20px',
        paddingX: '8px',
        fontSize: '0.75rem', // 12px
      },
      md: {
        height: '24px',
        paddingX: '10px',
        fontSize: '0.75rem', // 12px
      },
      lg: {
        height: '28px',
        paddingX: '12px',
        fontSize: '0.875rem', // 14px
      },
    },
  },
} as const;

// =============================================================================
// UTILITÁRIOS
// =============================================================================

/**
 * Combina classes CSS condicionalmente
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Gera variáveis CSS a partir dos tokens
 */
export function generateCSSVariables(): Record<string, string> {
  return {
    '--color-primary': colors.primary.DEFAULT,
    '--color-primary-hover': colors.primary.hover,
    '--color-primary-light': colors.primary.light,
    '--color-background': colors.neutral.background,
    '--color-surface': colors.neutral.surface,
    '--color-border': colors.neutral.border,
    '--color-text-primary': colors.text.primary,
    '--color-text-secondary': colors.text.secondary,
    '--color-text-muted': colors.text.muted,
    '--shadow-card': shadows.card,
    '--shadow-dropdown': shadows.dropdown,
    '--radius-md': borderRadius.md,
    '--radius-lg': borderRadius.lg,
  };
}

// Export default
export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  components,
};
