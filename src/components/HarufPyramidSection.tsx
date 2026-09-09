import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Layers,
  Target,
  ArrowRight,
  Copy,
  Check,
  Send,
  Calendar,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Zap,
  Flame,
  Award,
  Filter,
  CheckCircle2,
  SlidersHorizontal,
  Info,
  History,
  BarChart3,
  XCircle,
  Play,
  ChevronDown,
  ChevronUp,
  CalendarRange,
} from 'lucide-react';
import { DayMarketEntry, Currency, MARKETS, Market } from '../types';
import {
  runHarufPyramidAnalysis,
  buildHarufPyramid,
  runHarufPyramidHistoricalBacktest,
  HarufPyramidStructure,
  HarufDigitStat,
  HarufPyramidBacktestSummary,
  HarufPyramidBacktestDayResult,
} from '../utils/harufPyramidEngine';

interface HarufPyramidSectionProps {
  records: DayMarketEntry[];
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  onSendPairsToSimulator?: (pairs: string[]) => void;
  currency?: Currency;
}

export const HarufPyramidSection: React.FC<HarufPyramidSectionProps> = ({
  records,
  selectedDate,
  onDateChange,
  onSendPairsToSimulator,
}) => {
  // User custom Haruf selection state (if user overrides top-6)
  const [customHarufs, setCustomHarufs] = useState<number[] | null>(null);
  const [activePyramidView, setActivePyramidView] = useState<'direct' | 'rashi' | 'combined' | 'palti'>('direct');
  const [copiedState, setCopiedState] = useState<boolean>(false);
  const [toastText, setToastText] = useState<string | null>(null);

  const showLocalToast = (text: string) => {
    setToastText(text);
    setTimeout(() => setToastText(null), 3000);
  };

  // Backtest State
  const [backtestDaysLimit, setBacktestDaysLimit] = useState<number>(30);
  const [backtestMode, setBacktestMode] = useState<'dynamic' | 'fixed'>('dynamic');
  const [backtestHitRule, setBacktestHitRule] = useState<'direct' | 'direct_palti' | 'direct_rashi' | 'all'>('direct');
  const [backtestTargetMarket, setBacktestTargetMarket] = useState<'ALL' | Market>('ALL');
  const [backtestFilterOutcome, setBacktestFilterOutcome] = useState<'ALL' | 'WIN' | 'MISS'>('ALL');
  const [expandedDayDate, setExpandedDayDate] = useState<string | null>(null);

  // Run Memoized Analysis
  const analysis = useMemo(() => {
    return runHarufPyramidAnalysis(records, selectedDate, customHarufs || undefined);
  }, [records, selectedDate, customHarufs]);

  const { patternHarufs, universeHarufs, combinedHarufs, selectedTop6Harufs, pyramid } = analysis;

  // Run Memoized Backtest
  const backtestSummary = useMemo(() => {
    return runHarufPyramidHistoricalBacktest(records, {
      daysLimit: backtestDaysLimit,
      mode: backtestMode,
      fixedHarufs: customHarufs || selectedTop6Harufs,
      hitRule: backtestHitRule,
      targetMarket: backtestTargetMarket,
    });
  }, [
    records,
    backtestDaysLimit,
    backtestMode,
    customHarufs,
    selectedTop6Harufs,
    backtestHitRule,
    backtestTargetMarket,
  ]);

  const filteredDailyResults = useMemo(() => {
    if (backtestFilterOutcome === 'WIN') {
      return backtestSummary.dailyResults.filter((d) => d.isDayWin);
    }
    if (backtestFilterOutcome === 'MISS') {
      return backtestSummary.dailyResults.filter((d) => !d.isDayWin);
    }
    return backtestSummary.dailyResults;
  }, [backtestSummary.dailyResults, backtestFilterOutcome]);

  // Handler to toggle / pick digits in custom selection
  const handleToggleHarufDigit = (digit: number) => {
    const current = customHarufs ? [...customHarufs] : [...selectedTop6Harufs];
    if (current.includes(digit)) {
      if (current.length <= 2) {
        showLocalToast('Must keep at least 2 Harufs in sequence');
        return;
      }
      const updated = current.filter((d) => d !== digit);
      setCustomHarufs(updated);
    } else {
      if (current.length >= 6) {
        // Replace the last item or show prompt
        const updated = [...current.slice(0, 5), digit];
        setCustomHarufs(updated);
        showLocalToast(`Updated slot 6 with Haruf ${digit}`);
      } else {
        setCustomHarufs([...current, digit]);
      }
    }
  };

  const handleResetToConsensus = () => {
    setCustomHarufs(null);
    showLocalToast('Reset to Algorithmic Top-6 Consensus Haruf');
  };

  const handleLoadUserBenchmark = () => {
    setCustomHarufs([9, 2, 6, 7, 8, 5]);
    showLocalToast('Loaded Benchmark Haruf: (9, 2, 6, 7, 8, 5)');
  };

  // Active Pairs to copy or simulate based on current view tab
  const displayedPairs = useMemo(() => {
    switch (activePyramidView) {
      case 'direct':
        return pyramid.totalPairs;
      case 'rashi':
        return pyramid.rashiTotalPairs;
      case 'combined':
        return pyramid.combinedPairs;
      case 'palti':
        return pyramid.paltiPairs;
      default:
        return pyramid.totalPairs;
    }
  }, [activePyramidView, pyramid]);

  const handleCopyPairs = () => {
    navigator.clipboard.writeText(displayedPairs.join(', '));
    setCopiedState(true);
    showLocalToast(`Copied ${displayedPairs.length} pairs to clipboard`);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handleSendToSimulator = () => {
    if (onSendPairsToSimulator) {
      onSendPairsToSimulator(displayedPairs);
      showLocalToast(`Sent ${displayedPairs.length} pairs to Risk Simulator`);
    }
  };

  return (
    <div id="haruf-pyramid-main-container" className="space-y-6 font-sans">
      {/* Toast Notification */}
      {toastText && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          {toastText}
        </div>
      )}

      {/* Main Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                MAIN CORE ENGINE
              </span>
              <span className="px-3 py-1 text-xs font-bold rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                HARUF PYRAMID METHOD
              </span>
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30">
                C(6, 2) = 15 JODI POOL
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Target className="w-7 h-7 text-emerald-400" />
              Haruf Pyramid Consensus Suite
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Synthesizes separate single-digit Haruf intelligence from{' '}
              <span className="text-cyan-300 font-semibold">Pattern Dashboard Engine</span> and{' '}
              <span className="text-amber-300 font-semibold">Universe 00–99 Coverage</span>. Extracts Top-6 Harufs,
              derives their <span className="text-purple-300 font-semibold">Rashi complements</span>, and applies the
              rigorous triangular combinatoric pyramid{' '}
              <span className="font-mono text-emerald-400">P(H) = &#123; 10hᵢ + hⱼ | 1 ≤ i &lt; j ≤ 6 &#125;</span>.
            </p>
          </div>

          {/* Date Selector & Quick Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/90 border border-slate-700/80 p-3.5 rounded-xl backdrop-blur-md">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Target Draw Date
              </label>
              <input
                id="haruf-target-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono font-semibold text-slate-100 focus:outline-none focus:border-cyan-400 transition"
              />
            </div>

            <div className="flex sm:flex-col gap-1.5 justify-end">
              <button
                type="button"
                id="btn-load-benchmark-harufs"
                onClick={handleLoadUserBenchmark}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition cursor-pointer flex items-center gap-1"
                title="Load sample: (9, 2, 6, 7, 8, 5)"
              >
                <Zap className="w-3 h-3 text-indigo-400" />
                Sample (9,2,6,7,8,5)
              </button>
              <button
                type="button"
                id="btn-reset-harufs"
                onClick={handleResetToConsensus}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                Auto Consensus
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Dual Source Haruf Extraction (Pattern Dashboard vs Universe Coverage) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Source A: Pattern Dashboard Haruf Ranking */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                A
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  Pattern Dashboard Engine Harufs
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                    Predictive Models
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Extracted from Consensus 36 Candidates, Date Triads &amp; Repeated Root Digits
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {patternHarufs.map((item) => {
              const isSelected = selectedTop6Harufs.includes(item.digit);
              return (
                <button
                  key={`pattern-h-${item.digit}`}
                  type="button"
                  onClick={() => handleToggleHarufDigit(item.digit)}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-400/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    Rank #{item.rank}
                  </span>
                  <span className={`text-xl font-black font-mono ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                    {item.digit}
                  </span>
                  <div className="text-[10px] font-mono text-slate-400">
                    <span className="text-cyan-400 font-semibold">{item.score} pts</span>
                  </div>
                  <span className="text-[9px] text-slate-400">
                    A:{item.andarCount} B:{item.baharCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Source B: Universe 00-99 & Coverage Method Haruf Ranking */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                B
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  Universe &amp; Coverage Method Harufs
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                    00–99 Universe Ledger
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Extracted from actual monthly draw occurrences, appeared density &amp; recency
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {universeHarufs.map((item) => {
              const isSelected = selectedTop6Harufs.includes(item.digit);
              return (
                <button
                  key={`universe-h-${item.digit}`}
                  type="button"
                  onClick={() => handleToggleHarufDigit(item.digit)}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-950/70 border-amber-500 shadow-md ring-1 ring-amber-400/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    Rank #{item.rank}
                  </span>
                  <span className={`text-xl font-black font-mono ${isSelected ? 'text-amber-300' : 'text-slate-300'}`}>
                    {item.digit}
                  </span>
                  <div className="text-[10px] font-mono text-slate-400">
                    <span className="text-amber-400 font-semibold">{item.totalCount} hits</span>
                  </div>
                  <span className="text-[9px] text-slate-400">
                    In:{item.andarCount} Out:{item.baharCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: Top-6 Haruf Sequence H & Rashi Complements */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Selected Top-6 Harufs H &amp; Rashi Complements
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ordered 6-digit seed sequence used for building the pyramid: H = ({selectedTop6Harufs.join(', ')})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Active Sequence:</span>
            <span className="px-2.5 py-1 rounded bg-slate-900 text-emerald-300 font-mono text-xs font-bold border border-slate-700">
              H = ({selectedTop6Harufs.join(', ')})
            </span>
          </div>
        </div>

        {/* Visual Haruf Cards with Rashi Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {selectedTop6Harufs.map((h, idx) => {
            const rashiVal = pyramid.rashiHarufs[idx];
            const letter = ['h₁ (A)', 'h₂ (B)', 'h₃ (C)', 'h₄ (D)', 'h₅ (E)', 'h₆ (F)'][idx];
            return (
              <div
                key={`top6-h-${idx}`}
                className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-center relative overflow-hidden group hover:border-emerald-500 transition"
              >
                <div className="text-[10px] font-mono text-slate-400 font-bold mb-1">{letter}</div>
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-2xl font-black font-mono text-emerald-300 shadow-inner">
                  {h}
                </div>

                {/* Rashi Complement Below */}
                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-center gap-1.5">
                  <span className="text-[10px] text-slate-400">Rashi:</span>
                  <span className="w-6 h-6 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold flex items-center justify-center">
                    {rashiVal}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Rashi complement formula: <code className="text-purple-300 font-mono">R(h) = (h + 5) mod 10</code> (0↔5, 1↔6, 2↔7, 3↔8, 4↔9).
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-300">
            Rashi Harufs: ({pyramid.rashiHarufs.join(', ')})
          </div>
        </div>
      </div>

      {/* SECTION 3: The Haruf Pyramid Combinatoric Structure */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                MATHEMATICAL FORMULA
              </span>
              <h2 className="text-base font-bold text-white">
                Pyramid Structure P(H) = &#123; 10hᵢ + hⱼ | 1 ≤ i &lt; j ≤ 6 &#125;
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Stepped triangular reduction forming the exact 15-number Haruf Pyramid pool.
            </p>
          </div>

          {/* View Modes & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setActivePyramidView('direct')}
                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                  activePyramidView === 'direct'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Direct (15)
              </button>
              <button
                type="button"
                onClick={() => setActivePyramidView('rashi')}
                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                  activePyramidView === 'rashi'
                    ? 'bg-purple-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Rashi (15)
              </button>
              <button
                type="button"
                onClick={() => setActivePyramidView('combined')}
                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                  activePyramidView === 'combined'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Combined ({pyramid.combinedPairs.length})
              </button>
              <button
                type="button"
                onClick={() => setActivePyramidView('palti')}
                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                  activePyramidView === 'palti'
                    ? 'bg-amber-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Palti Reverse (15)
              </button>
            </div>

            <button
              type="button"
              id="btn-copy-pyramid-pairs"
              onClick={handleCopyPairs}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedState ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedState ? 'Copied' : 'Copy'}
            </button>

            {onSendPairsToSimulator && (
              <button
                type="button"
                id="btn-simulate-pyramid-pairs"
                onClick={handleSendToSimulator}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-900/30"
              >
                <Send className="w-3.5 h-3.5" />
                Simulate {displayedPairs.length} Pairs
              </button>
            )}
          </div>
        </div>

        {/* Visual Triangular Stepped Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px] space-y-3 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
            {activePyramidView === 'rashi' ? (
              // Rashi Pyramid Rows
              pyramid.rashiRows.map((row, rIdx) => (
                <div key={`rashi-row-${rIdx}`} className="flex items-center gap-3">
                  <div className="w-20 shrink-0 flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-purple-400">
                      Row {row.stepLetter}:
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono font-black text-sm flex items-center justify-center">
                      {row.rootHaruf}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="flex flex-wrap items-center gap-2">
                    {row.pairs.map((p, pIdx) => (
                      <div
                        key={`rashi-p-${p}-${pIdx}`}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-200 font-mono text-sm font-black shadow hover:border-purple-400 transition"
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 ml-auto">
                    ({row.pairs.length} pairs)
                  </span>
                </div>
              ))
            ) : (
              // Direct Haruf Pyramid Rows (Default)
              pyramid.rows.map((row, rIdx) => (
                <div key={`direct-row-${rIdx}`} className="flex items-center gap-3">
                  <div className="w-20 shrink-0 flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      Row {row.stepLetter}:
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-sm flex items-center justify-center">
                      {row.rootHaruf}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="flex flex-wrap items-center gap-2">
                    {row.pairs.map((p, pIdx) => (
                      <div
                        key={`direct-p-${p}-${pIdx}`}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 font-mono text-sm font-black shadow hover:border-emerald-400 transition"
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 ml-auto">
                    ({row.pairs.length} pairs)
                  </span>
                </div>
              ))
            )}

            {/* Base Haruf row indicator */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
              <div className="w-20 shrink-0 flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400">Base:</span>
                <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono font-black text-sm flex items-center justify-center">
                  {activePyramidView === 'rashi' ? pyramid.rashiHarufs[5] : pyramid.harufs[5]}
                </span>
              </div>
              <span className="text-xs text-slate-400 italic">
                Anchor baseline digit (completes all preceding pair combinations)
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 ml-auto">
                Total combinations: C(6, 2) = 15
              </span>
            </div>
          </div>
        </div>

        {/* Final 15-Number Pool Badges */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              Final Haruf Pyramid 15-Number Pool:
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {displayedPairs.length} Active Numbers
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-2">
            {displayedPairs.map((pair, idx) => (
              <span
                key={`pool-tag-${pair}-${idx}`}
                className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm font-extrabold shadow-sm hover:border-emerald-400 transition"
              >
                {pair}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: Real-time Draw Audit & Verification */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Draw Outcome Verification &amp; Hit Audit
              </h2>
              <p className="text-xs text-slate-400">
                Audits current day actual market outcomes against the Haruf Pyramid pool
              </p>
            </div>
          </div>

          <div className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
            7-Day Historical Hit Rate:{' '}
            <span className="text-emerald-400 font-bold">
              {analysis.historicalHitRate7Days.hitRatePercent}%
            </span>{' '}
            ({analysis.historicalHitRate7Days.hitDays}/{analysis.historicalHitRate7Days.testedDays} days)
          </div>
        </div>

        {analysis.drawOutcomesToday.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
            No actual draws recorded for <span className="font-mono text-slate-300">{selectedDate}</span> yet.
            The Haruf Pyramid pool above is ready for zero-lookahead forward testing.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {analysis.hitAuditToday.map((audit) => {
              const hasHit = audit.hasDirectHit || audit.hasRashiHit || audit.hasPaltiHit;
              return (
                <div
                  key={`audit-${audit.market}`}
                  className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2 ${
                    hasHit
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md'
                      : 'bg-slate-900/50 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">{audit.market}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                        hasHit ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {audit.matchType}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-400">Actual Draw:</span>
                    <span className="text-xl font-black font-mono text-white">
                      {audit.actualDraw}
                    </span>
                  </div>

                  {hasHit && (
                    <div className="text-[11px] text-emerald-300 font-medium">
                      ✓ Hit captured in Haruf Pyramid pool!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 5: Historical Backtest Suite Against Historical Records */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-6 shadow-xl">
        {/* Header & Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Haruf Pyramid Historical Backtest Engine
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  WALK-FORWARD AUDIT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Rigorous zero-lookahead backtest across historical records for Deshawar, Faridabad, Gali, &amp; Ghaziabad
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
              Tested:{' '}
              <span className="text-white font-bold">{backtestSummary.daysTested} Days</span>{' '}
              ({backtestSummary.totalDrawsTested} Draws)
            </div>
          </div>
        </div>

        {/* Backtest Control Filters Bar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Historical Depth */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-indigo-400" />
                Backtest Depth (Days):
              </label>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: '7D', value: 7 },
                  { label: '15D', value: 15 },
                  { label: '30D', value: 30 },
                  { label: '60D', value: 60 },
                  { label: 'All', value: 0 },
                ].map((item) => (
                  <button
                    key={`depth-${item.label}`}
                    onClick={() => setBacktestDaysLimit(item.value)}
                    className={`text-xs px-2.5 py-1 rounded-md font-mono font-semibold transition ${
                      backtestDaysLimit === item.value
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Model Generation Mode */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Haruf Selection Strategy:
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => setBacktestMode('dynamic')}
                  className={`flex-1 text-xs py-1 px-2 rounded-md font-medium text-center transition ${
                    backtestMode === 'dynamic'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
                  }`}
                  title="Zero-lookahead: dynamically discovers daily top-6 Harufs using prior training data"
                >
                  Dynamic Walk-Forward
                </button>
                <button
                  onClick={() => setBacktestMode('fixed')}
                  className={`flex-1 text-xs py-1 px-2 rounded-md font-medium text-center transition ${
                    backtestMode === 'fixed'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
                  }`}
                  title="Tests current Top-6 Haruf sequence across all historical records"
                >
                  Fixed Active H
                </button>
              </div>
            </div>

            {/* 3. Hit Rule Criteria */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Hit Capture Pool:
              </label>
              <select
                value={backtestHitRule}
                onChange={(e) => setBacktestHitRule(e.target.value as any)}
                className="w-full text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="direct">Direct 15 Pairs (Strict C(6,2))</option>
                <option value="direct_palti">Direct + Palti Reverse (30 Pairs)</option>
                <option value="direct_rashi">Direct + Rashi Complement (30 Pairs)</option>
                <option value="all">All Variations (Direct + Palti + Rashi)</option>
              </select>
            </div>

            {/* 4. Target Market Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                Market Filter:
              </label>
              <select
                value={backtestTargetMarket}
                onChange={(e) => setBacktestTargetMarket(e.target.value as any)}
                className="w-full text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All 4 Markets Combined</option>
                {MARKETS.map((m) => (
                  <option key={`opt-market-${m}`} value={m}>
                    {m} Only
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Executive KPI Scorecards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Day Win Rate */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold text-slate-300">Daily Win Rate</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="my-2">
              <div className="text-3xl font-black font-mono text-emerald-400">
                {backtestSummary.dayWinRatePercent}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                <span className="text-white font-bold">{backtestSummary.winningDays}</span> of{' '}
                <span className="text-slate-300 font-bold">{backtestSummary.daysTested}</span> days captured ≥1 hit
              </p>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, backtestSummary.dayWinRatePercent)}%` }}
              />
            </div>
          </div>

          {/* KPI 2: Total Draws Capture Rate */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold text-slate-300">Total Draw Capture</span>
              <Target className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="my-2">
              <div className="text-3xl font-black font-mono text-indigo-400">
                {backtestSummary.drawHitRatePercent}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                <span className="text-white font-bold">{backtestSummary.totalMarketHits}</span> hits across{' '}
                <span className="text-slate-300 font-bold">{backtestSummary.totalDrawsTested}</span> market draws
              </p>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, backtestSummary.drawHitRatePercent * 2)}%` }}
              />
            </div>
          </div>

          {/* KPI 3: Hit Composition */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold text-slate-300">Hit Composition</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="my-1.5 space-y-1 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Direct 15:
                </span>
                <span className="font-bold text-white">{backtestSummary.directHitsCount}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Palti Rev:
                </span>
                <span className="font-bold text-white">{backtestSummary.paltiHitsCount}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-purple-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Rashi Harm:
                </span>
                <span className="font-bold text-white">{backtestSummary.rashiHitsCount}</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500">
              Breakdown across tested historical period
            </div>
          </div>

          {/* KPI 4: Streak Metrics */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold text-slate-300">Streak Stability</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="my-1.5 space-y-1 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">Current Win Streak:</span>
                <span className="font-bold text-amber-300">{backtestSummary.currentWinStreak} Days</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">Max Win Streak:</span>
                <span className="font-bold text-emerald-400">{backtestSummary.maxWinStreak} Days</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">Max Loss Streak:</span>
                <span className="font-bold text-slate-400">{backtestSummary.maxLossStreak} Days</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500">
              Consecutive days with at least one hit
            </div>
          </div>
        </div>

        {/* Market Breakdown Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Per-Market Capture Breakdown:
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Market draws individually tested
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {MARKETS.map((m) => {
              const data = backtestSummary.marketBreakdown[m];
              return (
                <div
                  key={`market-card-${m}`}
                  className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{m}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {data.hitRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Hits: <strong className="text-slate-200">{data.hits}</strong></span>
                    <span>Draws: <strong className="text-slate-200">{data.tested}</strong></span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, data.hitRate * 2.5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Walk-Forward Day-by-Day Historical Log Table */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                Walk-Forward Day-by-Day Audit Log
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                ({filteredDailyResults.length} records shown)
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setBacktestFilterOutcome('ALL')}
                className={`text-[11px] px-2.5 py-1 rounded font-medium transition ${
                  backtestFilterOutcome === 'ALL'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Days ({backtestSummary.daysTested})
              </button>
              <button
                onClick={() => setBacktestFilterOutcome('WIN')}
                className={`text-[11px] px-2.5 py-1 rounded font-medium transition ${
                  backtestFilterOutcome === 'WIN'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Winning Days ({backtestSummary.winningDays})
              </button>
              <button
                onClick={() => setBacktestFilterOutcome('MISS')}
                className={`text-[11px] px-2.5 py-1 rounded font-medium transition ${
                  backtestFilterOutcome === 'MISS'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Miss Days ({backtestSummary.daysTested - backtestSummary.winningDays})
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Top-6 Harufs H</th>
                    <th className="py-2.5 px-3 font-semibold">Deshawar</th>
                    <th className="py-2.5 px-3 font-semibold">Faridabad</th>
                    <th className="py-2.5 px-3 font-semibold">Gali</th>
                    <th className="py-2.5 px-3 font-semibold">Ghaziabad</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Day Result</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredDailyResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                        No records match the active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyResults.map((day) => {
                      const isExpanded = expandedDayDate === day.date;
                      const deshawarHit = day.marketHits.find((h) => h.market === 'Deshawar');
                      const faridabadHit = day.marketHits.find((h) => h.market === 'Faridabad');
                      const galiHit = day.marketHits.find((h) => h.market === 'Gali');
                      const ghaziabadHit = day.marketHits.find((h) => h.market === 'Ghaziabad');

                      const renderMarketCell = (hit?: typeof deshawarHit) => {
                        if (!hit || !hit.draw) {
                          return <span className="text-slate-600">—</span>;
                        }
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">{hit.draw}</span>
                            {hit.isHit ? (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                  hit.matchType === 'DIRECT'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : hit.matchType === 'PALTI'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                }`}
                              >
                                {hit.matchType}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Miss</span>
                            )}
                          </div>
                        );
                      };

                      return (
                        <React.Fragment key={`bkt-day-${day.date}`}>
                          <tr
                            className={`hover:bg-slate-800/40 transition ${
                              day.isDayWin ? 'bg-emerald-950/10' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-slate-200 font-bold whitespace-nowrap">
                              {day.date}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1">
                                {day.top6Harufs.map((h, i) => (
                                  <span
                                    key={`h-${day.date}-${i}`}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-[11px] font-bold text-indigo-300 border border-slate-700"
                                  >
                                    {h}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">{renderMarketCell(deshawarHit)}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">{renderMarketCell(faridabadHit)}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">{renderMarketCell(galiHit)}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">{renderMarketCell(ghaziabadHit)}</td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {day.isDayWin ? (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  WIN ({day.totalDayHits})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-400">
                                  <XCircle className="w-3 h-3 text-slate-500" />
                                  MISS
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    onDateChange(day.date);
                                    showLocalToast(`Loaded Haruf Pyramid for ${day.date}`);
                                  }}
                                  className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                                  title="Inspect this day in the Haruf Pyramid view above"
                                >
                                  View Date
                                </button>
                                <button
                                  onClick={() =>
                                    setExpandedDayDate(isExpanded ? null : day.date)
                                  }
                                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                                  title="Toggle 15-pair breakdown"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr className="bg-slate-900/90 border-y border-slate-800">
                              <td colSpan={8} className="p-3.5 text-xs">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-slate-300">
                                      Day {day.date} Haruf Pyramid 15-Pair Pool:
                                    </span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(day.pyramidPairs.join(', '));
                                        showLocalToast(`Copied 15 pairs for ${day.date}`);
                                      }}
                                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                    >
                                      <Copy className="w-3 h-3" /> Copy Pairs
                                    </button>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5 font-mono">
                                    {day.pyramidPairs.map((pair) => {
                                      // Check if this pair hit any market
                                      const isHittingPair = day.marketHits.some(
                                        (h) => h.draw === pair
                                      );
                                      return (
                                        <span
                                          key={`exp-pair-${day.date}-${pair}`}
                                          className={`px-2 py-0.5 rounded text-xs font-bold border transition ${
                                            isHittingPair
                                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                                              : 'bg-slate-800/90 text-slate-200 border-slate-700'
                                          }`}
                                        >
                                          {pair} {isHittingPair && '✓'}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
