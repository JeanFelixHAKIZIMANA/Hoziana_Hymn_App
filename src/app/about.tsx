import { Image, ScrollView, View } from 'react-native';

import { usePage } from '@/data/content';
import { Glass, NavHeader, Screen, ScreenTitleBlock, Text, radius } from '@/design-system';
import { t } from '@/i18n';

// Text and photo are edited on the content website; the app ships with a short default.
export default function About() {
  const page = usePage('about');
  const title = page?.title ?? t.settings.aboutChoir;
  const paragraphs = (page?.body ?? t.settings.aboutBody).split(/\n\s*\n/).filter((p) => p.trim());

  return (
    <Screen>
      <NavHeader backLabel={t.settings.title} />
      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 48, gap: 20 }}>
        <ScreenTitleBlock title={title} />
        {page?.imageUrl ? (
          <Glass radius={radius.card} style={{ padding: 4 }}>
            <Image
              source={{ uri: page.imageUrl }}
              accessibilityIgnoresInvertColors
              style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.card - 4 }}
              resizeMode="cover"
            />
          </Glass>
        ) : null}
        <View style={{ gap: 14 }}>
          {paragraphs.map((p, i) => (
            <Text key={i} variant="row" style={{ lineHeight: 24 }}>
              {p.trim()}
            </Text>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
