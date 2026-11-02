import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHymn, playlistOf } from '@/data/hymnal';
import { useUserState } from '@/data/user-store';
import { Screen, ScreenTitleBlock, SegmentedControl, SongRow, TAB_BAR_CLEARANCE, Text } from '@/design-system';
import { t } from '@/i18n';

type Tab = 'hymns' | 'lists';

const open = (number: number) => router.push({ pathname: '/hymn/[number]', params: { number, from: t.favorites.title } });

export default function Favorites() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('hymns');
  const favorites = useUserState((s) => s.favorites);

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 8, gap: 16 }}>
        <ScreenTitleBlock title={t.favorites.title} />
        <SegmentedControl
          value={tab}
          onChange={setTab}
          segments={[
            { value: 'hymns', label: t.favorites.hymns },
            { value: 'lists', label: t.favorites.yourLists },
          ]}
        />
      </View>

      {tab === 'hymns' ? (
        // Virtualized: only the rows on screen are drawn, however many hymns are saved.
        <FlatList
          data={favorites}
          keyExtractor={(n) => String(n)}
          contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: TAB_BAR_CLEARANCE }}
          ListHeaderComponent={
            <Text variant="meta" color="textSecondary" style={{ paddingTop: 6 }}>
              {favorites.length ? t.favorites.count(favorites.length) : t.favorites.empty}
            </Text>
          }
          renderItem={({ item: n }) => {
            const hymn = getHymn(n);
            if (!hymn) return null;
            const playlist = playlistOf(hymn);
            return (
              <SongRow
                number={n}
                title={hymn.title}
                meta={playlist ? t.playlists.volume(playlist.label) : undefined}
                chevron
                onPress={open}
              />
            );
          }}
        />
      ) : (
        <View style={{ gap: 8, paddingTop: 10, paddingHorizontal: 20 }}>
          <Text variant="meta" color="textSecondary">
            {t.favorites.listsMeta}
          </Text>
          <Text variant="body" color="textSecondary">
            {t.favorites.listsComing}
          </Text>
        </View>
      )}
    </Screen>
  );
}
