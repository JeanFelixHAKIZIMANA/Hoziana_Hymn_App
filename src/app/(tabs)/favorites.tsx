import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHymn, playlistOf } from '@/data/hymnal';
import { useUserState } from '@/data/user-store';
import { Screen, ScreenTitleBlock, SegmentedControl, SongRow, TAB_BAR_CLEARANCE, Text } from '@/design-system';
import { t } from '@/i18n';

type Tab = 'hymns' | 'lists';

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

      <ScrollView contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: TAB_BAR_CLEARANCE }}>
        {tab === 'hymns' ? (
          <>
            <Text variant="meta" color="textSecondary" style={{ paddingTop: 6 }}>
              {favorites.length ? t.favorites.count(favorites.length) : t.favorites.empty}
            </Text>
            {favorites.map((n) => {
              const hymn = getHymn(n);
              if (!hymn) return null;
              const playlist = playlistOf(hymn);
              return (
                <SongRow
                  key={n}
                  number={n}
                  title={hymn.title}
                  meta={playlist ? t.playlists.volume(playlist.label) : undefined}
                  chevron
                  onPress={() =>
                    router.push({ pathname: '/hymn/[number]', params: { number: n, from: t.favorites.title } })
                  }
                />
              );
            })}
          </>
        ) : (
          <View style={{ gap: 8, paddingTop: 6 }}>
            <Text variant="meta" color="textSecondary">
              {t.favorites.listsMeta}
            </Text>
            <Text variant="body" color="textSecondary">
              {t.favorites.listsComing}
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
