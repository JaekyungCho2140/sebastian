import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Enhanced JSON Schema validation system
 */
export interface SchemaValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  metadata: {
    schemaVersion: string
    validatedAt: number
    validationTime: number
  }
}

export interface ValidationError {
  field: string
  message: string
  value?: any
  severity: 'error' | 'critical'
}

export interface ValidationWarning {
  field: string
  message: string
  value?: any
  suggestion?: string
}

export class SchemaValidationEngine {
  private static errorReportSchema: any = null
  private static configSchema: any = null

  /**
   * Load JSON schemas from files
   */
  private static loadSchemas(): void {
    if (!this.errorReportSchema) {
      try {
        const errorSchemaPath = join(__dirname, '../schemas/error-report.schema.json')
        this.errorReportSchema = JSON.parse(readFileSync(errorSchemaPath, 'utf8'))
      } catch (error) {
        console.warn('Could not load error report schema, using fallback validation')
        this.errorReportSchema = null
      }
    }

    if (!this.configSchema) {
      try {
        const configSchemaPath = join(__dirname, '../schemas/error-config.schema.json')
        this.configSchema = JSON.parse(readFileSync(configSchemaPath, 'utf8'))
      } catch (error) {
        console.warn('Could not load config schema, using fallback validation')
        this.configSchema = null
      }
    }
  }

  /**
   * Validate an error report against the JSON schema
   */
  static validateErrorReport(data: any): SchemaValidationResult {
    const startTime = Date.now()
    this.loadSchemas()

    const result: SchemaValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        schemaVersion: '1.0.0',
        validatedAt: Date.now(),
        validationTime: 0
      }
    }

    try {
      // Basic structure validation
      this.validateBasicStructure(data, result)
      
      // Required fields validation
      this.validateRequiredFields(data, this.getRequiredFields('errorReport'), result)
      
      // Field type validation
      this.validateErrorReportTypes(data, result)
      
      // Business logic validation
      this.validateErrorReportBusinessRules(data, result)
      
      // Size and limit validation
      this.validateErrorReportLimits(data, result)

    } catch (error) {
      result.errors.push({
        field: 'root',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical'
      })
      result.isValid = false
    }

    result.isValid = result.errors.length === 0
    result.metadata.validationTime = Date.now() - startTime

    return result
  }

  /**
   * Validate error reporting configuration
   */
  static validateConfig(data: any): SchemaValidationResult {
    const startTime = Date.now()
    this.loadSchemas()

    const result: SchemaValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        schemaVersion: '1.0.0',
        validatedAt: Date.now(),
        validationTime: 0
      }
    }

    try {
      // Basic structure validation
      this.validateBasicStructure(data, result)
      
      // Required fields validation
      this.validateRequiredFields(data, this.getRequiredFields('config'), result)
      
      // Field type validation
      this.validateConfigTypes(data, result)
      
      // Business logic validation
      this.validateConfigBusinessRules(data, result)

    } catch (error) {
      result.errors.push({
        field: 'root',
        message: `Config validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical'
      })
      result.isValid = false
    }

    result.isValid = result.errors.length === 0
    result.metadata.validationTime = Date.now() - startTime

    return result
  }

  /**
   * Validate basic structure
   */
  private static validateBasicStructure(data: any, result: SchemaValidationResult): void {
    if (data === null || data === undefined) {
      result.errors.push({
        field: 'root',
        message: 'Data cannot be null or undefined',
        severity: 'critical'
      })
      return
    }

    if (typeof data !== 'object') {
      result.errors.push({
        field: 'root',
        message: 'Data must be an object',
        value: typeof data,
        severity: 'critical'
      })
      return
    }

    if (Array.isArray(data)) {
      result.errors.push({
        field: 'root',
        message: 'Data cannot be an array',
        severity: 'critical'
      })
    }
  }

  /**
   * Validate required fields
   */
  private static validateRequiredFields(
    data: any, 
    requiredFields: string[], 
    result: SchemaValidationResult
  ): void {
    for (const field of requiredFields) {
      if (!(field in data) || data[field] === undefined) {
        result.errors.push({
          field,
          message: `Required field '${field}' is missing`,
          severity: 'error'
        })
      }
    }
  }

  /**
   * Validate error report field types
   */
  private static validateErrorReportTypes(data: any, result: SchemaValidationResult): void {
    // ID validation (UUID v4)
    if (data.id !== undefined) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      if (typeof data.id !== 'string' || !uuidRegex.test(data.id)) {
        result.errors.push({
          field: 'id',
          message: 'ID must be a valid UUID v4',
          value: data.id,
          severity: 'error'
        })
      }
    }

    // Timestamp validation
    if (data.timestamp !== undefined) {
      if (!Number.isInteger(data.timestamp) || data.timestamp < 0) {
        result.errors.push({
          field: 'timestamp',
          message: 'Timestamp must be a positive integer',
          value: data.timestamp,
          severity: 'error'
        })
      }
    }

    // Severity validation
    if (data.severity !== undefined) {
      const validSeverities = ['low', 'medium', 'high', 'critical']
      if (!validSeverities.includes(data.severity)) {
        result.errors.push({
          field: 'severity',
          message: `Severity must be one of: ${validSeverities.join(', ')}`,
          value: data.severity,
          severity: 'error'
        })
      }
    }

    // Error type validation
    if (data.errorType !== undefined) {
      const validTypes = ['javascript', 'promise-rejection', 'react-component', 'main-process', 'ipc', 'filesystem', 'network']
      if (!validTypes.includes(data.errorType)) {
        result.errors.push({
          field: 'errorType',
          message: `Error type must be one of: ${validTypes.join(', ')}`,
          value: data.errorType,
          severity: 'error'
        })
      }
    }

    // Process type validation
    if (data.processType !== undefined) {
      const validProcessTypes = ['main', 'renderer', 'preload']
      if (!validProcessTypes.includes(data.processType)) {
        result.errors.push({
          field: 'processType',
          message: `Process type must be one of: ${validProcessTypes.join(', ')}`,
          value: data.processType,
          severity: 'error'
        })
      }
    }

    // Message validation
    if (data.message !== undefined) {
      if (typeof data.message !== 'string') {
        result.errors.push({
          field: 'message',
          message: 'Message must be a string',
          value: typeof data.message,
          severity: 'error'
        })
      } else if (data.message.length === 0) {
        result.errors.push({
          field: 'message',
          message: 'Message cannot be empty',
          severity: 'error'
        })
      } else if (data.message.length > 10000) {
        result.warnings.push({
          field: 'message',
          message: 'Message is very long and may be truncated',
          value: data.message.length,
          suggestion: 'Consider shortening the message'
        })
      }
    }

    // System info validation
    if (data.systemInfo !== undefined) {
      this.validateSystemInfo(data.systemInfo, result)
    }

    // Breadcrumbs validation
    if (data.breadcrumbs !== undefined) {
      this.validateBreadcrumbs(data.breadcrumbs, result)
    }
  }

  /**
   * Validate system information
   */
  private static validateSystemInfo(systemInfo: any, result: SchemaValidationResult): void {
    if (typeof systemInfo !== 'object' || systemInfo === null) {
      result.errors.push({
        field: 'systemInfo',
        message: 'System info must be an object',
        value: typeof systemInfo,
        severity: 'error'
      })
      return
    }

    const requiredFields = ['platform', 'arch', 'osVersion', 'nodeVersion', 'electronVersion', 'appVersion']
    
    for (const field of requiredFields) {
      if (!(field in systemInfo) || typeof systemInfo[field] !== 'string') {
        result.errors.push({
          field: `systemInfo.${field}`,
          message: `System info field '${field}' must be a string`,
          value: systemInfo[field],
          severity: 'error'
        })
      }
    }

    // Memory validation
    if (systemInfo.totalMemory !== undefined && (!Number.isInteger(systemInfo.totalMemory) || systemInfo.totalMemory < 0)) {
      result.errors.push({
        field: 'systemInfo.totalMemory',
        message: 'Total memory must be a positive integer',
        value: systemInfo.totalMemory,
        severity: 'error'
      })
    }

    if (systemInfo.freeMemory !== undefined && (!Number.isInteger(systemInfo.freeMemory) || systemInfo.freeMemory < 0)) {
      result.errors.push({
        field: 'systemInfo.freeMemory',
        message: 'Free memory must be a positive integer',
        value: systemInfo.freeMemory,
        severity: 'error'
      })
    }

    // CPU validation
    if (systemInfo.cpuCount !== undefined && (!Number.isInteger(systemInfo.cpuCount) || systemInfo.cpuCount < 1)) {
      result.errors.push({
        field: 'systemInfo.cpuCount',
        message: 'CPU count must be a positive integer',
        value: systemInfo.cpuCount,
        severity: 'error'
      })
    }
  }

  /**
   * Validate breadcrumbs array
   */
  private static validateBreadcrumbs(breadcrumbs: any, result: SchemaValidationResult): void {
    if (!Array.isArray(breadcrumbs)) {
      result.errors.push({
        field: 'breadcrumbs',
        message: 'Breadcrumbs must be an array',
        value: typeof breadcrumbs,
        severity: 'error'
      })
      return
    }

    if (breadcrumbs.length > 100) {
      result.warnings.push({
        field: 'breadcrumbs',
        message: 'Too many breadcrumbs, some may be ignored',
        value: breadcrumbs.length,
        suggestion: 'Limit breadcrumbs to 100 items'
      })
    }

    breadcrumbs.forEach((breadcrumb: any, index: number) => {
      if (typeof breadcrumb !== 'object' || breadcrumb === null) {
        result.errors.push({
          field: `breadcrumbs[${index}]`,
          message: 'Breadcrumb must be an object',
          severity: 'error'
        })
        return
      }

      const requiredFields = ['timestamp', 'category', 'message', 'level']
      for (const field of requiredFields) {
        if (!(field in breadcrumb)) {
          result.errors.push({
            field: `breadcrumbs[${index}].${field}`,
            message: `Breadcrumb field '${field}' is required`,
            severity: 'error'
          })
        }
      }

      // Validate level
      if (breadcrumb.level !== undefined) {
        const validLevels = ['debug', 'info', 'warning', 'error']
        if (!validLevels.includes(breadcrumb.level)) {
          result.errors.push({
            field: `breadcrumbs[${index}].level`,
            message: `Breadcrumb level must be one of: ${validLevels.join(', ')}`,
            value: breadcrumb.level,
            severity: 'error'
          })
        }
      }
    })
  }

  /**
   * Validate configuration types
   */
  private static validateConfigTypes(data: any, result: SchemaValidationResult): void {
    // Numeric validations
    const numericFields = [
      { field: 'maxBreadcrumbs', min: 10, max: 500 },
      { field: 'maxFileSize', min: 1024, max: 50485760 },
      { field: 'maxFiles', min: 10, max: 1000 },
      { field: 'maxAge', min: 1, max: 365 },
      { field: 'maxTotalSize', min: 10485760, max: 1073741824 }
    ]

    for (const { field, min, max } of numericFields) {
      if (data[field] !== undefined) {
        if (!Number.isInteger(data[field])) {
          result.errors.push({
            field,
            message: `${field} must be an integer`,
            value: data[field],
            severity: 'error'
          })
        } else if (data[field] < min || data[field] > max) {
          result.errors.push({
            field,
            message: `${field} must be between ${min} and ${max}`,
            value: data[field],
            severity: 'error'
          })
        }
      }
    }

    // Boolean validations
    const booleanFields = ['enableDataMasking', 'enableSystemInfo']
    for (const field of booleanFields) {
      if (data[field] !== undefined && typeof data[field] !== 'boolean') {
        result.errors.push({
          field,
          message: `${field} must be a boolean`,
          value: data[field],
          severity: 'error'
        })
      }
    }

    // Reporting level validation
    if (data.reportingLevel !== undefined) {
      const validLevels = ['low', 'medium', 'high', 'critical']
      if (!validLevels.includes(data.reportingLevel)) {
        result.errors.push({
          field: 'reportingLevel',
          message: `Reporting level must be one of: ${validLevels.join(', ')}`,
          value: data.reportingLevel,
          severity: 'error'
        })
      }
    }
  }

  /**
   * Validate business rules for error reports
   */
  private static validateErrorReportBusinessRules(data: any, result: SchemaValidationResult): void {
    // Check timestamp is reasonable (not too far in the future or past)
    if (data.timestamp !== undefined) {
      const now = Date.now()
      const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000)
      const oneHourFromNow = now + (60 * 60 * 1000)

      if (data.timestamp < oneYearAgo) {
        result.warnings.push({
          field: 'timestamp',
          message: 'Timestamp is more than a year old',
          value: new Date(data.timestamp).toISOString(),
          suggestion: 'Check if timestamp is correct'
        })
      }

      if (data.timestamp > oneHourFromNow) {
        result.warnings.push({
          field: 'timestamp',
          message: 'Timestamp is in the future',
          value: new Date(data.timestamp).toISOString(),
          suggestion: 'Check system clock synchronization'
        })
      }
    }

    // Check for suspicious patterns
    if (data.message && typeof data.message === 'string') {
      if (data.message.includes('password') || data.message.includes('token')) {
        result.warnings.push({
          field: 'message',
          message: 'Message may contain sensitive information',
          suggestion: 'Ensure sensitive data is properly masked'
        })
      }
    }
  }

  /**
   * Validate business rules for configuration
   */
  private static validateConfigBusinessRules(data: any, result: SchemaValidationResult): void {
    // Check for reasonable size relationships
    if (data.maxFileSize && data.maxTotalSize) {
      if (data.maxFileSize > data.maxTotalSize) {
        result.errors.push({
          field: 'maxFileSize',
          message: 'Maximum file size cannot be larger than maximum total size',
          severity: 'error'
        })
      }
    }

    // Warn about extreme values
    if (data.maxAge !== undefined && data.maxAge < 7) {
      result.warnings.push({
        field: 'maxAge',
        message: 'Very short retention period may result in loss of important error data',
        value: data.maxAge,
        suggestion: 'Consider using at least 7 days'
      })
    }
  }

  /**
   * Validate size and limits
   */
  private static validateErrorReportLimits(data: any, result: SchemaValidationResult): void {
    // Check overall JSON size
    const jsonString = JSON.stringify(data)
    const sizeInBytes = new Blob([jsonString]).size

    if (sizeInBytes > 5 * 1024 * 1024) { // 5MB
      result.warnings.push({
        field: 'root',
        message: 'Error report is very large',
        value: `${Math.round(sizeInBytes / 1024)} KB`,
        suggestion: 'Consider reducing breadcrumb count or message length'
      })
    }

    // Check stack trace length
    if (data.stack && typeof data.stack === 'string' && data.stack.length > 50000) {
      result.warnings.push({
        field: 'stack',
        message: 'Stack trace is very long',
        value: `${data.stack.length} characters`,
        suggestion: 'Stack trace may be truncated during storage'
      })
    }
  }

  /**
   * Get required fields for different schema types
   */
  private static getRequiredFields(schemaType: 'errorReport' | 'config'): string[] {
    switch (schemaType) {
      case 'errorReport':
        return ['id', 'timestamp', 'severity', 'errorType', 'processType', 'message', 'systemInfo']
      case 'config':
        return ['maxBreadcrumbs', 'maxFileSize', 'maxFiles', 'maxAge', 'maxTotalSize', 'enableDataMasking', 'reportingLevel', 'enableSystemInfo']
      default:
        return []
    }
  }

  /**
   * Create a validation summary report
   */
  static createValidationSummary(result: SchemaValidationResult): string {
    const lines: string[] = []
    
    lines.push(`Validation Summary (${result.metadata.validationTime}ms)`)
    lines.push(`Status: ${result.isValid ? 'VALID' : 'INVALID'}`)
    lines.push(`Schema Version: ${result.metadata.schemaVersion}`)
    lines.push('')

    if (result.errors.length > 0) {
      lines.push('ERRORS:')
      result.errors.forEach((error, index) => {
        lines.push(`  ${index + 1}. [${error.severity.toUpperCase()}] ${error.field}: ${error.message}`)
        if (error.value !== undefined) {
          lines.push(`     Value: ${JSON.stringify(error.value)}`)
        }
      })
      lines.push('')
    }

    if (result.warnings.length > 0) {
      lines.push('WARNINGS:')
      result.warnings.forEach((warning, index) => {
        lines.push(`  ${index + 1}. ${warning.field}: ${warning.message}`)
        if (warning.value !== undefined) {
          lines.push(`     Value: ${JSON.stringify(warning.value)}`)
        }
        if (warning.suggestion) {
          lines.push(`     Suggestion: ${warning.suggestion}`)
        }
      })
    }

    return lines.join('\n')
  }
}