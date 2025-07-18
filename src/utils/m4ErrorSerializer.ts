/**
 * M4 Error Serialization Utilities
 * 
 * Handles serialization and deserialization of M4 processing errors
 * for Worker Thread communication with proper error context preservation.
 */

import { M4ProcessingError, SerializableM4Error, M4ErrorType, M4ErrorSeverity, M4ProcessingErrorContext } from '../types/m4ProcessingErrors';
import { ProcessStep, ProcessType } from '../types/m4Processing';

/**
 * Error serialization interface
 */
export interface IErrorSerializer {
  serialize(error: Error, context?: M4ProcessingErrorContext): SerializableM4Error;
  deserialize(serialized: SerializableM4Error): M4ProcessingError;
  isSerializable(error: any): boolean;
  getSize(serialized: SerializableM4Error): number;
}

/**
 * Error serialization context
 */
export interface ErrorSerializationContext {
  workerId?: string;
  taskId?: string;
  timestamp?: number;
  additionalData?: Record<string, any>;
}

/**
 * M4 Error Serializer implementation
 */
export class M4ErrorSerializer implements IErrorSerializer {
  private static instance: M4ErrorSerializer;
  
  public static getInstance(): M4ErrorSerializer {
    if (!M4ErrorSerializer.instance) {
      M4ErrorSerializer.instance = new M4ErrorSerializer();
    }
    return M4ErrorSerializer.instance;
  }
  
  /**
   * Serialize error for Worker Thread communication
   */
  public serialize(error: Error, context?: M4ProcessingErrorContext): SerializableM4Error {
    if (error instanceof M4ProcessingError) {
      return error.serialize();
    }
    
    // Convert generic Error to M4ProcessingError
    const m4Error = this.convertToM4Error(error, context);
    return m4Error.serialize();
  }
  
  /**
   * Deserialize error from Worker Thread communication
   */
  public deserialize(serialized: SerializableM4Error): M4ProcessingError {
    return M4ProcessingError.deserialize(serialized);
  }
  
  /**
   * Check if error is serializable
   */
  public isSerializable(error: any): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    
    try {
      // Test serialization
      const serialized = this.serialize(error);
      return serialized !== null && typeof serialized === 'object';
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Calculate serialized error size
   */
  public getSize(serialized: SerializableM4Error): number {
    try {
      return JSON.stringify(serialized).length;
    } catch (e) {
      return 0;
    }
  }
  
  /**
   * Convert generic Error to M4ProcessingError
   */
  private convertToM4Error(error: Error, context?: M4ProcessingErrorContext): M4ProcessingError {
    const errorType = this.inferErrorType(error);
    const errorContext = context || this.createDefaultContext();
    
    return new M4ProcessingError(
      error.message,
      errorType,
      errorContext,
      {
        cause: error,
        technicalMessage: error.message,
        userMessage: this.generateUserMessage(error, errorType)
      }
    );
  }
  
  /**
   * Infer M4 error type from generic error
   */
  private inferErrorType(error: Error): M4ErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    // File related errors
    if (message.includes('enoent') || message.includes('file not found')) {
      return M4ErrorType.FILE_NOT_FOUND;
    }
    if (message.includes('eacces') || message.includes('permission denied')) {
      return M4ErrorType.FILE_PERMISSION;
    }
    if (message.includes('corrupt') || message.includes('invalid format')) {
      return M4ErrorType.FILE_CORRUPT;
    }
    
    // Memory and performance errors
    if (message.includes('out of memory') || message.includes('heap')) {
      return M4ErrorType.MEMORY_PRESSURE;
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return M4ErrorType.TIMEOUT;
    }
    
    // Excel related errors
    if (message.includes('workbook') || message.includes('xlsx')) {
      return M4ErrorType.EXCEL_WORKBOOK;
    }
    if (message.includes('worksheet') || message.includes('sheet')) {
      return M4ErrorType.EXCEL_WORKSHEET;
    }
    
    // Worker thread errors
    if (stack.includes('worker_threads') || message.includes('worker')) {
      return M4ErrorType.WORKER_THREAD;
    }
    
    // Default to generic processing error
    return M4ErrorType.DATA_PARSING;
  }
  
  /**
   * Generate user-friendly message from generic error
   */
  private generateUserMessage(error: Error, errorType: M4ErrorType): string {
    const userMessages: Partial<Record<M4ErrorType, string>> = {
      [M4ErrorType.FILE_NOT_FOUND]: '파일을 찾을 수 없습니다',
      [M4ErrorType.FILE_PERMISSION]: '파일 접근 권한이 없습니다',
      [M4ErrorType.FILE_CORRUPT]: '파일이 손상되었습니다',
      [M4ErrorType.MEMORY_PRESSURE]: '메모리 부족으로 처리할 수 없습니다',
      [M4ErrorType.TIMEOUT]: '처리 시간이 초과되었습니다',
      [M4ErrorType.EXCEL_WORKBOOK]: 'Excel 파일을 열 수 없습니다',
      [M4ErrorType.EXCEL_WORKSHEET]: 'Excel 시트를 읽을 수 없습니다',
      [M4ErrorType.WORKER_THREAD]: '백그라운드 처리 중 오류가 발생했습니다'
    };
    
    return userMessages[errorType] || '처리 중 오류가 발생했습니다';
  }
  
  /**
   * Create default error context
   */
  private createDefaultContext(): M4ProcessingErrorContext {
    return {
      stage: ProcessStep.INITIALIZING,
      processType: ProcessType.DIALOGUE
    };
  }
}

/**
 * Error propagation utilities
 */
export interface ErrorPropagationChannel {
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  timeout: number;
  retries: number;
  fallback: 'log-and-terminate' | 'queue-for-retry' | 'ignore';
}

export interface ErrorPropagationStats {
  totalErrors: number;
  successfulTransmissions: number;
  failedTransmissions: number;
  averageSerializationTime: number;
  averageTransmissionTime: number;
}

/**
 * Error propagator for Worker Thread communication
 */
export class M4ErrorPropagator {
  private static instance: M4ErrorPropagator;
  private stats: ErrorPropagationStats = {
    totalErrors: 0,
    successfulTransmissions: 0,
    failedTransmissions: 0,
    averageSerializationTime: 0,
    averageTransmissionTime: 0
  };
  
  private channels: Record<string, ErrorPropagationChannel> = {
    urgent: {
      priority: 'URGENT',
      timeout: 5000,
      retries: 0,
      fallback: 'log-and-terminate'
    },
    standard: {
      priority: 'HIGH',
      timeout: 15000,
      retries: 2,
      fallback: 'queue-for-retry'
    },
    diagnostic: {
      priority: 'LOW',
      timeout: 60000,
      retries: 1,
      fallback: 'ignore'
    }
  };
  
  public static getInstance(): M4ErrorPropagator {
    if (!M4ErrorPropagator.instance) {
      M4ErrorPropagator.instance = new M4ErrorPropagator();
    }
    return M4ErrorPropagator.instance;
  }
  
  /**
   * Propagate error through Worker Thread message system
   */
  public async propagateError(
    error: Error | M4ProcessingError,
    channel: keyof typeof this.channels = 'standard',
    context?: M4ProcessingErrorContext
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      this.stats.totalErrors++;
      
      // Serialize error
      const serializer = M4ErrorSerializer.getInstance();
      const serialized = serializer.serialize(error, context);
      
      const serializationTime = performance.now() - startTime;
      this.updateAverageSerializationTime(serializationTime);
      
      // Send through appropriate channel
      await this.sendThroughChannel(serialized, this.channels[channel]);
      
      const totalTime = performance.now() - startTime;
      this.updateAverageTransmissionTime(totalTime);
      
      this.stats.successfulTransmissions++;
    } catch (propagationError) {
      this.stats.failedTransmissions++;
      
      // Handle propagation failure
      await this.handlePropagationFailure(error, propagationError, channel);
    }
  }
  
  /**
   * Send error through specified channel
   */
  private async sendThroughChannel(
    serialized: SerializableM4Error,
    channel: ErrorPropagationChannel
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Error propagation timeout after ${channel.timeout}ms`));
      }, channel.timeout);
      
      try {
        // Send message through Worker Thread postMessage
        if (typeof globalThis !== 'undefined' && (globalThis as any).postMessage) {
          // We're in a Worker Thread
          (globalThis as any).postMessage({
            type: 'ERROR',
            priority: channel.priority,
            payload: serialized,
            timestamp: Date.now()
          });
        } else if (process.send) {
          // We're in a child process
          process.send({
            type: 'ERROR',
            priority: channel.priority,
            payload: serialized,
            timestamp: Date.now()
          });
        } else {
          // Fallback to process emission
          process.nextTick(() => {
            // Fallback log for error propagation
            console.warn('M4 Error propagation fallback:', serialized.errorType, serialized.message);
          });
        }
        
        clearTimeout(timeout);
        resolve();
      } catch (sendError) {
        clearTimeout(timeout);
        reject(sendError);
      }
    });
  }
  
  /**
   * Handle propagation failure
   */
  private async handlePropagationFailure(
    originalError: Error | M4ProcessingError,
    propagationError: unknown,
    channel: keyof typeof this.channels
  ): Promise<void> {
    const channelConfig = this.channels[channel];
    
    switch (channelConfig.fallback) {
      case 'log-and-terminate':
        console.error('Critical error propagation failed:', {
          originalError: originalError.message,
          propagationError: propagationError instanceof Error ? propagationError.message : String(propagationError),
          channel
        });
        process.exit(1);
        break;
        
      case 'queue-for-retry':
        // Queue for retry (implement retry queue if needed)
        console.warn('Error propagation failed, queuing for retry:', {
          originalError: originalError.message,
          propagationError: propagationError instanceof Error ? propagationError.message : String(propagationError),
          channel
        });
        break;
        
      case 'ignore':
        // Silently ignore
        break;
    }
  }
  
  /**
   * Update average serialization time
   */
  private updateAverageSerializationTime(time: number): void {
    const total = this.stats.averageSerializationTime * (this.stats.totalErrors - 1);
    this.stats.averageSerializationTime = (total + time) / this.stats.totalErrors;
  }
  
  /**
   * Update average transmission time
   */
  private updateAverageTransmissionTime(time: number): void {
    const total = this.stats.averageTransmissionTime * this.stats.successfulTransmissions;
    this.stats.averageTransmissionTime = (total + time) / (this.stats.successfulTransmissions + 1);
  }
  
  /**
   * Get propagation statistics
   */
  public getStats(): ErrorPropagationStats {
    return { ...this.stats };
  }
  
  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      totalErrors: 0,
      successfulTransmissions: 0,
      failedTransmissions: 0,
      averageSerializationTime: 0,
      averageTransmissionTime: 0
    };
  }
}

/**
 * Error serialization utilities
 */
export class M4ErrorSerializationUtils {
  /**
   * Get enumerable properties from error object
   */
  public static getEnumerableProperties(error: Error): Record<string, any> {
    const properties: Record<string, any> = {};
    
    Object.getOwnPropertyNames(error).forEach(key => {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        try {
          const value = (error as any)[key];
          if (value !== undefined && typeof value !== 'function') {
            properties[key] = value;
          }
        } catch (e) {
          // Ignore properties that can't be accessed
        }
      }
    });
    
    return properties;
  }
  
  /**
   * Calculate memory usage of error object
   */
  public static getErrorMemoryUsage(error: Error): number {
    try {
      const serialized = JSON.stringify(error);
      return serialized.length * 2; // Approximate bytes (UTF-16)
    } catch (e) {
      return 0;
    }
  }
  
  /**
   * Sanitize error for serialization
   */
  public static sanitizeErrorForSerialization(error: Error): Record<string, any> {
    const sanitized: Record<string, any> = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
    
    // Add enumerable properties
    const enumerable = this.getEnumerableProperties(error);
    Object.assign(sanitized, enumerable);
    
    // Remove non-serializable properties
    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      if (typeof value === 'function' || value === undefined) {
        delete sanitized[key];
      }
    });
    
    return sanitized;
  }
  
  /**
   * Validate serialized error integrity
   */
  public static validateSerializedError(serialized: SerializableM4Error): boolean {
    const requiredFields = [
      'errorId', 'errorType', 'severity', 'message', 
      'context', 'timestamp', 'recoverable', 'retryable'
    ];
    
    return requiredFields.every(field => field in serialized);
  }
}

/**
 * Error context builder for common scenarios
 */
export class M4ErrorContextBuilder {
  private context: Partial<M4ProcessingErrorContext> = {};
  
  public static create(): M4ErrorContextBuilder {
    return new M4ErrorContextBuilder();
  }
  
  public withStage(stage: M4ProcessingErrorContext['stage']): M4ErrorContextBuilder {
    this.context.stage = stage;
    return this;
  }
  
  public withProcessType(processType: M4ProcessingErrorContext['processType']): M4ErrorContextBuilder {
    this.context.processType = processType;
    return this;
  }
  
  public withFile(fileName: string, filePath?: string): M4ErrorContextBuilder {
    this.context.fileName = fileName;
    this.context.filePath = filePath;
    return this;
  }
  
  public withSheet(sheetName: string): M4ErrorContextBuilder {
    this.context.sheetName = sheetName;
    return this;
  }
  
  public withLocation(rowNumber?: number, columnNumber?: number, cellAddress?: string): M4ErrorContextBuilder {
    this.context.rowNumber = rowNumber;
    this.context.columnNumber = columnNumber;
    this.context.cellAddress = cellAddress;
    return this;
  }
  
  public withWorker(workerId: string, taskId?: string): M4ErrorContextBuilder {
    this.context.workerId = workerId;
    this.context.taskId = taskId;
    return this;
  }
  
  public withProgress(processedFiles: number, totalFiles: number, processedRows?: number, totalRows?: number): M4ErrorContextBuilder {
    this.context.processedFiles = processedFiles;
    this.context.totalFiles = totalFiles;
    this.context.processedRows = processedRows;
    this.context.totalRows = totalRows;
    return this;
  }
  
  public withMemoryUsage(memoryUsage: number): M4ErrorContextBuilder {
    this.context.memoryUsage = memoryUsage;
    return this;
  }
  
  public withCustomData(customData: Record<string, any>): M4ErrorContextBuilder {
    this.context.customData = customData;
    return this;
  }
  
  public build(): M4ProcessingErrorContext {
    return {
      stage: this.context.stage || ProcessStep.INITIALIZING,
      processType: this.context.processType || ProcessType.DIALOGUE,
      ...this.context
    };
  }
}

/**
 * Update error statistics utility function
 */
export function updateErrorStatistics(error: M4ProcessingError): void {
  const propagator = M4ErrorPropagator.getInstance();
  const stats = propagator.getStats();
  
  // Update error statistics
  stats.totalErrors++;
  
  // Log error statistics update
  console.debug('Error statistics updated:', {
    errorType: error.errorType,
    severity: error.severity,
    totalErrors: stats.totalErrors
  });
}

/**
 * Export singleton instances
 */
export const errorSerializer = M4ErrorSerializer.getInstance();
export const errorPropagator = M4ErrorPropagator.getInstance();
export const errorContextBuilder = M4ErrorContextBuilder;

// ErrorPropagationChannel is already exported above