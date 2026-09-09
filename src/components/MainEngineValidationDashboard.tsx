import React, { useMemo } from 'react';
import { BarChart3, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { DayMarketEntry, Market } from '../types';
import { runConsensusPoolWalkForwardBacktest, ConsensusWalkForwardEnhancements } from '../utils/consensusPoolEngine';

interface MainEngineValidationDashboardProps {
  records: DayMarketEntry[];
  refreshToken: number;
  modelVersion: string;
  lastReevaluationDate?: string;
  reevaluationMessage?: string;
  isReevaluating?: boolean;
  onReevaluate: () => void;
}

const HOUSE_LABELS: Array<{ key: Market; label: string }> = [
  { key: 'Deshawar', label: 'DSWR' },
  { key: 'Faridabad', label: 'FRBD' },
  { key: 'Ghaziabad', label: 'GZBD' },
  { key: 'Gali', label: 'GALI' },
];

export const MainEngineValidationDashboard: React.FC<MainEngineValidationDashboardProps> = ({
  records,
  refreshToken,
  modelVersion,
  lastReevaluationDate,
  reevaluationMessage,
  isReevaluating = false,
  onReevaluate,
}) => {
  const report = useMemo(() => {
    const availableTestDays = Math.max(0, records.length - 6);
    return runConsensusPoolWalkForwardBacktest(records, availableTestDays, refreshToken);
  }, [records, refreshToken]);

  const metrics: ConsensusWalkForwardEnhancements = report.enhancements;
  const cumulative = metrics.cumulativePerformance;
  const top10 = cumulative.find((item) => item.poolSize === 10);
  const top20 = cumulative.find((item) => item.poolSize === 20);
  const top36 = cumulative.find((item) => item.poolSize === 36);

  return (
    <section className="w-full max-w-6xl mb-8 bg-slate-950/80 border border-cyan-500/20 rounded-2xl p-5 sm:p-6 text-left shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">36-Number Consensus Performance</h3>
            <p className="text-[11px] text-slate-400 mt-1">Frozen chronological replay. Each pool uses only the five completed days before its target date.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReevaluate}
          disabled={isReevaluating}
          className="px-3 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/30 text-xs font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isReevaluating ? 'animate-spin' : ''}`} />
          {isReevaluating ? 'Re-Evaluating ML...' : 'Re-Evaluate ML'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
        {[
          ['Overall', `${metrics.overallCoverage.hitRate}%`],
          ['Baseline', `${metrics.overallCoverage.baselineRate}%`],
          ['Excess', `${metrics.overallCoverage.excessHitRate >= 0 ? '+' : ''}${metrics.overallCoverage.excessHitRate}%`],
          ['Lift', `${metrics.overallCoverage.lift}x`],
          ['Top 10', `${top10?.hitRate ?? 0}%`],
          ['Top 20', `${top20?.hitRate ?? 0}%`],
          ['Top 36', `${top36?.hitRate ?? 0}%`],
          ['Samples', String(metrics.overallCoverage.tests)],
        ].map(([label, value]) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center">
            <div className="text-[10px] uppercase text-slate-500 font-mono">{label}</div>
            <div className="text-sm font-black text-cyan-300 font-mono mt-1">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-slate-900 text-xs font-bold text-slate-200">House-wise out-of-sample hit rates</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead className="text-slate-500 bg-slate-950"><tr><th className="p-2 text-left">House</th><th className="p-2">Tests</th><th className="p-2">Hits</th><th className="p-2">Hit %</th><th className="p-2">Recent</th><th className="p-2">Long-term</th><th className="p-2">Lift</th></tr></thead>
              <tbody>
                {HOUSE_LABELS.map(({ key, label }) => {
                  const metric = metrics.houseWiseMetrics[key];
                  return <tr key={key} className="border-t border-slate-800 text-slate-300"><td className="p-2 font-bold text-cyan-300">{label}</td><td className="p-2 text-center">{metric.tests}</td><td className="p-2 text-center">{metric.hits}</td><td className="p-2 text-center text-emerald-300">{metric.hitRate}%</td><td className="p-2 text-center">{metric.recentHitRate}%</td><td className="p-2 text-center">{metric.longTermHitRate}%</td><td className="p-2 text-center">{metric.lift}x</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 text-[10px] text-slate-500 border-t border-slate-800">House baseline is 36% per valid house observation. Overall coverage is separate from each house rate.</div>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-slate-900 text-xs font-bold text-slate-200">Rank buckets and incremental coverage</div>
          <div className="grid grid-cols-4 gap-2 p-3">
            {metrics.rankBucketPerformance.map((bucket) => <div key={bucket.bucket} className="bg-slate-900 rounded-lg p-2 text-center"><div className="text-[10px] text-slate-500">{bucket.bucket} ({bucket.rankRange})</div><div className="text-sm text-amber-300 font-bold mt-1">{bucket.hitRate}%</div><div className="text-[10px] text-slate-500">{bucket.hits}/{bucket.tests}</div></div>)}
          </div>
          <div className="px-3 pb-3 grid grid-cols-4 sm:grid-cols-7 gap-1">
            {cumulative.map((item) => <div key={item.poolSize} className="text-center border border-slate-800 rounded p-1.5"><div className="text-[10px] text-slate-500">Top {item.poolSize}</div><div className="text-xs text-emerald-300 font-bold">{item.hitRate}%</div><div className="text-[9px] text-slate-500">{item.lift}x</div></div>)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> OUT-OF-SAMPLE ONLY</span>
        <span>Model: {modelVersion}</span>
        <span>Training cutoff: {metrics.trainingCutoff || 'insufficient history'}</span>
        <span>Last ML re-evaluation: {lastReevaluationDate || 'not run'}</span>
        {reevaluationMessage && <span className="text-cyan-300 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{reevaluationMessage}</span>}
      </div>
    </section>
  );
};
