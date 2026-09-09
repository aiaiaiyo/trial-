import { DayMarketEntry, Market, MARKETS } from '../types';
import { parseDateSafe } from './mathEngine';

export interface MissSignal {
  name: 'HURUF' | 'WEEKDAY' | 'HOUSE' | 'RECENCY' | 'FIVE_DAY';
  status: 'SUPPORT' | 'CONFLICT' | 'NEUTRAL';
  score: number;
  reason: string;
}

export interface MissHitDiagnosis {
  pair: string;
  targetDate: string;
  weekday: string;
  signals: MissSignal[];
  supportCount: number;
  conflictCount: number;
  safeguard: 'KEEP' | 'DEPRIORITIZE' | 'PROTECT';
  rationalReason: string;
}

const HOUSE_KEYS: Record<Market, keyof DayMarketEntry> = {
  Deshawar: 'deshawar',
  Faridabad: 'faridabad',
  Gali: 'gali',
  Ghaziabad: 'ghaziabad',
};

function cleanPair(value: unknown): string | null {
  return typeof value === 'string' && /^\d{2}$/.test(value.trim()) ? value.trim() : null;
}

function rashiPair(pair: string): string {
  return pair
    .split('')
    .map((digit) => String((Number(digit) + 5) % 10))
    .join('');
}

function reversePair(pair: string): string {
  return pair.split('').reverse().join('');
}

function familyMatches(pair: string, drawn: string): boolean {
  return pair === drawn || pair === reversePair(drawn) || pair === rashiPair(drawn) || rashiPair(pair) === drawn;
}

function priorDays(records: DayMarketEntry[], targetDate: string, limit: number): DayMarketEntry[] {
  return records.filter((record) => record.date < targetDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

function allDraws(record: DayMarketEntry): string[] {
  return MARKETS.map((market) => cleanPair(record[HOUSE_KEYS[market]])).filter((pair): pair is string => Boolean(pair));
}

function addSignal(signals: MissSignal[], signal: MissSignal): void {
  signals.push(signal);
}

/**
 * Explains why a candidate is fragile before the target draw and provides a
 * conservative veto-like penalty when several independent signals disagree.
 * The target day's outcome is intentionally never read here.
 */
export function diagnoseCandidate(
  pairInput: string,
  records: DayMarketEntry[],
  targetDate: string,
  targetHouse: Market | 'ALL' = 'ALL'
): MissHitDiagnosis {
  const pair = pairInput.padStart(2, '0');
  const digits = pair.split('');
  const recent = priorDays(records, targetDate, 5);
  const sameWeekday = records
    .filter((record) => record.date < targetDate && parseDateSafe(record.date).getDay() === parseDateSafe(targetDate).getDay())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
  const weekday = parseDateSafe(targetDate).toLocaleDateString('en-US', { weekday: 'long' });
  const signals: MissSignal[] = [];

  const recentDigitCounts = digits.map((digit) => recent.reduce((count, record) => count + allDraws(record).join('').split(digit).length - 1, 0));
  const dominantDigits = recentDigitCounts.filter((count) => count > 0).length;
  addSignal(signals, {
    name: 'HURUF',
    status: dominantDigits === 2 ? 'SUPPORT' : dominantDigits === 1 ? 'NEUTRAL' : 'CONFLICT',
    score: dominantDigits === 2 ? 2 : dominantDigits === 1 ? 0 : -2,
    reason: dominantDigits === 2
      ? `Both Huruf digits ${digits.join(' and ')} are active in the five-day digit stream.`
      : dominantDigits === 1
        ? `Only one Huruf digit (${digits.find((digit, index) => recentDigitCounts[index] > 0)}) is active in the five-day stream.`
        : `Neither Huruf digit ${digits.join(' and ')} appears in the five-day digit stream.`,
  });

  const weekdayDraws = sameWeekday.flatMap(allDraws);
  const weekdayMatches = weekdayDraws.filter((draw) => familyMatches(pair, draw)).length;
  addSignal(signals, {
    name: 'WEEKDAY',
    status: weekdayMatches > 0 ? 'SUPPORT' : sameWeekday.length >= 3 ? 'CONFLICT' : 'NEUTRAL',
    score: weekdayMatches > 0 ? 2 : sameWeekday.length >= 3 ? -1 : 0,
    reason: weekdayMatches > 0
      ? `${weekday} history contains ${weekdayMatches} matching family echo${weekdayMatches === 1 ? '' : 'es'}.`
      : sameWeekday.length >= 3
        ? `No exact, reverse, or Rashi family echo across ${sameWeekday.length} prior ${weekday} observations.`
        : `Insufficient ${weekday} history for a reliable comparison.`,
  });

  const houseRecords = targetHouse === 'ALL'
    ? recent
    : recent.filter((record) => cleanPair(record[HOUSE_KEYS[targetHouse]]) !== null);
  const houseDraws = targetHouse === 'ALL'
    ? houseRecords.flatMap(allDraws)
    : houseRecords.map((record) => cleanPair(record[HOUSE_KEYS[targetHouse]])).filter((value): value is string => Boolean(value));
  const houseMatches = houseDraws.filter((draw) => familyMatches(pair, draw)).length;
  addSignal(signals, {
    name: 'HOUSE',
    status: houseMatches > 0 ? 'SUPPORT' : houseRecords.length >= 3 ? 'CONFLICT' : 'NEUTRAL',
    score: houseMatches > 0 ? 2 : houseRecords.length >= 3 ? -1 : 0,
    reason: houseMatches > 0
      ? `${targetHouse} has ${houseMatches} recent family echo${houseMatches === 1 ? '' : 'es'} for this pair.`
      : `No ${targetHouse} family echo in the available recent house history.`,
  });

  const exactRecentIndex = recent.findIndex((record) => allDraws(record).includes(pair));
  const daysSinceLastSeen = exactRecentIndex < 0 ? 99 : exactRecentIndex + 1;
  addSignal(signals, {
    name: 'RECENCY',
    status: daysSinceLastSeen === 1 ? 'CONFLICT' : daysSinceLastSeen >= 2 && daysSinceLastSeen <= 5 ? 'SUPPORT' : 'NEUTRAL',
    score: daysSinceLastSeen === 1 ? -2 : daysSinceLastSeen >= 2 && daysSinceLastSeen <= 5 ? 1 : 0,
    reason: daysSinceLastSeen === 99
      ? 'Pair has not appeared in the recent lookback; recency evidence is unconfirmed.'
      : daysSinceLastSeen === 1
        ? 'Pair appeared on the immediately prior draw, creating a repeat-risk conflict.'
        : `Pair was last seen ${daysSinceLastSeen} days ago, leaving a moderate recency gap.`,
  });

  const fiveDayMatches = recent.flatMap(allDraws).filter((draw) => familyMatches(pair, draw)).length;
  addSignal(signals, {
    name: 'FIVE_DAY',
    status: fiveDayMatches >= 1 ? 'SUPPORT' : recent.length >= 3 ? 'CONFLICT' : 'NEUTRAL',
    score: fiveDayMatches >= 1 ? 2 : recent.length >= 3 ? -2 : 0,
    reason: fiveDayMatches >= 1
      ? `Five-day window contains ${fiveDayMatches} exact, reverse, or Rashi family occurrence${fiveDayMatches === 1 ? '' : 's'}.`
      : `Five-day window contains no exact, reverse, or Rashi family occurrence.`,
  });

  const supportCount = signals.filter((signal) => signal.status === 'SUPPORT').length;
  const conflictCount = signals.filter((signal) => signal.status === 'CONFLICT').length;
  const safeguard = conflictCount >= 3 && supportCount < 2 ? 'DEPRIORITIZE' : supportCount >= 3 && conflictCount <= 1 ? 'PROTECT' : 'KEEP';
  const conflictingReasons = signals.filter((signal) => signal.status === 'CONFLICT').map((signal) => signal.reason);

  return {
    pair,
    targetDate,
    weekday,
    signals,
    supportCount,
    conflictCount,
    safeguard,
    rationalReason: conflictingReasons.length > 0
      ? conflictingReasons.join(' ')
      : 'No major cross-signal contradiction was detected before the draw.',
  };
}

export function diagnoseDrawMiss(
  actualPair: string,
  poolPairs: string[],
  records: DayMarketEntry[],
  targetDate: string,
  targetHouse: Market | 'ALL' = 'ALL'
): MissHitDiagnosis & { captured: boolean; poolRank: number | null } {
  const diagnosis = diagnoseCandidate(actualPair, records, targetDate, targetHouse);
  const poolRank = poolPairs.findIndex((pair) => pair === diagnosis.pair);
  return { ...diagnosis, captured: poolRank >= 0, poolRank: poolRank >= 0 ? poolRank + 1 : null };
}
