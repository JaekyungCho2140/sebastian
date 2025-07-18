/**
 * Worker Threads Types and Interfaces
 * 
 * This file contains all TypeScript interfaces and types
 * for Worker Threads communication and management.
 */

import { M4ProcessConfig, M4ProcessProgress, M4ProcessResult, ProcessStep } from './m4Processing';

// ============================================================================
// Worker Thread Management Types
// ============================================================================

/**
 * Worker 스레드 상태
 */
export enum WorkerState {
  IDLE = 'idle',
  BUSY = 'busy',
  TERMINATED = 'terminated',
  ERROR = 'error'
}

/**
 * Worker 스레드 유형
 */
export enum WorkerType {
  M4_DIALOGUE = 'm4_dialogue',
  M4_STRING = 'm4_string',
  GENERIC = 'generic'
}

/**
 * Worker 스레드 우선순위
 */
export enum WorkerPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Worker 메시지 우선순위
 */
export enum MessagePriority {
  URGENT = 'urgent',    // 즉시 처리 (에러, 종료 신호)
  HIGH = 'high',        // 높은 우선순위 (취소 요청, 상태 요청)
  NORMAL = 'normal',    // 일반 우선순위 (처리 시작, 진행률 업데이트)
  LOW = 'low',          // 낮은 우선순위 (헬스체크, 로그)
  BATCH = 'batch'       // 배치 처리용 (다수의 진행률 업데이트)
}

// ============================================================================
// Worker Thread Configuration
// ============================================================================

/**
 * Worker 스레드 구성
 */
export interface WorkerConfig {
  /** Worker 유형 */
  type: WorkerType;
  
  /** Worker ID */
  id: string;
  
  /** Worker 우선순위 */
  priority: WorkerPriority;
  
  /** 최대 메모리 사용량 (MB) */
  maxMemoryUsage: number;
  
  /** 타임아웃 시간 (초) */
  timeout: number;
  
  /** 재시도 횟수 */
  retryCount: number;
  
  /** 사용자 정의 옵션 */
  customOptions?: Record<string, any>;
}

/**
 * Worker 풀 구성
 */
export interface WorkerPoolConfig {
  /** 최대 Worker 수 */
  maxWorkers: number;
  
  /** 최소 Worker 수 */
  minWorkers: number;
  
  /** Worker 생성 간격 (ms) */
  workerSpawnInterval: number;
  
  /** Worker 유휴 타임아웃 (초) */
  idleTimeout: number;
  
  /** 리소스 정리 간격 (초) */
  cleanupInterval: number;
  
  /** 메모리 압박 임계값 (MB) */
  memoryPressureThreshold: number;
}

// ============================================================================
// Worker Message Protocol
// ============================================================================

/**
 * Worker 메시지 유형
 */
export enum WorkerMessageType {
  // 요청 메시지
  INITIALIZE = 'initialize',
  START_PROCESSING = 'start_processing',
  PAUSE_PROCESSING = 'pause_processing',
  RESUME_PROCESSING = 'resume_processing',
  CANCEL_PROCESSING = 'cancel_processing',
  TERMINATE = 'terminate',
  
  // 응답 메시지
  INITIALIZED = 'initialized',
  PROGRESS_UPDATE = 'progress_update',
  PROCESSING_COMPLETE = 'processing_complete',
  ERROR = 'error',
  TERMINATED = 'terminated',
  
  // 상태 메시지
  STATUS_REQUEST = 'status_request',
  STATUS_RESPONSE = 'status_response',
  HEALTH_CHECK = 'health_check',
  HEALTH_RESPONSE = 'health_response'
}

/**
 * Worker 메시지 기본 구조
 */
export interface WorkerMessage {
  /** 메시지 유형 */
  type: WorkerMessageType;
  
  /** 메시지 ID (요청-응답 매칭용) */
  messageId: string;
  
  /** 응답 대상 메시지 ID */
  responseToId?: string;
  
  /** 타임스탬프 */
  timestamp: number;
  
  /** 메시지 우선순위 */
  priority?: MessagePriority;
  
  /** 메시지 데이터 */
  data?: any;
  
  /** 에러 정보 */
  error?: WorkerError;
}

/**
 * Worker 초기화 요청
 */
export interface WorkerInitializeRequest extends WorkerMessage {
  type: WorkerMessageType.INITIALIZE;
  data: {
    config: WorkerConfig;
    processingConfig: M4ProcessConfig;
  };
}

/**
 * Worker 처리 시작 요청
 */
export interface WorkerStartProcessingRequest extends WorkerMessage {
  type: WorkerMessageType.START_PROCESSING;
  data: {
    taskId: string;
    config: M4ProcessConfig;
    inputData?: any;
  };
}

/**
 * Worker 진행률 업데이트
 */
export interface WorkerProgressUpdate extends WorkerMessage {
  type: WorkerMessageType.PROGRESS_UPDATE;
  data: {
    taskId: string;
    progress: M4ProcessProgress;
  };
}

/**
 * Worker 처리 완료 응답
 */
export interface WorkerProcessingComplete extends WorkerMessage {
  type: WorkerMessageType.PROCESSING_COMPLETE;
  data: {
    taskId: string;
    result: M4ProcessResult;
  };
}

/**
 * Worker 상태 응답
 */
export interface WorkerStatusResponse extends WorkerMessage {
  type: WorkerMessageType.STATUS_RESPONSE;
  data: {
    workerId: string;
    state: WorkerState;
    currentTask?: string;
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
  };
}

/**
 * Worker 헬스체크 응답
 */
export interface WorkerHealthResponse extends WorkerMessage {
  type: WorkerMessageType.HEALTH_RESPONSE;
  data: {
    workerId: string;
    isHealthy: boolean;
    performanceMetrics: WorkerPerformanceMetrics;
  };
}

// ============================================================================
// Worker Error Handling
// ============================================================================

/**
 * Worker 에러 유형
 */
export enum WorkerErrorType {
  INITIALIZATION_ERROR = 'initialization_error',
  PROCESSING_ERROR = 'processing_error',
  TIMEOUT_ERROR = 'timeout_error',
  MEMORY_ERROR = 'memory_error',
  COMMUNICATION_ERROR = 'communication_error',
  TERMINATION_ERROR = 'termination_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Worker 에러 심각도
 */
export enum WorkerErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Worker 에러 정보
 */
export interface WorkerError {
  /** 에러 유형 */
  type: WorkerErrorType;
  
  /** 에러 코드 */
  code: string;
  
  /** 에러 메시지 */
  message: string;
  
  /** 에러 스택 */
  stack?: string;
  
  /** 에러 심각도 */
  severity: WorkerErrorSeverity;
  
  /** 에러 발생 시간 */
  timestamp: number;
  
  /** 에러 컨텍스트 */
  context?: Record<string, any>;
  
  /** 복구 가능 여부 */
  recoverable: boolean;
  
  /** 재시도 가능 여부 */
  retryable: boolean;
}

// ============================================================================
// Worker Performance & Monitoring
// ============================================================================

/**
 * Worker 성능 메트릭
 */
export interface WorkerPerformanceMetrics {
  /** 메모리 사용량 (MB) */
  memoryUsage: number;
  
  /** CPU 사용률 (%) */
  cpuUsage: number;
  
  /** 처리된 작업 수 */
  tasksProcessed: number;
  
  /** 평균 처리 시간 (ms) */
  averageProcessingTime: number;
  
  /** 총 처리 시간 (ms) */
  totalProcessingTime: number;
  
  /** 에러 발생 횟수 */
  errorCount: number;
  
  /** 가동 시간 (ms) */
  uptime: number;
  
  /** 마지막 활동 시간 */
  lastActivity: number;
  
  /** 배치 처리 메트릭 */
  batchMetrics?: ProgressBatchMetrics;
  
  /** 사용자 정의 메트릭 */
  customMetrics?: Record<string, any>;
}

/**
 * 진행률 배치 처리 메트릭
 */
export interface ProgressBatchMetrics {
  /** 총 메시지 수 */
  totalMessages: number;
  
  /** 배치로 전송된 메시지 수 */
  batchedMessages: number;
  
  /** 즉시 전송된 메시지 수 */
  immediateMessages: number;
  
  /** 평균 배치 크기 */
  averageBatchSize: number;
  
  /** 총 배치 전송 횟수 */
  totalBatches: number;
  
  /** 메모리 압박으로 인한 즉시 전송 횟수 */
  memoryPressureFlushes: number;
  
  /** 마지막 배치 전송 시간 */
  lastBatchTime: number;
  
  /** 평균 배치 지연 시간 (ms) */
  averageBatchDelay: number;
}

/**
 * Worker 통계 정보
 */
export interface WorkerStatistics {
  /** Worker ID */
  workerId: string;
  
  /** 생성 시간 */
  createdAt: number;
  
  /** 현재 상태 */
  state: WorkerState;
  
  /** 성능 메트릭 */
  performance: WorkerPerformanceMetrics;
  
  /** 현재 작업 정보 */
  currentTask?: {
    taskId: string;
    startTime: number;
    progress: number;
  };
  
  /** 최근 에러 목록 */
  recentErrors: WorkerError[];
}

// ============================================================================
// Worker Pool Management
// ============================================================================

/**
 * Worker 풀 상태
 */
export interface WorkerPoolState {
  /** 전체 Worker 수 */
  totalWorkers: number;
  
  /** 활성 Worker 수 */
  activeWorkers: number;
  
  /** 유휴 Worker 수 */
  idleWorkers: number;
  
  /** 바쁜 Worker 수 */
  busyWorkers: number;
  
  /** 오류 상태 Worker 수 */
  errorWorkers: number;
  
  /** 대기 중인 작업 수 */
  pendingTasks: number;
  
  /** 처리 중인 작업 수 */
  processingTasks: number;
  
  /** 완료된 작업 수 */
  completedTasks: number;
  
  /** 실패한 작업 수 */
  failedTasks: number;
  
  /** 풀 전체 메모리 사용량 (MB) */
  totalMemoryUsage: number;
  
  /** 풀 평균 CPU 사용률 (%) */
  averageCpuUsage: number;
}

/**
 * Worker 작업 정보
 */
export interface WorkerTask {
  /** 작업 ID */
  taskId: string;
  
  /** 작업 유형 */
  type: WorkerType;
  
  /** 작업 우선순위 */
  priority: WorkerPriority;
  
  /** 작업 구성 */
  config: M4ProcessConfig;
  
  /** 할당된 Worker ID */
  assignedWorkerId?: string;
  
  /** 작업 상태 */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  
  /** 작업 생성 시간 */
  createdAt: number;
  
  /** 작업 시작 시간 */
  startedAt?: number;
  
  /** 작업 완료 시간 */
  completedAt?: number;
  
  /** 진행률 */
  progress: number;
  
  /** 작업 결과 */
  result?: M4ProcessResult;
  
  /** 작업 에러 */
  error?: WorkerError;
  
  /** 재시도 횟수 */
  retryCount: number;
}

// ============================================================================
// Worker Thread Manager Interface
// ============================================================================

/**
 * Worker 스레드 관리자 인터페이스
 */
export interface IWorkerThreadManager {
  /** Worker 풀 초기화 */
  initialize(config: WorkerPoolConfig): Promise<void>;
  
  /** Worker 생성 */
  createWorker(config: WorkerConfig): Promise<string>;
  
  /** 작업 실행 */
  executeTask(task: WorkerTask): Promise<string>;
  
  /** 작업 취소 */
  cancelTask(taskId: string): Promise<boolean>;
  
  /** Worker 상태 조회 */
  getWorkerStatus(workerId: string): Promise<WorkerStatistics>;
  
  /** 풀 상태 조회 */
  getPoolState(): Promise<WorkerPoolState>;
  
  /** Worker 종료 */
  terminateWorker(workerId: string): Promise<boolean>;
  
  /** 풀 종료 */
  terminatePool(): Promise<void>;
  
  /** 리소스 정리 */
  cleanup(): Promise<void>;
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * 기본 Worker 구성
 */
export const DEFAULT_WORKER_CONFIG: Partial<WorkerConfig> = {
  priority: WorkerPriority.MEDIUM,
  maxMemoryUsage: 512, // 512MB
  timeout: 300, // 5분
  retryCount: 3
};

/**
 * 기본 Worker 풀 구성
 */
export const DEFAULT_WORKER_POOL_CONFIG: WorkerPoolConfig = {
  maxWorkers: Math.max(2, require('os').cpus().length - 1),
  minWorkers: 1,
  workerSpawnInterval: 100,
  idleTimeout: 300, // 5분
  cleanupInterval: 60, // 1분
  memoryPressureThreshold: 1024 // 1GB
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * WorkerMessage 타입 가드
 */
export function isWorkerMessage(value: any): value is WorkerMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.type === 'string' &&
    typeof value.messageId === 'string' &&
    typeof value.timestamp === 'number'
  );
}

/**
 * WorkerError 타입 가드
 */
export function isWorkerError(value: any): value is WorkerError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.type === 'string' &&
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    typeof value.severity === 'string' &&
    typeof value.timestamp === 'number' &&
    typeof value.recoverable === 'boolean' &&
    typeof value.retryable === 'boolean'
  );
}

/**
 * WorkerTask 타입 가드
 */
export function isWorkerTask(value: any): value is WorkerTask {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.taskId === 'string' &&
    typeof value.type === 'string' &&
    typeof value.priority === 'string' &&
    typeof value.config === 'object' &&
    typeof value.status === 'string' &&
    typeof value.createdAt === 'number' &&
    typeof value.progress === 'number' &&
    typeof value.retryCount === 'number'
  );
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Worker 메시지 생성
 */
export function createWorkerMessage(
  type: WorkerMessageType,
  data?: any,
  error?: WorkerError,
  responseToId?: string,
  priority?: MessagePriority
): WorkerMessage {
  return {
    type,
    messageId: generateMessageId(),
    responseToId,
    timestamp: Date.now(),
    priority,
    data,
    error
  };
}

/**
 * Worker 에러 생성
 */
export function createWorkerError(
  type: WorkerErrorType,
  code: string,
  message: string,
  severity: WorkerErrorSeverity = WorkerErrorSeverity.MEDIUM,
  recoverable: boolean = true,
  retryable: boolean = true,
  context?: Record<string, any>
): WorkerError {
  return {
    type,
    code,
    message,
    severity,
    timestamp: Date.now(),
    context,
    recoverable,
    retryable
  };
}

/**
 * Worker 작업 생성
 */
export function createWorkerTask(
  type: WorkerType,
  config: M4ProcessConfig,
  priority: WorkerPriority = WorkerPriority.MEDIUM
): WorkerTask {
  return {
    taskId: generateTaskId(),
    type,
    priority,
    config,
    status: 'pending',
    createdAt: Date.now(),
    progress: 0,
    retryCount: 0
  };
}

/**
 * 빈 성능 메트릭 생성
 */
export function createEmptyPerformanceMetrics(): WorkerPerformanceMetrics {
  return {
    memoryUsage: 0,
    cpuUsage: 0,
    tasksProcessed: 0,
    averageProcessingTime: 0,
    totalProcessingTime: 0,
    errorCount: 0,
    uptime: 0,
    lastActivity: Date.now(),
    batchMetrics: createEmptyProgressBatchMetrics()
  };
}

/**
 * 빈 진행률 배치 메트릭 생성
 */
export function createEmptyProgressBatchMetrics(): ProgressBatchMetrics {
  return {
    totalMessages: 0,
    batchedMessages: 0,
    immediateMessages: 0,
    averageBatchSize: 0,
    totalBatches: 0,
    memoryPressureFlushes: 0,
    lastBatchTime: Date.now(),
    averageBatchDelay: 0
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 메시지 ID 생성
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 작업 ID 생성
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Worker ID 생성
 */
export function generateWorkerId(type: WorkerType): string {
  return `worker_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * 우선순위 점수 계산
 */
export function calculatePriorityScore(priority: WorkerPriority): number {
  switch (priority) {
    case WorkerPriority.URGENT: return 4;
    case WorkerPriority.HIGH: return 3;
    case WorkerPriority.MEDIUM: return 2;
    case WorkerPriority.LOW: return 1;
    default: return 2;
  }
}

/**
 * 메시지 우선순위 점수 계산
 */
export function calculateMessagePriorityScore(priority: MessagePriority): number {
  switch (priority) {
    case MessagePriority.URGENT: return 5;
    case MessagePriority.HIGH: return 4;
    case MessagePriority.NORMAL: return 3;
    case MessagePriority.LOW: return 2;
    case MessagePriority.BATCH: return 1;
    default: return 3;
  }
}

/**
 * 메시지 타입별 기본 우선순위 반환
 */
export function getDefaultMessagePriority(messageType: WorkerMessageType): MessagePriority {
  switch (messageType) {
    case WorkerMessageType.ERROR:
    case WorkerMessageType.TERMINATE:
    case WorkerMessageType.TERMINATED:
      return MessagePriority.URGENT;
      
    case WorkerMessageType.CANCEL_PROCESSING:
    case WorkerMessageType.STATUS_REQUEST:
    case WorkerMessageType.STATUS_RESPONSE:
      return MessagePriority.HIGH;
      
    case WorkerMessageType.START_PROCESSING:
    case WorkerMessageType.INITIALIZE:
    case WorkerMessageType.INITIALIZED:
    case WorkerMessageType.PROCESSING_COMPLETE:
    case WorkerMessageType.PAUSE_PROCESSING:
    case WorkerMessageType.RESUME_PROCESSING:
      return MessagePriority.NORMAL;
      
    case WorkerMessageType.HEALTH_CHECK:
    case WorkerMessageType.HEALTH_RESPONSE:
      return MessagePriority.LOW;
      
    case WorkerMessageType.PROGRESS_UPDATE:
      return MessagePriority.BATCH;
      
    default:
      return MessagePriority.NORMAL;
  }
}

/**
 * 메모리 사용량 포맷팅
 */
export function formatMemoryUsage(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

/**
 * 시간 포맷팅
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * CPU 개수 기반 최적 Worker 수 계산
 */
export function calculateOptimalWorkerCount(): number {
  const cpuCount = require('os').cpus().length;
  return Math.max(2, cpuCount - 1);
}

/**
 * 메모리 압박 상태 확인
 */
export function checkMemoryPressure(threshold: number): boolean {
  const memoryUsage = process.memoryUsage();
  const usedMemoryMB = memoryUsage.heapUsed / (1024 * 1024);
  return usedMemoryMB > threshold;
}