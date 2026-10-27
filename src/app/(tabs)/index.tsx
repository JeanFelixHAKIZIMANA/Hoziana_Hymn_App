import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHymn, hymns, playlistOf, playlists } from '@/data/hymnal';
import { useUserState } from '@/data/user-store';
import {
  ContinueCard,
  PlaylistRow,
  Screen,
  ScreenTitleBlock,
  SectionHeader,
  SongRow,
  TAB_BAR_CLEARANCE,
  Text,
} from '@/design-system';
import { t } from '@/i18n';
import { relativeTime } from '@/utils/relative-time';

export default function Home() {
  const insets = useSafeAreaInsets();
  const position = useUserState((s) => s.position);
  const recent = useUserState((s) => s.recent);
  const continueHymn = position ? getHymn(position.number) : undefined;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingHorizontal: 20,
          paddingBottom: TAB_BAR_CLEARANCE,
          gap: 28,
        }}
      >
        <ScreenTitleBlock title={t.appName} subtitle={t.home.hymnCount(hymns.length)} />

        {continueHymn && position ? (
          <ContinueCard
            title={continueHymn.title}
            meta={t.home.continueMeta(continueHymn.number, position.verse, position.total)}
            progress={position.verse / Math.max(position.total, 1)}
            onPress={() => router.push({ pathname: '/hymn/[number]', params: { number: continueHymn.number } })}
          />
        ) : null}

        <View>
          <SectionHeader title={t.home.playlists} linkLabel={t.home.seeAll} onLink={() => router.push('/playlists')} />
          {playlists.slice(0, 3).map((p) => (
            <PlaylistRow
              key={p.id}
              letter={p.label}
              name={t.playlists.volume(p.label)}
              meta={t.playlists.volumeMeta(p.year, p.hymns.length)}
              onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: p.id } })}
            />
          ))}
        </View>

        <View style={{ gap: 4 }}>
          <SectionHeader title={t.home.recent} />
          {recent.length === 0 ? (
            <Text variant="body" color="textSecondary">
              {t.home.recentEmpty}
            </Text>
          ) : (
            recent.slice(0, 3).map((r) => {
              const hymn = getHymn(r.number);
              if (!hymn) return null;
              const playlist = playlistOf(hymn);
              return (
                <SongRow
                  key={r.number}
                  number={hymn.number}
                  title={hymn.title}
                  meta={[playlist && t.playlists.volume(playlist.label), relativeTime(r.openedAt)].filter(Boolean).join(' · ')}
                  onPress={() => router.push({ pathname: '/hymn/[number]', params: { number: hymn.number } })}
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
