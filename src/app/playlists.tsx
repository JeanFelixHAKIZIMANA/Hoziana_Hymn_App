import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { playlists } from '@/data/hymnal';
import { NavHeader, PlaylistRow, Screen, ScreenTitleBlock } from '@/design-system';
import { t } from '@/i18n';

export default function Playlists() {
  return (
    <Screen>
      <NavHeader backLabel={t.tabs.home} />
      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 48, gap: 20 }}>
        <ScreenTitleBlock title={t.playlists.title} />
        {playlists.map((p) => (
          <PlaylistRow
            key={p.id}
            letter={p.label}
            name={t.playlists.volume(p.label)}
            meta={t.playlists.volumeMeta(p.year, p.hymns.length)}
            onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: p.id } })}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
