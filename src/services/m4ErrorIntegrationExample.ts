/**
 * M4 에러 통합 서비스 사용 예제
 * 
 * 이 파일은 M4 에러 통합 서비스를 기존 M4 처리 코드에 적용하는 방법을 보여줍니다.
 * 실제 프로덕션 환경에서는 이 코드들을 해당 파일에 통합하여 사용하시면 됩니다.
 */

import log from 'electron-log';
import { 
  M4ErrorIntegrationService,
  M4ErrorContextBuilder,
  M4ErrorSerializer,
  createM4ErrorContextBuilder,
  createM4ErrorIntegrationService,
  enhanceM4ErrorContext,
  m4ProcessStepToProcessStep,
  m4ContextToProcessingErrorContext,
  processingErrorContextToM4Context
} from './m4ErrorIntegration';
import { 
  M4ProcessingError,
  M4ErrorFactory,
  M4ErrorType,
  M4ErrorSeverity,
  M4ProcessingErrorContext
} from '../types/m4ProcessingErrors';
import { 
  M4ProcessStep,
  M4Context,
  ErrorContext
} from '../shared/types';
import { LocalErrorReporter } from '../main/services/local-error-reporter';

/**
 * M4 Dialogue Processor에서 에러 통합 서비스 사용 예제
 */
export class M4DialogueProcessorWithErrorIntegration {
  private errorIntegrationService: M4ErrorIntegrationService;
  private localErrorReporter: LocalErrorReporter;
  private sessionId: string;

  constructor(sessionId: string, localErrorReporter: LocalErrorReporter) {
    this.sessionId = sessionId;
    this.localErrorReporter = localErrorReporter;
    this.errorIntegrationService = createM4ErrorIntegrationService(sessionId, {
      performanceOptimization: true,
      maxHistorySize: 100
    });
  }

  /**
   * 파일 처리 예제 - 파일 읽기 에러 처리
   */
  public async processDialogueFile(filePath: string): Promise<void> {
    try {
      // 컨텍스트 빌더 생성
      const contextBuilder = createM4ErrorContextBuilder({
        includeSystemInfo: true,
        includeMemoryInfo: true,
        performanceMode: 'standard'
      });

      // 기본 컨텍스트 설정
      contextBuilder
        .setBasicContext(M4ProcessStep.FILE_READING, 'dialogue')
        .setFileInfo(filePath, filePath)
        .setProgressInfo(0, 1);

      // Breadcrumb 추가
      this.errorIntegrationService.addBreadcrumb({
        category: 'file-processing',
        message: `Starting dialogue file processing: ${filePath}`,
        level: 'info',
        data: { filePath }
      });

      // 파일 처리 시뮬레이션
      await this.simulateFileProcessing(filePath, contextBuilder);

    } catch (error) {
      // 에러 발생 시 M4 에러로 변환 및 처리
      await this.handleFileProcessingError(error as Error, filePath);
    }
  }

  /**
   * 파일 처리 시뮬레이션
   */
  private async simulateFileProcessing(
    filePath: string, 
    contextBuilder: M4ErrorContextBuilder
  ): Promise<void> {
    // 파일 존재 확인
    if (!this.fileExists(filePath)) {
      const context = contextBuilder.build();
      const processingContext = this.convertM4ContextToProcessingContext(context);
      const error = M4ErrorFactory.createFileNotFoundError(filePath, processingContext);
      
      // 에러 통합 서비스를 통해 처리
      await this.processM4Error(error);
      throw error;
    }

    // 메모리 압박 상황 시뮬레이션
    const memoryUsage = this.getCurrentMemoryUsage();
    if (memoryUsage > 512) { // 512MB 이상
      const context = contextBuilder
        .setMemoryUsage(memoryUsage)
        .build();
      
      const processingContext = this.convertM4ContextToProcessingContext(context);
      const error = M4ErrorFactory.createMemoryPressureError(memoryUsage, processingContext);
      
      // 에러 통합 서비스를 통해 처리
      await this.processM4Error(error);
      throw error;
    }

    // 엑셀 파싱 에러 시뮬레이션
    try {
      await this.simulateExcelParsing(filePath, contextBuilder);
    } catch (excelError) {
      const context = contextBuilder
        .setExcelErrorDetails('Sheet1', 10, 5, 'invalid_data', 'string')
        .build();
      
      const processingContext = this.convertM4ContextToProcessingContext(context);
      const error = new M4ProcessingError(
        `Excel parsing failed: ${(excelError as Error).message}`,
        M4ErrorType.EXCEL_WORKSHEET,
        processingContext as M4ProcessingErrorContext,
        {
          severity: M4ErrorSeverity.HIGH,
          recoverable: true,
          retryable: true,
          cause: excelError as Error
        }
      );
      
      await this.processM4Error(error);
      throw error;
    }
  }

  /**
   * 엑셀 파싱 시뮬레이션
   */
  private async simulateExcelParsing(
    filePath: string, 
    contextBuilder: M4ErrorContextBuilder
  ): Promise<void> {
    // 실제 엑셀 파싱 로직이 있다고 가정
    // 여기서는 간단한 에러 시뮬레이션만 수행
    
    const shouldFail = Math.random() < 0.3; // 30% 확률로 실패
    if (shouldFail) {
      throw new Error('Simulated Excel parsing error');
    }
  }
  
  /**
   * 파일 처리 에러 핸들러
   */
  private async handleFileProcessingError(error: Error, filePath: string): Promise<void> {
    const contextBuilder = createM4ErrorContextBuilder({
      includeSystemInfo: true,
      includeMemoryInfo: true,
      performanceMode: 'standard'
    });
    
    contextBuilder
      .setBasicContext(M4ProcessStep.FILE_READING, 'dialogue')
      .setFileInfo(filePath);
    
    const context = contextBuilder.build();
    const processingContext = this.convertM4ContextToProcessingContext(context);
    
    const m4Error = new M4ProcessingError(
      `File processing failed: ${error.message}`,
      M4ErrorType.FILE_NOT_FOUND,
      processingContext as M4ProcessingErrorContext,
      {
        severity: M4ErrorSeverity.HIGH,
        recoverable: false,
        retryable: false,
        cause: error,
        userMessage: `파일 처리 중 오류가 발생했습니다: ${filePath}`,
        technicalMessage: error.message
      }
    );
    
    await this.processM4Error(m4Error);
  }

  /**
   * M4 에러 처리
   */
  private async processM4Error(error: M4ProcessingError): Promise<void> {
    try {
      // 에러 컨텍스트 강화
      const enhancedError = await enhanceM4ErrorContext(error, {
        includeSystemInfo: true,
        includeMemoryInfo: true,
        performanceMode: 'standard'
      });

      // Sebastian ErrorReport로 변환
      const errorReport = await this.errorIntegrationService.processM4Error(
        enhancedError,
        {
          customData: {
            processingStage: 'dialogue-processing',
            userAction: 'file-processing'
          }
        }
      );

      // 로컬 에러 리포터에 전송
      await this.localErrorReporter.captureError(
        new Error(errorReport.message),
        errorReport.errorType,
        errorReport.processType,
        errorReport.severity,
        errorReport.context
      );

      log.error('M4 Error processed and reported:', {
        errorId: errorReport.id,
        errorType: error.errorType,
        severity: error.severity,
        message: error.message
      });

    } catch (integrationError) {
      log.error('Failed to process M4 error through integration service:', integrationError);
      
      // 통합 서비스 실패 시 직접 로컬 에러 리포터에 전송
      await this.localErrorReporter.captureError(
        error,
        'm4-process-type',
        'main',
        'high',
        {
          sessionId: this.sessionId,
          customData: {
            originalErrorType: error.errorType,
            integrationError: (integrationError as Error).message
          }
        }
      );
    }
  }

  /**
   * 파일 존재 확인 (시뮬레이션)
   */
  private fileExists(filePath: string): boolean {
    // 실제 구현에서는 fs.existsSync 사용
    return Math.random() > 0.1; // 90% 확률로 파일 존재
  }

  /**
   * 현재 메모리 사용량 조회
   */
  private getCurrentMemoryUsage(): number {
    const memoryUsage = process.memoryUsage();
    return Math.round(memoryUsage.heapUsed / 1024 / 1024); // MB
  }

  /**
   * 에러 통계 조회
   */
  public getErrorStats() {
    return this.errorIntegrationService.generateErrorStats();
  }

  /**
   * 에러 히스토리 조회
   */
  public getErrorHistory() {
    return this.errorIntegrationService.getErrorHistory();
  }
  
  /**
   * M4Context를 M4ProcessingErrorContext로 변환
   */
  private convertM4ContextToProcessingContext(context: M4Context): Partial<M4ProcessingErrorContext> {
    return m4ContextToProcessingErrorContext(context);
  }
}

/**
 * Worker Thread Manager에서 에러 통합 서비스 사용 예제
 */
export class WorkerThreadManagerWithErrorIntegration {
  private errorIntegrationService: M4ErrorIntegrationService;
  private localErrorReporter: LocalErrorReporter;
  private sessionId: string;

  constructor(sessionId: string, localErrorReporter: LocalErrorReporter) {
    this.sessionId = sessionId;
    this.localErrorReporter = localErrorReporter;
    this.errorIntegrationService = createM4ErrorIntegrationService(sessionId, {
      performanceOptimization: true,
      maxHistorySize: 50
    });
  }

  /**
   * Worker Thread에서 발생한 직렬화된 에러 처리
   */
  public async handleWorkerError(workerMessage: any): Promise<void> {
    try {
      // Worker 메시지에서 에러 추출
      const m4Error = M4ErrorSerializer.extractErrorFromWorkerMessage(workerMessage);
      
      if (!m4Error) {
        log.warn('Invalid worker error message received:', workerMessage);
        return;
      }

      // 워커 컨텍스트 정보 추가
      const m4Context = processingErrorContextToM4Context(m4Error.context);
      const contextBuilder = M4ErrorContextBuilder.fromContext(m4Context);
      contextBuilder
        .setWorkerInfo(workerMessage.metadata?.workerId)
        .setWorkerErrorDetails(
          workerMessage.metadata?.workerId,
          undefined,
          false,
          true
        );

      const enhancedM4Context = contextBuilder.build();
      const enhancedContext = m4ContextToProcessingErrorContext(enhancedM4Context);
      
      // 강화된 컨텍스트로 새 에러 생성
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

      // 에러 통합 서비스를 통해 처리
      await this.processWorkerM4Error(enhancedError, workerMessage.metadata);

    } catch (error) {
      log.error('Failed to handle worker error:', error);
      
      // 에러 처리 실패 시 직접 로컬 에러 리포터에 전송
      await this.localErrorReporter.captureError(
        error as Error,
        'm4-worker-thread',
        'main',
        'high',
        {
          sessionId: this.sessionId,
          customData: {
            workerMessage: workerMessage,
            errorHandlingFailed: true
          }
        }
      );
    }
  }

  /**
   * 워커 M4 에러 처리
   */
  private async processWorkerM4Error(
    error: M4ProcessingError,
    workerMetadata?: any
  ): Promise<void> {
    // Breadcrumb 추가
    this.errorIntegrationService.addBreadcrumb({
      category: 'worker-thread',
      message: `Worker error received: ${error.message}`,
      level: 'error',
      data: {
        errorType: error.errorType,
        workerId: workerMetadata?.workerId,
        taskId: workerMetadata?.taskId
      }
    });

    // Sebastian ErrorReport로 변환
    const errorReport = await this.errorIntegrationService.processM4Error(
      error,
      {
        customData: {
          workerMetadata,
          processingStage: 'worker-thread-processing',
          errorSource: 'worker-thread'
        }
      }
    );

    // 로컬 에러 리포터에 전송
    await this.localErrorReporter.captureError(
      new Error(errorReport.message),
      errorReport.errorType,
      errorReport.processType,
      errorReport.severity,
      errorReport.context
    );

    log.error('Worker M4 Error processed:', {
      errorId: errorReport.id,
      workerId: workerMetadata?.workerId,
      errorType: error.errorType,
      severity: error.severity
    });
  }

  /**
   * 워커 에러 메시지 생성
   */
  public createWorkerErrorMessage(error: M4ProcessingError): any {
    return M4ErrorSerializer.createWorkerMessage(error, 'error');
  }
}

/**
 * 전역 M4 에러 처리 헬퍼 함수들
 */
export class M4ErrorHandlingHelpers {
  /**
   * 기본 M4 에러 컨텍스트 생성
   */
  public static createBasicM4Context(
    processStep: M4ProcessStep,
    processType: 'dialogue' | 'string',
    currentFile?: string
  ): M4ErrorContextBuilder {
    const builder = createM4ErrorContextBuilder({
      includeSystemInfo: true,
      includeMemoryInfo: true,
      performanceMode: 'standard'
    });

    return builder
      .setBasicContext(processStep, processType)
      .setFileInfo(currentFile);
  }

  /**
   * 파일 처리 에러 생성
   */
  public static createFileProcessingError(
    filePath: string,
    originalError: Error,
    processStep: M4ProcessStep,
    processType: 'dialogue' | 'string'
  ): M4ProcessingError {
    const m4Context = this.createBasicM4Context(processStep, processType, filePath)
      .setFileIOErrorDetails('read', undefined, undefined, 'utf-8')
      .build();

    const context = this.convertM4ContextToProcessingContext(m4Context);

    return new M4ProcessingError(
      `File processing failed: ${originalError.message}`,
      M4ErrorType.FILE_NOT_FOUND,
      context as M4ProcessingErrorContext,
      {
        severity: M4ErrorSeverity.HIGH,
        recoverable: true,
        retryable: true,
        cause: originalError,
        userMessage: `파일 처리 중 오류가 발생했습니다: ${filePath}`,
        resolutionSteps: [
          '파일 경로를 확인하세요',
          '파일 권한을 확인하세요',
          '파일이 다른 프로그램에서 사용 중인지 확인하세요'
        ]
      }
    );
  }

  /**
   * 엑셀 파싱 에러 생성
   */
  public static createExcelParsingError(
    filePath: string,
    sheetName: string,
    rowIndex: number,
    columnIndex: number,
    originalError: Error,
    processType: 'dialogue' | 'string'
  ): M4ProcessingError {
    const m4Context = this.createBasicM4Context(
      M4ProcessStep.DATA_PARSING,
      processType,
      filePath
    )
      .setExcelErrorDetails(sheetName, rowIndex, columnIndex, undefined, 'string')
      .build();

    const context = this.convertM4ContextToProcessingContext(m4Context);

    return new M4ProcessingError(
      `Excel parsing failed: ${originalError.message}`,
      M4ErrorType.EXCEL_WORKSHEET,
      context as M4ProcessingErrorContext,
      {
        severity: M4ErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: false,
        cause: originalError,
        userMessage: `엑셀 파일 파싱 중 오류가 발생했습니다: ${sheetName} 시트의 ${rowIndex}행 ${columnIndex}열`,
        resolutionSteps: [
          '엑셀 파일이 올바른 형식인지 확인하세요',
          '해당 셀의 데이터 형식을 확인하세요',
          '파일이 손상되지 않았는지 확인하세요'
        ]
      }
    );
  }

  /**
   * 메모리 압박 에러 생성
   */
  public static createMemoryPressureError(
    memoryUsage: number,
    processStep: M4ProcessStep,
    processType: 'dialogue' | 'string'
  ): M4ProcessingError {
    const m4Context = this.createBasicM4Context(processStep, processType)
      .setMemoryUsage(memoryUsage)
      .build();

    const context = this.convertM4ContextToProcessingContext(m4Context);

    return M4ErrorFactory.createMemoryPressureError(memoryUsage, context);
  }

  /**
   * 워커 스레드 에러 생성
   */
  public static createWorkerThreadError(
    originalError: Error,
    workerId: string,
    processStep: M4ProcessStep,
    processType: 'dialogue' | 'string'
  ): M4ProcessingError {
    const m4Context = this.createBasicM4Context(processStep, processType)
      .setWorkerInfo(workerId)
      .setWorkerErrorDetails(workerId, undefined, false, true)
      .build();

    const context = this.convertM4ContextToProcessingContext(m4Context);

    return M4ErrorFactory.createWorkerThreadError(originalError, context);
  }
  
  /**
   * M4Context를 M4ProcessingErrorContext로 변환
   */
  private static convertM4ContextToProcessingContext(context: M4Context): Partial<M4ProcessingErrorContext> {
    return m4ContextToProcessingErrorContext(context);
  }
}

/**
 * 사용 예제 - 실제 통합 방법
 */
export function demonstrateM4ErrorIntegration() {
  // 1. 에러 통합 서비스 초기화
  const sessionId = 'demo-session-' + Date.now();
  const localErrorReporter = new LocalErrorReporter();
  const errorIntegrationService = createM4ErrorIntegrationService(sessionId);

  // 2. 기본 에러 처리 예제
  async function processFileWithErrorHandling(filePath: string) {
    try {
      // 파일 처리 로직
      throw new Error('Simulated file processing error');
      
    } catch (error) {
      // M4 에러 생성
      const m4Error = M4ErrorHandlingHelpers.createFileProcessingError(
        filePath,
        error as Error,
        M4ProcessStep.FILE_READING,
        'dialogue'
      );

      // 에러 통합 서비스를 통해 처리
      const errorReport = await errorIntegrationService.processM4Error(m4Error);
      
      // 로컬 에러 리포터에 전송
      await localErrorReporter.captureError(
        new Error(errorReport.message),
        errorReport.errorType,
        errorReport.processType,
        errorReport.severity,
        errorReport.context
      );
    }
  }

  // 3. 워커 스레드 에러 처리 예제
  async function handleWorkerError(workerMessage: any) {
    const m4Error = M4ErrorSerializer.extractErrorFromWorkerMessage(workerMessage);
    if (m4Error) {
      await errorIntegrationService.processM4Error(m4Error);
    }
  }

  // 4. 에러 통계 조회 예제
  function getErrorStatistics() {
    return errorIntegrationService.generateErrorStats();
  }

  return {
    processFileWithErrorHandling,
    handleWorkerError,
    getErrorStatistics
  };
}