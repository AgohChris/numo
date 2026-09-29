import { Platform } from 'react-native';

const inkBlue = '#1B2A4A';
const inkBlueLight = '#2E4270';
const warmAccent = '#E08E45';
const warmAccentDark = '#F2A461';

export const Colors = {
  light: {
    text: '#1C1E21',
    textSecondary: '#6B7280',
    background: '#FAF9F7',
    surface: '#FFFFFF',
    border: '#E8E6E1',
    tint: inkBlue,
    accent: warmAccent,
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: inkBlue,
  },
  dark: {
    text: '#F2F1EF',
    textSecondary: '#9BA1A6',
    background: '#14161A',
    surface: '#1D2026',
    border: '#2A2E36',
    tint: inkBlueLight,
    accent: warmAccentDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: inkBlueLight,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    title: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    title: 'sans-serif-medium',
    mono: 'monospace',
  },
  web: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    title: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
};

export const Radii = {
  sm: 8,
  md: 14,
  lg: 20,
  full: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
};
