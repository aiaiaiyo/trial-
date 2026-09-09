import { DayMarketEntry, Market, MARKETS } from '../types';
import { computeUnifiedEngineForDate } from './unifiedWalkForwardEngine';
import { runModelFAnalysis } from './modelFEngine';
import { generateMLLearnedRulesFromHistory } from './mlLearnedRulesEngine';

export type SynergyEngineId =
  | 'MODEL_F'
  | 'MACHINE_LEARNING'
  | 'PATTERN_DASHBOARD'
  | 'DATE_GENERATOR'
  | 'PREVIOUS_DAY'
  | 'SIR_ABHISHEK'
  | 'DELTA_METHOD'
  | 'HARUF_PYRAMID';

export interface EngineMetric {
  engineId: SynergyEngineId;
  label: string;
  poolSize: number;
  tests: number;
  hits: number;
  misses: number;
  hitRate: number;
  baselineRate: number;
  lift: number;
  excessHitRate: number;
  recentHitRate: number;
  stability: number;
  houseRates: Record<Market, number>;
}

export interface EngineRelationship {
  engineA: SynergyEngineId;
  engineB: SynergyEngineId;
  agreement: number;
  complementarity: number;
  sharedMissRate: number;
}

export interface SynergyCombinationMetric {
  combination: SynergyEngineId[];
  label: string;
  poolSize: number;
  tests: number;
  hits: number;
  misses: number;
  hitRate: number;
  baselineRate: number;
  lift: number;
  excessHitRate: number;
  synergyGain: number;
  stability: number;
  recentHitRate: number;
  houseConsistency: number;
  calibration: number;
  score: number;
  houseRates: Record<Market, number>;
  sufficientEvidence: boolean;
}

export interface EngineContributionRecord {
  date: string;
  house: Market;
  engineId: SynergyEngineId;
  poolSize: number;
  actualDraw: string;
  pool: string[];
  hit: boolean;
}

export interface EngineSynergyReport {
  testedDays: number;
  validHouseObservations: number;
  filters: { earliestDate: string; latestDate: string };
  individualMetrics: EngineMetric[];
  houseMetrics: Record<Market, EngineMetric[]>;
  relationships: EngineRelationship[];
  combinations: SynergyCombinationMetric[];
  bestOverall?: SynergyCombinationMetric;
  bestByHouse: Partial<Record<Market, SynergyCombinationMetric>>;
  mostStable?: SynergyCombinationMetric;
  bestRecent?: SynergyCombinationMetric;
  learnedWeights: Partial<Record<SynergyEngineId, number>>;
  modelVersion: string;
  dataCutoff: string;
  featureSet: string[];
  contributions: EngineContributionRecord[];
  outOfSampleOnly: boolean;
}

const ENGINE_LABELS: Record<SynergyEngineId, string> = {
  MODEL_F: 'Model F',
  MACHINE_LEARNING: 'Machine Learning',
  PATTERN_DASHBOARD: 'Pattern Dashboard',
  DATE_GENERATOR: 'Date Generator',
  PREVIOUS_DAY: 'Previous Day',
  SIR_ABHISHEK: 'Sir Abhishek',
  DELTA_METHOD: 'Delta Method',
  HARUF_PYRAMID: 'Haruf Pyramid',
};

const ENGINE_IDS = Object.keys(ENGINE_LABELS) as SynergyEngineId[];
const HOUSE_KEYS: Record<Market, keyof DayMarketEntry> = {
  Deshawar: 'deshawar',
  Faridabad: 'faridabad',
  Ghaziabad: 'ghaziabad',
  Gali: 'gali',
};

interface HistoricalStep {
  date: string;
  pools: Record<SynergyEngineId, string[]>;
  actuals: Record<Market, string | null>;
}

function pairList(values: unknown[], limit = 36): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && /^\d{2}$/.test(value)))).slice(0, limit);
}

function actualsForRecord(record: DayMarketEntry): Record<Market, string | null> {
  return Object.fromEntries(MARKETS.map((house) => {
    const value = record[HOUSE_KEYS[house]];
    return [house, typeof value === 'string' && /^\d{2}$/.test(value.trim()) ? value.trim().padStart(2, '0') : null];
  })) as Record<Market, string | null>;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function combinations(ids: SynergyEngineId[], size: number): SynergyEngineId[][] {
  const output: SynergyEngineId[][] = [];
  const visit = (start: number, current: SynergyEngineId[]) => {
    if (current.length === size) {
      output.push([...current]);
      return;
    }
    for (let index = start; index < ids.length; index += 1) {
      current.push(ids[index]);
      visit(index + 1, current);
      current.pop();
    }
  };
  visit(0, []);
  return output;
}

function combinePools(step: HistoricalStep, engineSet: SynergyEngineId[], poolSize = 36): string[] {
  const scores = new Map<string, number>();
  engineSet.forEach((engineId) => {
    step.pools[engineId].forEach((pair, rank) => {
      scores.set(pair, (scores.get(pair) || 0) + (step.pools[engineId].length - rank) / step.pools[engineId].length);
    });
  });
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, poolSize).map(([pair]) => pair);
}

function emptyHouseRates(): Record<Market, number> {
  return { Deshawar: 0, Faridabad: 0, Ghaziabad: 0, Gali: 0 };
}

function buildMetric(
  engineSet: SynergyEngineId[],
  steps: HistoricalStep[],
  recentDays: number,
  individualBest: number
): SynergyCombinationMetric {
  const hitsByHouse = emptyHouseRates();
  const testsByHouse = emptyHouseRates();
  const dailyHitRates: number[] = [];
  let totalHits = 0;
  let totalTests = 0;
  let recentHits = 0;
  let recentTests = 0;
  steps.forEach((step, index) => {
    const pool = engineSet.length === 1 ? step.pools[engineSet[0]] : combinePools(step, engineSet);
    let dayHits = 0;
    MARKETS.forEach((house) => {
      const actual = step.actuals[house];
      if (!actual) return;
      testsByHouse[house] += 1;
      totalTests += 1;
      const hit = pool.includes(actual);
      if (hit) {
        hitsByHouse[house] += 1;
        totalHits += 1;
        dayHits += 1;
      }
      if (index >= steps.length - recentDays) {
        recentTests += 1;
        if (hit) recentHits += 1;
      }
    });
    dailyHitRates.push(dayHits / Math.max(1, Object.values(step.actuals).filter(Boolean).length));
  });
  const hitRate = totalTests > 0 ? (totalHits / totalTests) * 100 : 0;
    const averagePoolSize = steps.length > 0
      ? steps.reduce((sum, step) => sum + (engineSet.length === 1 ? step.pools[engineSet[0]].length : 36), 0) / steps.length
      : 0;
    const baselineRate = Math.round(averagePoolSize * 10) / 10;
  const recentHitRate = recentTests > 0 ? (recentHits / recentTests) * 100 : 0;
  const stability = Math.max(0, 100 - standardDeviation(dailyHitRates.map((value) => value * 100)));
  const houseValues = MARKETS.map((house) => testsByHouse[house] > 0 ? (hitsByHouse[house] / testsByHouse[house]) * 100 : 0);
  const houseConsistency = houseValues.length > 0 ? Math.max(0, 100 - standardDeviation(houseValues)) : 0;
  const calibration = Math.max(0, 100 - Math.abs(hitRate - baselineRate));
  const lift = baselineRate > 0 ? hitRate / baselineRate : 0;
  const excessHitRate = hitRate - baselineRate;
  const synergyGain = engineSet.length > 1 ? hitRate - individualBest : 0;
  const score = hitRate * 0.35 + lift * 20 * 0.2 + stability * 0.15 + recentHitRate * 0.1 + houseConsistency * 0.1 + calibration * 0.1;
  const houseRates = emptyHouseRates();
  MARKETS.forEach((house) => { houseRates[house] = testsByHouse[house] > 0 ? Math.round((hitsByHouse[house] / testsByHouse[house]) * 1000) / 10 : 0; });
  return {
    combination: engineSet,
    label: engineSet.map((engine) => ENGINE_LABELS[engine]).join(' + '),
    poolSize: Math.round(averagePoolSize),
    tests: totalTests,
    hits: totalHits,
    misses: totalTests - totalHits,
    hitRate: Math.round(hitRate * 10) / 10,
      baselineRate,
    lift: Math.round(lift * 100) / 100,
    excessHitRate: Math.round(excessHitRate * 10) / 10,
    synergyGain: Math.round(synergyGain * 10) / 10,
    stability: Math.round(stability * 10) / 10,
    recentHitRate: Math.round(recentHitRate * 10) / 10,
    houseConsistency: Math.round(houseConsistency * 10) / 10,
    calibration: Math.round(calibration * 10) / 10,
    score: Math.round(score * 10) / 10,
    houseRates,
    sufficientEvidence: totalTests >= 40 && stability >= 35,
  };
}

function buildIndividualPools(targetDate: string, prior: DayMarketEntry[]): Record<SynergyEngineId, string[]> {
  const previous = prior[prior.length - 1];
  const prevOutcomes = previous ? [previous.deshawar, previous.faridabad, previous.ghaziabad || previous.gzb, previous.gali].filter((value): value is string => Boolean(value)) : [];
  const unified = computeUnifiedEngineForDate(targetDate, prior, prevOutcomes, previous?.date || '', previous, true);
  const modelF = runModelFAnalysis(prior, previous?.date || targetDate);
  const mlRules = generateMLLearnedRulesFromHistory(prior);
  const byEngine = (engineId: string) => unified.cleanUnifiedPredictions
    .filter((candidate) => candidate.engineBadges.some((badge) => badge.engineId === engineId))
    .map((candidate) => candidate.pair);
  return {
    MODEL_F: pairList(modelF.allCandidates.map((candidate) => candidate.pair)),
    MACHINE_LEARNING: pairList(mlRules.rules.flatMap((rule) => rule.sampleEvidence.map((evidence) => evidence.predictedPair))),
    PATTERN_DASHBOARD: pairList(unified.cleanUnifiedPredictions.map((candidate) => candidate.pair)),
    DATE_GENERATOR: pairList(unified.dateGenResult.pairs),
    PREVIOUS_DAY: pairList(unified.m2Assessment.pairs),
    SIR_ABHISHEK: pairList(unified.m3Result.pairs),
    DELTA_METHOD: pairList(unified.deltaResult.pairs),
    HARUF_PYRAMID: pairList(modelF.pyramidTriSetPool),
  };
}

export function runEngineSynergyWalkForward(records: DayMarketEntry[], maxTestDays = 0): EngineSynergyReport {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const eligible = sorted.filter((_, index) => index >= 5 && index < sorted.length && Object.values(actualsForRecord(sorted[index])).some(Boolean));
  const selected = maxTestDays > 0 ? eligible.slice(-maxTestDays) : eligible;
  const steps: HistoricalStep[] = [];
  const contributions: EngineContributionRecord[] = [];
  selected.forEach((record) => {
    const index = sorted.findIndex((candidate) => candidate.date === record.date);
    const prior = sorted.slice(0, index);
    const pools = buildIndividualPools(record.date, prior);
    const actuals = actualsForRecord(record);
    steps.push({ date: record.date, pools, actuals });
    MARKETS.forEach((house) => {
      const actual = actuals[house];
      if (!actual) return;
      ENGINE_IDS.forEach((engineId) => contributions.push({ date: record.date, house, engineId, poolSize: pools[engineId].length, actualDraw: actual, pool: [...pools[engineId]], hit: pools[engineId].includes(actual) }));
    });
  });

  const individualMetrics = ENGINE_IDS.map((engineId) => buildMetric([engineId], steps, 10, 0)).map((metric) => ({ ...metric, engineId: metric.combination[0], label: ENGINE_LABELS[metric.combination[0]], poolSize: Math.round(steps.reduce((sum, step) => sum + step.pools[metric.combination[0]].length, 0) / Math.max(1, steps.length)) }));
  const individualBest = Math.max(0, ...individualMetrics.map((metric) => metric.hitRate));
  const combinationsToTest = [...combinations(ENGINE_IDS, 2), ...combinations(ENGINE_IDS, 3)];
  const combinationsReport = combinationsToTest.map((engineSet) => buildMetric(engineSet, steps, 10, Math.max(...engineSet.map((id) => individualMetrics.find((metric) => metric.engineId === id)?.hitRate || 0))));
  const relationships: EngineRelationship[] = [];
  for (let left = 0; left < ENGINE_IDS.length; left += 1) {
    for (let right = left + 1; right < ENGINE_IDS.length; right += 1) {
      const a = ENGINE_IDS[left];
      const b = ENGINE_IDS[right];
      let shared = 0; let union = 0; let complementary = 0; let sharedMisses = 0; let evaluated = 0;
      steps.forEach((step) => {
        const aSet = new Set(step.pools[a]);
        const bSet = new Set(step.pools[b]);
        union += new Set([...aSet, ...bSet]).size;
        shared += [...aSet].filter((pair) => bSet.has(pair)).length;
        MARKETS.forEach((house) => {
          const actual = step.actuals[house];
          if (!actual) return;
          evaluated += 1;
          if (aSet.has(actual) !== bSet.has(actual)) complementary += 1;
          if (!aSet.has(actual) && !bSet.has(actual)) sharedMisses += 1;
        });
      });
      relationships.push({ engineA: a, engineB: b, agreement: union > 0 ? Math.round((shared / union) * 1000) / 10 : 0, complementarity: evaluated > 0 ? Math.round((complementary / evaluated) * 1000) / 10 : 0, sharedMissRate: evaluated > 0 ? Math.round((sharedMisses / evaluated) * 1000) / 10 : 0 });
    }
  }
  const eligibleCombinations = combinationsReport.filter((metric) => metric.sufficientEvidence).sort((a, b) => b.score - a.score);
  const bestOverall = eligibleCombinations[0];
  const bestByHouse: Partial<Record<Market, SynergyCombinationMetric>> = {};
  MARKETS.forEach((house) => { bestByHouse[house] = [...eligibleCombinations].sort((a, b) => (b.houseRates[house] - a.houseRates[house]) || (b.score - a.score))[0]; });
  const mostStable = [...eligibleCombinations].sort((a, b) => b.stability - a.stability)[0];
  const bestRecent = [...eligibleCombinations].sort((a, b) => b.recentHitRate - a.recentHitRate)[0];
  const positiveWeights = individualMetrics.map((metric) => ({ id: metric.engineId, value: Math.max(0, metric.excessHitRate) }));
  const weightTotal = positiveWeights.reduce((sum, item) => sum + item.value, 0);
  const learnedWeights: Partial<Record<SynergyEngineId, number>> = {};
  positiveWeights.forEach((item) => { learnedWeights[item.id] = weightTotal > 0 ? Math.round((item.value / weightTotal) * 1000) / 1000 : 1 / ENGINE_IDS.length; });

  const houseMetrics = {} as Record<Market, EngineMetric[]>;
  MARKETS.forEach((house) => { houseMetrics[house] = individualMetrics.map((metric) => ({ ...metric, hitRate: metric.houseRates[house], baselineRate: metric.baselineRate, lift: metric.baselineRate > 0 ? metric.houseRates[house] / metric.baselineRate : 0, excessHitRate: metric.houseRates[house] - metric.baselineRate })); });
  return {
    testedDays: steps.length,
    validHouseObservations: steps.reduce((sum, step) => sum + Object.values(step.actuals).filter(Boolean).length, 0),
    filters: { earliestDate: steps[0]?.date || '', latestDate: steps[steps.length - 1]?.date || '' },
    individualMetrics,
    houseMetrics,
    relationships,
    combinations: [...individualMetrics.map((metric) => ({ ...metric, combination: [metric.engineId], synergyGain: 0, sufficientEvidence: metric.tests >= 40 })), ...combinationsReport].sort((a, b) => b.score - a.score),
    bestOverall,
    bestByHouse,
    mostStable,
    bestRecent,
    learnedWeights,
    modelVersion: `engine-synergy-v${new Date().toISOString().slice(0, 10)}`,
    dataCutoff: steps[0]?.date || '',
    featureSet: ['prior-only engine pools', 'house outcomes', 'pool-size baseline', 'agreement', 'complementarity', 'recent stability'],
    contributions,
    outOfSampleOnly: true,
  };
}
