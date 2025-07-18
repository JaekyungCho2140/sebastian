/**
 * M4 Error Integration Service
 * 
 * M4 처리 중 발생하는 에러에 대한 상세한 컨텍스트 정보를 수집하고 구조화하여
 * Sebastian의 ErrorReport 형식으로 변환하는 통합 서비스입니다.
 * 
 * 주요 기능:
 * 1. M4ProcessingError를 Sebastian ErrorReport로 변환
 * 2. 컨텍스트 빌더: 파일명, 처리 단계, 워커 스레드 정보, 행/열 정보 수집
 * 3. 에러 컨텍스트 강화: 시스템 정보, 메모리 사용량, 진행률 추가
 * 4. 직렬화/역직렬화 지원: Worker Thread 간 에러 전파 지원
 * 5. 성능 최적화: 컨텍스트 수집 시 오버헤드 최소화
 */

import { randomUUID } from 'crypto';
import { cpus, totalmem, freemem, platform, arch } from 'os';
import log from 'electron-log';
import { app } from 'electron';
import { ProcessStep, ProcessType } from '../types/m4Processing';
import {
  ErrorReport,
  SystemInfo,
  ErrorContext,
  ErrorBreadcrumb,
  ErrorSeverity,
  ErrorType,
  M4Context,
  M4ProcessStep,
  createM4ErrorContext,
  updateM4ErrorContext,
  getM4ErrorSeverity,
  getM4ErrorMessage,
  calculateM4Progress,
  getM4ProcessStepOrder,
  M4_ERROR_TYPES
} from '../shared/types';
import { 
  M4ProcessingError,
  M4ErrorType,
  M4ErrorSeverity,
  M4ProcessingErrorContext,
  SerializableM4Error,
  isM4ProcessingError,
  isSerializableM4Error,
  validateSerializedError,
  M4ErrorFactory
} from '../types/m4ProcessingErrors';

/**
 * M4 에러 컨텍스트 수집 옵션
 */
export interface M4ErrorContextOptions {
  /** 시스템 정보 수집 여부 */
  includeSystemInfo?: boolean;
  /** 메모리 사용량 수집 여부 */
  includeMemoryInfo?: boolean;
  /** 파일 시스템 정보 수집 여부 */
  includeFileSystemInfo?: boolean;
  /** 워커 스레드 정보 수집 여부 */
  includeWorkerInfo?: boolean;
  /** 성능 최적화 모드 */
  performanceMode?: 'minimal' | 'standard' | 'detailed';
}

/**
 * M4 에러 통계 정보
 */
export interface M4ErrorStats {
  /** 총 에러 수 */
  totalErrors: number;
  /** 에러 타입별 분포 */
  errorsByType: Record<M4ErrorType, number>;
  /** 심각도별 분포 */
  errorsBySeverity: Record<M4ErrorSeverity, number>;
  /** 처리 단계별 분포 */
  errorsByProcessStep: Record<M4ProcessStep, number>;
  /** 처리 타입별 분포 */
  errorsByProcessType: Record<'dialogue' | 'string', number>;
  /** 가장 최근 에러 */
  lastError?: M4ProcessingError;
  /** 에러 발생률 (시간당) */
  errorRate?: number;
}

/**
 * M4 에러 컨텍스트 빌더
 */
export class M4ErrorContextBuilder {
  private context: Partial<M4Context> = {};
  private options: M4ErrorContextOptions;

  constructor(options: M4ErrorContextOptions = {}) {
    this.options = {
      includeSystemInfo: true,
      includeMemoryInfo: true,
      includeFileSystemInfo: true,
      includeWorkerInfo: true,
      performanceMode: 'standard',
      ...options
    };
  }

  /**
   * 기본 컨텍스트 설정
   */
  public setBasicContext(
    processStep: M4ProcessStep,
    processType: 'dialogue' | 'string'
  ): this {
    this.context.processStep = processStep;
    this.context.processType = processType;
    this.context.startTime = Date.now();
    return this;
  }

  /**
   * 파일 정보 설정
   */
  public setFileInfo(
    currentFile?: string,
    inputPath?: string,
    outputPath?: string
  ): this {
    if (currentFile) this.context.currentFile = currentFile;
    if (inputPath) this.context.inputPath = inputPath;
    if (outputPath) this.context.outputPath = outputPath;
    return this;
  }

  /**
   * 진행률 정보 설정
   */
  public setProgressInfo(
    processedCount?: number,
    totalFiles?: number
  ): this {
    if (processedCount !== undefined) this.context.processedCount = processedCount;
    if (totalFiles !== undefined) this.context.totalFiles = totalFiles;
    return this;
  }

  /**
   * 워커 스레드 정보 설정
   */
  public setWorkerInfo(workerId?: string): this {
    if (this.options.includeWorkerInfo && workerId) {
      this.context.workerId = workerId;
    }
    return this;
  }

  /**
   * 메모리 사용량 설정
   */
  public setMemoryUsage(memoryUsage?: number): this {
    if (this.options.includeMemoryInfo && memoryUsage !== undefined) {
      this.context.memoryUsage = memoryUsage;
    }
    return this;
  }

  /**
   * 에러 세부 정보 설정 (엑셀 관련)
   */
  public setExcelErrorDetails(
    sheetName?: string,
    rowIndex?: number,
    columnIndex?: number,
    cellValue?: string,
    expectedFormat?: string
  ): this {
    if (!this.context.errorDetails) {
      this.context.errorDetails = {};
    }
    
    this.context.errorDetails.excelDetails = {
      sheetName,
      rowIndex,
      columnIndex,
      cellValue,
      expectedFormat
    };
    
    return this;
  }

  /**
   * 워커 스레드 에러 세부 정보 설정
   */
  public setWorkerErrorDetails(
    threadId?: string,
    taskQueue?: number,
    isMainThread?: boolean,
    parentPort?: boolean
  ): this {
    if (!this.context.errorDetails) {
      this.context.errorDetails = {};
    }
    
    this.context.errorDetails.workerDetails = {
      threadId,
      taskQueue,
      isMainThread,
      parentPort
    };
    
    return this;
  }

  /**
   * 파일 I/O 에러 세부 정보 설정
   */
  public setFileIOErrorDetails(
    operation?: 'read' | 'write' | 'create' | 'delete' | 'move',
    fileSize?: number,
    permissions?: string,
    encoding?: string
  ): this {
    if (!this.context.errorDetails) {
      this.context.errorDetails = {};
    }
    
    this.context.errorDetails.fileIODetails = {
      operation,
      fileSize,
      permissions,
      encoding
    };
    
    return this;
  }

  /**
   * 데이터 검증 에러 세부 정보 설정
   */
  public setValidationErrorDetails(
    validationRule?: string,
    expectedValue?: string,
    actualValue?: string,
    fieldName?: string,
    recordIndex?: number
  ): this {
    if (!this.context.errorDetails) {
      this.context.errorDetails = {};
    }
    
    this.context.errorDetails.validationDetails = {
      validationRule,
      expectedValue,
      actualValue,
      fieldName,
      recordIndex
    };
    
    return this;
  }

  /**
   * 컨텍스트 빌드
   */
  public build(): M4Context {
    const baseContext: M4Context = {
      processStep: this.context.processStep || M4ProcessStep.INITIALIZATION,
      processType: this.context.processType || 'dialogue',
      startTime: this.context.startTime || Date.now(),
      ...this.context
    };

    // 성능 최적화에 따른 추가 정보 수집
    if (this.options.performanceMode === 'detailed') {
      this.enhanceContextWithDetailedInfo(baseContext);
    } else if (this.options.performanceMode === 'standard') {
      this.enhanceContextWithStandardInfo(baseContext);
    }

    return baseContext;
  }

  /**
   * 표준 정보로 컨텍스트 강화
   */
  private enhanceContextWithStandardInfo(context: M4Context): void {
    if (this.options.includeMemoryInfo && !context.memoryUsage) {
      const memoryUsage = process.memoryUsage();
      context.memoryUsage = Math.round(memoryUsage.heapUsed / 1024 / 1024); // MB
    }
  }

  /**
   * 상세 정보로 컨텍스트 강화
   */
  private enhanceContextWithDetailedInfo(context: M4Context): void {
    this.enhanceContextWithStandardInfo(context);
    
    // 추가 시스템 정보 수집 (성능 오버헤드 있음)
    if (this.options.includeSystemInfo) {
      // CPU 사용률, 디스크 사용률 등 추가 정보
      // 실제 구현에서는 더 많은 정보를 수집할 수 있음
    }
  }

  /**
   * 컨텍스트 복사
   */
  public static fromContext(existingContext: M4Context): M4ErrorContextBuilder {
    const builder = new M4ErrorContextBuilder();
    builder.context = { ...existingContext };
    return builder;
  }
}

/**
 * M4 에러를 Sebastian ErrorReport로 변환하는 팩토리
 */
export class M4ErrorReportFactory {
  private sessionId: string;
  private breadcrumbs: ErrorBreadcrumb[] = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * M4ProcessingError를 Sebastian ErrorReport로 변환
   */
  public async convertToErrorReport(
    m4Error: M4ProcessingError,
    additionalContext?: Partial<ErrorContext>
  ): Promise<ErrorReport> {
    const systemInfo = await this.getSystemInfo();
    const sebastianErrorType = this.mapM4ErrorTypeToSebastianType(m4Error.errorType);
    const sebastianSeverity = this.mapM4SeverityToSebastianSeverity(m4Error.severity);

    const errorReport: ErrorReport = {
      id: randomUUID(),
      timestamp: m4Error.timestamp,
      severity: sebastianSeverity,
      errorType: sebastianErrorType,
      processType: 'main',
      message: m4Error.message,
      stack: m4Error.stack,
      systemInfo,
      context: {
        sessionId: this.sessionId,
        m4Context: processingErrorContextToM4Context(m4Error.context),
        ...additionalContext
      },
      breadcrumbs: [...this.breadcrumbs],
      tags: this.generateTags(m4Error),
      fingerprint: this.generateFingerprint(m4Error)
    };

    return errorReport;
  }

  /**
   * SerializableM4Error를 Sebastian ErrorReport로 변환
   */
  public async convertSerializableToErrorReport(
    serializedError: SerializableM4Error,
    additionalContext?: Partial<ErrorContext>
  ): Promise<ErrorReport> {
    // 유효성 검증
    if (!validateSerializedError(serializedError)) {
      throw new Error('Invalid serialized M4 error format');
    }

    const systemInfo = await this.getSystemInfo();
    const sebastianErrorType = this.mapM4ErrorTypeToSebastianType(serializedError.errorType);
    const sebastianSeverity = this.mapM4SeverityToSebastianSeverity(serializedError.severity);

    // M4Context 생성
    const m4Context = this.createM4ContextFromSerialized(serializedError);

    const errorReport: ErrorReport = {
      id: randomUUID(),
      timestamp: serializedError.timestamp,
      severity: sebastianSeverity,
      errorType: sebastianErrorType,
      processType: 'main',
      message: serializedError.message,
      stack: serializedError.stackTrace,
      systemInfo,
      context: {
        sessionId: this.sessionId,
        m4Context,
        ...additionalContext
      },
      breadcrumbs: [...this.breadcrumbs],
      tags: this.generateTagsFromSerialized(serializedError),
      fingerprint: this.generateFingerprintFromSerialized(serializedError)
    };

    return errorReport;
  }

  /**
   * M4ErrorType을 Sebastian ErrorType으로 매핑
   */
  private mapM4ErrorTypeToSebastianType(m4ErrorType: M4ErrorType): ErrorType {
    const typeMap: Record<M4ErrorType, ErrorType> = {
      [M4ErrorType.FILE_NOT_FOUND]: 'filesystem',
      [M4ErrorType.FILE_PERMISSION]: 'filesystem',
      [M4ErrorType.FILE_CORRUPT]: 'filesystem',
      [M4ErrorType.FILE_FORMAT]: 'filesystem',
      [M4ErrorType.FILE_SIZE]: 'filesystem',
      [M4ErrorType.DATA_PARSING]: 'm4-excel-parse',
      [M4ErrorType.DATA_VALIDATION]: 'm4-data-validation',
      [M4ErrorType.DATA_TRANSFORMATION]: 'm4-data-validation',
      [M4ErrorType.DATA_MAPPING]: 'm4-data-validation',
      [M4ErrorType.EXCEL_WORKBOOK]: 'm4-excel-parse',
      [M4ErrorType.EXCEL_WORKSHEET]: 'm4-excel-parse',
      [M4ErrorType.EXCEL_COLUMN]: 'm4-excel-parse',
      [M4ErrorType.EXCEL_ROW]: 'm4-excel-parse',
      [M4ErrorType.EXCEL_CELL]: 'm4-excel-parse',
      [M4ErrorType.MEMORY_PRESSURE]: 'main-process',
      [M4ErrorType.TIMEOUT]: 'main-process',
      [M4ErrorType.WORKER_THREAD]: 'm4-worker-thread',
      [M4ErrorType.RESOURCE_EXHAUSTED]: 'main-process',
      [M4ErrorType.OUTPUT_GENERATION]: 'm4-file-io',
      [M4ErrorType.OUTPUT_WRITE]: 'm4-file-io',
      [M4ErrorType.OUTPUT_PERMISSION]: 'filesystem'
    };

    return typeMap[m4ErrorType] || 'm4-process-type';
  }

  /**
   * M4ErrorSeverity를 Sebastian ErrorSeverity로 매핑
   */
  private mapM4SeverityToSebastianSeverity(m4Severity: M4ErrorSeverity): ErrorSeverity {
    const severityMap: Record<M4ErrorSeverity, ErrorSeverity> = {
      [M4ErrorSeverity.LOW]: 'low',
      [M4ErrorSeverity.MEDIUM]: 'medium',
      [M4ErrorSeverity.HIGH]: 'high',
      [M4ErrorSeverity.CRITICAL]: 'critical'
    };

    return severityMap[m4Severity] || 'medium';
  }

  /**
   * SerializableM4Error에서 M4Context 생성
   */
  private createM4ContextFromSerialized(serializedError: SerializableM4Error): M4Context {
    // stage를 M4ProcessStep으로 변환 (ProcessStep -> M4ProcessStep)
    const processStep = processStepToM4ProcessStep(serializedError.context.stage);
    
    return {
      processStep,
      processType: serializedError.context.processType as 'dialogue' | 'string',
      currentFile: serializedError.context.fileName,
      processedCount: serializedError.context.processedFiles,
      totalFiles: serializedError.context.totalFiles,
      workerId: serializedError.workerId,
      memoryUsage: serializedError.context.memoryUsage,
      startTime: serializedError.timestamp,
      inputPath: serializedError.context.filePath,
      errorDetails: {
        excelDetails: serializedError.context.sheetName ? {
          sheetName: serializedError.context.sheetName,
          rowIndex: serializedError.context.rowNumber,
          columnIndex: serializedError.context.columnNumber,
          cellValue: serializedError.context.fieldValue,
          expectedFormat: serializedError.context.dataType
        } : undefined,
        workerDetails: serializedError.workerId ? {
          threadId: serializedError.workerId,
          taskQueue: undefined,
          isMainThread: false,
          parentPort: true
        } : undefined
      }
    };
  }

  /**
   * 태그 생성
   */
  private generateTags(m4Error: M4ProcessingError): string[] {
    const tags = [
      'm4-processing',
      m4Error.context.processType === ProcessType.DIALOGUE ? 'dialogue' : 'string',
      m4Error.context.stage,
      m4Error.errorType
    ];

    if (m4Error.context.workerId) {
      tags.push('worker-thread');
    }

    if (m4Error.recoverable) {
      tags.push('recoverable');
    }

    if (m4Error.retryable) {
      tags.push('retryable');
    }

    return tags;
  }

  /**
   * SerializableM4Error에서 태그 생성
   */
  private generateTagsFromSerialized(serializedError: SerializableM4Error): string[] {
    const tags = [
      'm4-processing',
      serializedError.context.processType,
      serializedError.context.stage.toString(),
      serializedError.errorType
    ];

    if (serializedError.workerId) {
      tags.push('worker-thread');
    }

    if (serializedError.recoverable) {
      tags.push('recoverable');
    }

    if (serializedError.retryable) {
      tags.push('retryable');
    }

    return tags;
  }

  /**
   * 지문 생성
   */
  private generateFingerprint(m4Error: M4ProcessingError): string {
    const processType = m4Error.context.processType === ProcessType.DIALOGUE ? 'dialogue' : 'string';
    const key = `${m4Error.errorType}-${m4Error.context.stage}-${processType}-${m4Error.message}`;
    return Buffer.from(key).toString('base64').slice(0, 16);
  }

  /**
   * SerializableM4Error에서 지문 생성
   */
  private generateFingerprintFromSerialized(serializedError: SerializableM4Error): string {
    const key = `${serializedError.errorType}-${processStepToM4ProcessStep(serializedError.context.stage)}-${serializedError.context.processType}-${serializedError.message}`;
    return Buffer.from(key).toString('base64').slice(0, 16);
  }

  /**
   * 시스템 정보 수집
   */
  private async getSystemInfo(): Promise<SystemInfo> {
    const cpu = cpus()[0];
    
    return {
      platform: platform(),
      arch: arch(),
      osVersion: process.platform,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron || 'unknown',
      appVersion: app.getVersion(),
      totalMemory: totalmem(),
      freeMemory: freemem(),
      cpuModel: cpu ? cpu.model : 'unknown',
      cpuCount: cpus().length
    };
  }

  /**
   * Breadcrumb 추가
   */
  public addBreadcrumb(breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>): void {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: Date.now()
    });

    // 최대 50개 유지
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50);
    }
  }

  /**
   * Breadcrumb 초기화
   */
  public clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * 세션 ID 조회
   */
  public getSessionId(): string {
    return this.sessionId;
  }
}

/**
 * M4 에러 컨텍스트 강화 서비스
 */
export class M4ErrorContextEnhancer {
  private performanceOptimization: boolean;

  constructor(performanceOptimization: boolean = true) {
    this.performanceOptimization = performanceOptimization;
  }

  /**
   * 에러 컨텍스트 강화
   */
  public async enhanceErrorContext(
    context: M4Context,
    options: M4ErrorContextOptions = {}
  ): Promise<M4Context> {
    const enhancedContext = { ...context };

    // 시스템 정보 추가
    if (options.includeSystemInfo !== false) {
      await this.addSystemInfo(enhancedContext);
    }

    // 메모리 사용량 추가
    if (options.includeMemoryInfo !== false) {
      this.addMemoryInfo(enhancedContext);
    }

    // 진행률 계산
    this.calculateProgress(enhancedContext);

    // 처리 시간 계산
    this.calculateProcessingTime(enhancedContext);

    return enhancedContext;
  }

  /**
   * 시스템 정보 추가
   */
  private async addSystemInfo(context: M4Context): Promise<void> {
    if (this.performanceOptimization) {
      // 성능 최적화 모드에서는 기본 정보만 수집
      const memoryUsage = process.memoryUsage();
      context.memoryUsage = Math.round(memoryUsage.heapUsed / 1024 / 1024); // MB
    } else {
      // 상세 정보 수집 (성능 오버헤드 있음)
      const memoryUsage = process.memoryUsage();
      context.memoryUsage = Math.round(memoryUsage.heapUsed / 1024 / 1024); // MB
      
      // 추가 시스템 정보 수집 가능
      // 예: CPU 사용률, 디스크 사용률 등
    }
  }

  /**
   * 메모리 정보 추가
   */
  private addMemoryInfo(context: M4Context): void {
    if (!context.memoryUsage) {
      const memoryUsage = process.memoryUsage();
      context.memoryUsage = Math.round(memoryUsage.heapUsed / 1024 / 1024); // MB
    }
  }

  /**
   * 진행률 계산
   */
  private calculateProgress(context: M4Context): void {
    if (context.processedCount !== undefined && context.totalFiles !== undefined) {
      const progress = calculateM4Progress(context);
      // 진행률 정보를 컨텍스트에 추가할 수 있음
    }
  }

  /**
   * 처리 시간 계산
   */
  private calculateProcessingTime(context: M4Context): void {
    if (context.startTime) {
      const processingTime = Date.now() - context.startTime;
      // 처리 시간 정보를 컨텍스트에 추가할 수 있음
    }
  }
}

/**
 * M4 에러 직렬화/역직렬화 유틸리티
 */
export class M4ErrorSerializer {
  /**
   * M4ProcessingError를 직렬화
   */
  public static serialize(error: M4ProcessingError): SerializableM4Error {
    if (!isM4ProcessingError(error)) {
      throw new Error('Invalid M4ProcessingError instance');
    }

    return error.serialize();
  }

  /**
   * SerializableM4Error를 역직렬화
   */
  public static deserialize(serializedError: SerializableM4Error): M4ProcessingError {
    if (!isSerializableM4Error(serializedError)) {
      throw new Error('Invalid SerializableM4Error format');
    }

    if (!validateSerializedError(serializedError)) {
      throw new Error('Serialized error validation failed');
    }

    return M4ProcessingError.deserialize(serializedError);
  }

  /**
   * 직렬화된 에러를 Worker Thread 간 안전하게 전송
   */
  public static createWorkerMessage(
    error: M4ProcessingError,
    messageType: 'error' | 'warning' | 'info' = 'error'
  ): any {
    const serialized = this.serialize(error);
    
    return {
      type: messageType,
      timestamp: Date.now(),
      payload: serialized,
      metadata: {
        workerId: serialized.workerId,
        taskId: serialized.taskId,
        serializedAt: serialized.serializedAt
      }
    };
  }

  /**
   * Worker Thread 메시지에서 에러 추출
   */
  public static extractErrorFromWorkerMessage(message: any): M4ProcessingError | null {
    if (!message || !message.payload) {
      return null;
    }

    try {
      return this.deserialize(message.payload);
    } catch (error) {
      log.error('Failed to deserialize error from worker message:', error);
      return null;
    }
  }
}

/**
 * M4 에러 통합 서비스 - 메인 클래스
 */
export class M4ErrorIntegrationService {
  private errorReportFactory: M4ErrorReportFactory;
  private contextEnhancer: M4ErrorContextEnhancer;
  private errorHistory: M4ProcessingError[] = [];
  private maxHistorySize: number = 100;

  constructor(
    sessionId: string,
    options: {
      performanceOptimization?: boolean;
      maxHistorySize?: number;
    } = {}
  ) {
    this.errorReportFactory = new M4ErrorReportFactory(sessionId);
    this.contextEnhancer = new M4ErrorContextEnhancer(options.performanceOptimization);
    this.maxHistorySize = options.maxHistorySize || 100;
  }

  /**
   * M4 에러를 Sebastian ErrorReport로 변환 및 처리
   */
  public async processM4Error(
    m4Error: M4ProcessingError,
    additionalContext?: Partial<ErrorContext>
  ): Promise<ErrorReport> {
    // 에러 히스토리에 추가
    this.addToHistory(m4Error);

    // 컨텍스트 강화
    // Convert M4ProcessingErrorContext to M4Context
    const m4Context = processingErrorContextToM4Context(m4Error.context);
    const enhancedM4Context = await this.contextEnhancer.enhanceErrorContext(
      m4Context
    );
    // Convert back to M4ProcessingErrorContext
    const enhancedContext = m4ContextToProcessingErrorContext(enhancedM4Context);

    // 강화된 컨텍스트로 에러 업데이트
    const enhancedError = new M4ProcessingError(
      m4Error.message,
      m4Error.errorType,
      enhancedContext,
      {
        severity: m4Error.severity,
        recoverable: m4Error.recoverable,
        retryable: m4Error.retryable,
        userMessage: m4Error.userMessage,
        technicalMessage: m4Error.technicalMessage,
        resolutionSteps: m4Error.resolutionSteps
      }
    );

    // Sebastian ErrorReport로 변환
    const errorReport = await this.errorReportFactory.convertToErrorReport(
      enhancedError,
      additionalContext
    );

    return errorReport;
  }

  /**
   * 직렬화된 M4 에러를 Sebastian ErrorReport로 변환 및 처리
   */
  public async processSerializedM4Error(
    serializedError: SerializableM4Error,
    additionalContext?: Partial<ErrorContext>
  ): Promise<ErrorReport> {
    // 역직렬화
    const m4Error = M4ErrorSerializer.deserialize(serializedError);

    // 일반 M4 에러 처리 플로우 사용
    return await this.processM4Error(m4Error, additionalContext);
  }

  /**
   * 에러 히스토리에 추가
   */
  private addToHistory(error: M4ProcessingError): void {
    this.errorHistory.push(error);

    // 히스토리 크기 제한
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * 에러 통계 생성
   */
  public generateErrorStats(): M4ErrorStats {
    const stats: M4ErrorStats = {
      totalErrors: this.errorHistory.length,
      errorsByType: {} as Record<M4ErrorType, number>,
      errorsBySeverity: {} as Record<M4ErrorSeverity, number>,
      errorsByProcessStep: {} as Record<M4ProcessStep, number>,
      errorsByProcessType: {} as Record<'dialogue' | 'string', number>,
      lastError: this.errorHistory[this.errorHistory.length - 1]
    };

    // 통계 계산
    this.errorHistory.forEach(error => {
      // 타입별 집계
      stats.errorsByType[error.errorType] = (stats.errorsByType[error.errorType] || 0) + 1;
      
      // 심각도별 집계
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
      
      // 처리 단계별 집계 - M4ProcessingError.context는 ProcessStep를 가지고 있음
      const m4ProcessStep = processStepToM4ProcessStep(error.context.stage);
      stats.errorsByProcessStep[m4ProcessStep] = (stats.errorsByProcessStep[m4ProcessStep] || 0) + 1;
      
      // 처리 타입별 집계
      const processType = error.context.processType === ProcessType.DIALOGUE ? 'dialogue' : 'string';
      stats.errorsByProcessType[processType] = (stats.errorsByProcessType[processType] || 0) + 1;
    });

    // 에러 발생률 계산 (최근 1시간 기준)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(error => error.timestamp > oneHourAgo);
    stats.errorRate = recentErrors.length;

    return stats;
  }

  /**
   * 에러 히스토리 초기화
   */
  public clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * 에러 히스토리 조회
   */
  public getErrorHistory(): M4ProcessingError[] {
    return [...this.errorHistory];
  }

  /**
   * Breadcrumb 추가
   */
  public addBreadcrumb(breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>): void {
    this.errorReportFactory.addBreadcrumb(breadcrumb);
  }

  /**
   * Breadcrumb 초기화
   */
  public clearBreadcrumbs(): void {
    this.errorReportFactory.clearBreadcrumbs();
  }

  /**
   * 세션 ID 조회
   */
  public getSessionId(): string {
    return this.errorReportFactory.getSessionId();
  }
}

/**
 * M4 에러 컨텍스트 강화 함수 (편의 함수)
 */
export async function enhanceM4ErrorContext(
  error: M4ProcessingError,
  options: M4ErrorContextOptions = {}
): Promise<M4ProcessingError> {
  const enhancer = new M4ErrorContextEnhancer(!options.performanceMode || options.performanceMode !== 'minimal');
  // Convert M4ProcessingErrorContext to M4Context
  const m4Context = processingErrorContextToM4Context(error.context);
  const enhancedM4Context = await enhancer.enhanceErrorContext(m4Context, options);
  // Convert back to M4ProcessingErrorContext
  const enhancedContext = m4ContextToProcessingErrorContext(enhancedM4Context);
  
  return new M4ProcessingError(
    error.message,
    error.errorType,
    enhancedContext,
    {
      severity: error.severity,
      recoverable: error.recoverable,
      retryable: error.retryable,
      userMessage: error.userMessage,
      technicalMessage: error.technicalMessage,
      resolutionSteps: error.resolutionSteps
    }
  );
}

/**
 * M4 에러 컨텍스트 빌더 생성 함수 (편의 함수)
 */
export function createM4ErrorContextBuilder(
  options: M4ErrorContextOptions = {}
): M4ErrorContextBuilder {
  return new M4ErrorContextBuilder(options);
}

/**
 * M4 에러 통합 서비스 인스턴스 생성 함수 (편의 함수)
 */
export function createM4ErrorIntegrationService(
  sessionId: string,
  options: {
    performanceOptimization?: boolean;
    maxHistorySize?: number;
  } = {}
): M4ErrorIntegrationService {
  return new M4ErrorIntegrationService(sessionId, options);
}

/**
 * Convert between ProcessStep enum and M4ProcessStep enum
 */
export function processStepToM4ProcessStep(step: ProcessStep | number | string): M4ProcessStep {
  // Handle number input
  if (typeof step === 'number') {
    const stepValues = Object.values(ProcessStep);
    if (step >= 0 && step < stepValues.length) {
      step = stepValues[step];
    } else {
      return M4ProcessStep.INITIALIZATION;
    }
  }
  
  // Handle string input (already a ProcessStep value)
  if (typeof step === 'string') {
    // Try to find matching ProcessStep
    const processStep = Object.values(ProcessStep).find(ps => ps === step);
    if (processStep) {
      step = processStep;
    } else {
      return M4ProcessStep.INITIALIZATION;
    }
  }
  
  const mapping: Record<ProcessStep, M4ProcessStep> = {
    [ProcessStep.INITIALIZING]: M4ProcessStep.INITIALIZATION,
    [ProcessStep.READING_FILES]: M4ProcessStep.FILE_READING,
    [ProcessStep.PROCESSING_DATA]: M4ProcessStep.DATA_PROCESSING,
    [ProcessStep.WRITING_OUTPUT]: M4ProcessStep.FILE_WRITING,
    [ProcessStep.COMPLETED]: M4ProcessStep.COMPLETION,
    [ProcessStep.ERROR]: M4ProcessStep.CLEANUP,
    [ProcessStep.PROCESSING]: M4ProcessStep.DATA_PROCESSING,
    [ProcessStep.DIALOGUE_PROCESSING]: M4ProcessStep.DATA_PROCESSING,
    [ProcessStep.STRING_PROCESSING]: M4ProcessStep.DATA_PROCESSING
  };
  return mapping[step as ProcessStep] || M4ProcessStep.INITIALIZATION;
}

/**
 * Convert between M4ProcessStep enum and ProcessStep enum
 */
export function m4ProcessStepToProcessStep(step: M4ProcessStep): ProcessStep {
  const mapping: Record<M4ProcessStep, ProcessStep> = {
    [M4ProcessStep.INITIALIZATION]: ProcessStep.INITIALIZING,
    [M4ProcessStep.FOLDER_VALIDATION]: ProcessStep.INITIALIZING,
    [M4ProcessStep.FILE_COLLECTION]: ProcessStep.READING_FILES,
    [M4ProcessStep.FILE_READING]: ProcessStep.READING_FILES,
    [M4ProcessStep.DATA_PARSING]: ProcessStep.PROCESSING_DATA,
    [M4ProcessStep.DATA_VALIDATION]: ProcessStep.PROCESSING_DATA,
    [M4ProcessStep.DATA_PROCESSING]: ProcessStep.PROCESSING_DATA,
    [M4ProcessStep.DATA_TRANSFORMATION]: ProcessStep.PROCESSING_DATA,
    [M4ProcessStep.FILE_WRITING]: ProcessStep.WRITING_OUTPUT,
    [M4ProcessStep.BACKUP_CREATION]: ProcessStep.WRITING_OUTPUT,
    [M4ProcessStep.OUTPUT_VALIDATION]: ProcessStep.WRITING_OUTPUT,
    [M4ProcessStep.CLEANUP]: ProcessStep.ERROR,
    [M4ProcessStep.COMPLETION]: ProcessStep.COMPLETED
  };
  return mapping[step] || ProcessStep.INITIALIZING;
}

/**
 * Convert M4Context to M4ProcessingErrorContext
 */
export function m4ContextToProcessingErrorContext(context: M4Context): M4ProcessingErrorContext {
  return {
    stage: m4ProcessStepToProcessStep(context.processStep),
    processType: context.processType === 'dialogue' ? ProcessType.DIALOGUE : ProcessType.STRING,
    fileName: context.currentFile,
    filePath: context.inputPath,
    processedFiles: context.processedCount,
    totalFiles: context.totalFiles,
    memoryUsage: context.memoryUsage,
    workerId: context.workerId,
    // Map Excel details
    sheetName: context.errorDetails?.excelDetails?.sheetName,
    rowNumber: context.errorDetails?.excelDetails?.rowIndex,
    columnNumber: context.errorDetails?.excelDetails?.columnIndex,
    fieldValue: context.errorDetails?.excelDetails?.cellValue,
    dataType: context.errorDetails?.excelDetails?.expectedFormat,
    // Map validation details
    fieldName: context.errorDetails?.validationDetails?.fieldName,
    // Additional fields that M4ProcessingErrorContext has
    cellAddress: undefined,
    taskId: undefined,
    processedRows: undefined,
    totalRows: undefined,
    customData: {
      startTime: context.startTime,
      outputPath: context.outputPath,
      validationRule: context.errorDetails?.validationDetails?.validationRule,
      operation: context.errorDetails?.fileIODetails?.operation,
      fileSize: context.errorDetails?.fileIODetails?.fileSize,
      permissions: context.errorDetails?.fileIODetails?.permissions,
      encoding: context.errorDetails?.fileIODetails?.encoding,
      threadId: context.errorDetails?.workerDetails?.threadId,
      isMainThread: context.errorDetails?.workerDetails?.isMainThread,
      parentPort: context.errorDetails?.workerDetails?.parentPort,
      taskQueue: context.errorDetails?.workerDetails?.taskQueue
    }
  };
}

/**
 * Convert M4ProcessingErrorContext to M4Context
 */
export function processingErrorContextToM4Context(context: M4ProcessingErrorContext): M4Context {
  return {
    processStep: processStepToM4ProcessStep(context.stage),
    processType: context.processType === ProcessType.DIALOGUE ? 'dialogue' : 'string',
    currentFile: context.fileName,
    processedCount: context.processedFiles,
    totalFiles: context.totalFiles,
    workerId: context.workerId,
    memoryUsage: context.memoryUsage,
    startTime: context.customData?.startTime as number | undefined,
    inputPath: context.filePath,
    outputPath: context.customData?.outputPath as string | undefined,
    errorDetails: {
      excelDetails: context.sheetName || context.rowNumber || context.columnNumber || context.fieldValue || context.dataType ? {
        sheetName: context.sheetName,
        rowIndex: context.rowNumber,
        columnIndex: context.columnNumber,
        cellValue: context.fieldValue,
        expectedFormat: context.dataType
      } : undefined,
      workerDetails: context.workerId ? {
        threadId: context.workerId,
        taskQueue: undefined,
        isMainThread: false,
        parentPort: true
      } : undefined,
      fileIODetails: undefined,
      validationDetails: context.fieldName || context.fieldValue ? {
        validationRule: undefined,
        expectedValue: undefined,
        actualValue: context.fieldValue,
        fieldName: context.fieldName,
        recordIndex: context.rowNumber
      } : undefined
    }
  };
}