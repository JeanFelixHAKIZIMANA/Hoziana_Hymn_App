import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text as RNText, View, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop, SvgXml } from 'react-native-svg';

import { iconXml, type IconName } from './icons.generated';
import { useTheme } from './theme';
import type { Palette } from './tokens';
import { type, type TextVariant } from './typography';

type ColorName = keyof Palette;

export function Text({
  variant = 'body',
  color = 'textPrimary',
  style,
  ...rest
}: TextProps & { variant?: TextVariant; color?: ColorName }) {
  const { colors } = useTheme();
  return <RNText {...rest} style={[type[variant], { color: colors[color] }, style]} />;
}

export function Icon({ name, size = 24, color = 'textSecondary' }: { name: IconName; size?: number; color?: ColorName }) {
  const { colors } = useTheme();
  // Keep the 1.75 pt stroke at every size, as the spec asks.
  const xml = iconXml[name].replaceAll('{{color}}', colors[color]).replaceAll('{{stroke}}', String((1.75 * 24) / size));
  return <SvgXml xml={xml} width={size} height={size} />;
}

type GlassProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  strong?: boolean;
  shadow?: 'surface' | 'floatingBar' | 'none';
  edges?: 'all' | 'top';
  topOnly?: boolean;
};

// Frosted surface: a blur on iOS (and web previews); on Android the same tint
// without blur, since Android blur is costly and barely visible over the plain
// paper background. Floating glass there is near-opaque so text never shows through.
export function Glass({ children, style, radius = 0, strong = false, shadow = 'surface', edges = 'all', topOnly = false }: GlassProps) {
  const { colors, effects, scheme } = useTheme();
  const corners = topOnly ? { borderTopLeftRadius: radius, borderTopRightRadius: radius } : { borderRadius: radius };
  const blur = Platform.OS !== 'android';
  const border = edges === 'all' ? { borderWidth: 1 } : { borderTopWidth: 1 };
  return (
    <View
      style={[
        { ...corners, boxShadow: shadow === 'none' ? undefined : effects[shadow] },
        style,
      ]}
    >
      <View style={[StyleSheet.absoluteFill, corners, { overflow: 'hidden' }]}>
        {blur && <BlurView intensity={40} tint={scheme} style={StyleSheet.absoluteFill} />}
        <View
          style={[
            StyleSheet.absoluteFill,
            border,
            corners,
            {
              borderColor: colors.glassStroke,
              backgroundColor: strong ? (blur ? colors.glassFillStrong : colors.glassFillStrongNoBlur) : colors.glassFill,
            },
          ]}
        />
      </View>
      {children}
    </View>
  );
}

// The single faint indigo glow behind every screen ("Ambient light" in Figma).
// Figma draws it as a blurred circle; a radial gradient gives the same falloff
// on both platforms.
export function AmbientLight() {
  const { colors, glowOpacity } = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="glow" cx="190" cy="30" r="380" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={glowOpacity} />
            <Stop offset="0.45" stopColor={colors.accent} stopOpacity={glowOpacity * 0.85} />
            <Stop offset="0.65" stopColor={colors.accent} stopOpacity={glowOpacity * 0.4} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
      </Svg>
    </View>
  );
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      <AmbientLight />
      {children}
    </View>
  );
}
