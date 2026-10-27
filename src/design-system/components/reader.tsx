import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Stanza } from '@/data/hymnal';
import type { Settings } from '@/data/user-store';
import { t } from '@/i18n';
import { Glass, Text } from '../primitives';
import { useTheme } from '../theme';
import { lyricLineHeight, lyricSizes, radius, type LyricSize } from '../tokens';
import { type } from '../typography';
import { IconButton, SegmentedControl } from './controls';

type LyricStyle = { size: LyricSize; typeface: Settings['typeface']; showNumbers: boolean };

export function VerseBlock({ stanza, lyric }: { stanza: Stanza; lyric: LyricStyle }) {
  const refrain = stanza.type === 'refrain';
  const spoken = stanza.type === 'spoken';
  const lineHeight = lyricLineHeight(lyric.size);
  // A section (lines up to the next gap) reserves the part-label column only if it has parts,
  // so a passage everyone sings keeps the full width.
  const sectionHasParts: boolean[] = [];
  stanza.lines.forEach((line, i) => {
    if (i === 0 || line.gap) {
      const end = stanza.lines.findIndex((l, j) => j > i && l.gap);
      const hasParts = stanza.lines.slice(i, end === -1 ? undefined : end).some((l) => l.part);
      sectionHasParts.push(hasParts);
    } else {
      sectionHasParts.push(sectionHasParts[i - 1]);
    }
  });
  const fontFamily =
    lyric.typeface === 'sans' ? 'Inter-Regular' : refrain || spoken ? type.refrain.fontFamily : type.lyrics.fontFamily;
  const textStyle = {
    fontFamily,
    fontStyle: lyric.typeface === 'sans' && (refrain || spoken) ? ('italic' as const) : undefined,
    fontSize: lyric.size,
    lineHeight,
  };
  const label = spoken ? t.reader.spoken : refrain && !stanza.continued ? t.reader.refrain : null;

  return (
    <View style={styles.verse}>
      {lyric.showNumbers ? (
        <View style={styles.numberColumn}>
          {stanza.type === 'verse' && !stanza.continued ? (
            <Text variant="verseNumber" color="textSecondary" style={{ lineHeight }}>
              {stanza.number}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={[{ flex: 1 }, (refrain || spoken) && { paddingLeft: 16 }]}>
        {label ? (
          <Text variant="overline" color="textSecondary" style={{ lineHeight: 20 }}>
            {label}
          </Text>
        ) : null}
        {stanza.lines.map((line, i) => (
          <View key={i} style={line.gap && { paddingTop: Math.round(lineHeight / 2) }}>
            {line.heading ? (
              <Text variant="overline" color="textSecondary" style={{ lineHeight: 20 }}>
                {t.reader[line.heading]}
              </Text>
            ) : null}
            {/* Part labels (Gore, Bose…) sit in their own column so they never change the
                height of the lyric line; nested text with its own line height breaks the line box on iOS. */}
            <View style={styles.line}>
              {sectionHasParts[i] ? (
                <Text variant="overline" color="textSecondary" style={[styles.part, { lineHeight }]}>
                  {line.part ?? ''}
                </Text>
              ) : null}
              <Text color={refrain || spoken ? 'textRefrain' : 'textPrimary'} style={[textStyle, { flex: 1 }]}>
                {line.text}
                {line.repeat ? (
                  <Text variant="meta" color="textSecondary" style={{ lineHeight }}>
                    {'  '}×{line.repeat}
                  </Text>
                ) : null}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export type VerseChipItem = { key: string; label: string; a11y: string };

export function ReaderBar({
  chips,
  current,
  onChip,
  previous,
  next,
}: {
  chips: VerseChipItem[];
  current: number;
  onChip: (index: number) => void;
  previous?: { number: number; go: () => void };
  next?: { number: number; go: () => void };
}) {
  const { colors, effects } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Glass edges="top" shadow="none" style={[styles.readerBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={{ opacity: previous ? 1 : 0.3 }}>
        <IconButton
          icon="arrow-left"
          color="textPrimary"
          label={previous ? t.reader.previous(previous.number) : ''}
          onPress={() => previous?.go()}
        />
      </View>
      <View style={styles.chips}>
        {chips.map((c, i) => {
          const active = i === current;
          return (
            <Pressable
              key={c.key}
              onPress={() => onChip(i)}
              hitSlop={2}
              accessibilityRole="button"
              accessibilityLabel={c.a11y}
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                active && { backgroundColor: colors.accent, boxShadow: effects.accentGlow },
              ]}
            >
              <Text variant="number" color={active ? 'onAccent' : 'textSecondary'}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ opacity: next ? 1 : 0.3 }}>
        <IconButton icon="arrow-right" color="textPrimary" label={next ? t.reader.next(next.number) : ''} onPress={() => next?.go()} />
      </View>
    </Glass>
  );
}

export function TextSettingsSheet({
  visible,
  onClose,
  settings,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sizeIndex = lyricSizes.indexOf(settings.lyricSize);
  const step = (d: number) => {
    const next = lyricSizes[Math.min(lyricSizes.length - 1, Math.max(0, sizeIndex + d))];
    onChange('lyricSize', next);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={onClose} accessibilityLabel={t.textSheet.done} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <Glass strong radius={radius.sheet} topOnly style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 14 }]}>
          <View style={[styles.grabber, { backgroundColor: colors.hairline }]} />
          <View style={styles.sheetHeader}>
            <Text variant="section">{t.textSheet.title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text variant="rowStrong" color="accent">
                {t.textSheet.done}
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: 10 }}>
            <View style={styles.labelRow}>
              <Text variant="body" color="textSecondary">
                {t.textSheet.size}
              </Text>
              <Text variant="number">{t.textSheet.sizeValue(settings.lyricSize)}</Text>
            </View>
            <View style={styles.sizeControl}>
              <Pressable
                onPress={() => step(-1)}
                accessibilityLabel={t.textSheet.smaller}
                style={[styles.sizeButton, { borderColor: colors.glassStroke }]}
              >
                <Text style={{ fontFamily: 'SourceSerif-Regular', fontSize: 15, lineHeight: 20 }}>A</Text>
              </Pressable>
              <View style={[styles.track, { backgroundColor: colors.hairline }]}>
                <View
                  style={{
                    height: 4,
                    width: `${((sizeIndex + 1) / lyricSizes.length) * 100}%`,
                    backgroundColor: colors.accent,
                  }}
                />
              </View>
              <Pressable
                onPress={() => step(1)}
                accessibilityLabel={t.textSheet.larger}
                style={[styles.sizeButton, { borderColor: colors.glassStroke }]}
              >
                <Text style={{ fontFamily: 'SourceSerif-Regular', fontSize: 24, lineHeight: 31 }}>A</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text variant="body" color="textSecondary">
              {t.textSheet.typeface}
            </Text>
            <SegmentedControl
              value={settings.typeface}
              onChange={(v) => onChange('typeface', v)}
              segments={[
                { value: 'serif', label: t.textSheet.serif, labelStyle: { fontFamily: 'SourceSerif-Regular', fontSize: 16 } },
                { value: 'sans', label: t.textSheet.sans, labelStyle: { fontSize: 16 } },
              ]}
            />
          </View>

          <View style={{ gap: 10 }}>
            <Text variant="body" color="textSecondary">
              {t.textSheet.theme}
            </Text>
            <SegmentedControl
              value={settings.theme}
              onChange={(v) => onChange('theme', v)}
              segments={[
                { value: 'light', label: t.textSheet.light },
                { value: 'dark', label: t.textSheet.dark },
                { value: 'auto', label: t.textSheet.auto },
              ]}
            />
          </View>
        </Glass>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  verse: { flexDirection: 'row' },
  numberColumn: { width: 28 },
  line: { flexDirection: 'row' },
  part: { width: 52 },
  readerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingHorizontal: 12 },
  chips: { flexDirection: 'row', gap: 4, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { gap: 22, paddingTop: 8, paddingHorizontal: 20 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sizeControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sizeButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
});

