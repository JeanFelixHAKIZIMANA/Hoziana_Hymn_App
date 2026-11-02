import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPlaylist, playlistOf, playlists, searchHymns, type Hymn, type LyricMatch } from '@/data/hymnal';
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

const open = (number: number) => router.push({ pathname: '/hymn/[number]', params: { number, from: t.search.title } });

const volumeName = (hymn: Hymn) => {
  const p = playlistOf(hymn);
  return p ? t.playlists.volume(p.label) : undefined;
};

const RowGap = () => <View style={{ height: 2 }} />;

type Section =
  | { key: 'titles'; title: string; data: Hymn[] }
  | { key: 'lyrics'; title: string; data: LyricMatch[] };

export default function Search() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>(ALL);
  // The field updates on every key press; the results catch up when the phone has a moment,
  // so typing never waits on the lyric search.
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(
    () => searchHymns(deferredQuery, filter === ALL ? undefined : getPlaylist(filter)),
    [deferredQuery, filter],
  );
  const empty = !deferredQuery.trim();
  const nothing = !empty && results.titles.length === 0 && results.lyrics.length === 0;

  const sections = useMemo(() => {
    const list: Section[] = [];
    if (results.titles.length)
      list.push({ key: 'titles', title: empty ? t.search.allHymns : t.search.titlesAndNumbers, data: results.titles });
    if (results.lyrics.length) list.push({ key: 'lyrics', title: t.search.inLyrics, data: results.lyrics });
    return list;
  }, [results, empty]);

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

      {/* Only the rows on screen are drawn, so the full list of hymns opens instantly. */}
      <SectionList<Hymn | LyricMatch, Section>
        sections={sections}
        keyExtractor={(item) => String('hymn' in item ? item.hymn.number : item.number)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        initialNumToRender={14}
        ItemSeparatorComponent={RowGap}
        contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: TAB_BAR_CLEARANCE }}
        renderSectionHeader={({ section }) => (
          <View style={{ paddingTop: section.key === 'lyrics' && results.titles.length ? 22 : 0, paddingBottom: 2 }}>
            <GroupLabel>{section.title}</GroupLabel>
          </View>
        )}
        renderItem={({ item }) =>
          'hymn' in item ? (
            <LyricMatchRow number={item.hymn.number} title={item.hymn.title} snippet={item.line} onPress={open} />
          ) : (
            <SongRow number={item.number} title={item.title} meta={volumeName(item)} onPress={open} />
          )
        }
        ListEmptyComponent={
          nothing ? (
            <View style={{ paddingVertical: 48, paddingHorizontal: 12, gap: 8, alignItems: 'center' }}>
              <Text variant="section" style={{ textAlign: 'center' }}>
                {t.search.noResults(deferredQuery.trim())}
              </Text>
              <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
                {t.search.noResultsHint}
              </Text>
            </View>
          ) : undefined
        }
      />
    </Screen>
  );
}
