import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DreamsEmptyState } from '@/components/dreams/DreamsEmptyState';
import { PlanningActivePlanCard } from '@/components/planning/PlanningActivePlanCard';
import {
  PlanningAwaitingSection,
  PlanningGoalsReachedSection,
} from '@/components/planning/PlanningSecondarySections';
import { PlanningMonthlySummaryCard } from '@/components/planning/PlanningMonthlySummaryCard';
import { PlanningScreenHeader } from '@/components/planning/PlanningScreenHeader';
import { colors, typography } from '@/constants/theme';
import { useDreamsList } from '@/hooks/useDreamsList';
import { buildPlanningScreenModel } from '@/utils/planningScreenModel';

export default function PlanningScreen() {
  const router = useRouter();
  const { dreams, loading, error } = useDreamsList();

  const model = useMemo(() => buildPlanningScreenModel(dreams), [dreams]);

  const showEmpty = !loading && !error && dreams.length === 0;
  const showContent = !loading && !error && dreams.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        directionalLockEnabled
        alwaysBounceVertical={false}>
        <PlanningScreenHeader />

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

        {showContent ? (
          <>
            <PlanningMonthlySummaryCard
              totalPlannedMonthlyAgorot={model.monthlySummary.totalPlannedMonthlyAgorot}
              activePlansCount={model.monthlySummary.activePlansCount}
            />

            {model.activePlans.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>תוכניות פעילות</Text>
                {model.activePlans.map((entry) => (
                  <PlanningActivePlanCard
                    key={entry.dream.id}
                    entry={entry}
                    onPressDetails={() => router.push(`/dream/${entry.dream.id}` as Href)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>
                  עדיין אין תוכניות פעילות — אפשר להגדיר חיסכון חודשי או תאריך יעד בעריכת החלום.
                </Text>
              </View>
            )}

            <PlanningAwaitingSection dreams={model.awaitingPlanning} />
            <PlanningGoalsReachedSection dreams={model.goalsReached} />
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
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    ...typography.stat,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 10,
    color: colors.text,
  },
  hintBox: {
    backgroundColor: 'rgba(118, 86, 232, 0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.1)',
  },
  hintText: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    lineHeight: 18,
  },
});
