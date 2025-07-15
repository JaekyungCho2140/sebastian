import {
  ErrorReport,
  ErrorSeverity,
  ErrorType,
  ProcessType,
  SystemInfo,
  ErrorContext,
  ErrorBreadcrumb,
  ErrorReportingConfig
} from '../../shared/types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class SchemaValidator {
  /**
   * Validate error severity
   */
  private static validateErrorSeverity(severity: any): string[] {
    const validSeverities: ErrorSeverity[] = ['low', 'medium', 'high', 'critical']
    const errors: string[] = []

    if (typeof severity !== 'string') {
      errors.push('severity must be a string')
    } else if (!validSeverities.includes(severity as ErrorSeverity)) {
      errors.push(`severity must be one of: ${validSeverities.join(', ')}`)
    }

    return errors
  }

  /**
   * Validate error type
   */
  private static validateErrorType(errorType: any): string[] {
    const validTypes: ErrorType[] = [
      'javascript', 'promise-rejection', 'react-component', 
      'main-process', 'ipc', 'filesystem', 'network'
    ]
    const errors: string[] = []

    if (typeof errorType !== 'string') {
      errors.push('errorType must be a string')
    } else if (!validTypes.includes(errorType as ErrorType)) {
      errors.push(`errorType must be one of: ${validTypes.join(', ')}`)
    }

    return errors
  }

  /**
   * Validate process type
   */
  private static validateProcessType(processType: any): string[] {
    const validTypes: ProcessType[] = ['main', 'renderer', 'preload']
    const errors: string[] = []

    if (typeof processType !== 'string') {
      errors.push('processType must be a string')
    } else if (!validTypes.includes(processType as ProcessType)) {
      errors.push(`processType must be one of: ${validTypes.join(', ')}`)
    }

    return errors
  }

  /**
   * Validate system info
   */
  private static validateSystemInfo(systemInfo: any): string[] {
    const errors: string[] = []

    if (!systemInfo || typeof systemInfo !== 'object') {
      errors.push('systemInfo must be an object')
      return errors
    }

    const requiredFields = [
      'platform', 'arch', 'osVersion', 'nodeVersion', 
      'electronVersion', 'appVersion', 'totalMemory', 
      'freeMemory', 'cpuModel', 'cpuCount'
    ]

    for (const field of requiredFields) {
      if (!(field in systemInfo)) {
        errors.push(`systemInfo.${field} is required`)
      }
    }

    // Type validations
    if (typeof systemInfo.platform !== 'string') {
      errors.push('systemInfo.platform must be a string')
    }
    if (typeof systemInfo.arch !== 'string') {
      errors.push('systemInfo.arch must be a string')
    }
    if (typeof systemInfo.totalMemory !== 'number') {
      errors.push('systemInfo.totalMemory must be a number')
    }
    if (typeof systemInfo.freeMemory !== 'number') {
      errors.push('systemInfo.freeMemory must be a number')
    }
    if (typeof systemInfo.cpuCount !== 'number') {
      errors.push('systemInfo.cpuCount must be a number')
    }

    return errors
  }

  /**
   * Validate error context
   */
  private static validateErrorContext(context: any): string[] {
    const errors: string[] = []

    if (!context || typeof context !== 'object') {
      errors.push('context must be an object')
      return errors
    }

    if (!context.sessionId || typeof context.sessionId !== 'string') {
      errors.push('context.sessionId is required and must be a string')
    }

    if (context.userId !== undefined && typeof context.userId !== 'string') {
      errors.push('context.userId must be a string if provided')
    }

    if (context.url !== undefined && typeof context.url !== 'string') {
      errors.push('context.url must be a string if provided')
    }

    if (context.viewport !== undefined) {
      if (typeof context.viewport !== 'object' || 
          typeof context.viewport.width !== 'number' || 
          typeof context.viewport.height !== 'number') {
        errors.push('context.viewport must be an object with width and height numbers')
      }
    }

    return errors
  }

  /**
   * Validate breadcrumb
   */
  private static validateBreadcrumb(breadcrumb: any): string[] {
    const errors: string[] = []

    if (!breadcrumb || typeof breadcrumb !== 'object') {
      errors.push('breadcrumb must be an object')
      return errors
    }

    if (typeof breadcrumb.timestamp !== 'number') {
      errors.push('breadcrumb.timestamp must be a number')
    }

    if (typeof breadcrumb.category !== 'string') {
      errors.push('breadcrumb.category must be a string')
    }

    if (typeof breadcrumb.message !== 'string') {
      errors.push('breadcrumb.message must be a string')
    }

    const validLevels = ['debug', 'info', 'warning', 'error']
    if (!validLevels.includes(breadcrumb.level)) {
      errors.push(`breadcrumb.level must be one of: ${validLevels.join(', ')}`)
    }

    return errors
  }

  /**
   * Validate breadcrumbs array
   */
  private static validateBreadcrumbs(breadcrumbs: any): string[] {
    const errors: string[] = []

    if (!Array.isArray(breadcrumbs)) {
      errors.push('breadcrumbs must be an array')
      return errors
    }

    breadcrumbs.forEach((breadcrumb, index) => {
      const breadcrumbErrors = this.validateBreadcrumb(breadcrumb)
      breadcrumbErrors.forEach(error => {
        errors.push(`breadcrumbs[${index}]: ${error}`)
      })
    })

    return errors
  }

  /**
   * Validate complete error report
   */
  public static validateErrorReport(data: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['Error report must be an object'],
        warnings: []
      }
    }

    // Required fields validation
    const requiredFields = [
      'id', 'timestamp', 'severity', 'errorType', 'processType',
      'message', 'systemInfo', 'context', 'breadcrumbs'
    ]

    for (const field of requiredFields) {
      if (!(field in data)) {
        errors.push(`${field} is required`)
      }
    }

    // Basic type validations
    if (data.id && typeof data.id !== 'string') {
      errors.push('id must be a string')
    }

    if (data.timestamp && typeof data.timestamp !== 'number') {
      errors.push('timestamp must be a number')
    }

    if (data.message && typeof data.message !== 'string') {
      errors.push('message must be a string')
    }

    // UUID format validation for id
    if (data.id && typeof data.id === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(data.id)) {
        errors.push('id must be a valid UUID')
      }
    }

    // Timestamp validation
    if (data.timestamp && typeof data.timestamp === 'number') {
      const now = Date.now()
      const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000)
      
      if (data.timestamp > now + 60000) { // Allow 1 minute future tolerance
        warnings.push('timestamp is in the future')
      }
      
      if (data.timestamp < oneYearAgo) {
        warnings.push('timestamp is older than one year')
      }
    }

    // Specific field validations
    if (data.severity) {
      errors.push(...this.validateErrorSeverity(data.severity))
    }

    if (data.errorType) {
      errors.push(...this.validateErrorType(data.errorType))
    }

    if (data.processType) {
      errors.push(...this.validateProcessType(data.processType))
    }

    if (data.systemInfo) {
      errors.push(...this.validateSystemInfo(data.systemInfo))
    }

    if (data.context) {
      errors.push(...this.validateErrorContext(data.context))
    }

    if (data.breadcrumbs) {
      errors.push(...this.validateBreadcrumbs(data.breadcrumbs))
    }

    // Optional field validations
    if (data.stack !== undefined && typeof data.stack !== 'string') {
      errors.push('stack must be a string if provided')
    }

    if (data.filename !== undefined && typeof data.filename !== 'string') {
      errors.push('filename must be a string if provided')
    }

    if (data.lineno !== undefined && typeof data.lineno !== 'number') {
      errors.push('lineno must be a number if provided')
    }

    if (data.colno !== undefined && typeof data.colno !== 'number') {
      errors.push('colno must be a number if provided')
    }

    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        errors.push('tags must be an array if provided')
      } else {
        data.tags.forEach((tag: any, index: number) => {
          if (typeof tag !== 'string') {
            errors.push(`tags[${index}] must be a string`)
          }
        })
      }
    }

    if (data.fingerprint !== undefined && typeof data.fingerprint !== 'string') {
      errors.push('fingerprint must be a string if provided')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate error reporting configuration
   */
  public static validateConfig(config: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!config || typeof config !== 'object') {
      return {
        isValid: false,
        errors: ['Configuration must be an object'],
        warnings: []
      }
    }

    // Number validations
    if (config.maxBreadcrumbs !== undefined) {
      if (typeof config.maxBreadcrumbs !== 'number' || config.maxBreadcrumbs < 0) {
        errors.push('maxBreadcrumbs must be a non-negative number')
      } else if (config.maxBreadcrumbs > 1000) {
        warnings.push('maxBreadcrumbs is very high (>1000), consider reducing for performance')
      }
    }

    if (config.maxFileSize !== undefined) {
      if (typeof config.maxFileSize !== 'number' || config.maxFileSize <= 0) {
        errors.push('maxFileSize must be a positive number')
      } else if (config.maxFileSize > 100 * 1024 * 1024) { // 100MB
        warnings.push('maxFileSize is very large (>100MB), consider reducing')
      }
    }

    if (config.maxFiles !== undefined) {
      if (typeof config.maxFiles !== 'number' || config.maxFiles < 1) {
        errors.push('maxFiles must be a positive number')
      } else if (config.maxFiles > 10000) {
        warnings.push('maxFiles is very high (>10000), consider reducing')
      }
    }

    // Boolean validations
    if (config.enableDataMasking !== undefined && typeof config.enableDataMasking !== 'boolean') {
      errors.push('enableDataMasking must be a boolean')
    }

    if (config.enableSystemInfo !== undefined && typeof config.enableSystemInfo !== 'boolean') {
      errors.push('enableSystemInfo must be a boolean')
    }

    // Array validations
    if (config.sensitiveDataPatterns !== undefined) {
      if (!Array.isArray(config.sensitiveDataPatterns)) {
        errors.push('sensitiveDataPatterns must be an array')
      } else {
        config.sensitiveDataPatterns.forEach((pattern: any, index: number) => {
          if (typeof pattern !== 'string') {
            errors.push(`sensitiveDataPatterns[${index}] must be a string`)
          } else {
            try {
              new RegExp(pattern)
            } catch (e) {
              errors.push(`sensitiveDataPatterns[${index}] is not a valid regular expression`)
            }
          }
        })
      }
    }

    // Severity level validation
    if (config.reportingLevel !== undefined) {
      errors.push(...this.validateErrorSeverity(config.reportingLevel))
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Sanitize error report data
   */
  public static sanitizeErrorReport(data: any): Partial<ErrorReport> {
    const sanitized: any = {}

    // Copy and validate basic fields
    if (typeof data.id === 'string') sanitized.id = data.id
    if (typeof data.timestamp === 'number') sanitized.timestamp = data.timestamp
    if (typeof data.message === 'string') sanitized.message = data.message.slice(0, 10000) // Limit length
    if (typeof data.stack === 'string') sanitized.stack = data.stack.slice(0, 50000) // Limit length
    if (typeof data.filename === 'string') sanitized.filename = data.filename
    if (typeof data.lineno === 'number') sanitized.lineno = data.lineno
    if (typeof data.colno === 'number') sanitized.colno = data.colno
    if (typeof data.fingerprint === 'string') sanitized.fingerprint = data.fingerprint

    // Copy validated enum fields
    const validSeverities: ErrorSeverity[] = ['low', 'medium', 'high', 'critical']
    if (validSeverities.includes(data.severity)) {
      sanitized.severity = data.severity
    }

    const validErrorTypes: ErrorType[] = [
      'javascript', 'promise-rejection', 'react-component', 
      'main-process', 'ipc', 'filesystem', 'network'
    ]
    if (validErrorTypes.includes(data.errorType)) {
      sanitized.errorType = data.errorType
    }

    const validProcessTypes: ProcessType[] = ['main', 'renderer', 'preload']
    if (validProcessTypes.includes(data.processType)) {
      sanitized.processType = data.processType
    }

    // Copy object fields if they exist
    if (data.systemInfo && typeof data.systemInfo === 'object') {
      sanitized.systemInfo = data.systemInfo
    }

    if (data.context && typeof data.context === 'object') {
      sanitized.context = data.context
    }

    if (Array.isArray(data.breadcrumbs)) {
      sanitized.breadcrumbs = data.breadcrumbs.slice(0, 100) // Limit array size
    }

    if (Array.isArray(data.tags)) {
      sanitized.tags = data.tags.filter((tag: any) => typeof tag === 'string').slice(0, 20)
    }

    return sanitized
  }
}