import React, { useEffect, useMemo, useState } from 'react';
import { Brain, CheckCircle2, Copy, Cpu, History, RefreshCw, Send, Sparkles } from 'lucide-react';
import { Currency, DayMarketEntry } from '../types';
import { useMLAssessmentWorker } from '../hooks/useMLAssessmentWorker';
import type { ConsensusPoolAnalysisResult } from '../utils/consensusPoolEngine';
import { getTodayDateISO } from '../utils/mathEngine';

interface MainEngineSectionProps {
  records: DayMarketEntry[];
  selectedDate: string;
  onDateChange?: (date: string) => void;
  onSendPairsToSimulator?: (pairs: string[]) => void;
  currency?: Currency;
}

export const MainEngineSection: React.FC<MainEngineSectionProps> = ({
  records,
  selectedDate,
  onDateChange,
  onSendPairsToSimulator,
}) => {
  const { runConsensusPool } = useMLAssessmentWorker();
  const normalizedSelectedDate = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) && Number(selectedDate.slice(0, 4)) >= 1900
    ? selectedDate
    : getTodayDateISO();
  const [analysis, setAnalysis] = useState<ConsensusPoolAnalysisResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [backtestDays, setBacktestDays] = useState(30);

  useEffect(() => {
    let active = true;
    setAnalysis(null);
    setError(null);
    runConsensusPool(records, normalizedSelectedDate, backtestDays)
      .then(({ result }) => {
        if (active) setAnalysis(result);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to build the pool');
      });

    return () => {
      active = false;
    };
  }, [records, normalizedSelectedDate, backtestDays, runConsensusPool]);

  const selectedPool = useMemo(() => analysis?.allCandidates.slice(0, 36) || [], [analysis]);
  const pairs = selectedPool.map((candidate) => candidate.pair);
  const pool36Backtest = useMemo(
    () => analysis?.backtestSummary.poolSizeComparisons.find((comparison) => comparison.poolSize === 36),
    [analysis]
  );

  const copyPool = async () => {
    await navigator.clipboard.writeText(pairs.join(', '));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const refresh = () => {
    setIsRefreshing(true);
    setAnalysis(null);
    runConsensusPool(records, normalizedSelectedDate, backtestDays)
      .then(({ result }) => setAnalysis(result))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to build the pool'))
      .finally(() => setIsRefreshing(false));
  };

  const handleDateChange = (date: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number(date.slice(0, 4)) >= 1900) {
      onDateChange?.(date);
    }
  };

  if (!analysis) {
    return (
      <div className="min-h-[360px] rounded-2xl border border-emerald-500/25 bg-slate-900/80 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Cpu className="h-9 w-9 animate-pulse text-emerald-400" />
        <div>
          <h2 className="text-lg font-bold text-slate-100">System is selecting the 36-number pool</h2>
          <p className="mt-1 text-sm text-slate-400">Comparing all engines, learned rules, recency, and cross-engine agreement.</p>
          {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-100">
      <section className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-emerald-300">
                <Brain className="h-3.5 w-3.5" /> Autonomous selector
              </span>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/15 px-2.5 py-1 text-cyan-300">36 numbers</span>
            </div>
            <h1 className="mt-3 flex items-center gap-3 text-2xl font-black tracking-tight sm:text-3xl">
              Main Engine
              <span className="rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1 font-mono text-xs text-emerald-300">TOP 36</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              The Main Engine derives a 36-number consensus from Pattern Dashboard, Model F, ML Rules, Date Generator, Sir Abhishek Theory, and Faridabad Delta Matrix, then validates the selection with walk-forward testing across all houses.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
              {['Date Generator', 'Pattern Dashboard', 'Model F', 'Sir Abhishek Theory', 'Faridabad Delta Matrix'].map((engine) => (
                <span key={engine} className="rounded-md border border-slate-700 bg-slate-950/80 px-2.5 py-1 text-slate-300">{engine}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={normalizedSelectedDate}
              onChange={(event) => handleDateChange(event.target.value)}
              min="2000-01-01"
              max="2100-12-31"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white"
            />
            <button type="button" onClick={refresh} title="Recalculate pool" className="rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-slate-200 hover:bg-slate-700">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">System-selected candidates</p>
            <p className="mt-1 text-xs text-slate-400">Generated {new Date(analysis.generatedAt).toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyPool} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700">
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy 36 numbers'}
            </button>
            <button type="button" onClick={() => onSendPairsToSimulator?.(pairs)} className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400">
              <Send className="h-4 w-4" /> Send to simulator
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
          {selectedPool.map((candidate) => (
            <div key={candidate.pair} className="relative rounded-xl border border-slate-700 bg-slate-950 p-3 text-center shadow-sm">
              <span className="absolute left-2 top-1 text-[9px] font-mono text-slate-500">#{candidate.rank}</span>
              <div className="mt-2 font-mono text-xl font-black text-emerald-300">{candidate.pair}</div>
              <div className="mt-1 text-[10px] text-slate-400">{candidate.consensusScore.toFixed(1)} score</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Signals combined</p><p className="mt-1 text-2xl font-black text-white">All engines + ML</p></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Historical window</p><p className="mt-1 text-2xl font-black text-white">{analysis.fiveDayWindowDates.length} days</p></div>
        <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-4"><p className="text-[10px] uppercase tracking-wider text-indigo-300">36-pool all-house hit rate</p><p className="mt-1 text-2xl font-black text-indigo-200">{pool36Backtest?.winRatePercent ?? 0}%</p><p className="mt-1 text-[10px] text-slate-400">{pool36Backtest?.totalMarketHits ?? 0} market hits</p></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Selection status</p><p className="mt-1 flex items-center gap-2 text-2xl font-black text-emerald-300"><Sparkles className="h-5 w-5" /> Certified</p></div>
      </section>

      <section className="rounded-2xl border border-indigo-500/25 bg-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
              <History className="h-4 w-4" /> Walk-forward validation
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Tests each historical date using only records available before that date.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Window</span>
            {[7, 15, 30, 60].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setBacktestDays(days)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${backtestDays === days ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200' : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-white'}`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><p className="text-[10px] uppercase text-slate-500">Days tested</p><p className="mt-1 text-xl font-black text-white">{analysis.backtestSummary.totalDaysTested}</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><p className="text-[10px] uppercase text-slate-500">Top 20 win rate</p><p className="mt-1 text-xl font-black text-emerald-300">{analysis.backtestSummary.top20WinRatePercent}%</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><p className="text-[10px] uppercase text-slate-500">Quad-hit days</p><p className="mt-1 text-xl font-black text-cyan-300">{analysis.backtestSummary.quadHitDays}</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><p className="text-[10px] uppercase text-slate-500">Loss days</p><p className="mt-1 text-xl font-black text-amber-300">{analysis.backtestSummary.lossDays}</p></div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="bg-slate-950 text-[10px] uppercase tracking-wider text-slate-500">
              <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Top 20</th><th className="px-3 py-2">Top 10</th><th className="px-3 py-2">Hits</th><th className="px-3 py-2">Actual draws</th></tr>
            </thead>
            <tbody>
              {analysis.backtestSummary.dailyAudits.slice().reverse().map((audit) => (
                <tr key={audit.targetDate} className="border-t border-slate-800 text-slate-300">
                  <td className="px-3 py-2 font-mono">{audit.targetDate}</td>
                  <td className={`px-3 py-2 font-bold ${audit.isWinTop20 ? 'text-emerald-300' : 'text-rose-300'}`}>{audit.isWinTop20 ? 'WIN' : 'MISS'}</td>
                  <td className={`px-3 py-2 font-bold ${audit.isWinTop10 ? 'text-emerald-300' : 'text-slate-500'}`}>{audit.isWinTop10 ? 'WIN' : 'MISS'}</td>
                  <td className="px-3 py-2 font-mono">{audit.totalHitsTop20}</td>
                  <td className="px-3 py-2">{audit.actualDraws.map((draw) => `${draw.market}: ${draw.draw}`).join(' · ') || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
