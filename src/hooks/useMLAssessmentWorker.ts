import { useCallback, useEffect, useRef } from 'react';
import { DayMarketEntry } from '../types';
import {
  saveDrawAssessment,
  MLDrawTrainingAssessment,
} from '../utils/mlDrawPerformanceAssessmentEngine';
import {
  saveStoredPerformanceLog,
  ComprehensivePerformanceLogSummary,
} from '../utils/enginePerformanceLogEngine';
import type { ConsensusPoolAnalysisResult } from '../utils/consensusPoolEngine';

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

type WorkerResponse = AssessmentResponse | PerformanceLogResponse | ConsensusPoolResponse | WorkerErrorResponse;
type AssessmentResult = { type: 'assessment'; assessment: MLDrawTrainingAssessment; perfLog: ComprehensivePerformanceLogSummary };
type PerformanceLogResult = { type: 'performance-log'; perfLog: ComprehensivePerformanceLogSummary };
type ConsensusPoolResult = { type: 'consensus-pool'; result: ConsensusPoolAnalysisResult };
type WorkerResult = AssessmentResult | PerformanceLogResult | ConsensusPoolResult;
type PendingJob = {
  resolve: (result: WorkerResult) => void;
  reject: (error: Error) => void;
};

let sharedWorker: Worker | null = null;
const pendingJobs = new Map<string, PendingJob>();

function getSharedWorker(): Worker {
  if (sharedWorker) return sharedWorker;

  const worker = new Worker(
    new URL('../workers/mlAssessment.worker.ts', import.meta.url),
    { type: 'module' }
  );

  worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
    const pendingJob = pendingJobs.get(data.jobId);
    if (!pendingJob) return;

    pendingJobs.delete(data.jobId);
    if (data.ok === true && data.type === 'assessment') {
      saveDrawAssessment(data.assessment);
      saveStoredPerformanceLog(data.perfLog);
      window.dispatchEvent(
        new CustomEvent('ml_draw_result_evaluated', {
          detail: { assessment: data.assessment, perfLog: data.perfLog },
        })
      );
      pendingJob.resolve({ type: 'assessment', assessment: data.assessment, perfLog: data.perfLog });
    } else if (data.ok === true && data.type === 'performance-log') {
      pendingJob.resolve({ type: 'performance-log', perfLog: data.perfLog });
    } else if (data.ok === true) {
      pendingJob.resolve({ type: 'consensus-pool', result: data.result });
    } else {
      pendingJob.reject(new Error(data.error));
    }
  };

  worker.onerror = (event) => {
    const error = new Error(event.message || 'ML worker failed');
    for (const job of pendingJobs.values()) job.reject(error);
    pendingJobs.clear();
    sharedWorker = null;
  };

  sharedWorker = worker;
  return worker;
}

export function useMLAssessmentWorker() {
  const ownedJobIdsRef = useRef(new Set<string>());

  useEffect(() => {
    return () => {
      for (const jobId of ownedJobIdsRef.current) {
        const pendingJob = pendingJobs.get(jobId);
        pendingJobs.delete(jobId);
        pendingJob?.reject(new Error('ML worker request cancelled'));
      }
      ownedJobIdsRef.current.clear();
    };
  }, []);

  const submitJob = useCallback((request: object): Promise<WorkerResult> => {
    const worker = getSharedWorker();

    for (const jobId of ownedJobIdsRef.current) {
      const pendingJob = pendingJobs.get(jobId);
      pendingJobs.delete(jobId);
      pendingJob?.reject(new Error('ML worker request superseded'));
    }
    ownedJobIdsRef.current.clear();

    const jobId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      pendingJobs.set(jobId, {
        resolve: (result) => {
          ownedJobIdsRef.current.delete(jobId);
          resolve(result);
        },
        reject: (error) => {
          ownedJobIdsRef.current.delete(jobId);
          reject(error);
        },
      });
      ownedJobIdsRef.current.add(jobId);
      worker.postMessage({ ...request, jobId });
    });
  }, []);

  const assessML = useCallback((records: DayMarketEntry[], targetRecord: DayMarketEntry): Promise<AssessmentResult> => {
    return submitJob({ type: 'assessment', records, targetRecord }) as Promise<AssessmentResult>;
  }, [submitJob]);

  const generatePerformanceLog = useCallback((records: DayMarketEntry[], maxDaysToEvaluate: number): Promise<PerformanceLogResult> => {
    return submitJob({ type: 'performance-log', records, maxDaysToEvaluate }) as Promise<PerformanceLogResult>;
  }, [submitJob]);

  const runConsensusPool = useCallback((records: DayMarketEntry[], selectedDate: string, backtestDays: number): Promise<ConsensusPoolResult> => {
    return submitJob({ type: 'consensus-pool', records, selectedDate, backtestDays }) as Promise<ConsensusPoolResult>;
  }, [submitJob]);

  return { assessML, generatePerformanceLog, runConsensusPool };
}
