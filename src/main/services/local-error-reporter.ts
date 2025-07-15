import { app } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { cpus, totalmem, freemem, platform, arch, release } from 'os'
import log from 'electron-log'
import {
  ErrorReport,
  ErrorReportingConfig,
  ErrorSeverity,
  ErrorType,
  ProcessType,
  SystemInfo,
  ErrorContext,
  ErrorBreadcrumb
} from '../../shared/types'
import { SchemaValidator, ValidationResult } from '../utils/validation'
import { FileOperations } from '../utils/file-operations'
import { DataMasking } from '../utils/data-masking'

export class LocalErrorReporter {
  private config: ErrorReportingConfig
  private breadcrumbs: ErrorBreadcrumb[] = []
  private sessionId: string
  private errorDir: string
  private dataMasking: DataMasking

  constructor(config?: Partial<ErrorReportingConfig>) {
    this.sessionId = randomUUID()
    this.config = {
      maxBreadcrumbs: 50,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxFiles: 100,
      maxAge: 30, // 30 days
      maxTotalSize: 50 * 1024 * 1024, // 50MB total
      enableDataMasking: true,
      sensitiveDataPatterns: [
        '/home/[^/]+/',
        '/Users/[^/]+/',
        'C:\\\\Users\\\\[^\\\\]+\\\\',
        '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b'
      ],
      reportingLevel: 'medium',
      enableSystemInfo: true,
      ...config
    }

    this.errorDir = join(app.getPath('userData'), 'error-reports')
    
    // Initialize data masking
    this.dataMasking = new DataMasking({
      enabled: this.config.enableDataMasking,
      preserveLength: false
    })
    
    this.initializeErrorDirectory()
  }

  /**
   * Initialize error reporting directory
   */
  private async initializeErrorDirectory(): Promise<void> {
    const result = await FileOperations.ensureDirectory(this.errorDir)
    if (result.success) {
      log.info(`Error reporting directory ensured: ${this.errorDir}`)
    } else {
      log.error('Failed to create error reporting directory:', result.error)
    }
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId
  }

  /**
   * Add breadcrumb for error context
   */
  public addBreadcrumb(breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>): void {
    const timestampedBreadcrumb: ErrorBreadcrumb = {
      ...breadcrumb,
      timestamp: Date.now()
    }

    this.breadcrumbs.push(timestampedBreadcrumb)

    // Limit breadcrumbs to configured max
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs)
    }

    log.debug('Breadcrumb added:', timestampedBreadcrumb)
  }

  /**
   * Collect system information
   */
  private async getSystemInfo(): Promise<SystemInfo> {
    if (!this.config.enableSystemInfo) {
      return {
        platform: 'masked',
        arch: 'masked',
        osVersion: 'masked',
        nodeVersion: 'masked',
        electronVersion: 'masked',
        appVersion: 'masked',
        totalMemory: 0,
        freeMemory: 0,
        cpuModel: 'masked',
        cpuCount: 0
      }
    }

    const cpu = cpus()[0]
    
    return {
      platform: platform(),
      arch: arch(),
      osVersion: release(),
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron || 'unknown',
      appVersion: app.getVersion(),
      totalMemory: totalmem(),
      freeMemory: freemem(),
      cpuModel: cpu ? cpu.model : 'unknown',
      cpuCount: cpus().length
    }
  }

  /**
   * Generate error fingerprint for deduplication
   */
  private generateFingerprint(error: Partial<ErrorReport>): string {
    const key = `${error.errorType}-${error.message}-${error.filename}-${error.lineno}`
    return Buffer.from(key).toString('base64').slice(0, 16)
  }

  /**
   * Mask sensitive data in strings
   */
  private maskSensitiveData(text: string): string {
    return this.dataMasking.maskText(text)
  }

  /**
   * Check if error should be reported based on severity level
   */
  private shouldReport(severity: ErrorSeverity): boolean {
    const levels: ErrorSeverity[] = ['low', 'medium', 'high', 'critical']
    const minLevel = levels.indexOf(this.config.reportingLevel)
    const errorLevel = levels.indexOf(severity)
    return errorLevel >= minLevel
  }

  /**
   * Clean up old error reports to manage disk space
   */
  private async cleanupOldReports(): Promise<void> {
    try {
      const listResult = await FileOperations.listFiles(this.errorDir, {
        extension: '.json'
      })
      
      if (!listResult.success) {
        log.error('Failed to list files for cleanup:', listResult.error)
        return
      }
      
      const files = listResult.data || []
      let filesToDelete: any[] = []
      
      // 1. Remove files older than maxAge days
      const maxAge = this.config.maxAge * 24 * 60 * 60 * 1000 // Convert to milliseconds
      const now = Date.now()
      const oldFiles = files.filter((file: any) => now - file.modified.getTime() > maxAge)
      filesToDelete.push(...oldFiles)
      
      // 2. Check total size and remove oldest if exceeding maxTotalSize
      const remainingFiles = files.filter((file: any) => !filesToDelete.includes(file))
      const totalSize = remainingFiles.reduce((size: number, file: any) => size + file.size, 0)
      
      if (totalSize > this.config.maxTotalSize) {
        remainingFiles.sort((a: any, b: any) => a.modified.getTime() - b.modified.getTime())
        let currentSize = totalSize
        
        for (const file of remainingFiles) {
          if (currentSize <= this.config.maxTotalSize) break
          filesToDelete.push(file)
          currentSize -= file.size
        }
      }
      
      // 3. Remove excess files if more than maxFiles
      const finalRemainingFiles = files.filter((file: any) => !filesToDelete.includes(file))
      if (finalRemainingFiles.length > this.config.maxFiles) {
        finalRemainingFiles.sort((a: any, b: any) => a.modified.getTime() - b.modified.getTime())
        const excessFiles = finalRemainingFiles.slice(0, finalRemainingFiles.length - this.config.maxFiles)
        filesToDelete.push(...excessFiles)
      }
      
      // Remove duplicates
      filesToDelete = [...new Set(filesToDelete)]
      
      // Delete files
      for (const file of filesToDelete) {
        const deleteResult = await FileOperations.deleteFile(file.path)
        if (deleteResult.success) {
          log.debug('Deleted old error report:', file.name)
        } else {
          log.warn('Failed to delete old error report:', file.name, deleteResult.error)
        }
      }

      if (filesToDelete.length > 0) {
        log.info(`Cleaned up ${filesToDelete.length} old error reports`)
      }
    } catch (error) {
      log.error('Failed to cleanup old error reports:', error)
    }
  }

  /**
   * Capture and report an error
   */
  public async captureError(
    error: Error | string,
    errorType: ErrorType,
    processType: ProcessType,
    severity: ErrorSeverity = 'medium',
    context?: Partial<ErrorContext>
  ): Promise<string | null> {
    try {
      // Check if error should be reported
      if (!this.shouldReport(severity)) {
        return null
      }

      const errorObj = typeof error === 'string' ? new Error(error) : error
      const systemInfo = await this.getSystemInfo()
      
      const errorReport: ErrorReport = {
        id: randomUUID(),
        timestamp: Date.now(),
        severity,
        errorType,
        processType,
        message: this.maskSensitiveData(errorObj.message),
        stack: errorObj.stack ? this.dataMasking.maskStackTrace(errorObj.stack) : undefined,
        systemInfo,
        context: {
          sessionId: this.sessionId,
          ...context
        },
        breadcrumbs: [...this.breadcrumbs],
        fingerprint: this.generateFingerprint({
          errorType,
          message: errorObj.message,
          stack: errorObj.stack
        })
      }

      // Add error tags based on context
      if (errorType === 'javascript' && errorObj.stack?.includes('at ')) {
        errorReport.tags = ['runtime-error']
      } else if (errorType === 'promise-rejection') {
        errorReport.tags = ['unhandled-promise']
      }

      await this.saveErrorReport(errorReport)
      await this.cleanupOldReports()

      log.info(`Error captured: ${errorReport.id} (${errorType})`)
      
      // Add breadcrumb for this error
      this.addBreadcrumb({
        category: 'error',
        message: `Error captured: ${errorObj.message}`,
        level: 'error',
        data: { errorId: errorReport.id, errorType }
      })

      // Show error dialog for critical errors
      if (severity === 'critical' || severity === 'high') {
        this.showErrorDialog(errorReport)
      }

      return errorReport.id
    } catch (captureError) {
      log.error('Failed to capture error:', captureError)
      return null
    }
  }

  /**
   * Validate error report before processing
   */
  private validateErrorReport(report: ErrorReport): ValidationResult {
    const validation = SchemaValidator.validateErrorReport(report)
    
    if (validation.warnings.length > 0) {
      log.warn('Error report validation warnings:', validation.warnings)
    }
    
    if (!validation.isValid) {
      log.error('Error report validation failed:', validation.errors)
    }
    
    return validation
  }

  /**
   * Save error report to file
   */
  private async saveErrorReport(report: ErrorReport): Promise<void> {
    // Validate error report before saving
    const validation = this.validateErrorReport(report)
    
    if (!validation.isValid) {
      log.error('Cannot save invalid error report:', validation.errors)
      
      // Try to sanitize and save a minimal version
      const sanitized = SchemaValidator.sanitizeErrorReport(report)
      const sanitizedValidation = SchemaValidator.validateErrorReport(sanitized)
      
      if (!sanitizedValidation.isValid) {
        throw new Error(`Error report validation failed: ${validation.errors.join(', ')}`)
      }
      
      log.warn('Saving sanitized error report due to validation errors')
      report = sanitized as ErrorReport
    }

    const filename = `error-${report.timestamp}-${report.id.slice(0, 8)}.json`
    const filepath = join(this.errorDir, filename)
    
    const reportJson = JSON.stringify(report, null, 2)
    
    // Check file size before writing
    const reportSize = Buffer.byteLength(reportJson, 'utf8')
    let finalContent = reportJson
    
    if (reportSize > this.config.maxFileSize) {
      log.warn(`Error report exceeds max file size: ${reportSize} > ${this.config.maxFileSize}`)
      
      // Create a truncated version
      const truncatedReport = {
        ...report,
        stack: report.stack?.slice(0, 5000), // Limit stack trace
        breadcrumbs: report.breadcrumbs.slice(-10), // Keep only last 10 breadcrumbs
        message: report.message.slice(0, 1000) // Limit message length
      }
      
      finalContent = JSON.stringify(truncatedReport, null, 2)
      log.warn('Truncating error report due to size limit')
    }
    
    const writeResult = await FileOperations.writeFileAtomic(filepath, finalContent, 'utf8')
    if (!writeResult.success) {
      log.error('Failed to save error report:', writeResult.error)
      throw new Error(writeResult.error)
    }
    
    log.debug('Error report saved:', filepath)
  }

  /**
   * Get error reports within a date range
   */
  public async getErrorReports(
    startDate?: Date,
    endDate?: Date
  ): Promise<ErrorReport[]> {
    try {
      const listResult = await FileOperations.listFiles(this.errorDir, {
        extension: '.json'
      })
      
      if (!listResult.success) {
        log.error('Failed to list error report files:', listResult.error)
        return []
      }
      
      const files = listResult.data || []
      const reports: ErrorReport[] = []
      
      for (const file of files) {
        try {
          const readResult = await FileOperations.readFileAtomic(file.path, 'utf8')
          if (!readResult.success) {
            log.warn(`Failed to read error report file: ${file.name}`, readResult.error)
            continue
          }
          
          const reportData = JSON.parse(readResult.data as string)
          
          // Validate loaded error report
          const validation = SchemaValidator.validateErrorReport(reportData)
          if (!validation.isValid) {
            log.warn(`Invalid error report file: ${file.name}`, validation.errors)
            continue
          }
          
          const report: ErrorReport = reportData
          
          // Filter by date range if provided
          if (startDate && report.timestamp < startDate.getTime()) continue
          if (endDate && report.timestamp > endDate.getTime()) continue
          
          reports.push(report)
        } catch (error) {
          log.warn(`Failed to parse error report file: ${file.name}`, error)
        }
      }
      
      return reports.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      log.error('Failed to get error reports:', error)
      return []
    }
  }

  /**
   * Get error statistics
   */
  public async getErrorStats(): Promise<{
    total: number
    byType: Record<ErrorType, number>
    bySeverity: Record<ErrorSeverity, number>
    lastError?: Date
  }> {
    const reports = await this.getErrorReports()
    
    const stats = {
      total: reports.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      lastError: reports.length > 0 ? new Date(reports[0].timestamp) : undefined
    }
    
    for (const report of reports) {
      stats.byType[report.errorType] = (stats.byType[report.errorType] || 0) + 1
      stats.bySeverity[report.severity] = (stats.bySeverity[report.severity] || 0) + 1
    }
    
    return stats
  }

  /**
   * Clear all error reports
   */
  public async clearErrorReports(): Promise<void> {
    try {
      const listResult = await FileOperations.listFiles(this.errorDir, {
        extension: '.json'
      })
      
      if (!listResult.success) {
        log.error('Failed to list files for clearing:', listResult.error)
        throw new Error(listResult.error)
      }
      
      const files = listResult.data || []
      let deletedCount = 0
      
      for (const file of files) {
        const deleteResult = await FileOperations.deleteFile(file.path)
        if (deleteResult.success) {
          deletedCount++
        } else {
          log.warn('Failed to delete error report:', file.name, deleteResult.error)
        }
      }
      
      log.info(`Cleared ${deletedCount} error reports`)
    } catch (error) {
      log.error('Failed to clear error reports:', error)
      throw error
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ErrorReportingConfig>): void {
    // Validate new configuration
    const configToValidate = { ...this.config, ...newConfig }
    const validation = SchemaValidator.validateConfig(configToValidate)
    
    if (!validation.isValid) {
      log.error('Invalid configuration update:', validation.errors)
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
    }
    
    if (validation.warnings.length > 0) {
      log.warn('Configuration validation warnings:', validation.warnings)
    }
    
    this.config = configToValidate
    
    // Update data masking configuration
    this.dataMasking.updateConfig({
      enabled: this.config.enableDataMasking
    })
    
    log.info('Error reporting configuration updated')
  }

  /**
   * Get current configuration
   */
  public getConfig(): ErrorReportingConfig {
    return { ...this.config }
  }

  /**
   * Add custom data masking rule
   */
  public addMaskingRule(name: string, pattern: string | RegExp, replacement: string): void {
    this.dataMasking.addRule({
      name,
      pattern,
      replacement,
      description: `Custom rule: ${name}`
    })
    log.info(`Added custom masking rule: ${name}`)
  }

  /**
   * Remove data masking rule
   */
  public removeMaskingRule(name: string): boolean {
    const removed = this.dataMasking.removeRule(name)
    if (removed) {
      log.info(`Removed masking rule: ${name}`)
    }
    return removed
  }

  /**
   * Test data masking on sample text
   */
  public testDataMasking(text: string): {
    original: string
    masked: string
    detectedPatterns: string[]
    stats: {
      originalLength: number
      maskedLength: number
      reductionPercentage: number
      charactersSaved: number
    }
  } {
    const masked = this.dataMasking.maskText(text)
    const detection = this.dataMasking.containsSensitiveData(text)
    const stats = this.dataMasking.getMaskingStats(text, masked)

    return {
      original: text,
      masked,
      detectedPatterns: detection.detectedPatterns,
      stats
    }
  }

  /**
   * Get data masking statistics
   */
  public getMaskingRuleValidation(): {
    valid: string[]
    invalid: { name: string, error: string }[]
  } {
    return this.dataMasking.validateRules()
  }

  /**
   * Export data masking configuration
   */
  public exportMaskingConfig(): string {
    return this.dataMasking.exportConfig()
  }

  /**
   * Import data masking configuration
   */
  public importMaskingConfig(configJson: string): boolean {
    return this.dataMasking.importConfig(configJson)
  }

  /**
   * Show error dialog in renderer process
   */
  private showErrorDialog(errorReport: ErrorReport): void {
    try {
      // Lazy import to avoid circular dependency
      const { showErrorDialog } = require('../ipc-handlers')
      
      const errorDialogData = {
        title: this.getErrorTitle(errorReport.errorType, errorReport.severity),
        message: this.getErrorMessage(errorReport.errorType, errorReport.severity),
        error: new Error(errorReport.message),
        details: this.formatErrorDetails(errorReport),
        stack: errorReport.stack,
        timestamp: errorReport.timestamp,
        severity: errorReport.severity
      }

      showErrorDialog(errorDialogData)
      
      log.info(`Error dialog shown for report: ${errorReport.id}`)
    } catch (error) {
      log.error('Failed to show error dialog:', error)
    }
  }

  /**
   * Get user-friendly error title
   */
  private getErrorTitle(errorType: ErrorType, severity: ErrorSeverity): string {
    if (severity === 'critical') {
      return '심각한 오류가 발생했습니다'
    }
    
    switch (errorType) {
      case 'javascript':
        return 'JavaScript 오류 발생'
      case 'promise-rejection':
        return 'Promise 처리 오류'
      case 'react-component':
        return 'Component Rendering Error'
      case 'main-process':
        return 'System Process Error'
      case 'ipc':
        return 'Inter-Process Communication Error'
      case 'filesystem':
        return 'File System Error'
      case 'network':
        return 'Network Connection Error'
      default:
        return 'An unexpected error occurred'
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(errorType: ErrorType, severity: ErrorSeverity): string {
    if (severity === 'critical') {
      return '애플리케이션에서 심각한 오류가 발생했습니다. 앱을 재시작해야 할 수 있습니다.'
    }
    
    switch (errorType) {
      case 'javascript':
        return '스크립트 실행 중 오류가 발생했습니다. 일부 기능이 제대로 작동하지 않을 수 있습니다.'
      case 'promise-rejection':
        return '비동기 작업 처리 중 오류가 발생했습니다.'
      case 'react-component':
        return '화면 렌더링 중 오류가 발생했습니다.'
      case 'main-process':
        return '시스템 프로세스에서 오류가 발생했습니다.'
      case 'ipc':
        return '프로세스 간 통신에서 오류가 발생했습니다.'
      case 'filesystem':
        return '파일 작업 중 오류가 발생했습니다.'
      case 'network':
        return '네트워크 연결에 문제가 발생했습니다.'
      default:
        return '예상치 못한 오류가 발생했습니다. 문제가 계속되면 개발자에게 문의해주세요.'
    }
  }

  /**
   * Format error details for display
   */
  private formatErrorDetails(errorReport: ErrorReport): string {
    const details = [
      `Error ID: ${errorReport.id}`,
      `Occurred at: ${new Date(errorReport.timestamp).toLocaleString('en-US')}`,
      `Error Type: ${errorReport.errorType}`,
      `Severity: ${errorReport.severity}`,
      `Process: ${errorReport.processType}`
    ]

    if (errorReport.context.url) {
      details.push(`URL: ${errorReport.context.url}`)
    }

    if (errorReport.systemInfo) {
      details.push(`Platform: ${errorReport.systemInfo.platform} ${errorReport.systemInfo.arch}`)
      details.push(`App Version: ${errorReport.systemInfo.appVersion}`)
    }

    return details.join('\n')
  }
}