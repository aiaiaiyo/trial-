import React, { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { SafetyBanner } from './components/SafetyBanner';

const DateGeneratorSection = lazy(() => import('./components/DateGeneratorSection').then((m) => ({ default: m.DateGeneratorSection })));
const GeneratedPairsView = lazy(() => import('./components/GeneratedPairsView').then((m) => ({ default: m.GeneratedPairsView })));
const RiskSimulatorSection = lazy(() => import('./components/RiskSimulatorSection').then((m) => ({ default: m.RiskSimulatorSection })));
const HeatmapSection = lazy(() => import('./components/HeatmapSection').then((m) => ({ default: m.HeatmapSection })));
const PreviousDateAnalyzer = lazy(() => import('./components/PreviousDateAnalyzer').then((m) => ({ default: m.PreviousDateAnalyzer })));
const SafeRestorePointModal = lazy(() => import('./components/SafeRestorePointModal').then((m) => ({ default: m.SafeRestorePointModal })));

const DailyDataSection = lazy(() => import('./components/DailyDataSection').then((m) => ({ default: m.DailyDataSection })));
const ScraperImportSection = lazy(() => import('./components/ScraperImportSection').then((m) => ({ default: m.ScraperImportSection })));
const HistorySection = lazy(() => import('./components/HistorySection').then((m) => ({ default: m.HistorySection })));
const MathematicsSection = lazy(() => import('./components/MathematicsSection').then((m) => ({ default: m.MathematicsSection })));
const UnitTestsRunner = lazy(() => import('./components/UnitTestsRunner').then((m) => ({ default: m.UnitTestsRunner })));

const PatternDashboardSection = lazy(() => import('./components/PatternDashboardSection').then((m) => ({ default: m.PatternDashboardSection })));
const BelgiumSquareMatrixSection = lazy(() => import('./components/BelgiumSquareMatrixSection').then((m) => ({ default: m.BelgiumSquareMatrixSection })));
const GSquareMethodSection = lazy(() => import('./components/GSquareMethodSection').then((m) => ({ default: m.GSquareMethodSection })));
const GSquareHarmonicsSection = lazy(() => import('./components/GSquareHarmonicsSection').then((m) => ({ default: m.GSquareHarmonicsSection })));
const PreviousDayRepeatedMethodSection = lazy(() => import('./components/PreviousDayRepeatedMethodSection').then((m) => ({ default: m.PreviousDayRepeatedMethodSection })));
const SirAbhishekTheorySection = lazy(() => import('./components/SirAbhishekTheorySection').then((m) => ({ default: m.SirAbhishekTheorySection })));
const SirTheoryPatternSection = lazy(() => import('./components/SirTheoryPatternSection').then((m) => ({ default: m.SirTheoryPatternSection })));
const RelationHotNumbersSection = lazy(() => import('./components/RelationHotNumbersSection').then((m) => ({ default: m.RelationHotNumbersSection })));
const ArithmeticPatternAnalysisSection = lazy(() => import('./components/ArithmeticPatternAnalysisSection').then((m) => ({ default: m.ArithmeticPatternAnalysisSection })));
const DateIntelligenceSection = lazy(() => import('./components/DateIntelligenceSection').then((m) => ({ default: m.DateIntelligenceSection })));
const BetaTestingSection = lazy(() => import('./components/BetaTestingSection').then((m) => ({ default: m.BetaTestingSection })));
const MonthlyNumberCoverageAnalysisModule = lazy(() => import('./components/MonthlyNumberCoverageAnalysisModule').then((m) => ({ default: m.MonthlyNumberCoverageAnalysisModule })));
const RashiIntelligenceModule = lazy(() => import('./components/RashiIntelligenceModule').then((m) => ({ default: m.RashiIntelligenceModule })));
const DoublesLabModule = lazy(() => import('./components/DoublesLabModule').then((m) => ({ default: m.DoublesLabModule })));
const PrecisionIntelligencePipelineSection = lazy(() => import('./components/PrecisionIntelligencePipelineSection').then((m) => ({ default: m.PrecisionIntelligencePipelineSection })));
const EngineSynergyLab = lazy(() => import('./components/EngineSynergyLab').then((m) => ({ default: m.EngineSynergyLab })));
const SavedRulesVaultSection = lazy(() => import('./components/SavedRulesVaultSection').then((m) => ({ default: m.SavedRulesVaultSection })));
const QuantitativeResearchSuite = lazy(() => import('./components/QuantitativeResearchSuite'));
const BriquetteEngineSection = lazy(() => import('./components/BriquetteEngineSection').then((m) => ({ default: m.BriquetteEngineSection })));
const HarufPyramidSection = lazy(() => import('./components/HarufPyramidSection').then((m) => ({ default: m.HarufPyramidSection })));
const ModelFSection = lazy(() => import('./components/ModelFSection').then((m) => ({ default: m.ModelFSection })));
const MainEngineSection = lazy(() => import('./components/SelfSelectingPoolSection').then((m) => ({ default: m.MainEngineSection })));

const sectionFallback = (
  <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 text-sm text-slate-300">
    Loading section...
  </div>
);

function scheduleBackgroundTask(task: () => void) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => task());
    return;
  }
  setTimeout(task, 0);
}

import {
  Currency,
  DayMarketEntry,
  DisplayMode,
  NavigationTab,
  UserPreferences,
} from './types';
import { generatePairsForDate, formatDateISO, getTodayDateISO, filterLast3MonthsRecords } from './utils/mathEngine';
import {
  loadDailyDataFromStorage,
  saveDailyDataToStorage,
  loadPreferencesFromStorage,
  savePreferencesToStorage,
} from './utils/cryptoStorage';
import { DEMO_DATASET_15_DAYS, DEMO_DATASET_30_DAYS, FULL_DATASET_2026_COMBINED } from './utils/seedData';
import { useMLAssessmentWorker } from './hooks/useMLAssessmentWorker';
import {
  getRestorePointsManifest,
  harvestSystemState,
  saveSafeRestorePoint,
} from './utils/safeRestorePointManager';
import {
  Sparkles,
  Calendar,
  Layers,
  Activity,
  Grid,
  History as HistoryIcon,
  BookOpen,
  ShieldCheck,
  Download,
  AlertTriangle,
  HeartHandshake,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  CalendarDays,
} from 'lucide-react';

export function App() {
  const { assessML: runMLAssessment } = useMLAssessmentWorker();

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<NavigationTab>('model-f');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateISO());
  const [currency, setCurrency] = useState<Currency>('USD');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('tiles');

  // Daily records state
  const [records, setRecords] = useState<DayMarketEntry[]>(() => {
    const initialRecords = [...FULL_DATASET_2026_COMBINED];
    initialRecords.sort((a, b) => b.date.localeCompare(a.date));
    return initialRecords;
  });
  const [isStorageLoaded, setIsStorageLoaded] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<string>('Initializing Core Systems...');
  const [loadingProgress, setLoadingProgress] = useState<number>(10);

  // Simulation selected pairs
  const [simSelectedPairs, setSimSelectedPairs] = useState<string[]>([]);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Safe Restore Point Modal state
  const [restorePointModalOpen, setRestorePointModalOpen] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Scroll to top when changing tab
  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load Initial Storage Data instantly on startup
  useEffect(() => {
    async function initStorage() {
      try {
        const storedPrefs = await loadPreferencesFromStorage();
        if (storedPrefs) {
          if (storedPrefs.defaultCurrency) setCurrency(storedPrefs.defaultCurrency);
          if (storedPrefs.displayMode) setDisplayMode(storedPrefs.displayMode);
        }

        const storedRecords = await loadDailyDataFromStorage();
        let loadedRecords: DayMarketEntry[] = [];
        if (storedRecords && storedRecords.length > 0) {
          const recordsByDate = new Map(storedRecords.map((record) => [record.date, record]));
          for (const demo of FULL_DATASET_2026_COMBINED) {
            const existing = recordsByDate.get(demo.date);
            if (existing) {
              // Ensure canonical actual draw values for historical dataset till today
              recordsByDate.set(demo.date, {
                ...existing,
                deshawar: demo.deshawar || existing.deshawar,
                faridabad: demo.faridabad || existing.faridabad,
                gali: demo.gali || existing.gali,
                ghaziabad: demo.ghaziabad || existing.ghaziabad,
                notes: demo.notes || existing.notes,
              });
            } else {
              recordsByDate.set(demo.date, demo);
            }
          }

          loadedRecords = Array.from(recordsByDate.values());
          loadedRecords.sort((a, b) => b.date.localeCompare(a.date));
        } else {
          const fullDataset = [...FULL_DATASET_2026_COMBINED];
          fullDataset.sort((a, b) => b.date.localeCompare(a.date));
          loadedRecords = fullDataset;
        }
        
        setRecords(loadedRecords);
        saveDailyDataToStorage(loadedRecords).catch((e) => console.warn('Save storage fallback:', e));

        // Ensure a Baseline Safe Restore Point exists non-blockingly
        const currentManifest = getRestorePointsManifest();
        if (currentManifest.length === 0 && loadedRecords.length > 0) {
          harvestSystemState({
            currentRecords: loadedRecords,
            currentCurrency: (storedPrefs?.defaultCurrency as Currency) || 'USD',
            currentDisplayMode: (storedPrefs?.displayMode as DisplayMode) || 'tiles',
            currentSelectedDate: getTodayDateISO(),
            currentActiveTab: 'daily-generator',
            customName: 'Factory Baseline State',
            customDescription: 'Initial safe restore point capturing default settings, parameters & historical dataset.',
            tag: 'BASELINE',
          }).then((baselinePoint) => {
            saveSafeRestorePoint(baselinePoint);
          }).catch((e) => console.warn('Baseline point creation fallback:', e));
        }
      } catch (err) {
        console.warn('Storage initialization error, using defaults:', err);
        setRecords(DEMO_DATASET_30_DAYS);
      } finally {
        setIsStorageLoaded(true);
      }
    }
    initStorage();
  }, []);

  // Sync Preferences to Storage
  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c);
    savePreferencesToStorage({
      defaultCurrency: c,
      displayMode,
      theme: 'dark',
      riskParameters: {
        totalPairsToStake: 4,
        stakePerPair: 10,
        payoutMultiplier: 90,
      },
    });
  };

  // Record Mutation Handlers
  const handleAddRecord = async (entry: Omit<DayMarketEntry, 'id' | 'createdAt'>) => {
    const newRecord: DayMarketEntry = {
      ...entry,
      id: `rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...records.filter((r) => r.date !== entry.date)];
    setRecords(updated);
    await saveDailyDataToStorage(updated);

    showToast(`Draw recorded for ${entry.date}`);
    scheduleBackgroundTask(() => {
      runMLAssessment(updated, newRecord).then(({ assessment }) => {
        const sweepLabel = assessment.cleanSweepStatus.replace(/_/g, ' ');
        showToast(`Performance Log updated & ML training assessed (${sweepLabel})`);
      }).catch((e) => {
        console.warn('ML assessment fallback:', e);
      });
    });
  };

  const handleUpdateRecord = async (entry: DayMarketEntry) => {
    const updated = records.map((r) => (r.id === entry.id ? entry : r));
    setRecords(updated);
    await saveDailyDataToStorage(updated);

    showToast(`Draw updated for ${entry.date}`);
    scheduleBackgroundTask(() => {
      runMLAssessment(updated, entry).then(({ assessment }) => {
        showToast(`Performance Log audited & ML weights calibrated (${assessment.drawAccuracyPct}% hit rate)`);
      }).catch((e) => {
        console.warn('ML assessment fallback:', e);
      });
    });
  };

  const handleDeleteRecord = async (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    await saveDailyDataToStorage(updated);
    showToast('Record deleted successfully');
  };

  const handleImportRecords = async (newRecords: DayMarketEntry[]) => {
    const dateMap = new Map<string, DayMarketEntry>();
    newRecords.forEach((r) => dateMap.set(r.date, r));
    records.forEach((r) => {
      if (!dateMap.has(r.date)) {
        dateMap.set(r.date, r);
      }
    });

    const merged = Array.from(dateMap.values());
    const pruned = filterLast3MonthsRecords(merged);
    pruned.sort((a, b) => b.date.localeCompare(a.date));
    setRecords(pruned);
    await saveDailyDataToStorage(pruned);

    if (pruned.length > 0) {
      scheduleBackgroundTask(() => {
        runMLAssessment(pruned, pruned[0]).catch((e) => {
          console.warn('Post-import ML assessment fallback:', e);
        });
      });
    }
    showToast(`Successfully imported ${newRecords.length} records • Performance Log & ML models synchronized`);
  };

  const handlePruneToLastThreeMonths = async () => {
    const originalCount = records.length;
    const pruned = filterLast3MonthsRecords(records);
    pruned.sort((a, b) => b.date.localeCompare(a.date));
    const deletedCount = originalCount - pruned.length;
    setRecords(pruned);
    await saveDailyDataToStorage(pruned);
    showToast(
      deletedCount > 0
        ? `Pruned dataset to last 3 months (${pruned.length} records kept, ${deletedCount} older records deleted)`
        : `Dataset is already within last 3 months limit (${pruned.length} records)`
    );
  };

  const handleClearAllRecords = async () => {
    setRecords([]);
    await saveDailyDataToStorage([]);
    showToast('All historical records cleared');
  };

  // Deterministic Pairs for currently selected date
  const generatedResult = useMemo(() => {
    return generatePairsForDate(selectedDate);
  }, [selectedDate]);

  // Handler to bridge Heatmap/Analyzer pairs directly to Simulator
  const handleSendSinglePairToSimulator = (pair: string) => {
    setSimSelectedPairs([pair]);
    handleTabChange('risk-simulator');
    showToast(`Transferred pair "${pair}" to Risk Simulator`);
  };

  const handleSendPairsListToSimulator = (pairs: string[]) => {
    setSimSelectedPairs(pairs);
    handleTabChange('risk-simulator');
    showToast(`Transferred ${pairs.length} pairs to Risk Simulator`);
  };

  if (!isStorageLoaded) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center font-sans px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Pattern Intelligence Platform
            </h1>
            <p className="text-xs text-slate-400">
              Initializing predictive neural pipelines & mathematical rashi matrix systems...
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span className="text-emerald-400 font-bold">Progress Rate</span>
              <span>{loadingProgress}%</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/60 p-[1px]">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-950 px-4 py-3 rounded-xl border border-slate-800/60 flex items-center gap-2 text-left">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0"></div>
            <span className="text-[11px] font-mono text-slate-300 truncate">
              {loadingStep}
            </span>
          </div>

          <p className="text-[10px] text-slate-500 select-none">
            Using safe sequential preloading & Platt scaling calibration logic
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg shadow-xl border border-emerald-400 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Navigation Bar & Currency Selector */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        currency={currency}
        setCurrency={handleCurrencyChange}
        recordsCount={records.length}
        records={records}
        onSendSinglePairToSimulator={handleSendSinglePairToSimulator}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onOpenRestorePointModal={() => setRestorePointModalOpen(true)}
      />

      {/* Safe Restore Point Modal */}
      <SafeRestorePointModal
        isOpen={restorePointModalOpen}
        onClose={() => setRestorePointModalOpen(false)}
        currentRecords={records}
        currentCurrency={currency}
        currentDisplayMode={displayMode}
        currentSelectedDate={selectedDate}
        currentActiveTab={activeTab}
        onStateRestored={({ records: r, currency: c, displayMode: d, selectedDate: s, activeTab: t }) => {
          setRecords(r);
          setCurrency(c);
          setDisplayMode(d);
          setSelectedDate(s);
          if (t) setActiveTab(t);
        }}
        onNotify={(msg) => showToast(msg)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-4">
        {/* Persistent Educational Safety Micro-Banner */}
        <SafetyBanner />

        {/* Primary Main Tab: SELF-SELECTING 36-NUMBER POOL */}
        {activeTab === 'main-engine' && (
          <Suspense fallback={sectionFallback}>
            <MainEngineSection
              records={records}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
              currency={currency}
            />
          </Suspense>
        )}

        {/* Primary Main Tab: MODEL F - Maximum Hit Rate Engine */}
        {activeTab === 'model-f' && (
          <Suspense fallback={sectionFallback}>
            <ModelFSection
              records={records}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
              currency={currency}
            />
          </Suspense>
        )}

        {/* Tab: Haruf Pyramid Engine */}
        {activeTab === 'haruf-pyramid' && (
          <Suspense fallback={sectionFallback}>
            <HarufPyramidSection
              records={records}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
              currency={currency}
            />
          </Suspense>
        )}

        {/* Tab 0: Pattern Engine Prediction Dashboard (Top 5 & Top 10 Predictions + Walk-Forward Backtesting) */}
        {activeTab === 'pattern-dashboard' && (
          <Suspense fallback={sectionFallback}>
            <PatternDashboardSection
              records={records}
              currency={currency}
              selectedDate={selectedDate}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
              onNavigateToTab={(tab: NavigationTab) => handleTabChange(tab)}
              onAddRecord={handleAddRecord}
              onUpdateRecord={handleUpdateRecord}
            />
          </Suspense>
        )}

        {/* Tab: Saved & Secured ML Rules Vault */}
        {activeTab === 'rules-vault' && (
          <Suspense fallback={sectionFallback}>
            <SavedRulesVaultSection records={records} />
          </Suspense>
        )}

        {/* Tab: Precision Intelligence Pipeline */}
        {activeTab === 'precision-intelligence' && (
          <Suspense fallback={sectionFallback}>
            <PrecisionIntelligencePipelineSection
              records={records}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}

        {/* Tab: Engine Performance & Synergy Lab */}
        {activeTab === 'engine-synergy-lab' && (
          <Suspense fallback={sectionFallback}>
            <EngineSynergyLab records={records} />
          </Suspense>
        )}

        {/* Tab: Quantitative Research & Prediction-Validation Suite */}
        {activeTab === 'quant-research' && (
          <Suspense fallback={sectionFallback}>
            <QuantitativeResearchSuite />
          </Suspense>
        )}

        {/* Tab 1: Date Pair Generator & Explorer */}
        {activeTab === 'generator' && (
          <div className="space-y-4">
            <DateGeneratorSection
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              generatedData={generatedResult}
            />

            <GeneratedPairsView
              generatedData={generatedResult}
              displayMode={displayMode}
              setDisplayMode={setDisplayMode}
              onSimulatePairs={(pairs) => {
                setSimSelectedPairs(pairs);
                handleTabChange('risk-simulator');
                showToast(`Transferred ${pairs.length} pairs to Risk Simulator`);
              }}
            />

            {/* Bento Bottom Quick Analysis Bar */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex flex-wrap gap-6 sm:gap-8 items-center">
                <div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">
                    Model Expectation
                  </div>
                  <div className="text-lg sm:text-xl font-mono font-bold text-amber-500">
                    -10.0% <span className="text-xs font-normal text-slate-400 font-sans">(House Margin)</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">
                    Generated Set P(4,2)
                  </div>
                  <div className="text-lg sm:text-xl font-mono text-slate-100 font-bold">
                    12 Pairs <span className="text-xs text-emerald-400 font-mono">(4 Active Digits)</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">
                    Sample Space (N=100)
                  </div>
                  <div className="text-lg sm:text-xl font-mono text-slate-100 font-bold">
                    12.0% <span className="text-xs text-slate-400 font-sans">Coverage</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">
                    Historical Dataset
                  </div>
                  <div className="text-lg sm:text-xl font-mono text-emerald-400 font-bold">
                    {records.length} Days Recorded
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTabChange('previous-date')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Multi-Day Repeat Analyzer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('mathematics')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold transition border border-slate-700 cursor-pointer"
                >
                  Mathematics Guide
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Belgium Square Matrix Method */}
        {activeTab === 'belgium-square-matrix' && (
          <Suspense fallback={sectionFallback}>
            <BelgiumSquareMatrixSection
              records={records}
              currency={currency}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}

        {/* Tab: G Square Method — Machine-Trainable Number Prediction Engine */}
        {activeTab === 'g-square-method' && (
          <Suspense fallback={sectionFallback}>
            <GSquareMethodSection
              records={records}
              currency={currency}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}

        {/* Tab: G Square Harmonics — Formal 6×4 Harmonic Grid & Walk-Forward Empirical Test */}
        {activeTab === 'g-square-harmonics' && (
          <Suspense fallback={sectionFallback}>
            <GSquareHarmonicsSection
              records={records}
              currency={currency}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}

        {/* Tab: Previous Day Repeated Digit Method (Separate Result Method) */}
        {activeTab === 'previous-day-repeated' && (
          <Suspense fallback={sectionFallback}>
            <PreviousDayRepeatedMethodSection
              records={records}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}

        {/* Tab: Sir Abhishek Theory (Method 3: Four-House Convergence & 15-Pair Vertical Expansion) */}
        {activeTab === 'sir-abhishek-theory' && (
          <Suspense fallback={sectionFallback}>
            <SirAbhishekTheorySection
              records={records}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}

        {/* Tab: Sir Theory Pattern Analysis Engine (562 Hits / 746 Draws Deep Assessment) */}
        {activeTab === 'sir-theory-pattern' && (
          <Suspense fallback={sectionFallback}>
            <SirTheoryPatternSection
              records={records}
              currency={currency}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}

        {/* Tab: Cross-Method Relation & Hot Numbers */}
        {activeTab === 'relation-hot-numbers' && (
          <Suspense fallback={sectionFallback}>
            <RelationHotNumbersSection
              records={records}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}

        {/* Tab: Actual Historical Results + Arithmetic Pattern Analysis Engine */}
        {activeTab === 'arithmetic-pattern-engine' && (
          <Suspense fallback={sectionFallback}>
            <ArithmeticPatternAnalysisSection
              records={records}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}

        {/* Tab: Rashi Intelligence Module */}
        {activeTab === 'rashi-intelligence' && (
          <Suspense fallback={sectionFallback}>
            <RashiIntelligenceModule records={records} />
          </Suspense>
        )}

        {/* Tab: Doubles Lab Module */}
        {activeTab === 'doubles-lab' && (
          <Suspense fallback={sectionFallback}>
            <DoublesLabModule records={records} />
          </Suspense>
        )}

        {/* Tab: Date Pair Intelligence Lab (+75% OOS Engine) */}
        {activeTab === 'date-intelligence' && (
          <Suspense fallback={sectionFallback}>
            <DateIntelligenceSection
              records={records}
              selectedDate={selectedDate}
              currency={currency}
              onSelectPairsForRisk={handleSendPairsListToSimulator}
              onNavigateTab={(tab) => handleTabChange(tab as NavigationTab)}
            />
          </Suspense>
        )}

        {/* Tab: Beta Testing - 7-Layer Empirical Validation Lab */}
        {activeTab === 'beta-testing' && (
          <Suspense fallback={sectionFallback}>
            <BetaTestingSection
              records={records}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}

        {/* Tab 2: 10x10 Heatmap Matrix & Walk-Forward Table */}
        {activeTab === 'heatmap' && (
          <HeatmapSection
            records={records}
            todayGeneratedPairs={generatedResult.pairs}
            onSendPairToSimulator={handleSendSinglePairToSimulator}
            onSendPairsToSimulator={handleSendPairsListToSimulator}
          />
        )}

        {/* Tab: Monthly 00-99 Coverage Ledger & Empirical Audit */}
        {activeTab === 'monthly-coverage' && (
          <Suspense fallback={sectionFallback}>
            <MonthlyNumberCoverageAnalysisModule
              records={records}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}

        {/* Tab 3: Previous-Date Repeat Analyzer */}
        {activeTab === 'previous-date' && (
          <PreviousDateAnalyzer
            onSendPairsToSimulator={handleSendPairsListToSimulator}
          />
        )}

        {/* Tab 4: Risk-Reward Simulator */}
        {activeTab === 'risk-simulator' && (
          <RiskSimulatorSection
            currency={currency}
            generatedPairs={generatedResult.pairs}
            initialSelectedPairs={simSelectedPairs.length > 0 ? simSelectedPairs : generatedResult.pairs.slice(0, 4)}
          />
        )}

        {/* Tab 5: Daily Data Entry */}
        {activeTab === 'daily-data' && (
          <Suspense fallback={sectionFallback}>
            <DailyDataSection
              records={records}
              onAddRecord={handleAddRecord}
              onUpdateRecord={handleUpdateRecord}
              onDeleteRecord={handleDeleteRecord}
              onClearAllRecords={handleClearAllRecords}
              onPruneToLastThreeMonths={handlePruneToLastThreeMonths}
              onNavigateToPerformanceLog={() => setActiveTab('engine-performance-log')}
            />
          </Suspense>
        )}

        {/* Tab 6: Scraper & Data Seeder */}
        {activeTab === 'scraper-import' && (
          <Suspense fallback={sectionFallback}>
            <ScraperImportSection
              records={records}
              onImportRecords={handleImportRecords}
              onClearAllRecords={handleClearAllRecords}
              onPruneToLastThreeMonths={handlePruneToLastThreeMonths}
              onOpenRestorePointModal={() => setRestorePointModalOpen(true)}
            />
          </Suspense>
        )}

        {/* Tab 7: Historical Archive */}
        {activeTab === 'history' && (
          <Suspense fallback={sectionFallback}>
            <HistorySection
              records={records}
              onDeleteRecord={handleDeleteRecord}
              onClearAll={handleClearAllRecords}
              onPruneToLastThreeMonths={handlePruneToLastThreeMonths}
            />
          </Suspense>
        )}

        {/* Tab 8: Educational Mathematics Reference */}
        {activeTab === 'mathematics' && (
          <Suspense fallback={sectionFallback}>
            <MathematicsSection />
          </Suspense>
        )}

        {/* Tab 9: Unit Tests Runner */}
        {activeTab === 'unit-tests' && (
          <Suspense fallback={sectionFallback}>
            <UnitTestsRunner />
          </Suspense>
        )}

        {/* Tab: Briquette & ML Rules Engine */}
        {activeTab === 'briquette-engine' && (
          <Suspense fallback={sectionFallback}>
            <BriquetteEngineSection
              records={records}
              currency={currency}
              onSendPairsToSimulator={handleSendPairsListToSimulator}
            />
          </Suspense>
        )}
      </main>

      {/* Bento Grid Footer */}
      <footer className="px-6 py-4 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-2">
        <div className="font-mono text-[10px]">
          &copy; 2026 DATE PAIR GENERATOR &bull; EDUCATIONAL PROBABILITY SIMULATOR
        </div>
        <div className="flex flex-wrap items-center gap-4 font-mono text-[10px]">
          <span className="text-slate-400">PAST FREQUENCY &ne; FUTURE PROBABILITY</span>
          <span className="text-emerald-400 font-bold">INDEPENDENT RANDOM TRIALS MODEL</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
