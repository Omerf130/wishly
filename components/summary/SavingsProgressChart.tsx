import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { colors, typography } from '@/constants/theme';
import { agorotToIls } from '@/database/money';
import type { SavingsProgressChartSeries } from '@/database/savingsProgressTimeline';
import {
  downsampleChartPointsForDisplay,
  formatChartAxisDayLabel,
  formatChartFullDateLabel,
  formatChartTimeLabel,
  formatSingleDayXAxisLabel,
  hasDistinctTimeLabels,
} from '@/utils/savingsProgressTimeline';
import { formatIlsExact } from '@/utils/formatCurrency';

type SavingsProgressChartProps = {
  series: SavingsProgressChartSeries;
  loading: boolean;
  error: string | null;
};

const CHART_HEIGHT = 176;
const PLOT_PADDING = { top: 14, right: 10, bottom: 8, left: 48 };

export function SavingsProgressChart({ series, loading, error }: SavingsProgressChartProps) {
  const [plotWidth, setPlotWidth] = useState(0);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const points = series.points;
  const displayPoints = useMemo(
    () => downsampleChartPointsForDisplay(points),
    [points],
  );

  const showTimesOnSingleDay = useMemo(() => {
    if (series.mode !== 'singleDay') {
      return false;
    }
    const txs = points.filter((p) => p.transactionType);
    return hasDistinctTimeLabels(
      txs.map((p) => ({
        transactionId: p.pointId,
        type: p.transactionType!,
        amountAgorot: p.transactionAmountAgorot ?? 0,
        createdAt: p.createdAt ?? '',
      })),
    );
  }, [points, series.mode]);

  useEffect(() => {
    const last = points[points.length - 1];
    setSelectedPointId(last?.pointId ?? null);
  }, [points]);

  const layout = useMemo(() => {
    if (displayPoints.length === 0 || plotWidth <= 0) {
      return null;
    }

    const balances = displayPoints.map((point) => point.balanceAgorot);
    let minBalance = Math.min(0, ...balances);
    let maxBalance = Math.max(0, ...balances);
    if (minBalance === maxBalance) {
      maxBalance = minBalance + 100;
    }

    const innerWidth = plotWidth - PLOT_PADDING.left - PLOT_PADDING.right;
    const innerHeight = CHART_HEIGHT - PLOT_PADDING.top - PLOT_PADDING.bottom;
    const count = displayPoints.length;
    const xAt = (index: number) =>
      PLOT_PADDING.left + (count <= 1 ? innerWidth / 2 : (index / (count - 1)) * innerWidth);
    const yAt = (balance: number) => {
      const ratio = (balance - minBalance) / (maxBalance - minBalance);
      return PLOT_PADDING.top + innerHeight * (1 - ratio);
    };

    const coords = displayPoints.map((point, index) => ({
      point,
      index,
      x: xAt(index),
      y: yAt(point.balanceAgorot),
    }));

    const pathD = coords
      .map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`)
      .join(' ');

    return { coords, minBalance, maxBalance, innerHeight, pathD, innerWidth };
  }, [displayPoints, plotWidth]);

  const selectedPoint = useMemo(() => {
    if (!selectedPointId) {
      return null;
    }
    return points.find((point) => point.pointId === selectedPointId) ?? null;
  }, [points, selectedPointId]);

  const onPlotLayout = (event: LayoutChangeEvent) => {
    setPlotWidth(event.nativeEvent.layout.width);
  };

  const showEmpty = !loading && !error && points.length === 0;

  const xLabels = useMemo(() => {
    if (displayPoints.length === 0) {
      return [] as string[];
    }
    if (series.mode === 'singleDay') {
      const first = displayPoints[0]!;
      const mid = displayPoints[Math.floor(displayPoints.length / 2)]!;
      const last = displayPoints[displayPoints.length - 1]!;
      return [
        formatSingleDayXAxisLabel({
          point: first,
          index: 0,
          total: displayPoints.length,
          showTimes: showTimesOnSingleDay,
        }),
        formatSingleDayXAxisLabel({
          point: mid,
          index: Math.floor(displayPoints.length / 2),
          total: displayPoints.length,
          showTimes: showTimesOnSingleDay,
        }),
        formatSingleDayXAxisLabel({
          point: last,
          index: displayPoints.length - 1,
          total: displayPoints.length,
          showTimes: showTimesOnSingleDay,
        }),
      ];
    }
    return [
      formatChartAxisDayLabel(displayPoints[0]!.dayYmd),
      formatChartAxisDayLabel(displayPoints[Math.floor(displayPoints.length / 2)]!.dayYmd),
      formatChartAxisDayLabel(displayPoints[displayPoints.length - 1]!.dayYmd),
    ];
  }, [displayPoints, series.mode, showTimesOnSingleDay]);

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        התקדמות החיסכון
      </Text>
      <Text style={styles.subtitle}>איך החיסכון שלך השתנה לאורך זמן</Text>

      {loading ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>טוען גרף…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>אין עדיין פעולות להצגה בגרף</Text>
        </View>
      ) : null}

      {!loading && !error && points.length > 0 ? (
        <>
          <View style={styles.chartWrap} onLayout={onPlotLayout} collapsable={false}>
            {layout ? (
              <>
                <Text
                  style={[styles.yLabel, styles.yLabelTop]}
                  numberOfLines={1}
                  adjustsFontSizeToFit>
                  {formatIlsExact(agorotToIls(layout.maxBalance))}
                </Text>
                <Text
                  style={[styles.yLabel, styles.yLabelBottom]}
                  numberOfLines={1}
                  adjustsFontSizeToFit>
                  {formatIlsExact(agorotToIls(layout.minBalance))}
                </Text>

                <Svg width={plotWidth} height={CHART_HEIGHT}>
                  <Line
                    x1={PLOT_PADDING.left}
                    y1={PLOT_PADDING.top}
                    x2={plotWidth - PLOT_PADDING.right}
                    y2={PLOT_PADDING.top}
                    stroke="rgba(38, 51, 75, 0.08)"
                    strokeWidth={1}
                  />
                  <Line
                    x1={PLOT_PADDING.left}
                    y1={CHART_HEIGHT - PLOT_PADDING.bottom}
                    x2={plotWidth - PLOT_PADDING.right}
                    y2={CHART_HEIGHT - PLOT_PADDING.bottom}
                    stroke="rgba(38, 51, 75, 0.08)"
                    strokeWidth={1}
                  />
                  <Path d={layout.pathD} stroke={colors.primary} strokeWidth={2.5} fill="none" />
                  {layout.coords.map(({ point, x, y }) => {
                    const selected = point.pointId === selectedPointId;
                    return (
                      <Circle
                        key={point.pointId}
                        cx={x}
                        cy={y}
                        r={selected ? 7 : 5}
                        fill={colors.primary}
                        stroke={colors.white}
                        strokeWidth={2}
                      />
                    );
                  })}
                  {layout.coords.map(({ point, x, y }) => (
                    <Circle
                      key={`${point.pointId}-hit`}
                      cx={x}
                      cy={y}
                      r={16}
                      fill="transparent"
                      onPress={() => setSelectedPointId(point.pointId)}
                    />
                  ))}
                </Svg>

                <View style={styles.xLabelsRow}>
                  {xLabels.map((label, index) => (
                    <Text key={`${label}-${index}`} style={styles.xLabel} numberOfLines={2}>
                      {label}
                    </Text>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.chartMeasurePlaceholder} />
            )}
          </View>

          <View style={styles.detailPanel}>
            {selectedPoint ? (
              <>
                <Text style={styles.detailBalance}>
                  {formatIlsExact(agorotToIls(selectedPoint.balanceAgorot))}
                </Text>
                <Text style={styles.detailMeta}>
                  {formatChartFullDateLabel(selectedPoint.dayYmd)}
                  {series.mode === 'singleDay' &&
                  selectedPoint.createdAt &&
                  !selectedPoint.isOpeningAnchor
                    ? ` · ${formatChartTimeLabel(selectedPoint.createdAt) ?? ''}`
                    : ''}
                </Text>
                {selectedPoint.isOpeningAnchor ? (
                  <Text style={styles.detailHint}>נקודת התחלה — לפני הפעילות הראשונה</Text>
                ) : null}
                {selectedPoint.isTodayAnchor ? (
                  <Text style={styles.detailHint}>יתרה עדכנית להיום</Text>
                ) : null}
                {series.mode === 'singleDay' && selectedPoint.transactionType ? (
                  <Text style={styles.detailHint}>
                    {selectedPoint.transactionType === 'deposit' ? 'הפקדה' : 'משיכה'}
                    {' · '}
                    {formatIlsExact(agorotToIls(selectedPoint.transactionAmountAgorot ?? 0))}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.detailHint}>געו בנקודה בגרף לפרטים</Text>
            )}
          </View>
        </>
      ) : null}
    </View>
  );
}

const CARD_SURFACE = '#FFFCF7';

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_SURFACE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.14)',
  },
  title: {
    ...typography.cardTitle,
    fontSize: 18,
    textAlign: 'right',
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  chartWrap: {
    width: '100%',
    direction: 'ltr',
    marginBottom: 8,
    minHeight: CHART_HEIGHT + 28,
  },
  chartMeasurePlaceholder: {
    width: '100%',
    height: CHART_HEIGHT,
  },
  yLabel: {
    position: 'absolute',
    left: 0,
    width: PLOT_PADDING.left - 6,
    ...typography.caption,
    fontSize: 10,
    lineHeight: 12,
    color: colors.textMuted,
    textAlign: 'left',
  },
  yLabelTop: {
    top: PLOT_PADDING.top - 2,
  },
  yLabelBottom: {
    top: CHART_HEIGHT - PLOT_PADDING.bottom - 10,
  },
  xLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PLOT_PADDING.left,
    marginTop: 6,
    gap: 4,
  },
  xLabel: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 13,
    color: colors.textMuted,
    textAlign: 'center',
    flex: 1,
  },
  detailPanel: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(38, 51, 75, 0.1)',
    alignItems: 'flex-end',
    minHeight: 72,
  },
  detailBalance: {
    ...typography.headline,
    fontSize: 22,
    color: colors.primary,
    textAlign: 'right',
  },
  detailMeta: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 4,
  },
  detailHint: {
    ...typography.caption,
    fontSize: 12,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 4,
  },
  placeholder: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  placeholderText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorWrap: {
    backgroundColor: 'rgba(237, 134, 165, 0.1)',
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.pink,
  },
});
