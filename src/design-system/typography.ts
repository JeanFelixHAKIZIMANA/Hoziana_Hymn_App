import type { TextStyle } from 'react-native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_500Medium,
} from '@expo-google-fonts/source-serif-4';

// Each face is registered under its own family name, so styles pick a face with
// fontFamily alone (fontWeight is not reliable with custom fonts on Android).
export const fontFaces = {
  'Inter-Regular': Inter_400Regular,
  'Inter-Medium': Inter_500Medium,
  'Inter-SemiBold': Inter_600SemiBold,
  'SourceSerif-Regular': SourceSerif4_400Regular,
  'SourceSerif-Italic': SourceSerif4_400Regular_Italic,
  'SourceSerif-Medium': SourceSerif4_500Medium,
};

type FontFamily = keyof typeof fontFaces;

const style = (fontFamily: FontFamily, fontSize: number, lineHeight: number, extra: TextStyle = {}): TextStyle => ({
  fontFamily,
  fontSize,
  lineHeight,
  ...extra,
});

// Text styles, named as in Figma. Letter spacing converted from % to points.
export const type = {
  songTitle: style('SourceSerif-Medium', 30, 36, { letterSpacing: -0.3 }),
  cardTitle: style('SourceSerif-Regular', 22, 28),
  lyrics: style('SourceSerif-Regular', 20, 32),
  refrain: style('SourceSerif-Italic', 20, 32),
  lyricSnippet: style('SourceSerif-Regular', 15, 22),
  tileLetter: style('SourceSerif-Regular', 19, 24),
  screenTitle: style('Inter-SemiBold', 32, 38, { letterSpacing: -0.64 }),
  section: style('Inter-SemiBold', 17, 22),
  row: style('Inter-Regular', 16, 22),
  rowStrong: style('Inter-Medium', 16, 22),
  number: style('Inter-Medium', 15, 22, { fontVariant: ['tabular-nums'] }),
  body: style('Inter-Regular', 14, 20),
  bodyStrong: style('Inter-Medium', 14, 20),
  meta: style('Inter-Regular', 13, 18),
  groupLabel: style('Inter-Medium', 13, 18),
  overline: style('Inter-Medium', 11, 14, { letterSpacing: 0.88, textTransform: 'uppercase' }),
  tabLabel: style('Inter-Medium', 11, 14),
  verseNumber: style('Inter-Medium', 12, 32, { fontVariant: ['tabular-nums'] }),
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof type;
