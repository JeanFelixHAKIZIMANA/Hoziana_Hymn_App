import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ScrollView, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePage } from '@/data/content';
import { userActions, useUserState } from '@/data/user-store';
import {
  Screen,
  ScreenTitleBlock,
  SettingsGroup,
  SettingsRow,
  TAB_BAR_CLEARANCE,
  Text,
  lyricSizes,
  useTheme,
} from '@/design-system';
import { t } from '@/i18n';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const settings = useUserState((s) => s.settings);
  const set = userActions.setSetting;
  const { scheme } = useTheme();
  const about = usePage('about');

  const nextSize = () => {
    const i = lyricSizes.indexOf(settings.lyricSize);
    set('lyricSize', lyricSizes[(i + 1) % lyricSizes.length]);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: TAB_BAR_CLEARANCE, gap: 24 }}
      >
        <ScreenTitleBlock title={t.settings.title} />

        <SettingsGroup label={t.settings.reading}>
          <SettingsRow first label={t.settings.textSize} value={t.textSheet.sizeValue(settings.lyricSize)} onPress={nextSize} />
          <SettingsRow
            label={t.settings.lyricsTypeface}
            value={settings.typeface === 'serif' ? t.textSheet.serif : t.textSheet.sans}
            onPress={() => set('typeface', settings.typeface === 'serif' ? 'sans' : 'serif')}
          />
          <SettingsRow label={t.settings.verseNumbers} toggle={settings.verseNumbers} onToggle={(v) => set('verseNumbers', v)} />
          <SettingsRow label={t.settings.keepAwake} toggle={settings.keepAwake} onToggle={(v) => set('keepAwake', v)} />
        </SettingsGroup>

        <SettingsGroup label={t.settings.appearance}>
          <SettingsRow
            first
            label={t.settings.darkMode}
            toggle={scheme === 'dark'}
            onToggle={(on) => set('theme', on ? 'dark' : 'light')}
          />
          <SettingsRow
            label={t.settings.matchDevice}
            toggle={settings.theme === 'auto'}
            onToggle={(on) => set('theme', on ? 'auto' : scheme)}
          />
          <SettingsRow label={t.settings.language} value={t.settings.languageValue} />
        </SettingsGroup>

        <SettingsGroup label={t.settings.about}>
          <SettingsRow first label={about?.title ?? t.settings.aboutChoir} value="" onPress={() => router.push('/about')} />
          <SettingsRow label={t.settings.share} value="" onPress={() => Share.share({ message: t.settings.shareMessage })} />
        </SettingsGroup>

        <Text variant="meta" color="textSecondary" style={{ textAlign: 'center' }}>
          {t.settings.footer(Constants.expoConfig?.version ?? '1.0.0')}
        </Text>
      </ScrollView>
    </Screen>
  );
}
