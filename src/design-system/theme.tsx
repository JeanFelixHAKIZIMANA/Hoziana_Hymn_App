import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useUserState } from '@/data/user-store';
import { ambientGlowOpacity, effects, palettes, type ColorScheme, type Palette } from './tokens';

type Theme = {
  scheme: ColorScheme;
  colors: Palette;
  effects: (typeof effects)['light'];
  glowOpacity: number;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const preference = useUserState((s) => s.settings.theme);
  const scheme: ColorScheme = preference === 'auto' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const theme = useMemo(
    () => ({
      scheme,
      colors: palettes[scheme],
      effects: effects[scheme],
      glowOpacity: ambientGlowOpacity[scheme],
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
