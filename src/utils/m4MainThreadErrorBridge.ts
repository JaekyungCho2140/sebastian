/**
 * M4 Main Thread Error Bridge
 * 
 * Main Thread에서 Worker Thread의 M4 에러를 받아 IPC를 통해 Main Process로 전달하는 브릿지
 * Worker Thread는 parentPort를 통해 에러를 전송하고, Main Thread가 IPC로 전달합니다.
 */

import { Worker } from 'worker_threads';
import { ipcMain, BrowserWindow } from 'electron';
import { 
  M4ErrorReportRequest,
  M4ErrorContext,
  IPC_CHANNELS,
  M4ErrorReportedEvent
} from '../shared/types';
import { 
  SerializableM4Error,
  isSerializableM4Error
} from '../types/m4ProcessingErrors';
import { 
  WorkerMessage,
  WorkerMessageType
} from '../types/workerTypes';
import { getM4ErrorReporter, reportM4Error } from '../main/ipc-handlers';

/**
 * Worker 에러 메시지 구조
 */
interface WorkerM4ErrorMessage {
  workerId: string;
  m4Error: SerializableM4Error;
  errorContext: M4ErrorContext;
  priority: string;
  m4ErrorReportId?: string | null;
}

/**
 * M4 Main Thread Error Bridge 클래스
 */
export class M4MainThreadErrorBridge {
  private static instance: M4MainThreadErrorBridge;
  private workers: Map<string, Worker>;
  private errorHandlers: Map<string, (error: WorkerM4ErrorMessage) => Promise<void>>;
  
  private constructor() {
    this.workers = new Map();
    this.errorHandlers = new Map();
  }
  
  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): M4MainThreadErrorBridge {
    if (!M4MainThreadErrorBridge.instance) {
      M4MainThreadErrorBridge.instance = new M4MainThreadErrorBridge();
    }
    return M4MainThreadErrorBridge.instance;
  }
  
  /**
   * Worker 등록 및 에러 핸들러 설정
   */
  public registerWorker(workerId: string, worker: Worker): void {
    this.workers.set(workerId, worker);
    
    // Worker 메시지 리스너 설정
    worker.on('message', async (message: WorkerMessage) => {
      if (message.type === WorkerMessageType.ERROR && message.data) {
        await this.handleWorkerError(message.data as WorkerM4ErrorMessage);
      }
    });
    
    // Worker 에러 리스너 설정
    worker.on('error', async (error) => {
      await this.handleWorkerCrash(workerId, error);
    });
  }
  
  /**
   * Worker 등록 해제
   */
  public unregisterWorker(workerId: string): void {
    this.workers.delete(workerId);
    this.errorHandlers.delete(workerId);
  }
  
  /**
   * Worker에서 전송된 M4 에러 처리
   */
  private async handleWorkerError(errorData: WorkerM4ErrorMessage): Promise<void> {
    try {
      const { workerId, m4Error, errorContext } = errorData;
      
      // SerializableM4Error 검증
      if (!isSerializableM4Error(m4Error)) {
        console.error('Invalid M4 error format from worker:', workerId);
        return;
      }
      
      // M4ErrorReportRequest 생성
      const errorRequest: M4ErrorReportRequest = {
        errorType: m4Error.errorType,
        severity: m4Error.severity,
        message: m4Error.message,
        stackTrace: m4Error.stackTrace,
        context: this.enrichErrorContext(errorContext, workerId),
        timestamp: m4Error.timestamp,
        correlationId: m4Error.correlationId,
        workerId: m4Error.workerId || workerId,
        taskId: m4Error.taskId,
        recoverable: m4Error.recoverable,
        retryable: m4Error.retryable,
        userMessage: m4Error.userMessage,
        technicalMessage: m4Error.technicalMessage,
        resolutionSteps: m4Error.resolutionSteps
      };
      
      // Main Process의 M4 에러 리포터로 전송
      const reportId = await reportM4Error(errorRequest);
      
      if (reportId) {
        console.log(`M4 error from worker ${workerId} reported: ${reportId}`);
        
        // 필요시 Worker에 리포트 ID 응답
        const worker = this.workers.get(workerId);
        if (worker) {
          worker.postMessage({
            type: 'M4_ERROR_REPORTED',
            data: { reportId, correlationId: m4Error.correlationId }
          });
        }
      }
    } catch (error) {
      console.error('Failed to handle worker M4 error:', error);
    }
  }
  
  /**
   * Worker 크래시 처리
   */
  private async handleWorkerCrash(workerId: string, error: Error): Promise<void> {
    try {
      // Worker 크래시를 M4 에러로 변환
      const errorRequest: M4ErrorReportRequest = {
        errorType: 'WORKER_THREAD',
        severity: 'critical',
        message: `Worker ${workerId} crashed: ${error.message}`,
        stackTrace: error.stack,
        context: {
          processType: 'dialogue', // 기본값, 실제로는 Worker 정보에서 가져와야 함
          stage: -1, // 알 수 없음
          threadId: workerId,
          isMainThread: false,
          customData: {
            crashType: 'worker-crash',
            errorName: error.name,
            timestamp: Date.now()
          }
        },
        timestamp: Date.now(),
        correlationId: `crash-${workerId}-${Date.now()}`,
        workerId,
        recoverable: false,
        retryable: true,
        userMessage: 'Background processing crashed. Please restart the operation.',
        technicalMessage: `Worker thread ${workerId} crashed unexpectedly`,
        resolutionSteps: [
          'Restart the M4 processing',
          'Check system memory availability',
          'Reduce the number of files being processed',
          'Contact support if the issue persists'
        ]
      };
      
      const reportId = await reportM4Error(errorRequest);
      console.error(`Worker crash reported: ${reportId}`);
    } catch (reportError) {
      console.error('Failed to report worker crash:', reportError);
    }
  }
  
  /**
   * 에러 컨텍스트 보강
   */
  private enrichErrorContext(
    context: M4ErrorContext,
    workerId: string
  ): M4ErrorContext {
    return {
      ...context,
      threadId: workerId,
      isMainThread: false,
      memoryUsage: context.memoryUsage || process.memoryUsage().heapUsed / 1024 / 1024,
      customData: {
        ...context.customData,
        bridgeProcessed: true,
        bridgeTimestamp: Date.now(),
        mainThreadMemory: process.memoryUsage().heapUsed / 1024 / 1024
      }
    };
  }
  
  /**
   * 모든 Worker에 에러 통계 요청
   */
  public async requestErrorStatsFromWorkers(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [workerId, worker] of this.workers) {
      try {
        const response = await this.sendWorkerRequest(worker, {
          type: 'GET_ERROR_STATS',
          workerId
        });
        
        if (response) {
          stats[workerId] = response;
        }
      } catch (error) {
        console.error(`Failed to get error stats from worker ${workerId}:`, error);
      }
    }
    
    return stats;
  }
  
  /**
   * Worker에 요청 전송 및 응답 대기
   */
  private sendWorkerRequest(worker: Worker, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker request timeout'));
      }, 5000);
      
      const handler = (message: any) => {
        if (message.type === `${request.type}_RESPONSE` && message.workerId === request.workerId) {
          clearTimeout(timeout);
          worker.off('message', handler);
          resolve(message.data);
        }
      };
      
      worker.on('message', handler);
      worker.postMessage(request);
    });
  }
}

/**
 * Main Thread에서 Worker 에러 브릿지 초기화
 */
export function initializeM4ErrorBridge(): M4MainThreadErrorBridge {
  return M4MainThreadErrorBridge.getInstance();
}

/**
 * Worker 등록 헬퍼 함수
 */
export function registerWorkerForErrorHandling(workerId: string, worker: Worker): void {
  const bridge = M4MainThreadErrorBridge.getInstance();
  bridge.registerWorker(workerId, worker);
}