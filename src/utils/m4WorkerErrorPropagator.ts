/**
 * M4 Worker Error Propagator
 * 
 * Worker Thread에서 Main Process로 M4 에러를 전파하는 유틸리티
 * IPC를 통해 구조화된 에러 정보를 전달합니다.
 */

import { 
  M4ErrorReportRequest,
  M4ErrorContext,
  IPC_CHANNELS
} from '../shared/types';
import { 
  SerializableM4Error,
  M4ProcessingError,
  M4ErrorType,
  M4ErrorSeverity
} from '../types/m4ProcessingErrors';
import { randomUUID } from 'crypto';

// Conditional import for electron
let ipcRenderer: any;
try {
  // Check if we're in a renderer process
  if (typeof process !== 'undefined' && process.type === 'renderer' && typeof require !== 'undefined') {
    const electron = require('electron');
    ipcRenderer = electron.ipcRenderer;
  }
} catch (e) {
  // Not in renderer process or electron not available
  ipcRenderer = null;
}

/**
 * Worker에서 Main Process로 M4 에러 전파
 */
export class M4WorkerErrorPropagator {
  private static instance: M4WorkerErrorPropagator;
  private correlationMap: Map<string, M4ErrorContext>;
  
  private constructor() {
    this.correlationMap = new Map();
  }
  
  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): M4WorkerErrorPropagator {
    if (!M4WorkerErrorPropagator.instance) {
      M4WorkerErrorPropagator.instance = new M4WorkerErrorPropagator();
    }
    return M4WorkerErrorPropagator.instance;
  }
  
  /**
   * Worker Thread에서 발생한 M4 에러를 Main Process로 전파
   */
  public async propagateM4ErrorFromWorker(
    error: M4ProcessingError | SerializableM4Error,
    workerId: string,
    taskId?: string
  ): Promise<string | null> {
    try {
      const correlationId = randomUUID();
      const timestamp = Date.now();
      
      // M4ErrorReportRequest 형식으로 변환
      const errorRequest: M4ErrorReportRequest = {
        errorType: error.errorType,
        severity: error.severity,
        message: error.message,
        stackTrace: error.stackTrace,
        context: this.buildM4ErrorContext(error, workerId),
        timestamp,
        correlationId,
        workerId,
        taskId,
        recoverable: error.recoverable,
        retryable: error.retryable,
        userMessage: error.userMessage,
        technicalMessage: error.technicalMessage,
        resolutionSteps: error.resolutionSteps
      };
      
      // 컨텍스트 저장
      this.correlationMap.set(correlationId, errorRequest.context);
      
      // Main Process로 에러 전송
      const reportId = await this.sendErrorToMainProcess(errorRequest);
      
      // 브레드크럼 추가
      this.addErrorBreadcrumb(error, correlationId, workerId);
      
      return reportId;
    } catch (propagationError) {
      console.error('Failed to propagate M4 error from worker:', propagationError);
      return null;
    }
  }
  
  /**
   * M4 에러 컨텍스트 빌드
   */
  private buildM4ErrorContext(
    error: M4ProcessingError | SerializableM4Error,
    workerId: string
  ): M4ErrorContext {
    const baseContext: M4ErrorContext = {
      processType: error.context.processType || 'dialogue',
      stage: typeof error.context.stage === 'number' ? error.context.stage : 0,
      fileName: error.context.fileName,
      filePath: error.context.filePath,
      processedFiles: error.context.processedFiles,
      totalFiles: error.context.totalFiles,
      memoryUsage: error.context.memoryUsage || process.memoryUsage().heapUsed / 1024 / 1024,
      sheetName: error.context.sheetName,
      rowNumber: error.context.rowNumber,
      columnNumber: error.context.columnNumber,
      fieldValue: error.context.fieldValue,
      dataType: error.context.dataType,
      validationRule: (error.context as any).validationRule,
      operation: (error.context as any).operation,
      fileSize: (error.context as any).fileSize,
      permissions: (error.context as any).permissions,
      encoding: (error.context as any).encoding,
      threadId: workerId,
      isMainThread: false,
      parentPort: true,
      taskQueue: (error.context as any).taskQueue,
      customData: {
        ...error.context.customData,
        workerError: true,
        propagatedAt: Date.now()
      }
    };
    
    return baseContext;
  }
  
  /**
   * Main Process로 에러 전송
   */
  private async sendErrorToMainProcess(
    errorRequest: M4ErrorReportRequest
  ): Promise<string | null> {
    try {
      // Main Process의 M4 에러 리포터로 전송
      if (typeof process !== 'undefined' && process.type === 'renderer' && (global as any).electronAPI) {
        return await (global as any).electronAPI.reportM4Error(errorRequest);
      } else if (ipcRenderer) {
        return await ipcRenderer.invoke(IPC_CHANNELS.REPORT_M4_ERROR, errorRequest);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to send M4 error to main process:', error);
      return null;
    }
  }
  
  /**
   * 에러 브레드크럼 추가
   */
  private addErrorBreadcrumb(
    error: M4ProcessingError | SerializableM4Error,
    correlationId: string,
    workerId: string
  ): void {
    const breadcrumb = {
      category: 'm4-worker-error',
      message: `M4 error propagated from worker: ${error.message}`,
      level: this.getSeverityLevel(error.severity),
      data: {
        correlationId,
        workerId,
        errorType: error.errorType,
        severity: error.severity,
        timestamp: Date.now()
      }
    };
    
    console.debug('M4 error breadcrumb:', breadcrumb);
  }
  
  /**
   * 심각도를 로그 레벨로 변환
   */
  private getSeverityLevel(severity: M4ErrorSeverity): 'debug' | 'info' | 'warning' | 'error' {
    switch (severity) {
      case M4ErrorSeverity.LOW:
        return 'debug';
      case M4ErrorSeverity.MEDIUM:
        return 'info';
      case M4ErrorSeverity.HIGH:
        return 'warning';
      case M4ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }
  
  /**
   * 에러 컨텍스트 업데이트
   */
  public async updateErrorContext(
    correlationId: string,
    contextUpdate: Partial<M4ErrorContext>
  ): Promise<void> {
    try {
      const existingContext = this.correlationMap.get(correlationId);
      if (existingContext) {
        const updatedContext = { ...existingContext, ...contextUpdate };
        this.correlationMap.set(correlationId, updatedContext);
        
        // Main Process로 컨텍스트 업데이트 전송
        if (typeof process !== 'undefined' && process.type === 'renderer' && (global as any).electronAPI) {
          await (global as any).electronAPI.updateM4ErrorContext(correlationId, contextUpdate);
        } else if (ipcRenderer) {
          await ipcRenderer.invoke(IPC_CHANNELS.M4_ERROR_CONTEXT_UPDATE, {
            correlationId,
            context: contextUpdate,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Failed to update M4 error context:', error);
    }
  }
  
  /**
   * 저장된 컨텍스트 정리
   */
  public clearOldContexts(maxAge: number = 3600000): void { // 1시간
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.correlationMap.forEach((context, correlationId) => {
      const contextAge = now - (context.customData?.propagatedAt || now);
      if (contextAge > maxAge) {
        keysToDelete.push(correlationId);
      }
    });
    
    keysToDelete.forEach(key => this.correlationMap.delete(key));
  }
}

/**
 * Worker Thread에서 사용할 수 있는 전역 에러 전파 함수
 */
export async function propagateM4ErrorFromWorker(
  error: M4ProcessingError | SerializableM4Error | Error,
  workerId: string,
  taskId?: string,
  context?: Partial<M4ErrorContext>
): Promise<string | null> {
  const propagator = M4WorkerErrorPropagator.getInstance();
  
  // 일반 Error를 SerializableM4Error로 변환
  if (!(error instanceof M4ProcessingError) && !('errorType' in error)) {
    const serializedError: SerializableM4Error = {
      errorId: randomUUID(),
      errorType: M4ErrorType.WORKER_THREAD,
      severity: M4ErrorSeverity.HIGH,
      message: error.message,
      stackTrace: error.stack,
      context: {
        ...context,
        workerId,
        taskId,
        stage: context?.stage || 0
      } as any,
      timestamp: Date.now(),
      correlationId: randomUUID(),
      workerId,
      taskId,
      recoverable: true,
      retryable: true,
      userMessage: 'Worker 처리 중 오류가 발생했습니다',
      technicalMessage: error.message,
      resolutionSteps: ['Check error logs', 'Verify input data', 'Restart the worker'],
      serializedAt: Date.now()
    };
    
    return propagator.propagateM4ErrorFromWorker(serializedError, workerId, taskId);
  }
  
  return propagator.propagateM4ErrorFromWorker(error as M4ProcessingError | SerializableM4Error, workerId, taskId);
}