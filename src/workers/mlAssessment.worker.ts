import {
  evaluateDrawResultForMLAndPerformance,
  MLDrawTrainingAssessment,
} from '../utils/mlDrawPerformanceAssessmentEngine';
import { DayMarketEntry } from '../types';
import {
  ComprehensivePerformanceLogSummary,
  generateDailyPerformanceLog,
} from '../utils/enginePerformanceLogEngine';
import {
  ConsensusPoolAnalysisResult,
  runConsensusPoolAnalysis,
} from '../utils/consensusPoolEngine';

interface AssessmentRequest {
  jobId: string;
  type: 'assessment';
  records: DayMarketEntry[];
  targetRecord: DayMarketEntry;
}

interface PerformanceLogRequest {
  jobId: string;
  type: 'performance-log';
  records: DayMarketEntry[];
  maxDaysToEvaluate: number;
}

interface ConsensusPoolRequest {
  jobId: string;
  type: 'consensus-pool';
  records: DayMarketEntry[];
  selectedDate: string;
  backtestDays: number;
}

type WorkerRequest = AssessmentRequest | PerformanceLogRequest | ConsensusPoolRequest;

const consensusCache = new Map<string, ConsensusPoolAnalysisResult>();

function createConsensusCacheKey(records: DayMarketEntry[], selectedDate: string, backtestDays: number): string {
  const recordSignature = records
    .map((record) => [
      record.date,
      record.deshawar || '',
      record.faridabad || '',
      record.gali || '',
      record.ghaziabad || record.gzb || '',
    ].join(':'))
    .join('|');

  return `${selectedDate}:${backtestDays}:${recordSignature}`;
}

interface AssessmentResponse {
  jobId: string;
  type: 'assessment';
  ok: true;
  assessment: MLDrawTrainingAssessment;
  perfLog: ComprehensivePerformanceLogSummary;
}

interface PerformanceLogResponse {
  jobId: string;
  type: 'performance-log';
  ok: true;
  perfLog: ComprehensivePerformanceLogSummary;
}

interface ConsensusPoolResponse {
  jobId: string;
  type: 'consensus-pool';
  ok: true;
  result: ConsensusPoolAnalysisResult;
}

interface WorkerErrorResponse {
  jobId: string;
  ok: false;
  error: string;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { jobId } = event.data;

  try {
    if (event.data.type === 'performance-log') {
      const perfLog = generateDailyPerformanceLog(event.data.records, {
        maxDaysToEvaluate: event.data.maxDaysToEvaluate,
      });
      const response: PerformanceLogResponse = { jobId, type: 'performance-log', ok: true, perfLog };
      self.postMessage(response);
      return;
    }

    if (event.data.type === 'consensus-pool') {
      const cacheKey = createConsensusCacheKey(
        event.data.records,
        event.data.selectedDate,
        event.data.backtestDays
      );
      const cachedResult = consensusCache.get(cacheKey);
      if (cachedResult) {
        self.postMessage({ jobId, type: 'consensus-pool', ok: true, result: cachedResult });
        return;
      }

      const result = runConsensusPoolAnalysis(
        event.data.records,
        event.data.selectedDate,
        event.data.backtestDays
      );
      consensusCache.set(cacheKey, result);
      const response: ConsensusPoolResponse = { jobId, type: 'consensus-pool', ok: true, result };
      self.postMessage(response);
      return;
    }

    const { assessment, perfLog } = evaluateDrawResultForMLAndPerformance(
      event.data.records,
      event.data.targetRecord
    );
    const response: AssessmentResponse = { jobId, type: 'assessment', ok: true, assessment, perfLog };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerErrorResponse = {
      jobId,
      ok: false,
      error: error instanceof Error ? error.message : 'ML assessment failed',
    };
    self.postMessage(response);
  }
};
