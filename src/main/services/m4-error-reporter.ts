import { LocalErrorReporter } from './local-error-reporter'
import { RemoteErrorReporter } from './remote-error-reporter'
import { M4ErrorIntegrationService, M4ErrorSerializer } from '../../services/m4ErrorIntegration'
import { 
  M4ProcessingError, 
  SerializableM4Error,
  M4ProcessingErrorContext
} from '../../types/m4ProcessingErrors'
import { ErrorReport, M4ErrorReportRequest, M4ErrorContext, M4ErrorLogExportRequest } from '../../shared/types'
import log from 'electron-log'
import { app } from 'electron'
import { join } from 'path'
import { FileOperations } from '../utils/file-operations'
import { promises as fs } from 'fs'

interface M4ErrorReporterConfig {
  enableLocalLogging: boolean
  enableRemoteReporting: boolean
  m4ErrorDir?: string
  separateM4Logs: boolean
  maxM4Files: number
  maxM4FileSize: number
  maxM4Age: number // days
  logRotationEnabled: boolean
}

export class M4ErrorReporter {
  private localReporter: LocalErrorReporter
  private remoteReporter: RemoteErrorReporter
  private m4IntegrationService: M4ErrorIntegrationService
  private config: M4ErrorReporterConfig
  private m4ErrorDir: string

  constructor(
    localReporter: LocalErrorReporter,
    remoteReporter: RemoteErrorReporter,
    config?: Partial<M4ErrorReporterConfig>
  ) {
    this.localReporter = localReporter
    this.remoteReporter = remoteReporter
    this.m4IntegrationService = new M4ErrorIntegrationService(
      `m4-error-reporter-${Date.now()}`,
      { performanceOptimization: true }
    )
    
    this.config = {
      enableLocalLogging: true,
      enableRemoteReporting: false,
      separateM4Logs: true,
      maxM4Files: 200, // M4 에러는 더 많이 보관
      maxM4FileSize: 10 * 1024 * 1024, // 10MB
      maxM4Age: 90, // 90일
      logRotationEnabled: true,
      ...config
    }

    // M4 전용 에러 디렉토리 설정
    this.m4ErrorDir = this.config.m4ErrorDir || 
      join(app.getPath('userData'), 'error-reports', 'm4-errors')
    
    this.initializeM4ErrorDirectory()
    
    // 로그 로테이션 스케줄링
    if (this.config.logRotationEnabled) {
      this.scheduleLogRotation()
    }
  }

  /**
   * M4 에러 디렉토리 초기화
   */
  private async initializeM4ErrorDirectory(): Promise<void> {
    if (this.config.separateM4Logs) {
      const result = await FileOperations.ensureDirectory(this.m4ErrorDir)
      if (result.success) {
        log.info(`M4 error directory ensured: ${this.m4ErrorDir}`)
      } else {
        log.error('Failed to create M4 error directory:', result.error)
      }
    }
  }

  /**
   * M4 에러 리포트 (상세 결과 반환)
   */
  public async reportM4ErrorDetailed(
    error: M4ProcessingError | SerializableM4Error,
    context?: any
  ): Promise<{ 
    success: boolean; 
    errorId: string; 
    localSaved: boolean; 
    remoteSent: boolean 
  }> {
    try {
      // M4 에러를 Sebastian ErrorReport로 변환
      let errorReport: ErrorReport
      
      if (error instanceof M4ProcessingError) {
        errorReport = await this.m4IntegrationService.processM4Error(error, context)
      } else {
        // SerializableM4Error인 경우 역직렬화
        const deserializedError = M4ErrorSerializer.deserialize(error)
        errorReport = await this.m4IntegrationService.processM4Error(deserializedError, context)
      }
      
      // 로컬 로깅
      let localSaved = false
      if (this.config.enableLocalLogging) {
        if (this.config.separateM4Logs) {
          // M4 전용 디렉토리에 저장
          localSaved = await this.saveM4ErrorLocally(errorReport)
        } else {
          // 일반 에러와 함께 저장
          const resultId = await this.localReporter.captureError(
            new Error(errorReport.message),
            errorReport.errorType,
            errorReport.processType,
            errorReport.severity,
            errorReport.context
          )
          localSaved = resultId !== null
        }
      }

      // 원격 리포팅
      let remoteSent = false
      if (this.config.enableRemoteReporting) {
        const result = await this.remoteReporter.reportError(errorReport)
        remoteSent = result.remoteSent
      }

      // 통계 업데이트 (향후 구현)
      // this.m4IntegrationService.updateStatistics(error)

      return {
        success: localSaved || remoteSent,
        errorId: errorReport.id,
        localSaved,
        remoteSent
      }
    } catch (reportError) {
      log.error('Failed to report M4 error:', reportError)
      return {
        success: false,
        errorId: '',
        localSaved: false,
        remoteSent: false
      }
    }
  }

  /**
   * M4 에러 리포트 (에러 ID만 반환)
   */
  public async reportM4Error(
    error: M4ProcessingError | SerializableM4Error | M4ErrorReportRequest,
    context?: any
  ): Promise<string | null> {
    try {
      // M4ErrorReportRequest를 SerializableM4Error로 변환
      let processableError: M4ProcessingError | SerializableM4Error
      
      if ('errorType' in error && 'severity' in error && 'context' in error && !('errorId' in error)) {
        // M4ErrorReportRequest인 경우
        const req = error as M4ErrorReportRequest
        processableError = {
          errorId: req.correlationId || `m4-${Date.now()}`,
          errorType: req.errorType,
          severity: req.severity,
          message: req.message,
          stackTrace: req.stackTrace,
          context: this.convertM4ErrorContextToProcessingContext(req.context),
          timestamp: req.timestamp,
          correlationId: req.correlationId,
          workerId: req.workerId,
          taskId: req.taskId,
          recoverable: req.recoverable || false,
          retryable: req.retryable || false,
          userMessage: req.userMessage,
          technicalMessage: req.technicalMessage,
          resolutionSteps: req.resolutionSteps,
          serializedAt: Date.now()
        } as SerializableM4Error
      } else {
        processableError = error as M4ProcessingError | SerializableM4Error
      }
      
      const result = await this.reportM4ErrorDetailed(processableError, context)
      return result.success ? result.errorId : null
    } catch (error) {
      log.error('Failed to report M4 error:', error)
      return null
    }
  }

  /**
   * 직렬화된 M4 에러 리포트 (Worker Thread에서 사용)
   */
  public async reportSerializedM4Error(
    serializedError: string,
    context?: any
  ): Promise<{ 
    success: boolean; 
    errorId: string; 
    localSaved: boolean; 
    remoteSent: boolean 
  }> {
    try {
      // Parse serialized error
      const parsedError = JSON.parse(serializedError) as SerializableM4Error
      
      const errorReport = await this.m4IntegrationService.processSerializedM4Error(
        parsedError, 
        context
      )
      
      // 로컬 로깅
      let localSaved = false
      if (this.config.enableLocalLogging) {
        if (this.config.separateM4Logs) {
          localSaved = await this.saveM4ErrorLocally(errorReport)
        } else {
          const resultId = await this.localReporter.captureError(
            new Error(errorReport.message),
            errorReport.errorType,
            errorReport.processType,
            errorReport.severity,
            errorReport.context
          )
          localSaved = resultId !== null
        }
      }

      // 원격 리포팅
      let remoteSent = false
      if (this.config.enableRemoteReporting) {
        const result = await this.remoteReporter.reportError(errorReport)
        remoteSent = result.remoteSent
      }

      return {
        success: localSaved || remoteSent,
        errorId: errorReport.id,
        localSaved,
        remoteSent
      }
    } catch (reportError) {
      log.error('Failed to report serialized M4 error:', reportError)
      return {
        success: false,
        errorId: '',
        localSaved: false,
        remoteSent: false
      }
    }
  }

  /**
   * M4 에러를 로컬에 저장
   */
  private async saveM4ErrorLocally(errorReport: ErrorReport): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `m4-error-${timestamp}-${errorReport.id}.json`
      const filepath = join(this.m4ErrorDir, filename)
      
      const writeResult = await FileOperations.writeJsonFile(filepath, errorReport, {
        pretty: true
      })
      
      if (writeResult.success) {
        log.info(`M4 error saved locally: ${filename}`)
        
        // 로그 로테이션 체크
        if (this.config.logRotationEnabled) {
          await this.performLogRotation()
        }
        
        return true
      } else {
        log.error('Failed to save M4 error locally:', writeResult.error)
        return false
      }
    } catch (error) {
      log.error('Exception while saving M4 error locally:', error)
      return false
    }
  }

  /**
   * 로그 로테이션 수행
   */
  private async performLogRotation(): Promise<void> {
    if (!this.config.separateM4Logs) {
      return // 일반 로그와 함께 관리되므로 스킵
    }

    try {
      const files = await FileOperations.listDirectory(this.m4ErrorDir)
      if (!files.success || !files.data) {
        return
      }

      const errorFiles = files.data
        .filter((file: any) => file.name.startsWith('m4-error-') && file.name.endsWith('.json'))
        .sort((a: any, b: any) => b.stats.mtime.getTime() - a.stats.mtime.getTime()) // 최신순

      // 파일 수 제한
      if (errorFiles.length > this.config.maxM4Files) {
        const filesToDelete = errorFiles.slice(this.config.maxM4Files)
        for (const file of filesToDelete) {
          await FileOperations.deleteFile(join(this.m4ErrorDir, file.name))
        }
      }

      // 오래된 파일 삭제
      const maxAge = this.config.maxM4Age * 24 * 60 * 60 * 1000 // days to ms
      const now = Date.now()
      
      for (const file of errorFiles) {
        const age = now - file.stats.mtime.getTime()
        if (age > maxAge) {
          await FileOperations.deleteFile(join(this.m4ErrorDir, file.name))
        }
      }

      // 총 크기 확인
      let totalSize = 0
      for (const file of errorFiles) {
        totalSize += file.stats.size
        if (totalSize > this.config.maxM4FileSize) {
          // 크기 제한 초과 시 오래된 파일부터 삭제
          await FileOperations.deleteFile(join(this.m4ErrorDir, file.name))
        }
      }
    } catch (error) {
      log.error('Error during M4 log rotation:', error)
    }
  }

  /**
   * 로그 로테이션 스케줄링
   */
  private scheduleLogRotation(): void {
    // 하루에 한 번 실행
    setInterval(() => {
      this.performLogRotation()
    }, 24 * 60 * 60 * 1000)
    
    // 초기 실행
    this.performLogRotation()
  }

  /**
   * M4 에러 통계 조회
   */
  public async getM4ErrorStats(): Promise<{
    totalErrors: number
    errorsByType: Record<string, number>
    errorsBySeverity: Record<string, number>
    errorsByProcessStep: Record<string, number>
    errorsByProcessType: Record<'dialogue' | 'string', number>
    lastErrorTime?: number
    errorRate?: number
    avgMemoryUsage?: number
    topErrorFiles?: { fileName: string; count: number }[]
    recentErrors: number
    diskUsage: number
  }> {
    const stats = this.m4IntegrationService.generateErrorStats()
    
    // 디스크 사용량 계산
    let diskUsage = 0
    if (this.config.separateM4Logs) {
      const files = await FileOperations.listDirectory(this.m4ErrorDir)
      if (files.success && files.data) {
        diskUsage = files.data.reduce((sum: number, file: any) => sum + file.stats.size, 0)
      }
    }

    // recentErrors 계산 (최근 24시간)
    const recentErrors = stats.lastError 
      ? (Date.now() - stats.lastError.timestamp < 24 * 60 * 60 * 1000 ? stats.totalErrors : 0)
      : 0

    return {
      ...stats,
      lastErrorTime: stats.lastError?.timestamp,
      recentErrors,
      diskUsage
    }
  }

  /**
   * M4 에러 로그 내보내기
   */
  public async exportM4ErrorLogs(request: M4ErrorLogExportRequest): Promise<string> {
    if (!this.config.separateM4Logs) {
      throw new Error('M4 error logs are not configured to be stored separately')
    }

    try {
      const files = await FileOperations.listDirectory(this.m4ErrorDir)
      if (!files.success || !files.data) {
        throw new Error('Failed to read M4 error directory')
      }

      const errorFiles = files.data
        .filter((file: any) => file.name.startsWith('m4-error-') && file.name.endsWith('.json'))
      
      // 필터링 적용
      let filteredErrors: ErrorReport[] = []
      
      for (const file of errorFiles) {
        const filepath = join(this.m4ErrorDir, file.name)
        const readResult = await FileOperations.readJsonFile<ErrorReport>(filepath)
        
        if (readResult.success && readResult.data) {
          const errorReport = readResult.data
          
          // 날짜 필터링
          if (request.startDate && errorReport.timestamp < request.startDate) continue
          if (request.endDate && errorReport.timestamp > request.endDate) continue
          
          // 타입 필터링
          if (request.errorTypes && request.errorTypes.length > 0 &&
              !request.errorTypes.includes(errorReport.errorType)) continue
          
          // 심각도 필터링
          if (request.severities && request.severities.length > 0 &&
              !request.severities.includes(errorReport.severity)) continue
          
          // 프로세스 타입 필터링
          if (request.processTypes && request.processTypes.length > 0 &&
              errorReport.context.m4Context &&
              !request.processTypes.includes(errorReport.context.m4Context.processType)) continue
          
          filteredErrors.push(errorReport)
          
          // 최대 레코드 수 제한
          if (request.maxRecords && filteredErrors.length >= request.maxRecords) break
        }
      }
      
      // 출력 파일 생성
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outputPath = join(app.getPath('downloads'), `m4-error-export-${timestamp}.json`)
      
      const exportData = {
        exportDate: new Date().toISOString(),
        totalErrors: filteredErrors.length,
        filters: request,
        errors: filteredErrors
      }
      
      const writeResult = await FileOperations.writeJsonFile(outputPath, exportData, {
        pretty: true
      })
      
      if (!writeResult.success) {
        throw new Error(`Failed to write export file: ${writeResult.error}`)
      }
      
      return outputPath
    } catch (error) {
      log.error('Failed to export M4 error logs:', error)
      throw error
    }
  }

  /**
   * M4 에러 로그 삭제
   */
  public async clearM4ErrorLogs(): Promise<{ success: boolean; deletedCount: number }> {
    if (!this.config.separateM4Logs) {
      return { success: false, deletedCount: 0 }
    }

    try {
      const files = await FileOperations.listDirectory(this.m4ErrorDir)
      if (!files.success || !files.data) {
        return { success: false, deletedCount: 0 }
      }

      const errorFiles = files.data
        .filter((file: any) => file.name.startsWith('m4-error-') && file.name.endsWith('.json'))
      
      let deletedCount = 0
      for (const file of errorFiles) {
        const result = await FileOperations.deleteFile(join(this.m4ErrorDir, file.name))
        if (result.success) {
          deletedCount++
        }
      }

      return {
        success: true,
        deletedCount
      }
    } catch (error) {
      log.error('Failed to clear M4 error logs:', error)
      return { success: false, deletedCount: 0 }
    }
  }

  /**
   * 설정 업데이트
   */
  public updateConfig(config: Partial<M4ErrorReporterConfig>): void {
    this.config = { ...this.config, ...config }
    
    // 원격 리포팅 설정 업데이트
    if ('enableRemoteReporting' in config) {
      this.remoteReporter.updateConfig({
        enabled: config.enableRemoteReporting
      })
    }
  }

  /**
   * Breadcrumb 추가 (M4 작업 추적용)
   */
  public addBreadcrumb(
    category: string,
    message: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ): void {
    this.m4IntegrationService.addBreadcrumb({
      category,
      message,
      level,
      data
    })
  }

  /**
   * M4 에러 컨텍스트 업데이트
   */
  public async updateM4ErrorContext(
    correlationId: string,
    contextUpdate: Partial<M4ErrorContext>
  ): Promise<void> {
    try {
      // 향후 구현: 컨텍스트 업데이트 로직
      log.info(`M4 error context updated for ${correlationId}:`, contextUpdate)
    } catch (error) {
      log.error('Failed to update M4 error context:', error)
    }
  }

  /**
   * Convert M4ErrorContext to M4ProcessingErrorContext
   */
  private convertM4ErrorContextToProcessingContext(context: any): M4ProcessingErrorContext {
    // Import ProcessStep from m4Processing
    const { ProcessStep } = require('../../types/m4Processing')
    
    return {
      stage: typeof context.stage === 'number' 
        ? Object.values(ProcessStep)[context.stage] || ProcessStep.INITIALIZING
        : ProcessStep.INITIALIZING,
      processType: context.processType,
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
      customData: {
        ...context.customData,
        validationRule: context.validationRule,
        operation: context.operation,
        fileSize: context.fileSize,
        permissions: context.permissions,
        encoding: context.encoding,
        threadId: context.threadId,
        isMainThread: context.isMainThread,
        parentPort: context.parentPort,
        taskQueue: context.taskQueue
      },
      workerId: context.workerId
    }
  }
}