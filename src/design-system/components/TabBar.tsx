import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import type { IconName } from '../icons.generated';
import { Glass, Icon, Text } from '../primitives';
import { useTheme } from '../theme';
import { radius } from '../tokens';
import { t } from '@/i18n';

const tabs: Record<string, { label: string; icon: IconName; activeIcon?: IconName }> = {
  index: { label: t.tabs.home, icon: 'home' },
  search: { label: t.tabs.search, icon: 'search' },
  favorites: { label: t.tabs.favorites, icon: 'heart', activeIcon: 'heart-filled' },
  settings: { label: t.tabs.settings, icon: 'settings' },
};

// Bottom padding a scrolling screen needs so its last row clears the floating bar.
export const TAB_BAR_CLEARANCE = 118;

// Floating glass pill: inset 16 from the sides and 12 above the bottom edge.
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { colors } = useTheme();
  // On iPhone the bar floats over the home indicator as designed; Android keeps
  // clear of the system navigation buttons.
  const bottom = Platform.OS === 'ios' ? 12 : insets.bottom + 12;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Glass radius={radius.pill} strong shadow="floatingBar" style={styles.bar}>
        {state.routes.map((route, i) => {
          const tab = tabs[route.name];
          if (!tab) return null;
          const active = i === state.index;
          return (
            <Pressable
              key={route.key}
              onPress={() => navigateToTab(route.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              style={[styles.item, active && { backgroundColor: colors.accentTint }]}
            >
              <Icon name={active && tab.activeIcon ? tab.activeIcon : tab.icon} size={24} color={active ? 'accent' : 'textSecondary'} />
              <Text variant="tabLabel" color={active ? 'accent' : 'textSecondary'}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  bar: { flexDirection: 'row', padding: 6 },
  item: { flex: 1, minWidth: 64, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6, borderRadius: radius.pill },
});
