import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '../icons.generated';
import { Glass, Icon, Text } from '../primitives';
import { useTheme } from '../theme';
import { radius } from '../tokens';
import { type } from '../typography';
import { t } from '@/i18n';

type Segment<T extends string> = { value: T; label: string; labelStyle?: TextStyle };

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  height = 36,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  height?: number;
}) {
  const { colors } = useTheme();
  return (
    <Glass radius={radius.pill} style={styles.segmented}>
      {segments.map((s) => {
        const selected = s.value === value;
        return (
          <Pressable
            key={s.value}
            onPress={() => onChange(s.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, { minHeight: height }, selected && { backgroundColor: colors.glassStroke }]}
          >
            <Text variant="bodyStrong" color={selected ? 'textPrimary' : 'textSecondary'} style={s.labelStyle}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </Glass>
  );
}

export function ChipRow<T extends string>({
  chips,
  value,
  onChange,
}: {
  chips: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors, effects } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -20 }}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
    >
      {chips.map((c) => {
        const selected = c.value === value;
        return (
          <Pressable
            key={c.value}
            onPress={() => onChange(c.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              selected
                ? { backgroundColor: colors.accent, borderColor: colors.accent, boxShadow: effects.accentGlow }
                : { borderColor: colors.glassStroke },
            ]}
          >
            <Text variant="bodyStrong" color={selected ? 'onAccent' : 'textPrimary'}>
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SearchField({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  const { colors } = useTheme();
  return (
    <Glass radius={radius.field} style={styles.searchField}>
      <Icon name="search" size={20} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t.search.placeholder}
        placeholderTextColor={colors.textSecondary}
        style={[type.row, { flex: 1, color: colors.textPrimary, paddingVertical: 0, zIndex: 1 }]}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value ? (
        <IconButton icon="close" label={t.search.clear} onPress={() => onChangeText('')} size={36} iconSize={22} />
      ) : null}
    </Glass>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color = 'textSecondary',
  size = 44,
  iconSize = 22,
  selected,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: 'textSecondary' | 'textPrimary' | 'accent';
  size?: number;
  iconSize?: number;
  selected?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={({ pressed }) => [{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 }]}
    >
      <Icon name={icon} size={iconSize} color={color} />
    </Pressable>
  );
}

export function NavHeader({ backLabel, actions }: { backLabel: string; actions?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.navHeader, { paddingTop: Math.max(insets.top, 20) + 6 }]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        style={({ pressed }) => [styles.back, { opacity: pressed ? 0.5 : 1 }]}
      >
        <Icon name="chevron-left" size={24} color="accent" />
        <Text variant="row" color="accent" numberOfLines={1}>
          {backLabel}
        </Text>
      </Pressable>
      <View style={{ flexDirection: 'row' }}>{actions}</View>
    </View>
  );
}

export function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="groupLabel" color="textSecondary" style={{ paddingLeft: 4 }}>
        {label}
      </Text>
      <Glass radius={radius.card} style={{ paddingHorizontal: 16 }}>
        {children}
      </Glass>
    </View>
  );
}

type SettingsRowProps = { label: string; first?: boolean } & (
  | { value: string; onPress?: () => void; toggle?: never }
  | { toggle: boolean; onToggle: (on: boolean) => void; value?: never }
);

export function SettingsRow(props: SettingsRowProps) {
  const { colors } = useTheme();
  const divider = props.first ? null : { borderTopWidth: 1, borderTopColor: colors.glassStroke };
  if (props.toggle !== undefined) {
    return (
      <View style={[styles.settingsRow, divider]}>
        <Text variant="row" style={{ flex: 1 }}>
          {props.label}
        </Text>
        <Toggle value={props.toggle} onChange={props.onToggle} label={props.label} />
      </View>
    );
  }
  return (
    <Pressable
      onPress={props.onPress}
      disabled={!props.onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.settingsRow, divider, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text variant="row" style={{ flex: 1 }}>
        {props.label}
      </Text>
      <View style={styles.trailing}>
        <Text variant="body" color="textSecondary" style={{ fontSize: 15 }}>
          {props.value}
        </Text>
        {props.onPress ? <Icon name="chevron-right" size={16} color="iconFaint" /> : null}
      </View>
    </Pressable>
  );
}

const TRACK = { width: 51, height: 31 };
const THUMB = 27;

// Drawn by hand rather than the native Switch: the native one changes size between
// iOS versions (iOS 26 draws it larger than it reports), which pushed it off centre.
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (on: boolean) => void; label: string }) {
  const { colors } = useTheme();
  const [progress] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.timing(progress, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [value, progress]);
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
    >
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: [colors.switchOff, colors.accent] }) },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, TRACK.width - THUMB - 4] }) }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', padding: 3 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, paddingHorizontal: 12 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchField: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingLeft: 12, paddingRight: 6 },
  navHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, minHeight: 44 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingLeft: 4, paddingRight: 8, flexShrink: 1 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  track: { ...TRACK, borderRadius: radius.pill, padding: 2, justifyContent: 'center' },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.18)',
  },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
});
