import type {
  SavingsProgressChartMode,
  SavingsProgressChartPoint,
  SavingsProgressChartSeries,
  SavingsTimelineTransaction,
} from '@/database/savingsProgressTimeline';
import { localYmdFromDate, todayLocalYmd } from '@/utils/localCalendarDate';

export const SAVINGS_PROGRESS_MAX_DISPLAY_POINTS = 48;

export function signedDeltaAgorot(tx: SavingsTimelineTransaction): number {
  return tx.type === 'deposit' ? tx.amountAgorot : -tx.amountAgorot;
}

export function countUniqueActivityDays(transactions: SavingsTimelineTransaction[]): number {
  const days = new Set<string>();
  for (const tx of transactions) {
    const date = new Date(tx.createdAt);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    days.add(localYmdFromDate(date));
  }
  return days.size;
}

/** Net change per local calendar day (device timezone via Date). */
export function aggregateDailyNetAgorot(
  transactions: SavingsTimelineTransaction[],
): { dayYmd: string; netAgorot: number }[] {
  const byDay = new Map<string, number>();

  for (const tx of transactions) {
    const date = new Date(tx.createdAt);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const dayYmd = localYmdFromDate(date);
    const prev = byDay.get(dayYmd) ?? 0;
    byDay.set(dayYmd, prev + signedDeltaAgorot(tx));
  }

  return [...byDay.entries()]
    .map(([dayYmd, netAgorot]) => ({ dayYmd, netAgorot: Math.trunc(netAgorot) }))
    .sort((a, b) => a.dayYmd.localeCompare(b.dayYmd));
}

function buildSingleDaySeries(
  transactions: SavingsTimelineTransaction[],
): SavingsProgressChartPoint[] {
  const sorted = [...transactions].sort((a, b) => {
    const timeCmp = a.createdAt.localeCompare(b.createdAt);
    if (timeCmp !== 0) {
      return timeCmp;
    }
    return a.transactionId.localeCompare(b.transactionId);
  });

  const firstDate = new Date(sorted[0]!.createdAt);
  const dayYmd = Number.isNaN(firstDate.getTime())
    ? todayLocalYmd()
    : localYmdFromDate(firstDate);

  const points: SavingsProgressChartPoint[] = [
    {
      pointId: 'opening',
      balanceAgorot: 0,
      dayYmd,
      isOpeningAnchor: true,
      sequenceIndex: -1,
      createdAt: sorted[0]?.createdAt,
    },
  ];

  let cumulative = 0;
  sorted.forEach((tx, index) => {
    cumulative += signedDeltaAgorot(tx);
    points.push({
      pointId: tx.transactionId,
      balanceAgorot: cumulative,
      dayYmd,
      createdAt: tx.createdAt,
      transactionType: tx.type,
      transactionAmountAgorot: tx.amountAgorot,
      sequenceIndex: index,
    });
  });

  return points;
}

function buildMultiDaySeries(
  transactions: SavingsTimelineTransaction[],
  todayYmd: string,
): SavingsProgressChartPoint[] {
  const daily = aggregateDailyNetAgorot(transactions);
  if (daily.length === 0) {
    return [];
  }

  const points: SavingsProgressChartPoint[] = [];
  const firstDay = daily[0]!.dayYmd;
  points.push({
    pointId: `open-${firstDay}`,
    balanceAgorot: 0,
    dayYmd: firstDay,
    isOpeningAnchor: true,
  });

  let cumulative = 0;
  for (const day of daily) {
    cumulative += day.netAgorot;
    points.push({
      pointId: `day-${day.dayYmd}`,
      balanceAgorot: cumulative,
      dayYmd: day.dayYmd,
    });
  }

  const lastPoint = points[points.length - 1]!;
  if (todayYmd > lastPoint.dayYmd) {
    points.push({
      pointId: `today-${todayYmd}`,
      balanceAgorot: lastPoint.balanceAgorot,
      dayYmd: todayYmd,
      isTodayAnchor: true,
    });
  }

  return points;
}

export function buildSavingsProgressChartSeries(input: {
  transactions: SavingsTimelineTransaction[];
  todayYmd?: string;
}): SavingsProgressChartSeries {
  const todayYmd = input.todayYmd ?? todayLocalYmd();
  const txs = input.transactions;

  if (txs.length === 0) {
    return { mode: 'multiDay', points: [] };
  }

  const uniqueDays = countUniqueActivityDays(txs);
  const mode: SavingsProgressChartMode = uniqueDays <= 1 ? 'singleDay' : 'multiDay';
  const points =
    mode === 'singleDay'
      ? buildSingleDaySeries(txs)
      : buildMultiDaySeries(txs, todayYmd);

  return { mode, points };
}

/** @deprecated use buildSavingsProgressChartSeries */
export function buildSavingsProgressChartPoints(input: {
  transactions: SavingsTimelineTransaction[];
  todayYmd?: string;
}): SavingsProgressChartPoint[] {
  return buildSavingsProgressChartSeries(input).points;
}

export function totalSavedAgorotFromTransactions(
  transactions: SavingsTimelineTransaction[],
): number {
  let total = 0;
  for (const tx of transactions) {
    total += signedDeltaAgorot(tx);
  }
  return total;
}

function indexOfExtremeBalance(
  points: SavingsProgressChartPoint[],
  pick: 'min' | 'max',
): number {
  if (points.length === 0) {
    return 0;
  }
  let idx = 0;
  for (let i = 1; i < points.length; i += 1) {
    const current = points[i]!.balanceAgorot;
    const best = points[idx]!.balanceAgorot;
    if (pick === 'max' ? current > best : current < best) {
      idx = i;
    }
  }
  return idx;
}

/** Display sampling — keeps start, end, min, max, then fills evenly. */
export function downsampleChartPointsForDisplay(
  points: SavingsProgressChartPoint[],
  maxPoints: number = SAVINGS_PROGRESS_MAX_DISPLAY_POINTS,
): SavingsProgressChartPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const keep = new Set<number>([0, points.length - 1]);
  keep.add(indexOfExtremeBalance(points, 'max'));
  keep.add(indexOfExtremeBalance(points, 'min'));

  let guard = 0;
  while (keep.size < maxPoints && guard < points.length * 2) {
    guard += 1;
    const slots = maxPoints - keep.size;
    for (let slot = 1; slot <= slots; slot += 1) {
      const index = Math.round((slot / (slots + 1)) * (points.length - 1));
      keep.add(index);
      if (keep.size >= maxPoints) {
        break;
      }
    }
    if (keep.size >= maxPoints) {
      break;
    }
    for (let i = 0; i < points.length && keep.size < maxPoints; i += 1) {
      keep.add(i);
    }
  }

  return [...keep]
    .sort((a, b) => a - b)
    .slice(0, maxPoints)
    .map((index) => points[index]!);
}

export function formatChartAxisDayLabel(dayYmd: string): string {
  const parts = dayYmd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return dayYmd;
  }
  const date = new Date(parts[0]!, parts[1]! - 1, parts[2]!, 12, 0, 0, 0);
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}

export function formatChartFullDateLabel(dayYmd: string): string {
  const parts = dayYmd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return dayYmd;
  }
  const date = new Date(parts[0]!, parts[1]! - 1, parts[2]!, 12, 0, 0, 0);
  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatChartTimeLabel(createdAt: string): string | null {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export function hasDistinctTimeLabels(transactions: SavingsTimelineTransaction[]): boolean {
  const labels = new Set<string>();
  for (const tx of transactions) {
    const label = formatChartTimeLabel(tx.createdAt);
    if (label) {
      labels.add(label);
    }
  }
  return labels.size > 1;
}

export function formatSingleDayXAxisLabel(input: {
  point: SavingsProgressChartPoint;
  index: number;
  total: number;
  showTimes: boolean;
}): string {
  if (input.point.isOpeningAnchor) {
    return 'התחלה';
  }
  if (input.index === input.total - 1) {
    return 'אחרונה';
  }
  if (input.showTimes && input.point.createdAt) {
    return formatChartTimeLabel(input.point.createdAt) ?? `פעולה ${input.index}`;
  }
  return `פעולה ${input.index}`;
}

export function findNearestPointIndex(
  coords: { x: number; y: number }[],
  touchX: number,
  touchY: number,
  maxDistancePx = 36,
): number | null {
  let bestIndex: number | null = null;
  let bestDist = maxDistancePx * maxDistancePx;
  coords.forEach((coord, index) => {
    const dx = coord.x - touchX;
    const dy = coord.y - touchY;
    const dist = dx * dx + dy * dy;
    if (dist <= bestDist) {
      bestDist = dist;
      bestIndex = index;
    }
  });
  return bestIndex;
}
