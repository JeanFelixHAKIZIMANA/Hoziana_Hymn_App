import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPlaylist, playlistOf, playlists, searchHymns, type Hymn } from '@/data/hymnal';
import {
  ChipRow,
  GroupLabel,
  LyricMatchRow,
  Screen,
  ScreenTitleBlock,
  SearchField,
  SongRow,
  TAB_BAR_CLEARANCE,
  Text,
} from '@/design-system';
import { t } from '@/i18n';

const ALL = 'all';

const open = (hymn: Hymn) => router.push({ pathname: '/hymn/[number]', params: { number: hymn.number, from: t.search.title } });

export default function Search() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>(ALL);

  const results = useMemo(
    () => searchHymns(query, filter === ALL ? undefined : getPlaylist(filter)),
    [query, filter],
  );
  const empty = !query.trim();
  const nothing = !empty && results.titles.length === 0 && results.lyrics.length === 0;

  const volumeName = (hymn: Hymn) => {
    const p = playlistOf(hymn);
    return p ? t.playlists.volume(p.label) : undefined;
  };

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
        <ScreenTitleBlock title={t.search.title} />
        <SearchField value={query} onChangeText={setQuery} />
        <ChipRow
          value={filter}
          onChange={setFilter}
          chips={[{ value: ALL, label: t.search.all }, ...playlists.map((p) => ({ value: p.id, label: t.playlists.volume(p.label) }))]}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: TAB_BAR_CLEARANCE, gap: 22 }}
      >
        {nothing ? (
          <View style={{ paddingVertical: 48, paddingHorizontal: 12, gap: 8, alignItems: 'center' }}>
            <Text variant="section" style={{ textAlign: 'center' }}>
              {t.search.noResults(query.trim())}
            </Text>
            <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
              {t.search.noResultsHint}
            </Text>
          </View>
        ) : null}

        {results.titles.length > 0 ? (
          <View style={{ gap: 2 }}>
            <GroupLabel>{empty ? t.search.allHymns : t.search.titlesAndNumbers}</GroupLabel>
            {results.titles.map((h) => (
              <SongRow key={h.number} number={h.number} title={h.title} meta={volumeName(h)} onPress={() => open(h)} />
            ))}
          </View>
        ) : null}

        {results.lyrics.length > 0 ? (
          <View style={{ gap: 2 }}>
            <GroupLabel>{t.search.inLyrics}</GroupLabel>
            {results.lyrics.map((m) => (
              <LyricMatchRow key={m.hymn.number} number={m.hymn.number} title={m.hymn.title} snippet={m.line} onPress={() => open(m.hymn)} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
