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

import { getHymn, neighbours, playlistOf, type Hymn } from '@/data/hymnal';
import { userActions, useUserState } from '@/data/user-store';
import {
  IconButton,
  NavHeader,
  ReaderBar,
  Screen,
  Text,
  TextSettingsSheet,
  VerseBlock,
  type VerseChipItem,
} from '@/design-system';
import { t } from '@/i18n';

const KEEP_AWAKE_TAG = 'reader';

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ number: string; from?: string }>();
  const hymn = getHymn(Number(params.number));
  if (!hymn) return null;
  // Keyed so verse positions reset when moving to the next or previous hymn.
  return <Reader key={hymn.number} hymn={hymn} from={params.from} />;
}

function Reader({ hymn, from }: { hymn: Hymn; from?: string }) {
  const settings = useUserState((s) => s.settings);
  const favorite = useUserState((s) => s.favorites.includes(hymn.number));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const offsets = useRef<number[]>([]);
  const versesTop = useRef(0);

  const playlist = playlistOf(hymn);
  const { previous, next } = neighbours(hymn.number);
  const backLabel = from ?? t.reader.back;

  const chips: VerseChipItem[] = useMemo(
    () =>
      hymn.stanzas.map((s, i) =>
        s.type === 'refrain'
          ? { key: `r${i}`, label: 'R', a11y: t.reader.refrain }
          : { key: `v${i}`, label: String(s.number), a11y: t.reader.verse(s.number ?? i + 1) },
      ),
    [hymn],
  );
  const verseTotal = hymn.stanzas.filter((s) => s.type === 'verse').length;

  useEffect(() => {
    userActions.opened(hymn.number);
  }, [hymn.number]);

  useEffect(() => {
    // "Continue" on Home remembers the last verse reached.
    const stanza = hymn.stanzas[current];
    const verse = stanza?.type === 'verse' ? (stanza.number ?? 1) : hymn.stanzas.slice(0, current).filter((s) => s.type === 'verse').length || 1;
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

        <View style={{ paddingTop: 28, gap: 28 }} onLayout={(e) => (versesTop.current = e.nativeEvent.layout.y)}>
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
        current={current}
        onChip={(i) => {
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
