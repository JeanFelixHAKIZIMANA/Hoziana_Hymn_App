// Design tokens for the approved "Screens · Glass" design.
// Base palette, spacing and radii come from design/hoziana-tokens.json; the glass
// tokens (glass-fill, glass-stroke, accent-tint, effects) come from the Figma
// variable collections "Hoziana" and "Hoziana Dark". Screens never use raw colours.

export type ColorScheme = 'light' | 'dark';

const light = {
  background: '#F8F6F1',
  surface: '#FFFFFF',
  field: '#EFECE5',
  hairline: '#E6E1D7',
  textPrimary: '#1D1B18',
  textSecondary: '#6B645A',
  textRefrain: '#3E3932',
  iconFaint: '#B3ACA1',
  switchOff: '#D9D4CA',
  accent: '#34479A',
  onAccent: '#FFFFFF',
  scrim: 'rgba(10, 9, 8, 0.38)',
  glassFill: 'rgba(255, 255, 255, 0.52)',
  glassFillStrong: 'rgba(255, 255, 255, 0.72)',
  glassStroke: 'rgba(255, 255, 255, 0.8)',
  accentTint: 'rgba(52, 71, 154, 0.05)',
  // Android has no blur behind glass, so floating glass (tab bar, sheet) is near-opaque there.
  glassFillStrongNoBlur: 'rgba(252, 251, 248, 0.96)',
};

const dark: typeof light = {
  background: '#141312',
  surface: '#1D1C1A',
  field: '#242320',
  hairline: '#2C2A27',
  textPrimary: '#ECE8E1',
  textSecondary: '#A39C92',
  textRefrain: '#CFC9C0',
  iconFaint: '#5E5952',
  switchOff: '#3A3834',
  accent: '#9DAAF0',
  onAccent: '#141312',
  scrim: 'rgba(10, 9, 8, 0.38)',
  glassFill: 'rgba(255, 255, 255, 0.07)',
  glassFillStrong: 'rgba(31, 31, 51, 0.72)',
  glassStroke: 'rgba(255, 255, 255, 0.14)',
  accentTint: 'rgba(255, 255, 255, 0.05)',
  glassFillStrongNoBlur: 'rgba(33, 32, 40, 0.96)',
};

export const palettes = { light, dark };
export type Palette = typeof light;

// Effect styles, written as CSS box-shadow strings for React Native's boxShadow prop.
export const effects = {
  light: {
    surface: '0px 10px 30px 0px rgba(43, 46, 115, 0.10)',
    floatingBar: '0px 14px 36px 0px rgba(31, 33, 82, 0.16), 0px 2px 6px 0px rgba(31, 33, 82, 0.06)',
    accentGlow: '0px 4px 16px 0px rgba(51, 71, 153, 0.35)',
  },
  dark: {
    surface: '0px 10px 30px 0px rgba(0, 0, 0, 0.40)',
    floatingBar: '0px 14px 36px 0px rgba(0, 0, 0, 0.55), 0px 2px 6px 0px rgba(0, 0, 0, 0.30)',
    accentGlow: '0px 4px 16px 0px rgba(157, 170, 240, 0.30)',
  },
};

// Opacity of the single indigo glow behind each screen.
export const ambientGlowOpacity = { light: 0.1, dark: 0.16 };

export const space = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  28: 28,
  48: 48,
  screenMargin: 20,
  touchTarget: 44,
} as const;

export const radius = {
  tile: 10,
  field: 12,
  card: 14,
  sheet: 20,
  pill: 999,
} as const;

// Lyric sizes offered in the Aa sheet; line height is size × 1.6, rounded.
export const lyricSizes = [17, 20, 24, 28] as const;
export type LyricSize = (typeof lyricSizes)[number];
export const lyricLineHeight = (size: number) => Math.round(size * 1.6);
