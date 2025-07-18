/**
 * M4 Worker Thread Error Bridge
 * 
 * Worker Thread에서 Main Process로 M4 에러를 전파하는 메커니즘을 제공합니다.
 * 이 모듈은 Worker Thread와 Main Process 양쪽에서 사용할 수 있도록 설계되었습니다.
 */

import { randomUUID } from 'crypto'
import { parentPort } from 'worker_threads'
import { 
  SerializableM4Error, 
  M4ProcessingError, 
  M4ErrorFactory,
  M4ErrorType,
  M4ErrorSeverity,
  M4ProcessingErrorContext,
  isSerializableM4Error,
  validateSerializedError
} from '../types/m4ProcessingErrors'
import { ProcessStep, ProcessType } from '../types/m4Processing'
import { M4ErrorSerializer } from '../services/m4ErrorIntegration'
import { M4ErrorReportRequest, M4ErrorContext } from '../shared/types'

/**
 * Worker Thread 에러 메시지 타입
 */
export interface M4WorkerErrorMessage {
  type: 'M4_ERROR'
  messageId: string
  timestamp: number
  workerId: string
  taskId?: string
  payload: SerializableM4Error
  priority: 'low' | 'medium' | 'high' | 'critical'
  retryCount: number
  correlationId: string
}

/**
 * Worker Thread 에러 응답 타입
 */
export interface M4WorkerErrorResponse {
  type: 'M4_ERROR_ACK'
  messageId: string
  timestamp: number
  success: boolean
  reportId?: string
  error?: string
}

/**
 * Worker Thread 에러 컨텍스트 업데이트 메시지
 */
export interface M4WorkerContextUpdateMessage {
  type: 'M4_ERROR_CONTEXT_UPDATE'
  messageId: string
  timestamp: number
  workerId: string
  correlationId: string
  context: Partial<M4ErrorContext>
}

/**
 * Worker Thread 브레드크럼 메시지
 */
export interface M4WorkerBreadcrumbMessage {
  type: 'M4_BREADCRUMB'
  messageId: string
  timestamp: number
  workerId: string
  breadcrumb: {
    category: string
    message: string
    level: 'debug' | 'info' | 'warn' | 'error'
    data?: any
  }
}

/**
 * Worker Thread에서 사용할 M4 에러 리포터 클래스
 */
export class M4WorkerErrorBridge {
  private workerId: string
  private messageQueue: M4WorkerErrorMessage[] = []
  private pendingMessages: Map<string, M4WorkerErrorMessage> = new Map()
  private maxRetries: number = 3
  private retryDelay: number = 1000 // 1초

  constructor(workerId: string) {
    this.workerId = workerId
  }

  /**
   * M4 에러를 Main Process로 전파
   */
  public async reportError(
    error: M4ProcessingError,
    taskId?: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string | null> {
    try {
      // 직렬화
      const serializedError = M4ErrorSerializer.serialize(error)
      
      // 워커 메시지 생성
      const message: M4WorkerErrorMessage = {
        type: 'M4_ERROR',
        messageId: randomUUID(),
        timestamp: Date.now(),
        workerId: this.workerId,
        taskId,
        payload: serializedError,
        priority,
        retryCount: 0,
        correlationId: error.correlationId
      }

      // 메시지 전송
      return await this.sendMessage(message)
    } catch (error) {
      console.error('Failed to report M4 error from worker:', error)
      return null
    }
  }

  /**
   * 직렬화된 M4 에러를 Main Process로 전파
   */
  public async reportSerializedError(
    serializedError: SerializableM4Error,
    taskId?: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string | null> {
    try {
      // 유효성 검증
      if (!isSerializableM4Error(serializedError)) {
        throw new Error('Invalid serialized M4 error format')
      }

      if (!validateSerializedError(serializedError)) {
        throw new Error('Serialized error validation failed')
      }

      // 워커 메시지 생성
      const message: M4WorkerErrorMessage = {
        type: 'M4_ERROR',
        messageId: randomUUID(),
        timestamp: Date.now(),
        workerId: this.workerId,
        taskId,
        payload: serializedError,
        priority,
        retryCount: 0,
        correlationId: serializedError.correlationId
      }

      // 메시지 전송
      return await this.sendMessage(message)
    } catch (error) {
      console.error('Failed to report serialized M4 error from worker:', error)
      return null
    }
  }

  /**
   * 간단한 에러 정보로 M4 에러 보고
   */
  public async reportSimpleError(
    errorType: M4ErrorType,
    message: string,
    context: Partial<M4ErrorContext>,
    options: {
      severity?: M4ErrorSeverity
      taskId?: string
      priority?: 'low' | 'medium' | 'high' | 'critical'
      recoverable?: boolean
      retryable?: boolean
      userMessage?: string
      technicalMessage?: string
      resolutionSteps?: string[]
    } = {}
  ): Promise<string | null> {
    try {
      // Convert M4ErrorContext to M4ProcessingErrorContext
      const processingErrorContext: Partial<M4ProcessingErrorContext> = {
        processType: context.processType === 'dialogue' ? ProcessType.DIALOGUE : ProcessType.STRING,
        fileName: context.fileName,
        filePath: context.filePath,
        processedFiles: context.processedFiles,
        totalFiles: context.totalFiles,
        memoryUsage: context.memoryUsage,
        workerId: context.workerId,
        // Map ProcessStep properly
        stage: typeof context.stage === 'number' 
          ? Object.values(ProcessStep)[context.stage] || ProcessStep.INITIALIZING
          : ProcessStep.INITIALIZING,
        // Excel-specific context
        sheetName: context.sheetName,
        rowNumber: context.rowNumber,
        columnNumber: context.columnNumber,
        fieldValue: context.fieldValue,
        dataType: context.dataType,
        validationRule: context.validationRule,
        // File I/O context
        operation: context.operation,
        fileSize: context.fileSize,
        permissions: context.permissions,
        encoding: context.encoding,
        // Worker thread context
        threadId: context.threadId,
        isMainThread: context.isMainThread,
        parentPort: context.parentPort,
        taskQueue: Array.isArray(context.taskQueue) ? context.taskQueue : undefined,
        // Additional context
        customData: context.customData
      };
      
      // M4 에러 생성
      const m4Error = M4ErrorFactory.createError(errorType, message, processingErrorContext, {
        severity: options.severity || M4ErrorSeverity.MEDIUM,
        recoverable: options.recoverable,
        retryable: options.retryable,
        userMessage: options.userMessage,
        technicalMessage: options.technicalMessage,
        resolutionSteps: options.resolutionSteps,
        workerId: this.workerId
      })

      // 에러 보고
      return await this.reportError(m4Error, options.taskId, options.priority)
    } catch (error) {
      console.error('Failed to report simple M4 error from worker:', error)
      return null
    }
  }

  /**
   * 에러 컨텍스트 업데이트를 Main Process로 전파
   */
  public async updateErrorContext(
    correlationId: string,
    context: Partial<M4ErrorContext>
  ): Promise<void> {
    try {
      const message: M4WorkerContextUpdateMessage = {
        type: 'M4_ERROR_CONTEXT_UPDATE',
        messageId: randomUUID(),
        timestamp: Date.now(),
        workerId: this.workerId,
        correlationId,
        context
      }

      await this.sendContextUpdateMessage(message)
    } catch (error) {
      console.error('Failed to update error context from worker:', error)
    }
  }

  /**
   * 브레드크럼 추가를 Main Process로 전파
   */
  public async addBreadcrumb(
    category: string,
    message: string,
    level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    data?: any
  ): Promise<void> {
    try {
      const breadcrumbMessage: M4WorkerBreadcrumbMessage = {
        type: 'M4_BREADCRUMB',
        messageId: randomUUID(),
        timestamp: Date.now(),
        workerId: this.workerId,
        breadcrumb: {
          category,
          message,
          level,
          data
        }
      }

      await this.sendBreadcrumbMessage(breadcrumbMessage)
    } catch (error) {
      console.error('Failed to add breadcrumb from worker:', error)
    }
  }

  /**
   * 메시지 전송 (재시도 로직 포함)
   */
  private async sendMessage(message: M4WorkerErrorMessage): Promise<string | null> {
    return new Promise((resolve, reject) => {
      // 대기 중인 메시지에 추가
      this.pendingMessages.set(message.messageId, message)

      // 메시지 전송 시도
      const attemptSend = async () => {
        try {
          // Worker Thread 환경 확인
          if (typeof process !== 'undefined' && process.send) {
            // Child Process 환경
            process.send(message)
          } else if (parentPort) {
            // Worker Thread 환경
            parentPort.postMessage(message)
          } else {
            // 대체 전송 방법 (console log를 통한 디버깅)
            console.log('M4 Worker Error (no parent port):', JSON.stringify(message, null, 2))
            resolve(null)
            return
          }

          // 응답 대기 타임아웃 설정 (10초)
          const timeout = setTimeout(() => {
            const pendingMessage = this.pendingMessages.get(message.messageId)
            if (pendingMessage && pendingMessage.retryCount < this.maxRetries) {
              pendingMessage.retryCount++
              setTimeout(() => attemptSend(), this.retryDelay * pendingMessage.retryCount)
            } else {
              this.pendingMessages.delete(message.messageId)
              resolve(null)
            }
          }, 10000)

          // 응답 리스너 설정
          const responseListener = (response: any) => {
            if (response.type === 'M4_ERROR_ACK' && response.messageId === message.messageId) {
              clearTimeout(timeout)
              this.pendingMessages.delete(message.messageId)
              
              if (response.success) {
                resolve(response.reportId || 'success')
              } else {
                resolve(null)
              }
            }
          }

          // 환경에 따른 응답 리스너 등록
          if (typeof process !== 'undefined' && process.on) {
            process.on('message', responseListener)
          } else if (parentPort) {
            parentPort.on('message', responseListener)
          }
        } catch (error) {
          console.error('Failed to send M4 error message:', error)
          resolve(null)
        }
      }

      attemptSend()
    })
  }

  /**
   * 컨텍스트 업데이트 메시지 전송
   */
  private async sendContextUpdateMessage(message: M4WorkerContextUpdateMessage): Promise<void> {
    try {
      if (typeof process !== 'undefined' && process.send) {
        process.send(message)
      } else if (parentPort) {
        parentPort.postMessage(message)
      } else {
        console.log('M4 Worker Context Update (no parent port):', JSON.stringify(message, null, 2))
      }
    } catch (error) {
      console.error('Failed to send context update message:', error)
    }
  }

  /**
   * 브레드크럼 메시지 전송
   */
  private async sendBreadcrumbMessage(message: M4WorkerBreadcrumbMessage): Promise<void> {
    try {
      if (typeof process !== 'undefined' && process.send) {
        process.send(message)
      } else if (parentPort) {
        parentPort.postMessage(message)
      } else {
        console.log('M4 Worker Breadcrumb (no parent port):', JSON.stringify(message, null, 2))
      }
    } catch (error) {
      console.error('Failed to send breadcrumb message:', error)
    }
  }

  /**
   * 대기 중인 메시지 개수 조회
   */
  public getPendingMessageCount(): number {
    return this.pendingMessages.size
  }

  /**
   * 대기 중인 메시지 정리
   */
  public clearPendingMessages(): void {
    this.pendingMessages.clear()
  }

  /**
   * Worker ID 조회
   */
  public getWorkerId(): string {
    return this.workerId
  }
}

/**
 * Main Process에서 Worker Thread 에러 메시지를 처리하는 핸들러
 */
export class M4WorkerErrorHandler {
  private reportM4ErrorFn: (errorRequest: M4ErrorReportRequest) => Promise<string | null>
  private updateContextFn: (correlationId: string, context: Partial<M4ErrorContext>) => Promise<void>
  private addBreadcrumbFn: (breadcrumb: any) => void

  constructor(
    reportM4ErrorFn: (errorRequest: M4ErrorReportRequest) => Promise<string | null>,
    updateContextFn: (correlationId: string, context: Partial<M4ErrorContext>) => Promise<void>,
    addBreadcrumbFn: (breadcrumb: any) => void
  ) {
    this.reportM4ErrorFn = reportM4ErrorFn
    this.updateContextFn = updateContextFn
    this.addBreadcrumbFn = addBreadcrumbFn
  }

  /**
   * Worker Thread 메시지 처리
   */
  public async handleWorkerMessage(message: any, worker?: any): Promise<void> {
    try {
      switch (message.type) {
        case 'M4_ERROR':
          await this.handleErrorMessage(message as M4WorkerErrorMessage, worker)
          break
        case 'M4_ERROR_CONTEXT_UPDATE':
          await this.handleContextUpdateMessage(message as M4WorkerContextUpdateMessage)
          break
        case 'M4_BREADCRUMB':
          await this.handleBreadcrumbMessage(message as M4WorkerBreadcrumbMessage)
          break
        default:
          // 다른 메시지 타입은 무시
          break
      }
    } catch (error) {
      console.error('Failed to handle worker message:', error)
    }
  }

  /**
   * 에러 메시지 처리
   */
  private async handleErrorMessage(message: M4WorkerErrorMessage, worker?: any): Promise<void> {
    try {
      // SerializableM4Error를 M4ErrorReportRequest로 변환
      const errorRequest: M4ErrorReportRequest = {
        errorType: message.payload.errorType,
        severity: message.payload.severity,
        message: message.payload.message,
        stackTrace: message.payload.stackTrace,
        context: this.convertToM4ErrorContext(message.payload.context),
        timestamp: message.payload.timestamp,
        correlationId: message.payload.correlationId,
        workerId: message.workerId,
        taskId: message.taskId,
        recoverable: message.payload.recoverable,
        retryable: message.payload.retryable,
        userMessage: message.payload.userMessage,
        technicalMessage: message.payload.technicalMessage,
        resolutionSteps: message.payload.resolutionSteps
      }

      // 에러 보고
      const reportId = await this.reportM4ErrorFn(errorRequest)

      // 응답 전송
      const response: M4WorkerErrorResponse = {
        type: 'M4_ERROR_ACK',
        messageId: message.messageId,
        timestamp: Date.now(),
        success: !!reportId,
        reportId: reportId || undefined,
        error: reportId ? undefined : 'Failed to report error'
      }

      this.sendResponseToWorker(response, worker)
    } catch (error) {
      console.error('Failed to handle error message:', error)
      
      // 에러 응답 전송
      const errorResponse: M4WorkerErrorResponse = {
        type: 'M4_ERROR_ACK',
        messageId: message.messageId,
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }

      this.sendResponseToWorker(errorResponse, worker)
    }
  }

  /**
   * 컨텍스트 업데이트 메시지 처리
   */
  private async handleContextUpdateMessage(message: M4WorkerContextUpdateMessage): Promise<void> {
    try {
      await this.updateContextFn(message.correlationId, message.context)
    } catch (error) {
      console.error('Failed to handle context update message:', error)
    }
  }

  /**
   * 브레드크럼 메시지 처리
   */
  private async handleBreadcrumbMessage(message: M4WorkerBreadcrumbMessage): Promise<void> {
    try {
      this.addBreadcrumbFn({
        category: message.breadcrumb.category,
        message: message.breadcrumb.message,
        level: message.breadcrumb.level,
        data: message.breadcrumb.data
      })
    } catch (error) {
      console.error('Failed to handle breadcrumb message:', error)
    }
  }

  /**
   * Worker에게 응답 전송
   */
  private sendResponseToWorker(response: M4WorkerErrorResponse, worker?: any): void {
    try {
      if (worker && worker.send) {
        worker.send(response)
      } else if (worker && worker.postMessage) {
        worker.postMessage(response)
      } else {
        console.log('M4 Worker Response (no worker reference):', JSON.stringify(response, null, 2))
      }
    } catch (error) {
      console.error('Failed to send response to worker:', error)
    }
  }

  /**
   * SerializableM4Error의 컨텍스트를 M4ErrorContext로 변환
   */
  private convertToM4ErrorContext(context: any): M4ErrorContext {
    return {
      processType: context.processType,
      stage: context.stage,
      fileName: context.fileName,
      filePath: context.filePath,
      processedFiles: context.processedFiles,
      totalFiles: context.totalFiles,
      memoryUsage: context.memoryUsage,
      sheetName: context.sheetName,
      rowNumber: context.rowNumber,
      columnNumber: context.columnNumber,
      fieldValue: context.fieldValue,
      dataType: context.dataType,
      validationRule: context.validationRule,
      operation: context.operation,
      fileSize: context.fileSize,
      permissions: context.permissions,
      encoding: context.encoding,
      threadId: context.threadId,
      isMainThread: context.isMainThread,
      parentPort: context.parentPort,
      taskQueue: context.taskQueue,
      customData: context.customData
    }
  }
}

/**
 * 편의 함수들
 */

/**
 * Worker Thread에서 사용할 글로벌 에러 브리지 인스턴스
 */
let globalWorkerErrorBridge: M4WorkerErrorBridge | null = null

/**
 * 글로벌 Worker Error Bridge 초기화
 */
export function initializeWorkerErrorBridge(workerId: string): M4WorkerErrorBridge {
  globalWorkerErrorBridge = new M4WorkerErrorBridge(workerId)
  return globalWorkerErrorBridge
}

/**
 * 글로벌 Worker Error Bridge 조회
 */
export function getWorkerErrorBridge(): M4WorkerErrorBridge | null {
  return globalWorkerErrorBridge
}

/**
 * Worker Thread에서 간단한 에러 보고
 */
export async function reportWorkerError(
  errorType: M4ErrorType,
  message: string,
  context: Partial<M4ErrorContext>,
  options: {
    severity?: M4ErrorSeverity
    taskId?: string
    priority?: 'low' | 'medium' | 'high' | 'critical'
    recoverable?: boolean
    retryable?: boolean
    userMessage?: string
    technicalMessage?: string
    resolutionSteps?: string[]
  } = {}
): Promise<string | null> {
  if (!globalWorkerErrorBridge) {
    console.error('Worker error bridge not initialized')
    return null
  }

  return await globalWorkerErrorBridge.reportSimpleError(errorType, message, context, options)
}

/**
 * Worker Thread에서 에러 컨텍스트 업데이트
 */
export async function updateWorkerErrorContext(
  correlationId: string,
  context: Partial<M4ErrorContext>
): Promise<void> {
  if (!globalWorkerErrorBridge) {
    console.error('Worker error bridge not initialized')
    return
  }

  await globalWorkerErrorBridge.updateErrorContext(correlationId, context)
}

/**
 * Worker Thread에서 브레드크럼 추가
 */
export async function addWorkerBreadcrumb(
  category: string,
  message: string,
  level: 'debug' | 'info' | 'warn' | 'error' = 'info',
  data?: any
): Promise<void> {
  if (!globalWorkerErrorBridge) {
    console.error('Worker error bridge not initialized')
    return
  }

  await globalWorkerErrorBridge.addBreadcrumb(category, message, level, data)
}