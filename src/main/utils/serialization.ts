import { ErrorReport, ErrorReportingConfig } from '../../shared/types'

/**
 * JSON Serialization utilities for error reports and configuration
 */
export class Serializer {
  private static readonly SCHEMA_VERSION = '1.0.0'
  private static readonly MAX_SERIALIZATION_DEPTH = 10
  private static readonly MAX_STRING_LENGTH = 10000

  /**
   * Serialize an error report to JSON string
   */
  static serializeErrorReport(errorReport: ErrorReport): string {
    try {
      // Add schema version
      const serializable = {
        ...errorReport,
        schemaVersion: this.SCHEMA_VERSION
      }

      // Clean and sanitize the data
      const cleanedData = this.sanitizeObject(serializable, 0)
      
      return JSON.stringify(cleanedData, this.replacer, 2)
    } catch (error) {
      throw new Error(`Failed to serialize error report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Deserialize an error report from JSON string
   */
  static deserializeErrorReport(jsonString: string): ErrorReport {
    try {
      const parsed = JSON.parse(jsonString)
      
      // Validate basic structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON structure')
      }

      // Check schema version
      if (parsed.schemaVersion && parsed.schemaVersion !== this.SCHEMA_VERSION) {
        console.warn(`Schema version mismatch: expected ${this.SCHEMA_VERSION}, got ${parsed.schemaVersion}`)
      }

      // Remove schema version from the object before returning
      const { schemaVersion, ...errorReport } = parsed
      
      return errorReport as ErrorReport
    } catch (error) {
      throw new Error(`Failed to deserialize error report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Serialize configuration to JSON string
   */
  static serializeConfig(config: ErrorReportingConfig): string {
    try {
      const cleanedConfig = this.sanitizeObject(config, 0)
      return JSON.stringify(cleanedConfig, null, 2)
    } catch (error) {
      throw new Error(`Failed to serialize configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Deserialize configuration from JSON string
   */
  static deserializeConfig(jsonString: string): ErrorReportingConfig {
    try {
      const parsed = JSON.parse(jsonString)
      
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid configuration JSON structure')
      }

      return parsed as ErrorReportingConfig
    } catch (error) {
      throw new Error(`Failed to deserialize configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create a serializable copy of an Error object
   */
  static serializeError(error: Error): Record<string, any> {
    return {
      name: error.name,
      message: this.truncateString(error.message),
      stack: error.stack ? this.truncateString(error.stack, 50000) : undefined,
      // Preserve any additional properties
      ...Object.getOwnPropertyNames(error).reduce((acc, key) => {
        if (!['name', 'message', 'stack'].includes(key)) {
          const value = (error as any)[key]
          if (this.isSerializable(value)) {
            acc[key] = value
          }
        }
        return acc
      }, {} as Record<string, any>)
    }
  }

  /**
   * JSON replacer function to handle special cases
   */
  private static replacer(key: string, value: any): any {
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (this.hasCircularReference(value)) {
        return '[Circular Reference]'
      }
    }

    // Handle functions
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`
    }

    // Handle undefined
    if (value === undefined) {
      return null
    }

    // Handle BigInt
    if (typeof value === 'bigint') {
      return value.toString()
    }

    // Handle symbols
    if (typeof value === 'symbol') {
      return value.toString()
    }

    // Truncate very long strings
    if (typeof value === 'string' && value.length > this.MAX_STRING_LENGTH) {
      return this.truncateString(value)
    }

    return value
  }

  /**
   * Sanitize an object for serialization
   */
  private static sanitizeObject(obj: any, depth: number): any {
    if (depth > this.MAX_SERIALIZATION_DEPTH) {
      return '[Max Depth Exceeded]'
    }

    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj !== 'object') {
      return obj
    }

    if (obj instanceof Date) {
      return obj.getTime() // Convert to timestamp
    }

    if (obj instanceof Error) {
      return this.serializeError(obj)
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1))
    }

    // Handle regular objects
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSerializable(value)) {
        sanitized[key] = this.sanitizeObject(value, depth + 1)
      }
    }

    return sanitized
  }

  /**
   * Check if a value is serializable
   */
  private static isSerializable(value: any): boolean {
    if (value === null || value === undefined) {
      return true
    }

    const type = typeof value
    
    // Primitive types are serializable
    if (['string', 'number', 'boolean'].includes(type)) {
      return true
    }

    // BigInt can be converted to string
    if (type === 'bigint') {
      return true
    }

    // Objects and arrays are serializable if they don't have circular references
    if (type === 'object') {
      return !this.hasCircularReference(value)
    }

    // Functions and symbols are not directly serializable but can be converted
    return false
  }

  /**
   * Check for circular references in an object
   */
  private static hasCircularReference(obj: any, seen = new WeakSet()): boolean {
    if (obj === null || typeof obj !== 'object') {
      return false
    }

    if (seen.has(obj)) {
      return true
    }

    seen.add(obj)

    try {
      for (const value of Object.values(obj)) {
        if (this.hasCircularReference(value, seen)) {
          return true
        }
      }
    } catch {
      // If we can't iterate over the object, assume it's safe
      return false
    }

    seen.delete(obj)
    return false
  }

  /**
   * Truncate a string to a maximum length
   */
  private static truncateString(str: string, maxLength = this.MAX_STRING_LENGTH): string {
    if (str.length <= maxLength) {
      return str
    }

    const truncated = str.substring(0, maxLength - 3) + '...'
    return truncated
  }

  /**
   * Validate JSON schema compatibility
   */
  static validateSchemaCompatibility(data: any): { 
    isCompatible: boolean
    version?: string
    errors: string[] 
  } {
    const errors: string[] = []

    // Check if data has schema version
    if (!data.schemaVersion) {
      errors.push('Missing schema version')
      return { isCompatible: false, errors }
    }

    const version = data.schemaVersion

    // Validate version format (semver)
    const semverPattern = /^\d+\.\d+\.\d+$/
    if (!semverPattern.test(version)) {
      errors.push('Invalid schema version format')
      return { isCompatible: false, version, errors }
    }

    // Check compatibility with current version
    const [currentMajor] = this.SCHEMA_VERSION.split('.').map(Number)
    const [dataMajor] = version.split('.').map(Number)

    if (dataMajor !== currentMajor) {
      errors.push(`Incompatible schema version: expected ${currentMajor}.x.x, got ${version}`)
      return { isCompatible: false, version, errors }
    }

    return { isCompatible: true, version, errors }
  }

  /**
   * Create a deep clone of an object using serialization
   */
  static deepClone<T>(obj: T): T {
    try {
      return JSON.parse(JSON.stringify(obj, this.replacer))
    } catch (error) {
      throw new Error(`Failed to deep clone object: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get serialization statistics
   */
  static getSerializationStats(obj: any): {
    size: number
    depth: number
    objectCount: number
    arrayCount: number
    stringCount: number
    numberCount: number
  } {
    const stats = {
      size: 0,
      depth: 0,
      objectCount: 0,
      arrayCount: 0,
      stringCount: 0,
      numberCount: 0
    }

    const serialized = JSON.stringify(obj, this.replacer)
    stats.size = new Blob([serialized]).size

    this.analyzeObject(obj, stats, 0)

    return stats
  }

  private static analyzeObject(obj: any, stats: any, depth: number): void {
    stats.depth = Math.max(stats.depth, depth)

    if (obj === null || obj === undefined) {
      return
    }

    const type = typeof obj

    switch (type) {
      case 'string':
        stats.stringCount++
        break
      case 'number':
        stats.numberCount++
        break
      case 'object':
        if (Array.isArray(obj)) {
          stats.arrayCount++
          obj.forEach(item => this.analyzeObject(item, stats, depth + 1))
        } else {
          stats.objectCount++
          Object.values(obj).forEach(value => this.analyzeObject(value, stats, depth + 1))
        }
        break
    }
  }
}