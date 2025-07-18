/**
 * M4 Processing Worker Thread
 * 
 * This is the main worker thread entry point for M4 Excel processing.
 * It handles CPU-intensive Excel operations in a separate thread to maintain UI responsiveness.
 */

import { parentPort, workerData } from 'worker_threads';
import { EventEmitter } from 'events';
import * as os from 'os';
import {
  WorkerMessage,
  WorkerMessageType,
  MessagePriority,
  WorkerState,
  WorkerError,
  WorkerErrorType,
  WorkerErrorSeverity,
  WorkerConfig,
  WorkerPerformanceMetrics,
  createWorkerMessage,
  createWorkerError,
  createEmptyPerformanceMetrics,
  getDefaultMessagePriority,
  isWorkerMessage
} from '../types/workerTypes';
import {
  M4ProcessConfig,
  M4ProcessProgress,
  M4ProcessResult,
  ProcessStep,
  ProcessType,
  createM4ProcessProgress,
  createM4ProcessLog,
  createEmptyM4ProcessStatistics
} from '../types/m4Processing';
import { ExcelProcessor } from '../utils/excelProcessor';
import M4DialogueProcessor from '../services/m4DialogueProcessor';
import { M4StringProcessor } from '../services/m4StringProcessor';
import { M4ProcessorFactory } from '../services/m4/processors/processorFactory';
import { 
  M4ProcessingError, 
  M4ErrorType, 
  M4ErrorSeverity, 
  M4ProcessingErrorContext,
  M4ErrorFactory,
  M4ErrorContextPropagator
} from '../types/m4ProcessingErrors';
import { M4ErrorContext, M4ProcessStep } from '../shared/types';
import { 
  errorSerializer, 
  errorPropagator, 
  errorContextBuilder,
  ErrorPropagationChannel 
} from '../utils/m4ErrorSerializer';

// ============================================================================
// Worker State Management
// ============================================================================

/**
 * M4 처리 Worker 클래스
 */
class M4ProcessWorker extends EventEmitter {
  private workerId: string;
  private state: WorkerState;
  private config: WorkerConfig;
  private processingConfig: M4ProcessConfig | null;
  private currentTaskId: string | null;
  private excelProcessor: ExcelProcessor;
  private performanceMetrics: WorkerPerformanceMetrics;
  private startTime: number;
  private lastActivity: number;
  private isShuttingDown: boolean;
  private processingAborted: boolean;
  private performanceTimer: NodeJS.Timeout | null;

  constructor(workerId: string) {
    super();
    
    this.workerId = workerId;
    this.state = WorkerState.IDLE;
    this.config = {} as WorkerConfig;
    this.processingConfig = null;
    this.currentTaskId = null;
    this.excelProcessor = new ExcelProcessor(this.log.bind(this));
    this.performanceMetrics = createEmptyPerformanceMetrics();
    this.startTime = Date.now();
    this.lastActivity = Date.now();
    this.isShuttingDown = false;
    this.processingAborted = false;
    this.performanceTimer = null;
    
    this.setupEventHandlers();
    this.startPerformanceMonitoring();
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    // 메시지 수신 처리
    if (parentPort) {
      parentPort.on('message', this.handleMessage.bind(this));
      parentPort.on('error', this.handleParentError.bind(this));
    }

    // 프로세스 종료 처리
    process.on('SIGINT', this.handleShutdown.bind(this));
    process.on('SIGTERM', this.handleShutdown.bind(this));
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
  }

  /**
   * 성능 모니터링 시작
   */
  private startPerformanceMonitoring(): void {
    this.performanceTimer = setInterval(() => {
      this.updatePerformanceMetrics();
    }, 5000); // 5초마다 업데이트
  }

  /**
   * 성능 메트릭 업데이트
   */
  private updatePerformanceMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.performanceMetrics.memoryUsage = memoryUsage.heapUsed / (1024 * 1024); // MB
    this.performanceMetrics.uptime = Date.now() - this.startTime;
    
    // CPU 사용률 계산 (간단한 추정)
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) / (this.performanceMetrics.uptime / 1000) * 100;
    this.performanceMetrics.cpuUsage = Math.min(100, Math.max(0, cpuPercent));
    
    this.lastActivity = Date.now();
  }

  /**
   * 메시지 처리
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      if (!isWorkerMessage(message)) {
        throw new Error('Invalid message format');
      }

      this.log(`Received message: ${message.type}`, 'debug');
      
      switch (message.type) {
        case WorkerMessageType.INITIALIZE:
          await this.handleInitialize(message);
          break;
          
        case WorkerMessageType.START_PROCESSING:
          await this.handleStartProcessing(message);
          break;
          
        case WorkerMessageType.PAUSE_PROCESSING:
          await this.handlePauseProcessing(message);
          break;
          
        case WorkerMessageType.RESUME_PROCESSING:
          await this.handleResumeProcessing(message);
          break;
          
        case WorkerMessageType.CANCEL_PROCESSING:
          await this.handleCancelProcessing(message);
          break;
          
        case WorkerMessageType.STATUS_REQUEST:
          await this.handleStatusRequest(message);
          break;
          
        case WorkerMessageType.HEALTH_CHECK:
          await this.handleHealthCheck(message);
          break;
          
        case WorkerMessageType.TERMINATE:
          await this.handleTerminate(message);
          break;
          
        default:
          this.log(`Unknown message type: ${message.type}`, 'warn');
      }
    } catch (error) {
      this.handleError(error as Error, message);
    }
  }

  /**
   * 초기화 처리
   */
  private async handleInitialize(message: WorkerMessage): Promise<void> {
    try {
      this.config = message.data.config;
      this.processingConfig = message.data.processingConfig;
      this.state = WorkerState.IDLE;
      
      this.log(`Worker initialized with config: ${JSON.stringify(this.config)}`, 'info');
      
      this.sendMessage(createWorkerMessage(
        WorkerMessageType.INITIALIZED,
        { workerId: this.workerId, state: this.state },
        undefined,
        message.messageId
      ));
    } catch (error) {
      this.handleError(error as Error, message);
    }
  }

  /**
   * 처리 시작 처리
   */
  private async handleStartProcessing(message: WorkerMessage): Promise<void> {
    try {
      if (this.state !== WorkerState.IDLE) {
        throw new Error(`Worker is not idle. Current state: ${this.state}`);
      }

      this.currentTaskId = message.data.taskId;
      this.processingConfig = message.data.config;
      this.state = WorkerState.BUSY;
      this.processingAborted = false;
      
      this.log(`Starting processing for task: ${this.currentTaskId}`, 'info');
      
      // 처리 시작
      const result = await this.processM4Data(this.processingConfig!);
      
      if (!this.processingAborted) {
        this.state = WorkerState.IDLE;
        this.currentTaskId = null;
        
        this.sendMessage(createWorkerMessage(
          WorkerMessageType.PROCESSING_COMPLETE,
          { 
            taskId: message.data.taskId,
            result 
          },
          undefined,
          message.messageId
        ));
      }
    } catch (error) {
      this.handleError(error as Error, message);
    }
  }

  /**
   * 처리 일시정지 처리
   */
  private async handlePauseProcessing(message: WorkerMessage): Promise<void> {
    this.log(`Pause processing requested for task: ${this.currentTaskId}`, 'info');
    // 일시정지 로직 구현 (향후 확장)
  }

  /**
   * 처리 재개 처리
   */
  private async handleResumeProcessing(message: WorkerMessage): Promise<void> {
    this.log(`Resume processing requested for task: ${this.currentTaskId}`, 'info');
    // 재개 로직 구현 (향후 확장)
  }

  /**
   * 처리 취소 처리
   */
  private async handleCancelProcessing(message: WorkerMessage): Promise<void> {
    this.log(`Cancel processing requested for task: ${this.currentTaskId}`, 'info');
    
    this.processingAborted = true;
    this.state = WorkerState.IDLE;
    this.currentTaskId = null;
    
    this.sendMessage(createWorkerMessage(
      WorkerMessageType.PROCESSING_COMPLETE,
      { 
        taskId: message.data.taskId,
        result: {
          success: false,
          outputPath: '',
          error: 'Processing cancelled by user',
          processedFileCount: 0,
          elapsedTime: 0,
          statistics: createEmptyM4ProcessStatistics(),
          logs: [createM4ProcessLog('info', 'Processing cancelled')],
          generatedFiles: []
        }
      },
      undefined,
      message.messageId
    ));
  }

  /**
   * 상태 요청 처리
   */
  private async handleStatusRequest(message: WorkerMessage): Promise<void> {
    this.sendMessage(createWorkerMessage(
      WorkerMessageType.STATUS_RESPONSE,
      {
        workerId: this.workerId,
        state: this.state,
        currentTask: this.currentTaskId,
        memoryUsage: this.performanceMetrics.memoryUsage,
        cpuUsage: this.performanceMetrics.cpuUsage,
        uptime: this.performanceMetrics.uptime
      },
      undefined,
      message.messageId
    ));
  }

  /**
   * 헬스체크 처리
   */
  private async handleHealthCheck(message: WorkerMessage): Promise<void> {
    const isHealthy = this.state !== WorkerState.ERROR && 
                     this.performanceMetrics.memoryUsage < this.config.maxMemoryUsage &&
                     !this.isShuttingDown;
    
    this.sendMessage(createWorkerMessage(
      WorkerMessageType.HEALTH_RESPONSE,
      {
        workerId: this.workerId,
        isHealthy,
        performanceMetrics: this.performanceMetrics
      },
      undefined,
      message.messageId
    ));
  }

  /**
   * 종료 처리
   */
  private async handleTerminate(message: WorkerMessage): Promise<void> {
    this.log(`Terminate requested for worker: ${this.workerId}`, 'info');
    
    await this.gracefulShutdown(message.messageId);
  }

  /**
   * 안전한 종료 처리
   */
  private async gracefulShutdown(messageId?: string): Promise<void> {
    this.isShuttingDown = true;
    this.processingAborted = true;
    
    // 리소스 정리
    try {
      // 성능 모니터링 타이머 정리
      if (this.performanceTimer) {
        clearInterval(this.performanceTimer);
        this.performanceTimer = null;
      }
      
      // Excel 프로세서 정리
      this.excelProcessor.dispose();
      
      this.log('Resources cleaned up successfully', 'info');
    } catch (error) {
      // dispose 에러는 로깅만 하고 계속 진행
      this.log(`Error during cleanup: ${error instanceof Error ? error.message : String(error)}`, 'warn');
    }
    
    // 종료 메시지 전송
    if (messageId) {
      this.sendMessage(createWorkerMessage(
        WorkerMessageType.TERMINATED,
        { workerId: this.workerId },
        undefined,
        messageId
      ));
    }
    
    // 약간의 지연 후 프로세스 종료
    setTimeout(() => {
      process.exit(0);
    }, 100);
  }

  /**
   * M4 데이터 처리
   */
  private async processM4Data(config: M4ProcessConfig): Promise<M4ProcessResult> {
    const startTime = Date.now();
    let processedFileCount = 0;
    const logs: any[] = [];
    const generatedFiles: string[] = [];
    
    try {
      // 진행률 업데이트: 초기화
      this.sendProgressUpdate(
        createM4ProcessProgress(0, ProcessStep.INITIALIZING, 'Initializing...', 0, config.requiredFiles.length)
      );
      
      // 입력 파일 검증
      this.sendProgressUpdate(
        createM4ProcessProgress(10, ProcessStep.READING_FILES, 'Validating input files...', 0, config.requiredFiles.length)
      );
      
      // 처리 유형에 따른 로직 분기
      if (config.type === ProcessType.DIALOGUE) {
        return await this.processDialogueFiles(config, startTime);
      } else if (config.type === ProcessType.STRING) {
        return await this.processStringFiles(config, startTime);
      } else {
        throw new Error(`Unsupported process type: ${config.type}`);
      }
      
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      
      return {
        success: false,
        outputPath: '',
        error: (error as Error).message,
        processedFileCount,
        elapsedTime,
        statistics: createEmptyM4ProcessStatistics(),
        logs: [
          ...logs,
          createM4ProcessLog('error', `Processing failed: ${(error as Error).message}`)
        ],
        generatedFiles
      };
    }
  }

  /**
   * Dialogue 파일 처리
   */
  private async processDialogueFiles(config: M4ProcessConfig, startTime: number): Promise<M4ProcessResult> {
    const logs: any[] = [];
    let processedFileCount = 0;
    
    try {
      this.sendProgressUpdate(
        createM4ProcessProgress(30, ProcessStep.PROCESSING_DATA, 'Processing dialogue files...', 0, config.requiredFiles.length)
      );
      
      // 입력 파일 경로 구성
      const inputPath = `${config.inputFolder}/M4_Dialogue.xlsx`;
      const outputPath = `${config.outputFolder}/M4_Dialogue_output.xlsx`;
      
      // 스트리밍 모드 사용 (Factory 패턴)
      const processor = M4ProcessorFactory.createDialogueProcessor({
        useStreaming: true, // 항상 스트리밍 모드 사용
        onProgress: (info) => {
          // 중단 신호 확인
          if (this.processingAborted || this.isShuttingDown) {
            throw new Error('Processing aborted');
          }
          
          // 30%부터 90%까지 dialogue 처리 진행률 적용
          const adjustedProgress = 30 + (info.percentage * 0.6);
          this.sendProgressUpdate(
            createM4ProcessProgress(
              adjustedProgress,
              ProcessStep.PROCESSING_DATA,
              info.currentStep || 'Processing...',
              info.current || 0,
              info.total || config.requiredFiles.length
            )
          );
          
          // 로그 추가
          logs.push(createM4ProcessLog('info', info.currentStep || 'Processing'));
          this.log(`${info.currentStep}: ${info.percentage}%`, 'info');
        }
      });
      
      // 스트리밍 처리 실행
      const result = await processor.process(inputPath, outputPath);
      
      if (!result.success) {
        throw new Error(`Dialogue processing failed: ${result.error || 'Unknown error'}`);
      }
      
      processedFileCount = result.rowsProcessed || 0;
      
      this.sendProgressUpdate(
        createM4ProcessProgress(90, ProcessStep.WRITING_OUTPUT, 'Dialogue processing completed', processedFileCount, config.requiredFiles.length)
      );
      
      this.sendProgressUpdate(
        createM4ProcessProgress(100, ProcessStep.COMPLETED, 'Processing completed', processedFileCount, config.requiredFiles.length)
      );
      
      const elapsedTime = Date.now() - startTime;
      
      // 메모리 사용량 로그
      const memoryUsed = result.memoryUsed || 0;
      this.log(`Memory used: ${(memoryUsed / 1024 / 1024).toFixed(2)} MB`, 'info');
      logs.push(createM4ProcessLog('info', `Streaming mode used. Memory efficiency: ${(memoryUsed / 1024 / 1024).toFixed(2)} MB`));
      
      return {
        success: true,
        outputPath: result.outputPath,
        processedFileCount,
        elapsedTime,
        statistics: {
          ...createEmptyM4ProcessStatistics(),
          totalRowsProcessed: processedFileCount,
          totalColumnsProcessed: 23,
          validatedRowsCount: processedFileCount
        },
        logs,
        generatedFiles: [result.outputPath]
      };
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * String 파일 처리
   */
  private async processStringFiles(config: M4ProcessConfig, startTime: number): Promise<M4ProcessResult> {
    const logs: any[] = [];
    let processedFileCount = 0;
    
    try {
      this.sendProgressUpdate(
        createM4ProcessProgress(30, ProcessStep.PROCESSING_DATA, 'Processing string files...', 0, config.requiredFiles.length)
      );
      
      // 출력 파일 경로 구성
      const outputPath = `${config.outputFolder}/M4_String_output.xlsx`;
      
      // 스트리밍 모드 사용 (Factory 패턴)
      const processor = M4ProcessorFactory.createStringProcessor({
        useStreaming: true, // 항상 스트리밍 모드 사용
        onProgress: (info) => {
          // 중단 신호 확인
          if (this.processingAborted || this.isShuttingDown) {
            throw new Error('Processing aborted');
          }
          
          // 30%부터 90%까지 string 처리 진행률 적용
          const adjustedProgress = 30 + (info.percentage * 0.6);
          this.sendProgressUpdate(
            createM4ProcessProgress(
              adjustedProgress,
              ProcessStep.PROCESSING_DATA,
              info.currentStep || 'Processing...',
              info.current || 0,
              info.total || config.requiredFiles.length
            )
          );
          
          // 로그 추가
          logs.push(createM4ProcessLog('info', info.currentStep || 'Processing'));
          this.log(`${info.currentFile}: ${info.percentage}%`, 'info');
          
          // 메모리 사용량 로그 (옵션)
          if (info.memoryUsage) {
            this.log(`Memory usage: ${(info.memoryUsage / 1024 / 1024).toFixed(2)} MB`, 'debug');
          }
        }
      });
      
      // 스트리밍 처리 실행
      const result = await processor.process(config.inputFolder, outputPath);
      
      if (!result.success) {
        throw new Error(`String processing failed: ${result.error || 'Unknown error'}`);
      }
      
      processedFileCount = result.rowsProcessed || 0;
      const filesProcessed = result.filesProcessed || 8;
      
      this.sendProgressUpdate(
        createM4ProcessProgress(90, ProcessStep.WRITING_OUTPUT, 'String processing completed', processedFileCount, config.requiredFiles.length)
      );
      
      this.sendProgressUpdate(
        createM4ProcessProgress(100, ProcessStep.COMPLETED, 'Processing completed', processedFileCount, config.requiredFiles.length)
      );
      
      const elapsedTime = Date.now() - startTime;
      
      // 메모리 사용량 로그
      const memoryUsed = result.memoryUsed || 0;
      this.log(`Memory used: ${(memoryUsed / 1024 / 1024).toFixed(2)} MB`, 'info');
      logs.push(createM4ProcessLog('info', `Streaming mode used. Memory efficiency: ${(memoryUsed / 1024 / 1024).toFixed(2)} MB`));
      logs.push(createM4ProcessLog('info', `Processed ${filesProcessed} files with ${processedFileCount} total rows`));
      
      return {
        success: true,
        outputPath: result.outputPath,
        processedFileCount: filesProcessed,
        elapsedTime,
        statistics: {
          ...createEmptyM4ProcessStatistics(),
          totalRowsProcessed: processedFileCount,
          totalColumnsProcessed: 15,
          validatedRowsCount: processedFileCount
        },
        logs,
        generatedFiles: [result.outputPath]
      };
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * 처리 시뮬레이션 (비동기 지연)
   */
  private async simulateProcessing(duration: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, duration);
    });
  }

  /**
   * 진행률 업데이트 전송 (배치 처리 최적화)
   */
  private sendProgressUpdate(progress: M4ProcessProgress): void {
    if (this.currentTaskId && !this.processingAborted) {
      this.sendMessage(createWorkerMessage(
        WorkerMessageType.PROGRESS_UPDATE,
        {
          taskId: this.currentTaskId,
          progress
        },
        undefined,
        undefined,
        MessagePriority.BATCH  // 배치 처리를 위한 우선순위 설정
      ));
    }
  }

  /**
   * 메시지 전송 (우선순위 기반)
   */
  private sendMessage(message: WorkerMessage): void {
    if (parentPort && !this.isShuttingDown) {
      // 메시지 우선순위가 설정되지 않은 경우 기본값 사용
      if (!message.priority) {
        message.priority = getDefaultMessagePriority(message.type);
      }
      
      parentPort.postMessage(message);
    }
  }

  /**
   * 에러 처리 (M4 특화 에러 컨텍스트 전파)
   */
  private handleError(error: Error, originalMessage?: WorkerMessage): void {
    this.log(`Error in worker: ${error.message}`, 'error');
    
    this.state = WorkerState.ERROR;
    this.performanceMetrics.errorCount++;
    
    try {
      // M4 특화 에러 컨텍스트 생성
      const processingErrorContext = errorContextBuilder.create()
        .withWorker(this.workerId, this.currentTaskId || undefined)
        .withStage(this.getCurrentProcessingStage())
        .withProcessType(this.getCurrentProcessType())
        .withMemoryUsage(process.memoryUsage().heapUsed / 1024 / 1024)
        .withCustomData({
          performanceMetrics: this.performanceMetrics,
          originalMessage: originalMessage?.type,
          state: this.state
        })
        .build();
      
      // M4ProcessingError로 변환 또는 생성
      let m4Error: M4ProcessingError;
      if (error instanceof M4ProcessingError) {
        m4Error = error;
      } else {
        m4Error = this.createM4ErrorFromProcessingContext(error, processingErrorContext);
      }
      
      // 에러 컨텍스트 전파
      const propagator = M4ErrorContextPropagator.getInstance();
      propagator.propagateError(m4Error);
      
      // 에러 직렬화 및 전송
      const serializedError = errorSerializer.serialize(m4Error);
      
      // Worker 메시지로 에러 전송 (Main Thread가 IPC로 전파)
      this.sendMessage(createWorkerMessage(
        WorkerMessageType.ERROR,
        { 
          workerId: this.workerId,
          m4Error: serializedError,
          errorContext: processingErrorContext,
          priority: MessagePriority.URGENT  // 에러 메시지는 최고 우선순위
        },
        undefined,
        originalMessage?.messageId,
        MessagePriority.URGENT  // 에러 메시지는 최고 우선순위
      ));
      
      // 에러 통계 업데이트
      this.updateErrorStatistics(m4Error);
      
    } catch (serializationError) {
      // 직렬화 실패 시 기본 에러 처리
      this.handleSerializationError(error, serializationError as Error, originalMessage);
    }
  }
  
  /**
   * ProcessingErrorContext로부터 M4ProcessingError 생성
   */
  private createM4ErrorFromProcessingContext(error: Error, context: M4ProcessingErrorContext): M4ProcessingError {
    const errorMessage = error.message.toLowerCase();
    
    // 에러 유형 추론
    if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
      return M4ErrorFactory.createMemoryPressureError(
        process.memoryUsage().heapUsed / 1024 / 1024,
        context
      );
    }
    
    if (errorMessage.includes('file') || errorMessage.includes('enoent')) {
      return M4ErrorFactory.createFileNotFoundError(
        context.fileName || 'unknown',
        context
      );
    }
    
    if (errorMessage.includes('worker') || errorMessage.includes('thread')) {
      return M4ErrorFactory.createWorkerThreadError(error, context);
    }
    
    // 기본 M4ProcessingError 생성
    return new M4ProcessingError(
      error.message,
      M4ErrorType.WORKER_THREAD,
      context,
      {
        cause: error,
        severity: M4ErrorSeverity.HIGH,
        recoverable: true,
        retryable: true,
        technicalMessage: error.message,
        userMessage: '백그라운드 처리 중 오류가 발생했습니다'
      }
    );
  }
  
  /**
   * 현재 처리 단계 반환
   */
  private getCurrentProcessingStage(): ProcessStep {
    if (this.currentTaskId) {
      // 현재 작업 ID를 기반으로 단계 추론
      if (this.currentTaskId.includes('dialogue')) {
        return ProcessStep.DIALOGUE_PROCESSING;
      } else if (this.currentTaskId.includes('string')) {
        return ProcessStep.STRING_PROCESSING;
      }
    }
    return ProcessStep.PROCESSING;
  }
  
  /**
   * 현재 처리 유형 반환
   */
  private getCurrentProcessType(): ProcessType {
    if (this.currentTaskId) {
      if (this.currentTaskId.includes('dialogue')) {
        return ProcessType.DIALOGUE;
      } else if (this.currentTaskId.includes('string')) {
        return ProcessType.STRING;
      }
    }
    return ProcessType.DIALOGUE;
  }
  
  /**
   * 에러 통계 업데이트
   */
  private updateErrorStatistics(error: M4ProcessingError): void {
    // 에러 통계를 성능 메트릭스에 추가
    if (!this.performanceMetrics.customMetrics) {
      this.performanceMetrics.customMetrics = {};
    }
    
    const errorStats = this.performanceMetrics.customMetrics.errorStats || {
      totalErrors: 0,
      errorsByType: {},
      errorsBySeverity: {}
    };
    
    errorStats.totalErrors++;
    errorStats.errorsByType[error.errorType] = (errorStats.errorsByType[error.errorType] || 0) + 1;
    errorStats.errorsBySeverity[error.severity] = (errorStats.errorsBySeverity[error.severity] || 0) + 1;
    
    this.performanceMetrics.customMetrics.errorStats = errorStats;
  }
  
  /**
   * 직렬화 오류 처리
   */
  private handleSerializationError(
    originalError: Error, 
    serializationError: Error, 
    originalMessage?: WorkerMessage
  ): void {
    this.log(`Error serialization failed: ${serializationError.message}`, 'error');
    
    // 기본 워커 에러로 대체
    const workerError = createWorkerError(
      WorkerErrorType.PROCESSING_ERROR,
      'SERIALIZATION_ERROR',
      `Error serialization failed: ${originalError.message}`,
      WorkerErrorSeverity.CRITICAL,
      false,
      false,
      {
        workerId: this.workerId,
        currentTask: this.currentTaskId,
        originalError: originalError.message,
        serializationError: serializationError.message,
        stack: originalError.stack
      }
    );
    
    this.sendMessage(createWorkerMessage(
      WorkerMessageType.ERROR,
      { 
        workerId: this.workerId,
        priority: MessagePriority.HIGH  // 직렬화 실패는 HIGH 우선순위
      },
      workerError,
      originalMessage?.messageId,
      MessagePriority.HIGH
    ));
  }

  /**
   * 부모 프로세스 에러 처리
   */
  private handleParentError(error: Error): void {
    this.log(`Parent port error: ${error.message}`, 'error');
    this.handleError(error);
  }

  /**
   * 종료 처리
   */
  private async handleShutdown(): Promise<void> {
    this.log('Worker shutting down...', 'info');
    await this.gracefulShutdown();
  }

  /**
   * 처리되지 않은 예외 처리
   */
  private handleUncaughtException(error: Error): void {
    this.log(`Uncaught exception: ${error.message}`, 'error');
    this.handleError(error);
    process.exit(1);
  }

  /**
   * 처리되지 않은 Promise 거부 처리
   */
  private handleUnhandledRejection(reason: any): void {
    this.log(`Unhandled rejection: ${reason}`, 'error');
    this.handleError(new Error(String(reason)));
  }

  /**
   * 로그 출력
   */
  private log(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.workerId}] [${level.toUpperCase()}] ${message}`;
    
    if (level === 'error') {
      console.error(logMessage);
    } else if (level === 'warn') {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }
}

// ============================================================================
// Worker Thread Entry Point
// ============================================================================

// Worker 데이터에서 Worker ID 추출
const workerId = workerData?.workerId || `worker_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

// Worker 인스턴스 생성
const worker = new M4ProcessWorker(workerId);

// 초기화 완료 알림
if (parentPort) {
  parentPort.postMessage(createWorkerMessage(
    WorkerMessageType.INITIALIZED,
    { 
      workerId,
      state: WorkerState.IDLE,
      pid: process.pid,
      memoryUsage: process.memoryUsage().heapUsed / (1024 * 1024)
    }
  ));
}

// 에러 처리
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in worker:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in worker:', reason);
  process.exit(1);
});

console.log(`M4 Process Worker ${workerId} initialized and ready`);