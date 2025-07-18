/**
 * M4 Excel Processing Error Types and Context System
 * 
 * Comprehensive error handling system for M4 Dialogue and String processing
 * with Worker Thread serialization support and recovery mechanisms.
 */

import { ProcessStep, ProcessType } from './m4Processing';
import { WorkerErrorSeverity } from './workerTypes';

/**
 * M4 specific error types for Excel processing operations
 */
export enum M4ErrorType {
  // File related errors
  FILE_NOT_FOUND = 'file_not_found',
  FILE_PERMISSION = 'file_permission',
  FILE_CORRUPT = 'file_corrupt',
  FILE_FORMAT = 'file_format',
  FILE_SIZE = 'file_size',
  
  // Data processing errors
  DATA_PARSING = 'data_parsing',
  DATA_VALIDATION = 'data_validation',
  DATA_TRANSFORMATION = 'data_transformation',
  DATA_MAPPING = 'data_mapping',
  
  // Excel specific errors
  EXCEL_WORKBOOK = 'excel_workbook',
  EXCEL_WORKSHEET = 'excel_worksheet',
  EXCEL_COLUMN = 'excel_column',
  EXCEL_ROW = 'excel_row',
  EXCEL_CELL = 'excel_cell',
  
  // Memory and performance errors
  MEMORY_PRESSURE = 'memory_pressure',
  TIMEOUT = 'timeout',
  WORKER_THREAD = 'worker_thread',
  RESOURCE_EXHAUSTED = 'resource_exhausted',
  
  // Output errors
  OUTPUT_GENERATION = 'output_generation',
  OUTPUT_WRITE = 'output_write',
  OUTPUT_PERMISSION = 'output_permission'
}

/**
 * M4 specific error severity levels
 */
export enum M4ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Detailed context information for M4 processing errors
 * NOTE: This is different from M4ErrorContext in shared/types.ts
 * This type is specifically for M4ProcessingError class
 */
export interface M4ProcessingErrorContext {
  // Processing stage information
  stage: ProcessStep;
  processType: ProcessType;
  
  // File information
  fileName?: string;
  filePath?: string;
  sheetName?: string;
  
  // Location information
  rowNumber?: number;
  columnNumber?: number;
  cellAddress?: string;
  
  // Data information
  dataType?: string;
  fieldName?: string;
  fieldValue?: string;
  validationRule?: string;
  
  // System information
  workerId?: string;
  taskId?: string;
  memoryUsage?: number;
  
  // Processing statistics
  processedFiles?: number;
  totalFiles?: number;
  processedRows?: number;
  totalRows?: number;
  
  // File I/O context
  operation?: string;
  fileSize?: number;
  permissions?: string;
  encoding?: string;
  
  // Worker thread context
  threadId?: string;
  isMainThread?: boolean;
  parentPort?: boolean;
  taskQueue?: any[];
  
  // User defined context
  customData?: Record<string, any>;
}

/**
 * Serializable error structure for Worker Thread communication
 */
export interface SerializableM4Error {
  errorId: string;
  errorType: M4ErrorType;
  severity: M4ErrorSeverity;
  message: string;
  userMessage: string;
  technicalMessage: string;
  context: M4ProcessingErrorContext;
  stackTrace?: string;
  timestamp: number;
  recoverable: boolean;
  retryable: boolean;
  resolutionSteps: string[];
  correlationId: string;
  
  // Serialization metadata
  serializedAt: number;
  workerId?: string;
  taskId?: string;
  
  // Error chain support
  cause?: SerializableM4Error;
  
  // System diagnostics
  diagnostics?: {
    nodeVersion: string;
    platform: string;
    architecture: string;
    memoryLimit: number;
    cpuUsage: number;
    diskSpace: number;
  };
}

/**
 * M4 Processing Error class with serialization support
 */
export class M4ProcessingError extends Error {
  public readonly errorId: string;
  public readonly errorType: M4ErrorType;
  public readonly severity: M4ErrorSeverity;
  public readonly context: M4ProcessingErrorContext;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly timestamp: number;
  public readonly userMessage: string;
  public readonly technicalMessage: string;
  public readonly resolutionSteps: string[];
  public readonly serializable: boolean = true;
  public readonly correlationId: string;
  public readonly stackTrace?: string;
  
  constructor(
    message: string,
    errorType: M4ErrorType,
    context: M4ProcessingErrorContext,
    options: {
      severity?: M4ErrorSeverity;
      recoverable?: boolean;
      retryable?: boolean;
      userMessage?: string;
      technicalMessage?: string;
      resolutionSteps?: string[];
      cause?: Error;
    } = {}
  ) {
    super(message);
    
    this.name = 'M4ProcessingError';
    this.errorId = this.generateErrorId();
    this.errorType = errorType;
    this.severity = options.severity || this.determineSeverity(errorType);
    this.context = context;
    this.recoverable = options.recoverable ?? this.determineRecoverable(errorType);
    this.retryable = options.retryable ?? this.determineRetryable(errorType);
    this.timestamp = Date.now();
    this.userMessage = options.userMessage || this.generateUserMessage(errorType, context);
    this.technicalMessage = options.technicalMessage || message;
    this.resolutionSteps = options.resolutionSteps || this.generateResolutionSteps(errorType);
    this.correlationId = this.errorId; // Use errorId as default correlationId
    this.stackTrace = this.stack;
    
    // Maintain error chain
    if (options.cause) {
      (this as any).cause = options.cause;
    }
    
    // Ensure proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, M4ProcessingError);
    }
  }
  
  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `M4E-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Determine severity based on error type
   */
  private determineSeverity(errorType: M4ErrorType): M4ErrorSeverity {
    const severityMap: Record<M4ErrorType, M4ErrorSeverity> = {
      [M4ErrorType.FILE_NOT_FOUND]: M4ErrorSeverity.HIGH,
      [M4ErrorType.FILE_PERMISSION]: M4ErrorSeverity.HIGH,
      [M4ErrorType.FILE_CORRUPT]: M4ErrorSeverity.HIGH,
      [M4ErrorType.FILE_FORMAT]: M4ErrorSeverity.MEDIUM,
      [M4ErrorType.FILE_SIZE]: M4ErrorSeverity.MEDIUM,
      [M4ErrorType.DATA_PARSING]: M4ErrorSeverity.MEDIUM,
      [M4ErrorType.DATA_VALIDATION]: M4ErrorSeverity.MEDIUM,
      [M4ErrorType.DATA_TRANSFORMATION]: M4ErrorSeverity.MEDIUM,
      [M4ErrorType.DATA_MAPPING]: M4ErrorSeverity.MEDIUM,
      [M4ErrorType.EXCEL_WORKBOOK]: M4ErrorSeverity.HIGH,
      [M4ErrorType.EXCEL_WORKSHEET]: M4ErrorSeverity.MEDIUM,
      [M4ErrorType.EXCEL_COLUMN]: M4ErrorSeverity.LOW,
      [M4ErrorType.EXCEL_ROW]: M4ErrorSeverity.LOW,
      [M4ErrorType.EXCEL_CELL]: M4ErrorSeverity.LOW,
      [M4ErrorType.MEMORY_PRESSURE]: M4ErrorSeverity.CRITICAL,
      [M4ErrorType.TIMEOUT]: M4ErrorSeverity.HIGH,
      [M4ErrorType.WORKER_THREAD]: M4ErrorSeverity.CRITICAL,
      [M4ErrorType.RESOURCE_EXHAUSTED]: M4ErrorSeverity.CRITICAL,
      [M4ErrorType.OUTPUT_GENERATION]: M4ErrorSeverity.HIGH,
      [M4ErrorType.OUTPUT_WRITE]: M4ErrorSeverity.HIGH,
      [M4ErrorType.OUTPUT_PERMISSION]: M4ErrorSeverity.HIGH
    };
    
    return severityMap[errorType] || M4ErrorSeverity.MEDIUM;
  }
  
  /**
   * Determine if error is recoverable
   */
  private determineRecoverable(errorType: M4ErrorType): boolean {
    const recoverableErrors = [
      M4ErrorType.FILE_PERMISSION,
      M4ErrorType.DATA_VALIDATION,
      M4ErrorType.DATA_TRANSFORMATION,
      M4ErrorType.EXCEL_WORKSHEET,
      M4ErrorType.EXCEL_COLUMN,
      M4ErrorType.EXCEL_ROW,
      M4ErrorType.EXCEL_CELL,
      M4ErrorType.TIMEOUT,
      M4ErrorType.OUTPUT_PERMISSION
    ];
    
    return recoverableErrors.includes(errorType);
  }
  
  /**
   * Determine if error is retryable
   */
  private determineRetryable(errorType: M4ErrorType): boolean {
    const retryableErrors = [
      M4ErrorType.FILE_PERMISSION,
      M4ErrorType.DATA_PARSING,
      M4ErrorType.EXCEL_WORKBOOK,
      M4ErrorType.EXCEL_WORKSHEET,
      M4ErrorType.MEMORY_PRESSURE,
      M4ErrorType.TIMEOUT,
      M4ErrorType.RESOURCE_EXHAUSTED,
      M4ErrorType.OUTPUT_WRITE,
      M4ErrorType.OUTPUT_PERMISSION
    ];
    
    return retryableErrors.includes(errorType);
  }
  
  /**
   * Generate user-friendly message
   */
  private generateUserMessage(errorType: M4ErrorType, context: M4ProcessingErrorContext): string {
    const messages: Record<M4ErrorType, string> = {
      [M4ErrorType.FILE_NOT_FOUND]: `파일을 찾을 수 없습니다: ${context.fileName || '알 수 없는 파일'}`,
      [M4ErrorType.FILE_PERMISSION]: `파일 접근 권한이 없습니다: ${context.fileName || '알 수 없는 파일'}`,
      [M4ErrorType.FILE_CORRUPT]: `파일이 손상되었습니다: ${context.fileName || '알 수 없는 파일'}`,
      [M4ErrorType.FILE_FORMAT]: `지원되지 않는 파일 형식입니다: ${context.fileName || '알 수 없는 파일'}`,
      [M4ErrorType.FILE_SIZE]: `파일 크기가 너무 큽니다: ${context.fileName || '알 수 없는 파일'}`,
      [M4ErrorType.DATA_PARSING]: `데이터 파싱 중 오류가 발생했습니다`,
      [M4ErrorType.DATA_VALIDATION]: `데이터 검증에 실패했습니다`,
      [M4ErrorType.DATA_TRANSFORMATION]: `데이터 변환 중 오류가 발생했습니다`,
      [M4ErrorType.DATA_MAPPING]: `데이터 매핑 중 오류가 발생했습니다`,
      [M4ErrorType.EXCEL_WORKBOOK]: `Excel 워크북 처리 중 오류가 발생했습니다`,
      [M4ErrorType.EXCEL_WORKSHEET]: `Excel 워크시트 처리 중 오류가 발생했습니다`,
      [M4ErrorType.EXCEL_COLUMN]: `Excel 컬럼 처리 중 오류가 발생했습니다`,
      [M4ErrorType.EXCEL_ROW]: `Excel 행 처리 중 오류가 발생했습니다`,
      [M4ErrorType.EXCEL_CELL]: `Excel 셀 처리 중 오류가 발생했습니다`,
      [M4ErrorType.MEMORY_PRESSURE]: `메모리 부족으로 처리를 계속할 수 없습니다`,
      [M4ErrorType.TIMEOUT]: `처리 시간이 초과되었습니다`,
      [M4ErrorType.WORKER_THREAD]: `백그라운드 처리 중 오류가 발생했습니다`,
      [M4ErrorType.RESOURCE_EXHAUSTED]: `시스템 리소스가 부족합니다`,
      [M4ErrorType.OUTPUT_GENERATION]: `출력 파일 생성 중 오류가 발생했습니다`,
      [M4ErrorType.OUTPUT_WRITE]: `출력 파일 저장 중 오류가 발생했습니다`,
      [M4ErrorType.OUTPUT_PERMISSION]: `출력 파일 저장 권한이 없습니다`
    };
    
    return messages[errorType] || '알 수 없는 오류가 발생했습니다';
  }
  
  /**
   * Generate resolution steps
   */
  private generateResolutionSteps(errorType: M4ErrorType): string[] {
    const steps: Partial<Record<M4ErrorType, string[]>> = {
      [M4ErrorType.FILE_NOT_FOUND]: [
        '파일 경로를 확인하세요',
        '파일이 존재하는지 확인하세요',
        '다른 폴더를 선택해보세요'
      ],
      [M4ErrorType.FILE_PERMISSION]: [
        '파일의 읽기 권한을 확인하세요',
        '관리자 권한으로 실행해보세요',
        '파일이 다른 프로그램에서 열려있는지 확인하세요'
      ],
      [M4ErrorType.FILE_CORRUPT]: [
        '원본 파일을 다시 확인하세요',
        '파일을 다시 다운로드하세요',
        '백업 파일을 사용해보세요'
      ],
      [M4ErrorType.MEMORY_PRESSURE]: [
        '다른 프로그램을 종료하여 메모리를 확보하세요',
        '파일을 더 작은 단위로 나누어 처리하세요',
        '시스템을 재시작하세요'
      ],
      [M4ErrorType.TIMEOUT]: [
        '처리 시간을 늘려보세요',
        '더 작은 파일로 테스트해보세요',
        '시스템 성능을 확인하세요'
      ]
    };
    
    return steps[errorType] || ['문제가 지속되면 지원팀에 문의하세요'];
  }
  
  /**
   * Serialize error for Worker Thread communication
   */
  public serialize(): SerializableM4Error {
    return {
      errorId: this.errorId,
      errorType: this.errorType,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      context: this.context,
      stackTrace: this.stack,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
      retryable: this.retryable,
      resolutionSteps: this.resolutionSteps,
      correlationId: this.correlationId,
      serializedAt: Date.now(),
      workerId: this.context.workerId,
      taskId: this.context.taskId,
      cause: (this as any).cause instanceof M4ProcessingError ? (this as any).cause.serialize() : undefined,
      diagnostics: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memoryLimit: process.memoryUsage().heapTotal,
        cpuUsage: process.cpuUsage().system + process.cpuUsage().user,
        diskSpace: 0 // Will be filled by system check
      }
    };
  }
  
  /**
   * Deserialize error from Worker Thread communication
   */
  public static deserialize(serialized: SerializableM4Error): M4ProcessingError {
    const error = new M4ProcessingError(
      serialized.message,
      serialized.errorType,
      serialized.context,
      {
        severity: serialized.severity,
        recoverable: serialized.recoverable,
        retryable: serialized.retryable,
        userMessage: serialized.userMessage,
        technicalMessage: serialized.technicalMessage,
        resolutionSteps: serialized.resolutionSteps,
        cause: serialized.cause ? M4ProcessingError.deserialize(serialized.cause) : undefined
      }
    );
    
    // Restore serialized properties
    (error as any).errorId = serialized.errorId;
    (error as any).timestamp = serialized.timestamp;
    error.stack = serialized.stackTrace;
    
    // Add worker context
    (error as any).workerContext = {
      workerId: serialized.workerId,
      taskId: serialized.taskId,
      serializedAt: serialized.serializedAt,
      diagnostics: serialized.diagnostics
    };
    
    return error;
  }
}

/**
 * Error context propagation utilities
 */
export class M4ErrorContextPropagator {
  private static instance: M4ErrorContextPropagator;
  private errorHistory: M4ProcessingError[] = [];
  private maxHistorySize = 100;
  
  public static getInstance(): M4ErrorContextPropagator {
    if (!M4ErrorContextPropagator.instance) {
      M4ErrorContextPropagator.instance = new M4ErrorContextPropagator();
    }
    return M4ErrorContextPropagator.instance;
  }
  
  /**
   * Propagate error with context
   */
  public propagateError(error: M4ProcessingError): void {
    this.errorHistory.push(error);
    
    // Maintain history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
    
    // Emit error for external handlers
    process.nextTick(() => {
      process.emit('m4-processing-error' as any, error);
    });
  }
  
  /**
   * Get error history
   */
  public getErrorHistory(): M4ProcessingError[] {
    return [...this.errorHistory];
  }
  
  /**
   * Clear error history
   */
  public clearErrorHistory(): void {
    this.errorHistory = [];
  }
  
  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<M4ErrorType, number>;
    errorsBySeverity: Record<M4ErrorSeverity, number>;
  } {
    const stats = {
      totalErrors: this.errorHistory.length,
      errorsByType: {} as Record<M4ErrorType, number>,
      errorsBySeverity: {} as Record<M4ErrorSeverity, number>
    };
    
    this.errorHistory.forEach(error => {
      stats.errorsByType[error.errorType] = (stats.errorsByType[error.errorType] || 0) + 1;
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
    });
    
    return stats;
  }
}

/**
 * Type guards for error checking
 */
export function isM4ProcessingError(error: any): error is M4ProcessingError {
  return error instanceof M4ProcessingError;
}

export function isSerializableM4Error(error: any): error is SerializableM4Error {
  return typeof error === 'object' && 
         error !== null && 
         'errorId' in error && 
         'errorType' in error && 
         'severity' in error;
}

/**
 * Validate serialized error integrity
 */
export function validateSerializedError(serialized: SerializableM4Error): boolean {
  const requiredFields = [
    'errorId', 'errorType', 'severity', 'message', 
    'context', 'timestamp', 'recoverable', 'retryable'
  ];
  
  return requiredFields.every(field => field in serialized);
}

/**
 * Factory functions for common M4 errors
 */
export class M4ErrorFactory {
  /**
   * Create a generic M4 error
   */
  public static createError(
    errorType: M4ErrorType,
    message: string,
    context: Partial<M4ProcessingErrorContext>,
    options?: {
      severity?: M4ErrorSeverity;
      recoverable?: boolean;
      retryable?: boolean;
      userMessage?: string;
      technicalMessage?: string;
      resolutionSteps?: string[];
      workerId?: string;
    }
  ): M4ProcessingError {
    return new M4ProcessingError(
      message,
      errorType,
      {
        stage: context.stage || ProcessStep.INITIALIZING,
        processType: context.processType || ProcessType.DIALOGUE,
        ...context
      } as M4ProcessingErrorContext,
      options
    );
  }

  public static createFileNotFoundError(fileName: string, context: Partial<M4ProcessingErrorContext> = {}): M4ProcessingError {
    return new M4ProcessingError(
      `File not found: ${fileName}`,
      M4ErrorType.FILE_NOT_FOUND,
      {
        stage: context.stage || ProcessStep.INITIALIZING,
        processType: context.processType || ProcessType.DIALOGUE,
        fileName,
        ...context
      },
      {
        userMessage: `필요한 파일을 찾을 수 없습니다: ${fileName}`,
        resolutionSteps: [
          '파일 경로를 확인하세요',
          '파일이 존재하는지 확인하세요',
          '올바른 폴더를 선택했는지 확인하세요'
        ]
      }
    );
  }
  
  public static createMemoryPressureError(memoryUsage: number, context: Partial<M4ProcessingErrorContext> = {}): M4ProcessingError {
    return new M4ProcessingError(
      `Memory pressure detected: ${memoryUsage}MB`,
      M4ErrorType.MEMORY_PRESSURE,
      {
        stage: context.stage || ProcessStep.PROCESSING,
        processType: context.processType || ProcessType.DIALOGUE,
        memoryUsage,
        ...context
      },
      {
        severity: M4ErrorSeverity.CRITICAL,
        recoverable: true,
        retryable: true,
        userMessage: `메모리 부족으로 처리를 계속할 수 없습니다 (사용량: ${memoryUsage}MB)`,
        resolutionSteps: [
          '다른 프로그램을 종료하여 메모리를 확보하세요',
          '시스템을 재시작하세요',
          '더 작은 파일로 테스트해보세요'
        ]
      }
    );
  }
  
  public static createWorkerThreadError(originalError: Error, context: Partial<M4ProcessingErrorContext> = {}): M4ProcessingError {
    return new M4ProcessingError(
      `Worker thread error: ${originalError.message}`,
      M4ErrorType.WORKER_THREAD,
      {
        stage: context.stage || ProcessStep.PROCESSING,
        processType: context.processType || ProcessType.DIALOGUE,
        ...context
      },
      {
        severity: M4ErrorSeverity.CRITICAL,
        recoverable: false,
        retryable: true,
        cause: originalError,
        userMessage: '백그라운드 처리 중 오류가 발생했습니다',
        technicalMessage: originalError.message,
        resolutionSteps: [
          '작업을 다시 시도하세요',
          '시스템 리소스를 확인하세요',
          '문제가 지속되면 지원팀에 문의하세요'
        ]
      }
    );
  }
}