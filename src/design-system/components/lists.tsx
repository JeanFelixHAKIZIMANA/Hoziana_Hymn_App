import { Pressable, StyleSheet, View } from 'react-native';

import { Glass, Icon, Text } from '../primitives';
import { useTheme } from '../theme';
import { radius } from '../tokens';
import { t } from '@/i18n';

export function ScreenTitleBlock({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text variant="screenTitle" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="textSecondary">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionHeader({ title, linkLabel, onLink }: { title: string; linkLabel?: string; onLink?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="section" accessibilityRole="header">
        {title}
      </Text>
      {linkLabel ? (
        <Pressable onPress={onLink} hitSlop={8} accessibilityRole="link" style={{ paddingVertical: 8 }}>
          <Text variant="body" color="accent">
            {linkLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function GroupLabel({ children }: { children: string }) {
  return (
    <Text variant="groupLabel" color="textSecondary">
      {children}
    </Text>
  );
}

type RowProps = {
  number: number;
  title: string;
  meta?: string;
  chevron?: boolean;
  minHeight?: number;
  onPress: () => void;
};

export function SongRow({ number, title, meta, chevron = false, minHeight = 60, onPress }: RowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${number}, ${title}`}
      style={({ pressed }) => [styles.row, { minHeight, borderBottomColor: colors.glassStroke, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text variant="number" color="accent" style={styles.number}>
        {number}
      </Text>
      <View style={{ flex: 1 }}>
        <Text variant="row">{title}</Text>
        {meta ? (
          <Text variant="meta" color="textSecondary" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {chevron ? <Icon name="chevron-right" size={18} color="iconFaint" /> : null}
    </Pressable>
  );
}

export function LyricMatchRow({ number, title, snippet, onPress }: { number: number; title: string; snippet: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { alignItems: 'flex-start', paddingVertical: 12, borderBottomColor: colors.glassStroke, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text variant="number" color="accent" style={styles.number}>
        {number}
      </Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="row">{title}</Text>
        <Text variant="lyricSnippet" color="textSecondary">
          “{snippet}”
        </Text>
      </View>
    </Pressable>
  );
}

export function PlaylistRow({ letter, name, meta, onPress }: { letter: string; name: string; meta: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${meta}`}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.glassStroke, opacity: pressed ? 0.6 : 1 }]}
    >
      <Glass radius={radius.tile} style={styles.tile}>
        <Text variant="tileLetter" color="accent">
          {letter}
        </Text>
      </Glass>
      <View style={{ flex: 1 }}>
        <Text variant="rowStrong">{name}</Text>
        <Text variant="meta" color="textSecondary" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color="iconFaint" />
    </Pressable>
  );
}

export function ContinueCard({ title, meta, progress, onPress }: { title: string; meta: string; progress: number; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${t.home.continue}: ${title}, ${meta}`}>
      {({ pressed }) => (
        <Glass radius={radius.card} style={[styles.card, { opacity: pressed ? 0.8 : 1 }]}>
          <Text variant="overline" color="textSecondary">
            {t.home.continue}
          </Text>
          <View style={styles.cardRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="cardTitle">{title}</Text>
              <Text variant="meta" color="textSecondary">
                {meta}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color="iconFaint" />
          </View>
          <View style={[styles.track, { backgroundColor: colors.hairline }]}>
            <View style={[styles.bar, { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.accent }]} />
          </View>
        </Glass>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, minHeight: 60 },
  number: { width: 40 },
  tile: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 16, gap: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { height: 3, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 3, borderRadius: 3 },
});
