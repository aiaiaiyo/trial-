import React, { useMemo, useState } from 'react';
import { Activity, Brain, CheckCircle2, GitBranch, RefreshCw, ShieldCheck, SlidersHorizontal, Target } from 'lucide-react';
import { DayMarketEntry, Market } from '../types';
import { EngineMetric, EngineSynergyReport, runEngineSynergyWalkForward } from '../utils/engineSynergyEngine';

interface EngineSynergyLabProps { records: DayMarketEntry[]; }
type WindowFilter = 'ALL' | '5' | '10' | '30' | 'CUSTOM';
const houses: Array<{ key: Market; label: string }> = [
  { key: 'Deshawar', label: 'DSWR' },
  { key: 'Faridabad', label: 'FRBD' },
  { key: 'Ghaziabad', label: 'GZBD' },
  { key: 'Gali', label: 'GALI' },
];

const pct = (value: number) => `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;

export const EngineSynergyLab: React.FC<EngineSynergyLabProps> = ({ records }) => {
  const [windowFilter, setWindowFilter] = useState<WindowFilter>('ALL');
  const [customDays, setCustomDays] = useState(60);
  const [houseFilter, setHouseFilter] = useState<Market | 'ALL'>('ALL');
  const [evaluationNonce, setEvaluationNonce] = useState(0);
  const [isReevaluating, setIsReevaluating] = useState(false);
  const [auditMessage, setAuditMessage] = useState('');

  const maxTestDays = windowFilter === 'ALL' ? 0 : windowFilter === 'CUSTOM' ? customDays : Number(windowFilter);
  const report: EngineSynergyReport = useMemo(
    () => runEngineSynergyWalkForward(records, maxTestDays),
    [records, maxTestDays, evaluationNonce]
  );
  const visibleMetrics = houseFilter === 'ALL' ? report.individualMetrics : report.houseMetrics[houseFilter];
  const combinations = report.combinations.filter((combination) => combination.sufficientEvidence).slice(0, 20);

  const handleReevaluate = () => {
    setIsReevaluating(true);
    setAuditMessage('');
    setTimeout(() => {
      const nextNonce = Date.now();
      const candidate = runEngineSynergyWalkForward(records, maxTestDays);
      const candidateKey = candidate.bestOverall?.label || 'No sufficiently evidenced combination';
      const candidateScore = candidate.bestOverall?.score || 0;
      const storedRaw = localStorage.getItem('engine_synergy_registry_v1');
      const stored = storedRaw ? JSON.parse(storedRaw) as { score?: number; modelVersion?: string } : null;
      const promote = !stored || candidateScore >= (stored.score || 0);
      const timestamp = new Date().toISOString();
      const modelVersion = promote ? `engine-synergy-v${timestamp.replace(/\D/g, '').slice(0, 14)}` : stored?.modelVersion || report.modelVersion;
      const auditEntry = {
        modelVersion,
        dataCutoff: candidate.dataCutoff,
        engineSet: candidate.bestOverall?.combination || [],
        engineWeights: candidate.learnedWeights,
        featureSet: candidate.featureSet,
        validationPeriod: candidate.filters,
        performanceMetrics: candidate.bestOverall || null,
        decision: promote ? 'PROMOTED' : 'RETAINED_EXISTING',
        evaluatedAt: timestamp,
      };
      const priorAudit = JSON.parse(localStorage.getItem('engine_synergy_audit_v1') || '[]');
      localStorage.setItem('engine_synergy_audit_v1', JSON.stringify([...priorAudit, auditEntry].slice(-30)));
      if (promote) localStorage.setItem('engine_synergy_registry_v1', JSON.stringify({ modelVersion, score: candidateScore, activeCombination: candidate.bestOverall?.combination || [] }));
      setAuditMessage(promote ? `Validated combination promoted: ${candidateKey}.` : `Candidate retained for audit; existing synergy model kept.`);
      setEvaluationNonce(nextNonce);
      setIsReevaluating(false);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <section className="bg-gradient-to-r from-slate-950 via-cyan-950/30 to-slate-950 border border-cyan-500/25 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300"><GitBranch className="w-6 h-6" /></div>
            <div><h1 className="text-xl font-black text-slate-100 tracking-tight">Engine Performance &amp; Synergy Lab</h1><p className="text-xs text-slate-400 mt-1 max-w-2xl">Independent engine value, house behavior, agreement, complementarity, and stable combinations from chronological out-of-sample replay.</p></div>
          </div>
          <button type="button" onClick={handleReevaluate} disabled={isReevaluating} className="px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-100 text-xs font-bold flex items-center gap-2 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${isReevaluating ? 'animate-spin' : ''}`} />{isReevaluating ? 'Re-Evaluating ML...' : 'Re-Evaluate ML'}</button>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <select value={windowFilter} onChange={(event) => setWindowFilter(event.target.value as WindowFilter)} className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5"><option value="ALL">All history</option><option value="5">Recent 5 days</option><option value="10">Recent 10 days</option><option value="30">Recent 30 days</option><option value="CUSTOM">Custom window</option></select>
          {windowFilter === 'CUSTOM' && <input type="number" min={5} value={customDays} onChange={(event) => setCustomDays(Math.max(5, Number(event.target.value) || 5))} className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200" />}
          <select value={houseFilter} onChange={(event) => setHouseFilter(event.target.value as Market | 'ALL')} className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5"><option value="ALL">All houses</option>{houses.map((house) => <option key={house.key} value={house.key}>{house.label}</option>)}</select>
          <span className="text-[10px] text-slate-500 ml-auto">{report.testedDays} walk-forward days / {report.validHouseObservations} house observations</span>
        </div>
        {auditMessage && <div className="mt-3 text-xs text-emerald-300 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{auditMessage}</div>}
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
        <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-emerald-400" /><h2 className="text-sm font-bold text-slate-100">Individual Engine Performance</h2><span className="text-[10px] text-slate-500">Baseline is each engine&apos;s actual pool size / 100</span></div>
        <table className="w-full min-w-[900px] text-[11px] font-mono"><thead className="text-slate-500"><tr><th className="p-2 text-left">Engine</th><th>Pool</th><th>Tests</th><th>Hits</th><th>Misses</th><th>Hit %</th><th>Baseline</th><th>Lift</th><th>Excess</th><th>Recent</th><th>Stability</th></tr></thead><tbody>{visibleMetrics.map((metric) => <tr key={metric.engineId} className="border-t border-slate-800 text-slate-300"><td className="p-2 font-bold text-cyan-300">{metric.label}</td><td className="text-center">{metric.poolSize}</td><td className="text-center">{metric.tests}</td><td className="text-center text-emerald-300">{metric.hits}</td><td className="text-center text-rose-300">{metric.misses}</td><td className="text-center">{pct(metric.hitRate)}</td><td className="text-center text-slate-500">{pct(metric.baselineRate)}</td><td className="text-center">{metric.lift.toFixed(2)}x</td><td className="text-center">{metric.excessHitRate >= 0 ? '+' : ''}{pct(metric.excessHitRate)}</td><td className="text-center">{pct(metric.recentHitRate)}</td><td className="text-center">{pct(metric.stability)}</td></tr>)}</tbody></table>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 overflow-x-auto"><div className="flex items-center gap-2 mb-4"><Target className="w-4 h-4 text-amber-400" /><h2 className="text-sm font-bold text-slate-100">House-wise Engine Hit Rates</h2></div><table className="w-full min-w-[600px] text-[11px] font-mono"><thead className="text-slate-500"><tr><th className="p-2 text-left">Engine</th>{houses.map((house) => <th key={house.key}>{house.label}</th>)}</tr></thead><tbody>{report.individualMetrics.map((metric) => <tr key={metric.engineId} className="border-t border-slate-800"><td className="p-2 text-cyan-300">{metric.label}</td>{houses.map((house) => <td key={house.key} className="text-center text-emerald-300">{pct(metric.houseRates[house.key])}</td>)}</tr>)}</tbody></table></div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 overflow-x-auto"><div className="flex items-center gap-2 mb-4"><GitBranch className="w-4 h-4 text-violet-400" /><h2 className="text-sm font-bold text-slate-100">Agreement / Complementarity</h2></div><table className="w-full min-w-[600px] text-[10px] font-mono"><thead className="text-slate-500"><tr><th className="p-2 text-left">Pair</th><th>Agreement</th><th>Complement</th><th>Shared miss</th></tr></thead><tbody>{report.relationships.sort((a, b) => b.complementarity - a.complementarity).slice(0, 20).map((relationship) => <tr key={`${relationship.engineA}-${relationship.engineB}`} className="border-t border-slate-800"><td className="p-2 text-slate-300">{relationship.engineA} + {relationship.engineB}</td><td className="text-center">{pct(relationship.agreement)}</td><td className="text-center text-emerald-300">{pct(relationship.complementarity)}</td><td className="text-center">{pct(relationship.sharedMissRate)}</td></tr>)}</tbody></table></div>
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 overflow-x-auto"><div className="flex items-center gap-2 mb-4"><Brain className="w-4 h-4 text-cyan-400" /><h2 className="text-sm font-bold text-slate-100">Machine-Generated Engine Synergy</h2><span className="text-[10px] text-slate-500">Only combinations with minimum evidence and stability are ranked</span></div><table className="w-full min-w-[1100px] text-[10px] font-mono"><thead className="text-slate-500"><tr><th className="p-2 text-left">Rank / Combination</th><th>Pool</th><th>Hit %</th><th>Lift</th><th>Synergy Gain</th><th>Stability</th><th>Recent</th><th>House consistency</th><th>Tests</th></tr></thead><tbody>{combinations.map((combination, index) => <tr key={combination.label} className="border-t border-slate-800"><td className="p-2 text-cyan-300">#{index + 1} {combination.label}</td><td className="text-center">{combination.poolSize}</td><td className="text-center text-emerald-300">{pct(combination.hitRate)}</td><td className="text-center">{combination.lift.toFixed(2)}x</td><td className={`text-center ${combination.synergyGain > 0 ? 'text-emerald-300' : 'text-slate-500'}`}>{combination.synergyGain >= 0 ? '+' : ''}{pct(combination.synergyGain)}</td><td className="text-center">{pct(combination.stability)}</td><td className="text-center">{pct(combination.recentHitRate)}</td><td className="text-center">{pct(combination.houseConsistency)}</td><td className="text-center">{combination.tests}</td></tr>)}</tbody></table></section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[['Best Overall Combination', report.bestOverall], ['Most Stable Combination', report.mostStable], ['Best Recent Combination', report.bestRecent], ...houses.map((house) => [`Best ${house.label} Combination`, report.bestByHouse[house.key]])].map(([label, metric]) => <div key={String(label)} className="bg-slate-950 border border-slate-800 rounded-xl p-4"><div className="text-[10px] uppercase text-slate-500">{label}</div><div className="text-xs font-bold text-cyan-300 mt-2">{(metric as any)?.label || 'Insufficient evidence'}</div><div className="text-[11px] text-slate-300 mt-1">{(metric as any) ? `${pct((metric as any).hitRate)} hit | ${(metric as any).lift.toFixed(2)}x baseline` : 'Need more valid walk-forward observations.'}</div></div>)}
      </section>

      <section className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[10px] font-mono text-slate-500 flex flex-wrap gap-3"><ShieldCheck className="w-4 h-4 text-emerald-400" /><span>LEAKAGE-FREE WALK-FORWARD</span><span>Model version: {report.modelVersion}</span><span>Data cutoff: {report.dataCutoff || 'insufficient history'}</span><span>Weights: {Object.entries(report.learnedWeights).map(([engine, weight]) => `${engine} ${(Number(weight) * 100).toFixed(1)}%`).join(' | ')}</span></section>
    </div>
  );
};
