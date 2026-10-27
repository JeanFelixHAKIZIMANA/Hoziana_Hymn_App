import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { firstLine, getPlaylist } from '@/data/hymnal';
import { NavHeader, Screen, ScreenTitleBlock, SegmentedControl, SongRow } from '@/design-system';
import { t } from '@/i18n';

type Order = 'number' | 'title';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlist = getPlaylist(id);
  const [order, setOrder] = useState<Order>('number');

  const items = useMemo(() => {
    const list = [...(playlist?.hymns ?? [])];
    return order === 'title' ? list.sort((a, b) => a.title.localeCompare(b.title)) : list;
  }, [playlist, order]);

  if (!playlist) return null;
  const name = t.playlists.volume(playlist.label);

  return (
    <Screen>
      <NavHeader backLabel={t.tabs.home} />
      <FlatList
        data={items}
        keyExtractor={(h) => String(h.number)}
        contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 48 }}
        ListHeaderComponent={
          <View style={{ gap: 20, paddingBottom: 20 }}>
            <ScreenTitleBlock title={name} subtitle={t.playlists.volumeMeta(playlist.year, playlist.hymns.length)} />
            <SegmentedControl
              value={order}
              onChange={setOrder}
              segments={[
                { value: 'number', label: t.playlists.byNumber },
                { value: 'title', label: t.playlists.byTitle },
              ]}
            />
          </View>
        }
        renderItem={({ item }) => (
          <SongRow
            number={item.number}
            title={item.title}
            meta={firstLine(item)}
            minHeight={64}
            onPress={() => router.push({ pathname: '/hymn/[number]', params: { number: item.number, from: name } })}
          />
        )}
      />
    </Screen>
  );
}
