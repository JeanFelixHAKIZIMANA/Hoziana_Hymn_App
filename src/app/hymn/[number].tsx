import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { getHymn, isNavigable, neighbours, playlistOf, playlists, verseCount, type Hymn } from '@/data/hymnal';
import { userActions, useUserState } from '@/data/user-store';
import {
  IconButton,
  NavHeader,
  ReaderBar,
  Screen,
  Text,
  TextSettingsSheet,
  VerseBlock,
  lyricLineHeight,
  type VerseChipItem,
} from '@/design-system';
import { t } from '@/i18n';

const KEEP_AWAKE_TAG = 'reader';

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ number: string; from?: string }>();
  const hymn = getHymn(Number(params.number));
  if (!hymn) return null;
  // Keyed so verse positions reset when moving to the next or previous hymn.
  return <Reader key={hymn.number} hymn={hymn} from={backLabelFor(params.from)} />;
}

// `from` arrives in the link, so any app or website can set it: only the app's own screen names are shown.
function backLabelFor(from?: string) {
  if (!from) return undefined;
  const known = from === t.search.title || from === t.favorites.title || playlists.some((p) => t.playlists.volume(p.label) === from);
  return known ? from : undefined;
}

function Reader({ hymn, from }: { hymn: Hymn; from?: string }) {
  const settings = useUserState((s) => s.settings);
  const favorite = useUserState((s) => s.favorites.includes(hymn.number));
  const [sheetOpen, setSheetOpen] = useState(false);
  // Index of the stanza at the top of the screen.
  const [current, setCurrent] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const offsets = useRef<number[]>([]);
  const versesTop = useRef(0);

  const playlist = playlistOf(hymn);
  const { previous, next } = neighbours(hymn.number);
  const backLabel = from ?? t.reader.back;

  // One chip per verse or refrain; spoken passages and continuations belong to the chip before them.
  const chipStanzas = useMemo(() => hymn.stanzas.flatMap((s, i) => (isNavigable(s) ? [i] : [])), [hymn]);
  const chips: VerseChipItem[] = chipStanzas.map((i) => {
    const s = hymn.stanzas[i];
    return s.type === 'refrain'
      ? { key: `r${i}`, label: 'R', a11y: t.reader.refrain }
      : { key: `v${i}`, label: String(s.number), a11y: t.reader.verse(s.number ?? i + 1) };
  });
  const currentChip = Math.max(0, chipStanzas.findLastIndex((i) => i <= current));
  const verseTotal = verseCount(hymn);
  const lineHeight = lyricLineHeight(settings.lyricSize);

  useEffect(() => {
    userActions.opened(hymn.number);
  }, [hymn.number]);

  useEffect(() => {
    // "Continue" on Home remembers the last verse reached.
    const verse = hymn.stanzas.slice(0, current + 1).filter((s) => s.type === 'verse' && !s.continued).length || 1;
    userActions.setPosition({ number: hymn.number, verse, total: verseTotal });
  }, [current, hymn, verseTotal]);

  useEffect(() => {
    if (!settings.keepAwake) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [settings.keepAwake]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y + 120;
    let index = 0;
    offsets.current.forEach((top, i) => {
      if (versesTop.current + top <= y) index = i;
    });
    if (index !== current) setCurrent(index);
  };

  const goTo = (n?: Hymn) => {
    if (n) router.replace({ pathname: '/hymn/[number]', params: { number: n.number, from: backLabel } });
  };

  const share = () => {
    const text = hymn.stanzas
      .map((s) => s.lines.map((l) => l.text).join('\n'))
      .join('\n\n');
    Share.share({ message: `${hymn.number}. ${hymn.title}\n\n${text}` });
  };

  const details = [hymn.author, hymn.key && t.reader.keyOf(hymn.key)].filter(Boolean).join(' · ');

  return (
    <Screen>
      <NavHeader
        backLabel={backLabel}
        actions={
          <>
            <Pressable
              onPress={() => setSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t.reader.textSettings}
              style={styles.aa}
            >
              <Text variant="section" color="textSecondary">
                Aa
              </Text>
            </Pressable>
            <IconButton
              icon={favorite ? 'heart-filled' : 'heart'}
              color={favorite ? 'accent' : 'textSecondary'}
              label={favorite ? t.reader.unfavorite : t.reader.favorite}
              selected={favorite}
              onPress={() => userActions.toggleFavorite(hymn.number)}
            />
            <IconButton icon="share" label={t.reader.share} onPress={share} />
          </>
        }
      />

      <ScrollView
        ref={scroll}
        onScroll={onScroll}
        scrollEventThrottle={64}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 32 }}
      >
        <Text variant="overline" color="textSecondary">
          <Text variant="overline" color="accent">
            {t.reader.numberOverline(hymn.number)}
          </Text>
          {playlist ? ` · ${t.playlists.volume(playlist.label)}` : ''}
        </Text>
        <Text variant="songTitle" accessibilityRole="header" style={{ paddingTop: 6 }}>
          {hymn.title}
        </Text>
        {details || hymn.scripture ? (
          <View style={{ paddingTop: 10, gap: 2 }}>
            {details ? (
              <Text variant="meta" color="textSecondary">
                {details}
              </Text>
            ) : null}
            {hymn.scripture ? (
              <Text variant="meta" color="textSecondary">
                {hymn.scripture}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* One blank line between stanzas, at whatever size the lyrics are set. */}
        <View style={{ paddingTop: 28, gap: lineHeight }} onLayout={(e) => (versesTop.current = e.nativeEvent.layout.y)}>
          {hymn.stanzas.map((stanza, i) => (
            <View key={i} onLayout={(e) => (offsets.current[i] = e.nativeEvent.layout.y)}>
              <VerseBlock
                stanza={stanza}
                lyric={{ size: settings.lyricSize, typeface: settings.typeface, showNumbers: settings.verseNumbers }}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <ReaderBar
        chips={chips}
        current={currentChip}
        onChip={(chip) => {
          const i = chipStanzas[chip];
          setCurrent(i);
          scroll.current?.scrollTo({ y: versesTop.current + (offsets.current[i] ?? 0) - 12, animated: true });
        }}
        previous={previous && { number: previous.number, go: () => goTo(previous) }}
        next={next && { number: next.number, go: () => goTo(next) }}
      />

      <TextSettingsSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        settings={settings}
        onChange={userActions.setSetting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  aa: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
