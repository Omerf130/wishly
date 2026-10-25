import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DreamCard } from '@/components/dreams/DreamCard';
import { DreamsEmptyState } from '@/components/dreams/DreamsEmptyState';
import { NewDreamCard } from '@/components/dreams/NewDreamCard';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeSavingsOverviewCard } from '@/components/home/HomeSavingsOverviewCard';
import { colors, typography } from '@/constants/theme';
import { useDreamsList } from '@/hooks/useDreamsList';

export default function DreamsHomeScreen() {
  const router = useRouter();
  const { dreams, loading, error } = useDreamsList();

  const onPressSettings = () => {
    router.navigate('/settings' as Href);
  };

  const onPressAddDream = () => {
    router.push('/dream/create' as Href);
  };

  const showEmpty = !loading && !error && dreams.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        directionalLockEnabled
        alwaysBounceVertical={false}>
        <HomeHeader onPressSettings={onPressSettings} onPressAddDream={onPressAddDream} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {showEmpty ? <DreamsEmptyState /> : null}

        {!loading && !error && dreams.length > 0 ? (
          <>
            <HomeSavingsOverviewCard dreams={dreams} />
            <View style={styles.listSectionHeader}>
              <Text style={styles.listSectionTitle}>החלומות שלי</Text>
              <Text style={styles.listSectionCount}>{dreams.length}</Text>
            </View>
            <View style={styles.list}>
            {dreams.map((dream) => (
              <DreamCard key={dream.id} dream={dream} />
            ))}
            <NewDreamCard onPress={onPressAddDream} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  listSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  listSectionTitle: {
    ...typography.stat,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  listSectionCount: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted,
    backgroundColor: 'rgba(118, 86, 232, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  list: {
    marginTop: 0,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorWrap: {
    backgroundColor: 'rgba(237, 134, 165, 0.12)',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  errorText: {
    ...typography.body,
    textAlign: 'right',
    color: colors.pink,
  },
});
