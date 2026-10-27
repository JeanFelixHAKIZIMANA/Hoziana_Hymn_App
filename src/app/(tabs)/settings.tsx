import Constants from 'expo-constants';
import { Alert, ScrollView, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { userActions, useUserState, type ThemePreference } from '@/data/user-store';
import {
  Screen,
  ScreenTitleBlock,
  SettingsGroup,
  SettingsRow,
  TAB_BAR_CLEARANCE,
  Text,
  lyricSizes,
} from '@/design-system';
import { t } from '@/i18n';

const themeOrder: ThemePreference[] = ['auto', 'light', 'dark'];
const themeLabel = { auto: t.settings.themeAuto, light: t.textSheet.light, dark: t.textSheet.dark };

export default function Settings() {
  const insets = useSafeAreaInsets();
  const settings = useUserState((s) => s.settings);
  const set = userActions.setSetting;

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
            label={t.settings.theme}
            value={themeLabel[settings.theme]}
            onPress={() => set('theme', themeOrder[(themeOrder.indexOf(settings.theme) + 1) % themeOrder.length])}
          />
          <SettingsRow label={t.settings.language} value={t.settings.languageValue} />
        </SettingsGroup>

        <SettingsGroup label={t.settings.about}>
          <SettingsRow first label={t.settings.aboutChoir} value="" onPress={() => Alert.alert(t.settings.aboutChoir, t.settings.aboutBody)} />
          <SettingsRow label={t.settings.share} value="" onPress={() => Share.share({ message: t.settings.shareMessage })} />
        </SettingsGroup>

        <Text variant="meta" color="textSecondary" style={{ textAlign: 'center' }}>
          {t.settings.footer(Constants.expoConfig?.version ?? '1.0.0')}
        </Text>
      </ScrollView>
    </Screen>
  );
}
