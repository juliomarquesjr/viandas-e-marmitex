// Dashboard Light Theme Configuration
export const dashboardTheme = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    purple: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
    },
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    }
  },
  gradients: {
    primary: 'from-blue-400 to-blue-500',
    success: 'from-green-400 to-green-500',
    warning: 'from-orange-400 to-orange-500',
    danger: 'from-red-400 to-red-500',
    purple: 'from-purple-400 to-purple-500',
    background: 'from-slate-50 via-blue-50/20 to-indigo-50/20',
    lightCard: 'from-white to-slate-50/50',
  },
  shadows: {
    card: '0 4px 20px rgba(0, 0, 0, 0.05)',
    hover: '0 8px 20px rgba(0, 0, 0, 0.08)',
    glow: '0 0 15px rgba(99, 102, 241, 0.2)',
    light: '0 2px 12px rgba(0, 0, 0, 0.04)',
  },
  animations: {
    float: 'float 6s ease-in-out infinite',
    pulse: 'pulse 2s ease-in-out infinite alternate',
    shimmer: 'shimmer 1.5s infinite',
  }
};

export const getGradientClass = (type: keyof typeof dashboardTheme.gradients) => {
  return `bg-gradient-to-br ${dashboardTheme.gradients[type]}`;
};

export const getColorClass = (color: keyof typeof dashboardTheme.colors, shade: number) => {
  return `text-${color}-${shade}`;
};