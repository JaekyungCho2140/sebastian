import log from 'electron-log'

export interface MaskingRule {
  name: string
  pattern: string | RegExp
  replacement: string | ((match: string) => string)
  global?: boolean
  description?: string
}

export interface MaskingConfig {
  enabled: boolean
  rules: MaskingRule[]
  preserveLength?: boolean
  maskCharacter?: string
}

export class DataMasking {
  private static readonly DEFAULT_RULES: MaskingRule[] = [
    // File paths
    {
      name: 'windows-user-path',
      pattern: /C:\\Users\\[^\\]+/gi,
      replacement: 'C:\\Users\\[USER]',
      description: 'Windows user directory paths'
    },
    
    // Email addresses
    {
      name: 'email',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
      replacement: '[EMAIL]',
      description: 'Email addresses'
    },
    
    // IP addresses
    {
      name: 'ipv4',
      pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      replacement: '[IP]',
      description: 'IPv4 addresses'
    },
    
    // Phone numbers (various formats)
    {
      name: 'phone-us',
      pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      replacement: '[PHONE]',
      description: 'US phone numbers'
    },
    
    // Credit card numbers
    {
      name: 'credit-card',
      pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      replacement: '[CARD]',
      description: 'Credit card numbers'
    },
    
    // Social Security Numbers
    {
      name: 'ssn',
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      replacement: '[SSN]',
      description: 'Social Security Numbers'
    },
    
    // URLs with tokens/keys
    {
      name: 'url-with-token',
      pattern: /https?:\/\/[^\s]*[?&](?:token|key|secret|password|auth)=[^&\s]+/gi,
      replacement: (match: string) => {
        const url = new URL(match)
        const params = new URLSearchParams(url.search)
        
        // Mask sensitive parameters
        for (const [key, value] of params.entries()) {
          if (/token|key|secret|password|auth/i.test(key)) {
            params.set(key, '[MASKED]')
          }
        }
        
        return `${url.protocol}//${url.host}${url.pathname}?${params.toString()}`
      },
      description: 'URLs containing tokens or keys'
    },
    
    // API keys (common patterns)
    {
      name: 'api-key-generic',
      pattern: /[a-zA-Z0-9]{32,}/g,
      replacement: '[API_KEY]',
      description: 'Generic API keys (32+ alphanumeric chars)'
    },
    
    // Database connection strings
    {
      name: 'db-connection',
      pattern: /(?:mongodb|mysql|postgresql|sqlite):\/\/[^\s]+/gi,
      replacement: '[DB_CONNECTION]',
      description: 'Database connection strings'
    },
    
    // AWS credentials
    {
      name: 'aws-access-key',
      pattern: /AKIA[0-9A-Z]{16}/g,
      replacement: '[AWS_KEY]',
      description: 'AWS access keys'
    },
    
    // JWT tokens
    {
      name: 'jwt-token',
      pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
      replacement: '[JWT_TOKEN]',
      description: 'JWT tokens'
    },
    
    // MAC addresses
    {
      name: 'mac-address',
      pattern: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g,
      replacement: '[MAC]',
      description: 'MAC addresses'
    },
    
    // Windows registry paths
    {
      name: 'registry-path',
      pattern: /HKEY_[A-Z_]+\\[^\s\]]+/gi,
      replacement: '[REGISTRY_PATH]',
      description: 'Windows registry paths'
    }
  ]

  private config: MaskingConfig

  constructor(config?: Partial<MaskingConfig>) {
    this.config = {
      enabled: true,
      rules: [...DataMasking.DEFAULT_RULES],
      preserveLength: false,
      maskCharacter: '*',
      ...config
    }
  }

  /**
   * Add a custom masking rule
   */
  public addRule(rule: MaskingRule): void {
    this.config.rules.push(rule)
    log.debug(`Added masking rule: ${rule.name}`)
  }

  /**
   * Remove a masking rule by name
   */
  public removeRule(name: string): boolean {
    const initialLength = this.config.rules.length
    this.config.rules = this.config.rules.filter(rule => rule.name !== name)
    const removed = this.config.rules.length < initialLength
    
    if (removed) {
      log.debug(`Removed masking rule: ${name}`)
    }
    
    return removed
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<MaskingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    log.debug('Data masking configuration updated')
  }

  /**
   * Get current configuration
   */
  public getConfig(): MaskingConfig {
    return { ...this.config }
  }

  /**
   * Generate a mask of specific length
   */
  private generateMask(length: number): string {
    return this.config.maskCharacter!.repeat(Math.min(length, 20)) // Limit mask length
  }

  /**
   * Apply a single masking rule
   */
  private applyRule(text: string, rule: MaskingRule): string {
    try {
      const pattern = typeof rule.pattern === 'string' 
        ? new RegExp(rule.pattern, rule.global ? 'g' : '')
        : rule.pattern

      if (typeof rule.replacement === 'function') {
        return text.replace(pattern, rule.replacement)
      }

      if (this.config.preserveLength) {
        return text.replace(pattern, (match) => {
          const baseReplacement = rule.replacement as string
          if (baseReplacement.includes('[') && baseReplacement.includes(']')) {
            // For bracketed replacements, preserve some structure
            return baseReplacement
          }
          return this.generateMask(match.length)
        })
      }

      return text.replace(pattern, rule.replacement as string)
    } catch (error) {
      log.warn(`Failed to apply masking rule '${rule.name}':`, error)
      return text
    }
  }

  /**
   * Mask sensitive data in text
   */
  public maskText(text: string): string {
    if (!this.config.enabled || !text) {
      return text
    }

    let maskedText = text

    for (const rule of this.config.rules) {
      maskedText = this.applyRule(maskedText, rule)
    }

    return maskedText
  }

  /**
   * Mask sensitive data in an object recursively
   */
  public maskObject(obj: any, maxDepth: number = 10): any {
    if (!this.config.enabled || maxDepth <= 0) {
      return obj
    }

    if (typeof obj === 'string') {
      return this.maskText(obj)
    }

    if (typeof obj === 'number' || typeof obj === 'boolean' || obj === null || obj === undefined) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.maskObject(item, maxDepth - 1))
    }

    if (typeof obj === 'object') {
      const maskedObj: any = {}
      
      for (const [key, value] of Object.entries(obj)) {
        // Also mask sensitive keys
        const maskedKey = this.maskText(key)
        maskedObj[maskedKey] = this.maskObject(value, maxDepth - 1)
      }
      
      return maskedObj
    }

    return obj
  }

  /**
   * Mask sensitive data in error stack traces
   */
  public maskStackTrace(stack: string): string {
    if (!this.config.enabled || !stack) {
      return stack
    }

    let maskedStack = stack

    // Apply all masking rules
    maskedStack = this.maskText(maskedStack)

    // Additional stack-specific masking
    const stackRules: MaskingRule[] = [
      {
        name: 'node-modules-path',
        pattern: /node_modules[\/\\][^\/\\]+/g,
        replacement: 'node_modules/[MODULE]',
        description: 'Node modules paths in stack traces'
      },
      {
        name: 'file-line-number',
        pattern: /:\d+:\d+\)/g,
        replacement: ':[LINE]:[COL])',
        description: 'Line and column numbers in stack traces'
      }
    ]

    for (const rule of stackRules) {
      maskedStack = this.applyRule(maskedStack, rule)
    }

    return maskedStack
  }

  /**
   * Check if text contains potentially sensitive data
   */
  public containsSensitiveData(text: string): {
    hasSensitiveData: boolean
    detectedPatterns: string[]
  } {
    const detectedPatterns: string[] = []

    for (const rule of this.config.rules) {
      try {
        const pattern = typeof rule.pattern === 'string' 
          ? new RegExp(rule.pattern, 'g')
          : rule.pattern

        if (pattern.test(text)) {
          detectedPatterns.push(rule.name)
        }
      } catch (error) {
        log.warn(`Failed to test pattern '${rule.name}':`, error)
      }
    }

    return {
      hasSensitiveData: detectedPatterns.length > 0,
      detectedPatterns
    }
  }

  /**
   * Get statistics about masking operations
   */
  public getMaskingStats(originalText: string, maskedText: string): {
    originalLength: number
    maskedLength: number
    reductionPercentage: number
    charactersSaved: number
  } {
    const originalLength = originalText.length
    const maskedLength = maskedText.length
    const charactersSaved = Math.max(0, originalLength - maskedLength)
    const reductionPercentage = originalLength > 0 
      ? (charactersSaved / originalLength) * 100 
      : 0

    return {
      originalLength,
      maskedLength,
      reductionPercentage: Math.round(reductionPercentage * 100) / 100,
      charactersSaved
    }
  }

  /**
   * Validate masking rules
   */
  public validateRules(): { valid: string[], invalid: { name: string, error: string }[] } {
    const valid: string[] = []
    const invalid: { name: string, error: string }[] = []

    for (const rule of this.config.rules) {
      try {
        if (typeof rule.pattern === 'string') {
          new RegExp(rule.pattern)
        }
        
        // Test the rule with sample text
        this.applyRule('test string', rule)
        valid.push(rule.name)
      } catch (error) {
        invalid.push({
          name: rule.name,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return { valid, invalid }
  }

  /**
   * Export configuration for backup/sharing
   */
  public exportConfig(): string {
    return JSON.stringify({
      ...this.config,
      rules: this.config.rules.map(rule => ({
        ...rule,
        pattern: rule.pattern.toString()
      }))
    }, null, 2)
  }

  /**
   * Import configuration from backup
   */
  public importConfig(configJson: string): boolean {
    try {
      const importedConfig = JSON.parse(configJson)
      
      // Validate and convert patterns back to RegExp
      if (importedConfig.rules && Array.isArray(importedConfig.rules)) {
        importedConfig.rules = importedConfig.rules.map((rule: any) => ({
          ...rule,
          pattern: typeof rule.pattern === 'string' && rule.pattern.startsWith('/') 
            ? new RegExp(rule.pattern.slice(1, rule.pattern.lastIndexOf('/')), 
                        rule.pattern.slice(rule.pattern.lastIndexOf('/') + 1))
            : rule.pattern
        }))
      }
      
      this.config = { ...this.config, ...importedConfig }
      log.info('Data masking configuration imported successfully')
      return true
    } catch (error) {
      log.error('Failed to import data masking configuration:', error)
      return false
    }
  }
}