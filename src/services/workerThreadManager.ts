/**
 * Worker Thread Manager Service
 * 
 * This service manages Worker Threads for CPU-intensive M4 Excel processing.
 * It handles worker lifecycle, task distribution, and resource management.
 */

import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as os from 'os';
import {
  IWorkerThreadManager,
  WorkerConfig,
  WorkerPoolConfig,
  WorkerState,
  WorkerType,
  WorkerPriority,
  WorkerMessage,
  WorkerMessageType,
  MessagePriority,
  WorkerTask,
  WorkerStatistics,
  WorkerPoolState,
  WorkerError,
  WorkerErrorType,
  WorkerErrorSeverity,
  WorkerPerformanceMetrics,
  DEFAULT_WORKER_CONFIG,
  DEFAULT_WORKER_POOL_CONFIG,
  generateWorkerId,
  createWorkerMessage,
  createWorkerError,
  createWorkerTask,
  createEmptyPerformanceMetrics,
  calculateOptimalWorkerCount,
  calculatePriorityScore,
  calculateMessagePriorityScore,
  getDefaultMessagePriority,
  formatMemoryUsage,
  formatDuration,
  checkMemoryPressure,
  isWorkerMessage
} from '../types/workerTypes';
import { M4ProcessConfig } from '../types/m4Processing';
import { registerWorkerForErrorHandling } from '../utils/m4MainThreadErrorBridge';
import { SerializableM4Error, isSerializableM4Error } from '../types/m4ProcessingErrors';
import { reportM4Error } from '../main/ipc-handlers';
import { M4ErrorReportRequest, M4ErrorContext } from '../shared/types';
import { PerformanceProfiler, globalProfiler } from './m4/performance/profiler';

// ============================================================================
// Worker Thread Manager Implementation
// ============================================================================

/**
 * 우선순위 메시지 큐 항목
 */
interface PriorityMessageQueueItem {
  message: WorkerMessage;
  priority: MessagePriority;
  priorityScore: number;
  resolve: Function;
  reject: Function;
  timeout: NodeJS.Timeout;
  timestamp: number;
}

/**
 * 배치 처리 시스템
 */
interface BatchProcessingSystem {
  progressUpdates: WorkerMessage[];
  batchTimer: NodeJS.Timeout | null;
  maxBatchSize: number;
  batchInterval: number;
  isMemoryPressure: boolean;
}

/**
 * Worker 정보 인터페이스
 */
interface WorkerInfo {
  id: string;
  worker: Worker;
  config: WorkerConfig;
  state: WorkerState;
  statistics: WorkerStatistics;
  currentTask: WorkerTask | null;
  messageQueue: Map<string, PriorityMessageQueueItem>;
  batchSystem: BatchProcessingSystem;
  lastActivity: number;
  retryCount: number;
}

/**
 * Worker Thread Manager 구현
 */
export class WorkerThreadManager extends EventEmitter implements IWorkerThreadManager {
  private poolConfig: WorkerPoolConfig;
  private workers: Map<string, WorkerInfo>;
  private profiler?: PerformanceProfiler;
  private taskQueue: WorkerTask[];
  private completedTasks: Map<string, WorkerTask>;
  private isInitialized: boolean;
  private cleanupInterval: NodeJS.Timeout | null;
  private monitoringInterval: NodeJS.Timeout | null;
  private isShuttingDown: boolean;

  constructor(profiler?: PerformanceProfiler) {
    super();
    
    this.poolConfig = DEFAULT_WORKER_POOL_CONFIG;
    this.workers = new Map();
    this.profiler = profiler || globalProfiler;
    this.taskQueue = [];
    this.completedTasks = new Map();
    this.isInitialized = false;
    this.cleanupInterval = null;
    this.monitoringInterval = null;
    this.isShuttingDown = false;
    
    this.setupProcessHandlers();
  }

  /**
   * 프로세스 핸들러 설정
   */
  private setupProcessHandlers(): void {
    process.on('SIGINT', this.handleShutdown.bind(this));
    process.on('SIGTERM', this.handleShutdown.bind(this));
    process.on('exit', this.handleShutdown.bind(this));
  }

  /**
   * Worker 풀 초기화
   */
  async initialize(config: WorkerPoolConfig): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Worker pool already initialized');
    }

    this.poolConfig = { ...DEFAULT_WORKER_POOL_CONFIG, ...config };
    
    // 최소 Worker 수 생성
    for (let i = 0; i < this.poolConfig.minWorkers; i++) {
      await this.createWorker({
        ...DEFAULT_WORKER_CONFIG,
        type: WorkerType.GENERIC,
        id: generateWorkerId(WorkerType.GENERIC),
        priority: WorkerPriority.MEDIUM
      } as WorkerConfig);
    }

    // 정리 및 모니터링 시작
    this.startCleanupInterval();
    this.startMonitoringInterval();
    
    this.isInitialized = true;
    this.emit('initialized', this.poolConfig);
    
    console.log(`Worker pool initialized with ${this.workers.size} workers`);
  }

  /**
   * Worker 생성
   */
  async createWorker(config: WorkerConfig): Promise<string> {
    if (this.workers.size >= this.poolConfig.maxWorkers) {
      throw new Error('Maximum worker limit reached');
    }

    const workerId = config.id || generateWorkerId(config.type);
    // 프로젝트 루트 기준으로 Worker Thread 경로 설정
    const projectRoot = path.resolve(__dirname, '..', '..');
    const workerPath = path.join(projectRoot, 'dist', 'workers', 'm4ProcessWorker.js');
    
    try {
      const worker = new Worker(workerPath, {
        workerData: { workerId }
      });
      
      // M4 에러 브릿지에 Worker 등록
      registerWorkerForErrorHandling(workerId, worker);

      const workerInfo: WorkerInfo = {
        id: workerId,
        worker,
        config,
        state: WorkerState.IDLE,
        statistics: {
          workerId,
          createdAt: Date.now(),
          state: WorkerState.IDLE,
          performance: createEmptyPerformanceMetrics(),
          recentErrors: []
        },
        currentTask: null,
        messageQueue: new Map(),
        batchSystem: {
          progressUpdates: [],
          batchTimer: null,
          maxBatchSize: 10,
          batchInterval: 100, // 100ms
          isMemoryPressure: false
        },
        lastActivity: Date.now(),
        retryCount: 0
      };

      this.setupWorkerEventHandlers(workerInfo);
      this.workers.set(workerId, workerInfo);

      // Worker 초기화
      await this.sendMessageToWorker(workerId, createWorkerMessage(
        WorkerMessageType.INITIALIZE,
        { config, processingConfig: null }
      ));

      this.emit('workerCreated', workerId);
      console.log(`Worker created: ${workerId}`);
      
      return workerId;
    } catch (error) {
      console.error(`Failed to create worker: ${error}`);
      throw error;
    }
  }

  /**
   * Worker 이벤트 핸들러 설정
   */
  private setupWorkerEventHandlers(workerInfo: WorkerInfo): void {
    const { worker, id } = workerInfo;

    worker.on('message', (message: WorkerMessage) => {
      this.handleWorkerMessage(id, message);
    });

    worker.on('error', (error: Error) => {
      this.handleWorkerError(id, error);
    });

    worker.on('exit', (code: number) => {
      this.handleWorkerExit(id, code);
    });

    worker.on('online', () => {
      console.log(`Worker ${id} is online`);
    });
  }

  /**
   * Worker 메시지 처리
   */
  private handleWorkerMessage(workerId: string, message: WorkerMessage): void {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) {
      console.error(`Received message from unknown worker: ${workerId}`);
      return;
    }

    workerInfo.lastActivity = Date.now();

    switch (message.type) {
      case WorkerMessageType.INITIALIZED:
        this.handleWorkerInitialized(workerId, message);
        break;
        
      case WorkerMessageType.PROGRESS_UPDATE:
        this.handleProgressUpdate(workerId, message);
        break;
        
      case WorkerMessageType.PROCESSING_COMPLETE:
        this.handleProcessingComplete(workerId, message);
        break;
        
      case WorkerMessageType.ERROR:
        this.handleWorkerErrorMessage(workerId, message).catch(error => {
          console.error('Failed to handle worker error message:', error);
        });
        break;
        
      case WorkerMessageType.STATUS_RESPONSE:
        this.handleStatusResponse(workerId, message);
        break;
        
      case WorkerMessageType.HEALTH_RESPONSE:
        this.handleHealthResponse(workerId, message);
        break;
        
      case WorkerMessageType.TERMINATED:
        this.handleWorkerTerminated(workerId, message);
        break;
    }

    // 메시지 큐에서 대기 중인 응답 처리
    if (message.responseToId) {
      const pending = workerInfo.messageQueue.get(message.responseToId);
      if (pending) {
        clearTimeout(pending.timeout);
        workerInfo.messageQueue.delete(message.responseToId);
        pending.resolve(message);
      }
    }
  }

  /**
   * Worker 초기화 완료 처리
   */
  private handleWorkerInitialized(workerId: string, message: WorkerMessage): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.state = WorkerState.IDLE;
      workerInfo.statistics.state = WorkerState.IDLE;
      console.log(`Worker ${workerId} initialized successfully`);
      this.processNextTask();
    }
  }

  /**
   * 진행률 업데이트 처리
   */
  private handleProgressUpdate(workerId: string, message: WorkerMessage): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo && workerInfo.currentTask) {
      workerInfo.currentTask.progress = message.data.progress.percentage;
      this.emit('progressUpdate', workerId, message.data.taskId, message.data.progress);
    }
  }

  /**
   * 처리 완료 처리
   */
  private handleProcessingComplete(workerId: string, message: WorkerMessage): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo && workerInfo.currentTask) {
      const task = workerInfo.currentTask;
      
      if (message.data.result.success) {
        task.status = 'completed';
        task.result = message.data.result;
      } else {
        task.status = 'failed';
        task.error = createWorkerError(
          WorkerErrorType.PROCESSING_ERROR,
          'PROCESSING_FAILED',
          message.data.result.error || 'Unknown processing error',
          WorkerErrorSeverity.HIGH
        );
      }
      
      task.completedAt = Date.now();
      this.completedTasks.set(task.taskId, task);
      
      // Worker 상태 업데이트
      workerInfo.state = WorkerState.IDLE;
      workerInfo.statistics.state = WorkerState.IDLE;
      workerInfo.currentTask = null;
      workerInfo.statistics.performance.tasksProcessed++;
      
      this.emit('taskCompleted', task);
      console.log(`Task ${task.taskId} completed by worker ${workerId}`);
      
      // 다음 작업 처리
      this.processNextTask();
    }
  }

  /**
   * Worker 에러 메시지 처리
   */
  private async handleWorkerErrorMessage(workerId: string, message: WorkerMessage): Promise<void> {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.state = WorkerState.ERROR;
      workerInfo.statistics.state = WorkerState.ERROR;
      workerInfo.statistics.performance.errorCount++;
      
      // M4 에러 확인 및 처리
      if (message.data && message.data.m4Error && isSerializableM4Error(message.data.m4Error)) {
        await this.handleM4ErrorFromWorker(workerId, message.data);
      }
      
      if (message.error) {
        workerInfo.statistics.recentErrors.push(message.error);
        // 최근 에러 10개만 유지
        if (workerInfo.statistics.recentErrors.length > 10) {
          workerInfo.statistics.recentErrors.shift();
        }
      }
      
      this.emit('workerError', workerId, message.error);
      console.error(`Worker ${workerId} error:`, message.error);
      
      // 현재 작업 실패 처리
      if (workerInfo.currentTask) {
        workerInfo.currentTask.status = 'failed';
        workerInfo.currentTask.error = message.error;
        workerInfo.currentTask.completedAt = Date.now();
        this.completedTasks.set(workerInfo.currentTask.taskId, workerInfo.currentTask);
        
        this.emit('taskFailed', workerInfo.currentTask);
        workerInfo.currentTask = null;
      }
    }
  }
  
  /**
   * Worker로부터 받은 M4 에러 처리
   */
  private async handleM4ErrorFromWorker(workerId: string, errorData: any): Promise<void> {
    try {
      const { m4Error, errorContext } = errorData;
      
      // M4ErrorReportRequest 생성
      const errorRequest: M4ErrorReportRequest = {
        errorType: m4Error.errorType,
        severity: m4Error.severity,
        message: m4Error.message,
        stackTrace: m4Error.stackTrace,
        context: this.enrichM4ErrorContext(errorContext, workerId),
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
        
        // 에러 통계 업데이트
        this.updateM4ErrorStatistics(workerId, m4Error.errorType, m4Error.severity);
      }
    } catch (error) {
      console.error('Failed to handle M4 error from worker:', error);
    }
  }
  
  /**
   * M4 에러 컨텍스트 보강
   */
  private enrichM4ErrorContext(context: M4ErrorContext, workerId: string): M4ErrorContext {
    const workerInfo = this.workers.get(workerId);
    
    return {
      ...context,
      threadId: workerId,
      isMainThread: false,
      memoryUsage: context.memoryUsage || (workerInfo?.statistics.performance.memoryUsage || 0),
      taskQueue: this.taskQueue.length,
      customData: {
        ...context.customData,
        workerState: workerInfo?.state,
        workerRetryCount: workerInfo?.retryCount,
        poolSize: this.workers.size,
        activeWorkers: Array.from(this.workers.values()).filter(w => w.state === WorkerState.BUSY).length,
        pendingTasks: this.taskQueue.length,
        completedTasks: this.completedTasks.size
      }
    };
  }
  
  /**
   * M4 에러 통계 업데이트
   */
  private updateM4ErrorStatistics(workerId: string, errorType: string, severity: string): void {
    // 향후 확장을 위한 플레이스홀더
    // 필요시 별도의 M4 에러 통계 추적 구현
    console.debug(`M4 error statistics updated: Worker ${workerId}, Type: ${errorType}, Severity: ${severity}`);
  }

  /**
   * 상태 응답 처리
   */
  private handleStatusResponse(workerId: string, message: WorkerMessage): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.statistics.performance.memoryUsage = message.data.memoryUsage;
      workerInfo.statistics.performance.cpuUsage = message.data.cpuUsage;
      workerInfo.statistics.performance.uptime = message.data.uptime;
    }
  }

  /**
   * 헬스 응답 처리
   */
  private handleHealthResponse(workerId: string, message: WorkerMessage): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.statistics.performance = message.data.performanceMetrics;
      
      if (!message.data.isHealthy) {
        workerInfo.state = WorkerState.ERROR;
        workerInfo.statistics.state = WorkerState.ERROR;
        this.emit('workerUnhealthy', workerId);
      }
    }
  }

  /**
   * Worker 종료 처리
   */
  private handleWorkerTerminated(workerId: string, message: WorkerMessage): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.state = WorkerState.TERMINATED;
      workerInfo.statistics.state = WorkerState.TERMINATED;
      this.emit('workerTerminated', workerId);
      console.log(`Worker ${workerId} terminated`);
    }
  }

  /**
   * Worker 에러 처리
   */
  private handleWorkerError(workerId: string, error: Error): void {
    console.error(`Worker ${workerId} error:`, error);
    
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.state = WorkerState.ERROR;
      workerInfo.statistics.state = WorkerState.ERROR;
      workerInfo.statistics.performance.errorCount++;
      
      const workerError = createWorkerError(
        WorkerErrorType.UNKNOWN_ERROR,
        'WORKER_ERROR',
        error.message,
        WorkerErrorSeverity.HIGH,
        false,
        true,
        { stack: error.stack }
      );
      
      workerInfo.statistics.recentErrors.push(workerError);
      this.emit('workerError', workerId, workerError);
    }
  }

  /**
   * Worker 종료 처리
   */
  private handleWorkerExit(workerId: string, code: number): void {
    console.log(`Worker ${workerId} exited with code ${code}`);
    
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.state = WorkerState.TERMINATED;
      workerInfo.statistics.state = WorkerState.TERMINATED;
      
      // 현재 작업 실패 처리
      if (workerInfo.currentTask) {
        workerInfo.currentTask.status = 'failed';
        workerInfo.currentTask.error = createWorkerError(
          WorkerErrorType.TERMINATION_ERROR,
          'WORKER_EXIT',
          `Worker exited with code ${code}`,
          WorkerErrorSeverity.HIGH
        );
        workerInfo.currentTask.completedAt = Date.now();
        this.completedTasks.set(workerInfo.currentTask.taskId, workerInfo.currentTask);
        
        this.emit('taskFailed', workerInfo.currentTask);
      }
      
      // 배치 시스템 정리
      if (workerInfo.batchSystem.batchTimer) {
        clearTimeout(workerInfo.batchSystem.batchTimer);
        workerInfo.batchSystem.batchTimer = null;
      }
      
      // 보류 중인 메시지 거부
      workerInfo.messageQueue.forEach((pending) => {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Worker terminated'));
      });
      
      this.emit('workerExit', workerId, code);
    }
    
    // Worker 정리
    this.workers.delete(workerId);
    
    // 필요시 새 Worker 생성
    if (!this.isShuttingDown && this.workers.size < this.poolConfig.minWorkers) {
      this.createWorker({
        ...DEFAULT_WORKER_CONFIG,
        type: WorkerType.GENERIC,
        id: generateWorkerId(WorkerType.GENERIC),
        priority: WorkerPriority.MEDIUM
      } as WorkerConfig).catch(console.error);
    }
  }

  /**
   * 작업 실행
   */
  async executeTask(task: WorkerTask): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Worker pool not initialized');
    }

    // 작업을 큐에 추가
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => calculatePriorityScore(b.priority) - calculatePriorityScore(a.priority));
    
    this.emit('taskQueued', task);
    console.log(`Task ${task.taskId} queued with priority ${task.priority}`);
    
    // 즉시 처리 시도
    this.processNextTask();
    
    return task.taskId;
  }

  /**
   * 다음 작업 처리
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0) {
      return;
    }

    // 유휴 Worker 찾기
    const idleWorker = this.findIdleWorker();
    if (!idleWorker) {
      // 가능하면 새 Worker 생성
      if (this.workers.size < this.poolConfig.maxWorkers) {
        this.createWorker({
          ...DEFAULT_WORKER_CONFIG,
          type: WorkerType.GENERIC,
          id: generateWorkerId(WorkerType.GENERIC),
          priority: WorkerPriority.MEDIUM
        } as WorkerConfig).then(() => {
          this.processNextTask();
        }).catch(console.error);
      }
      return;
    }

    const task = this.taskQueue.shift()!;
    this.assignTaskToWorker(idleWorker, task);
  }

  /**
   * 유휴 Worker 찾기
   */
  private findIdleWorker(): WorkerInfo | null {
    for (const [, workerInfo] of this.workers) {
      if (workerInfo.state === WorkerState.IDLE) {
        return workerInfo;
      }
    }
    return null;
  }

  /**
   * Worker에 작업 할당
   */
  private async assignTaskToWorker(workerInfo: WorkerInfo, task: WorkerTask): Promise<void> {
    try {
      workerInfo.state = WorkerState.BUSY;
      workerInfo.statistics.state = WorkerState.BUSY;
      workerInfo.currentTask = task;
      
      task.status = 'processing';
      task.startedAt = Date.now();
      task.assignedWorkerId = workerInfo.id;
      
      await this.sendMessageToWorker(workerInfo.id, createWorkerMessage(
        WorkerMessageType.START_PROCESSING,
        {
          taskId: task.taskId,
          config: task.config
        }
      ));
      
      this.emit('taskStarted', task);
      console.log(`Task ${task.taskId} assigned to worker ${workerInfo.id}`);
    } catch (error) {
      console.error(`Failed to assign task to worker:`, error);
      
      // 작업 실패 처리
      task.status = 'failed';
      task.error = createWorkerError(
        WorkerErrorType.COMMUNICATION_ERROR,
        'TASK_ASSIGNMENT_FAILED',
        (error as Error).message,
        WorkerErrorSeverity.HIGH
      );
      task.completedAt = Date.now();
      this.completedTasks.set(task.taskId, task);
      
      // Worker 상태 복구
      workerInfo.state = WorkerState.IDLE;
      workerInfo.statistics.state = WorkerState.IDLE;
      workerInfo.currentTask = null;
      
      this.emit('taskFailed', task);
    }
  }

  /**
   * Worker에 메시지 전송 (우선순위 기반)
   */
  private async sendMessageToWorker(workerId: string, message: WorkerMessage): Promise<WorkerMessage> {
    // 프로파일링 시작
    const measurementId = this.profiler?.begin('sendMessageToWorker', {
      workerId,
      messageType: message.type,
      messageSize: JSON.stringify(message).length
    });
    
    try {
      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) {
        throw new Error(`Worker ${workerId} not found`);
      }

      // 메시지 우선순위 설정 (명시되지 않은 경우 기본값 사용)
      const priority = message.priority || getDefaultMessagePriority(message.type);
      const priorityScore = calculateMessagePriorityScore(priority);
      
      // 우선순위가 BATCH인 경우 배치 처리 시스템 사용
      if (priority === MessagePriority.BATCH && message.type === WorkerMessageType.PROGRESS_UPDATE) {
        const result = await this.handleBatchMessage(workerInfo, message);
        if (measurementId) this.profiler?.end(measurementId);
        return result;
      }

      const result = await new Promise<WorkerMessage>((resolve, reject) => {
        const timeout = setTimeout(() => {
          workerInfo.messageQueue.delete(message.messageId);
          reject(new Error('Message timeout'));
        }, this.getTimeoutByPriority(priority));

        const queueItem: PriorityMessageQueueItem = {
          message: { ...message, priority },
          priority,
          priorityScore,
          resolve,
          reject,
          timeout,
          timestamp: Date.now()
        };

        workerInfo.messageQueue.set(message.messageId, queueItem);
        
        // 우선순위에 따라 즉시 전송 또는 큐에 추가
        if (priority === MessagePriority.URGENT || priority === MessagePriority.HIGH) {
          // 긴급/높은 우선순위 메시지는 즉시 전송
          this.sendPriorityMessage(workerInfo, queueItem);
        } else {
          // 일반/낮은 우선순위 메시지는 큐에서 순서대로 처리
          this.processPriorityQueue(workerInfo);
        }
      });
      
      if (measurementId) this.profiler?.end(measurementId);
      return result;
      
    } catch (error) {
      if (measurementId) this.profiler?.end(measurementId);
      throw error;
    }
  }

  /**
   * 배치 메시지 처리
   */
  private async handleBatchMessage(workerInfo: WorkerInfo, message: WorkerMessage): Promise<WorkerMessage> {
    const batchSystem = workerInfo.batchSystem;
    
    // 메모리 압박 상황이거나 긴급한 경우 즉시 전송
    if (batchSystem.isMemoryPressure || batchSystem.progressUpdates.length >= batchSystem.maxBatchSize) {
      return this.flushBatchMessages(workerInfo, message);
    }

    // 배치에 추가
    batchSystem.progressUpdates.push(message);
    
    // 배치 타이머 설정 (아직 설정되지 않은 경우)
    if (!batchSystem.batchTimer) {
      batchSystem.batchTimer = setTimeout(() => {
        this.flushBatchMessages(workerInfo);
      }, batchSystem.batchInterval);
    }

    // Promise 반환 (배치 전송 시 resolve됨)
    return new Promise((resolve, reject) => {
      // 임시로 메시지 큐에 추가하여 배치 전송 시 처리
      const timeout = setTimeout(() => {
        reject(new Error('Batch message timeout'));
      }, 5000);
      
      workerInfo.messageQueue.set(message.messageId, {
        message,
        priority: MessagePriority.BATCH,
        priorityScore: 1,
        resolve,
        reject,
        timeout,
        timestamp: Date.now()
      });
    });
  }

  /**
   * 배치 메시지 플러시
   */
  private async flushBatchMessages(workerInfo: WorkerInfo, additionalMessage?: WorkerMessage): Promise<WorkerMessage> {
    const batchSystem = workerInfo.batchSystem;
    
    // 타이머 정리
    if (batchSystem.batchTimer) {
      clearTimeout(batchSystem.batchTimer);
      batchSystem.batchTimer = null;
    }

    const messagesToSend = [...batchSystem.progressUpdates];
    if (additionalMessage) {
      messagesToSend.push(additionalMessage);
    }

    // 배치 정리
    batchSystem.progressUpdates = [];
    
    if (messagesToSend.length === 0) {
      throw new Error('No messages to flush');
    }

    // 배치 통계 업데이트
    if (workerInfo.statistics.performance.batchMetrics) {
      const batchMetrics = workerInfo.statistics.performance.batchMetrics;
      batchMetrics.totalBatches++;
      batchMetrics.batchedMessages += messagesToSend.length;
      batchMetrics.averageBatchSize = 
        (batchMetrics.averageBatchSize * (batchMetrics.totalBatches - 1) + messagesToSend.length) / batchMetrics.totalBatches;
      batchMetrics.lastBatchTime = Date.now();
    }

    // 단일 메시지인 경우 개별 전송
    if (messagesToSend.length === 1) {
      const message = messagesToSend[0];
      workerInfo.worker.postMessage(message);
      
      // 해당 메시지의 Promise resolve
      const queueItem = workerInfo.messageQueue.get(message.messageId);
      if (queueItem) {
        clearTimeout(queueItem.timeout);
        workerInfo.messageQueue.delete(message.messageId);
        return new Promise((resolve) => {
          queueItem.resolve(message);
          resolve(message);
        });
      }
      return message;
    }

    // 다중 메시지인 경우 배치 메시지로 전송
    const batchMessage = createWorkerMessage(
      WorkerMessageType.PROGRESS_UPDATE,
      {
        batch: true,
        messages: messagesToSend.map(msg => msg.data)
      },
      undefined,
      undefined,
      MessagePriority.BATCH
    );

    workerInfo.worker.postMessage(batchMessage);

    // 모든 배치 메시지의 Promise resolve
    messagesToSend.forEach(message => {
      const queueItem = workerInfo.messageQueue.get(message.messageId);
      if (queueItem) {
        clearTimeout(queueItem.timeout);
        workerInfo.messageQueue.delete(message.messageId);
        queueItem.resolve(message);
      }
    });

    return batchMessage;
  }

  /**
   * 우선순위 메시지 즉시 전송
   */
  private sendPriorityMessage(workerInfo: WorkerInfo, queueItem: PriorityMessageQueueItem): void {
    workerInfo.worker.postMessage(queueItem.message);
    
    // 통계 업데이트
    if (workerInfo.statistics.performance.batchMetrics) {
      workerInfo.statistics.performance.batchMetrics.immediateMessages++;
    }
  }

  /**
   * 우선순위 큐 처리
   */
  private processPriorityQueue(workerInfo: WorkerInfo): void {
    // 큐를 우선순위순으로 정렬
    const sortedQueue = Array.from(workerInfo.messageQueue.values())
      .sort((a, b) => {
        // 우선순위가 같으면 타임스탬프 순
        if (a.priorityScore === b.priorityScore) {
          return a.timestamp - b.timestamp;
        }
        return b.priorityScore - a.priorityScore;
      });

    // 가장 높은 우선순위 메시지 전송
    if (sortedQueue.length > 0) {
      const highestPriorityItem = sortedQueue[0];
      this.sendPriorityMessage(workerInfo, highestPriorityItem);
    }
  }

  /**
   * 우선순위별 타임아웃 반환
   */
  private getTimeoutByPriority(priority: MessagePriority): number {
    switch (priority) {
      case MessagePriority.URGENT: return 5000;   // 5초
      case MessagePriority.HIGH: return 15000;    // 15초
      case MessagePriority.NORMAL: return 30000;  // 30초
      case MessagePriority.LOW: return 60000;     // 60초
      case MessagePriority.BATCH: return 5000;    // 5초 (배치 타임아웃)
      default: return 30000;
    }
  }

  /**
   * 작업 취소
   */
  async cancelTask(taskId: string): Promise<boolean> {
    // 큐에서 제거
    const queueIndex = this.taskQueue.findIndex(task => task.taskId === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      task.status = 'cancelled';
      task.completedAt = Date.now();
      this.completedTasks.set(taskId, task);
      this.emit('taskCancelled', task);
      return true;
    }

    // 진행 중인 작업 취소
    for (const [, workerInfo] of this.workers) {
      if (workerInfo.currentTask?.taskId === taskId) {
        try {
          await this.sendMessageToWorker(workerInfo.id, createWorkerMessage(
            WorkerMessageType.CANCEL_PROCESSING,
            { taskId }
          ));
          return true;
        } catch (error) {
          console.error(`Failed to cancel task ${taskId}:`, error);
          return false;
        }
      }
    }

    return false;
  }

  /**
   * Worker 상태 조회
   */
  async getWorkerStatus(workerId: string): Promise<WorkerStatistics> {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) {
      throw new Error(`Worker ${workerId} not found`);
    }

    // 실시간 상태 요청
    try {
      await this.sendMessageToWorker(workerId, createWorkerMessage(
        WorkerMessageType.STATUS_REQUEST
      ));
    } catch (error) {
      console.warn(`Failed to get real-time status for worker ${workerId}:`, error);
    }

    return workerInfo.statistics;
  }

  /**
   * 풀 상태 조회
   */
  async getPoolState(): Promise<WorkerPoolState> {
    let totalWorkers = 0;
    let activeWorkers = 0;
    let idleWorkers = 0;
    let busyWorkers = 0;
    let errorWorkers = 0;
    let totalMemoryUsage = 0;
    let totalCpuUsage = 0;

    for (const [, workerInfo] of this.workers) {
      totalWorkers++;
      
      switch (workerInfo.state) {
        case WorkerState.IDLE:
          idleWorkers++;
          activeWorkers++;
          break;
        case WorkerState.BUSY:
          busyWorkers++;
          activeWorkers++;
          break;
        case WorkerState.ERROR:
          errorWorkers++;
          break;
      }

      totalMemoryUsage += workerInfo.statistics.performance.memoryUsage;
      totalCpuUsage += workerInfo.statistics.performance.cpuUsage;
    }

    const completedTasks = Array.from(this.completedTasks.values());
    const failedTasks = completedTasks.filter(task => task.status === 'failed').length;
    const successfulTasks = completedTasks.filter(task => task.status === 'completed').length;

    return {
      totalWorkers,
      activeWorkers,
      idleWorkers,
      busyWorkers,
      errorWorkers,
      pendingTasks: this.taskQueue.length,
      processingTasks: busyWorkers,
      completedTasks: successfulTasks,
      failedTasks,
      totalMemoryUsage,
      averageCpuUsage: totalWorkers > 0 ? totalCpuUsage / totalWorkers : 0
    };
  }

  /**
   * Worker 종료
   */
  async terminateWorker(workerId: string): Promise<boolean> {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) {
      return false;
    }

    try {
      await this.sendMessageToWorker(workerId, createWorkerMessage(
        WorkerMessageType.TERMINATE
      ));
      
      // M4 에러 브릿지에서 Worker 등록 해제
      const M4MainThreadErrorBridge = require('../utils/m4MainThreadErrorBridge').M4MainThreadErrorBridge;
      const bridge = M4MainThreadErrorBridge.getInstance();
      bridge.unregisterWorker(workerId);
      
      // 타임아웃 후 강제 종료
      setTimeout(() => {
        if (this.workers.has(workerId)) {
          workerInfo.worker.terminate();
          this.workers.delete(workerId);
        }
      }, 5000);
      
      return true;
    } catch (error) {
      console.error(`Failed to terminate worker ${workerId}:`, error);
      
      // 강제 종료
      workerInfo.worker.terminate();
      this.workers.delete(workerId);
      return false;
    }
  }

  /**
   * 풀 종료
   */
  async terminatePool(): Promise<void> {
    this.isShuttingDown = true;
    
    // 정리 인터벌 중지
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // 모든 Worker 종료
    const terminationPromises = Array.from(this.workers.keys()).map(workerId => 
      this.terminateWorker(workerId)
    );

    await Promise.all(terminationPromises);
    
    this.workers.clear();
    this.taskQueue.length = 0;
    this.completedTasks.clear();
    this.isInitialized = false;
    
    this.emit('poolTerminated');
    console.log('Worker pool terminated');
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    await this.terminatePool();
  }

  /**
   * 정리 인터벌 시작
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.poolConfig.cleanupInterval * 1000);
  }

  /**
   * 모니터링 인터벌 시작
   */
  private startMonitoringInterval(): void {
    this.monitoringInterval = setInterval(() => {
      this.performMonitoring();
    }, 30000); // 30초마다
  }

  /**
   * 정리 수행
   */
  private performCleanup(): void {
    const now = Date.now();
    
    // 유휴 Worker 정리
    for (const [workerId, workerInfo] of this.workers) {
      if (workerInfo.state === WorkerState.IDLE && 
          now - workerInfo.lastActivity > this.poolConfig.idleTimeout * 1000 &&
          this.workers.size > this.poolConfig.minWorkers) {
        
        this.terminateWorker(workerId);
        console.log(`Idle worker ${workerId} terminated due to timeout`);
      }
    }

    // 완료된 작업 정리 (1시간 이상 된 것)
    for (const [taskId, task] of this.completedTasks) {
      if (task.completedAt && now - task.completedAt > 3600000) { // 1시간
        this.completedTasks.delete(taskId);
      }
    }

    // 메모리 압박 검사
    const isMemoryPressure = checkMemoryPressure(this.poolConfig.memoryPressureThreshold);
    if (isMemoryPressure) {
      console.warn('Memory pressure detected, performing aggressive cleanup');
      
      // 모든 Worker의 배치 시스템에 메모리 압박 플래그 설정
      this.workers.forEach(workerInfo => {
        workerInfo.batchSystem.isMemoryPressure = true;
        
        // 대기 중인 배치 메시지 즉시 플러시
        if (workerInfo.batchSystem.progressUpdates.length > 0) {
          this.flushBatchMessages(workerInfo).catch(console.error);
        }
      });
      
      this.performAggressiveCleanup();
    } else {
      // 메모리 압박이 해제되면 플래그 리셋
      this.workers.forEach(workerInfo => {
        workerInfo.batchSystem.isMemoryPressure = false;
      });
    }
  }

  /**
   * 모니터링 수행
   */
  private performMonitoring(): void {
    this.workers.forEach(async (workerInfo, workerId) => {
      try {
        await this.sendMessageToWorker(workerId, createWorkerMessage(
          WorkerMessageType.HEALTH_CHECK
        ));
      } catch (error) {
        console.warn(`Health check failed for worker ${workerId}:`, error);
      }
    });
  }

  /**
   * 적극적인 정리 수행
   */
  private performAggressiveCleanup(): void {
    // 에러 상태 Worker 제거
    for (const [workerId, workerInfo] of this.workers) {
      if (workerInfo.state === WorkerState.ERROR) {
        this.terminateWorker(workerId);
      }
    }

    // 메모리 사용량이 높은 Worker 제거
    const sortedWorkers = Array.from(this.workers.entries())
      .sort((a, b) => b[1].statistics.performance.memoryUsage - a[1].statistics.performance.memoryUsage);

    for (let i = 0; i < Math.min(2, sortedWorkers.length); i++) {
      const [workerId, workerInfo] = sortedWorkers[i];
      if (workerInfo.state === WorkerState.IDLE && 
          workerInfo.statistics.performance.memoryUsage > this.poolConfig.memoryPressureThreshold / 2) {
        this.terminateWorker(workerId);
        console.log(`High memory usage worker ${workerId} terminated`);
      }
    }
  }

  /**
   * 종료 처리
   */
  private async handleShutdown(): Promise<void> {
    console.log('Shutting down worker thread manager...');
    await this.cleanup();
  }
}

// 기본 내보내기
export default WorkerThreadManager;