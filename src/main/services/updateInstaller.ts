import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { existsSync, statSync } from 'fs'
import { 
  UpdateProgress, 
  InstallOptions, 
  InstallResult, 
  InstallationLog as NsisInstallationLog,
  NSIS_EXIT_CODES,
  TimeoutConfiguration,
  TimeoutEvent,
  InstallationTimeoutStatus,
  TimeoutUserAction,
  TimeoutNotification,
  ErrorCategory,
  ErrorSolution,
  InstallationErrorDetails,
  RecoveryOption,
  RecoveryStep,
  RecoveryActionResult,
  RecoveryActionRequest,
  SystemSnapshot,
  ProcessInfo,
  InstalledSoftwareInfo,
  RecentError,
  InstallationAttempt,
  ErrorLogExportRequest
} from '../../shared/types'
import { shell, app } from 'electron'
import { execSync } from 'child_process'
import { platform, arch, release, freemem, totalmem } from 'os'
import { join } from 'path'
import { writeFileSync } from 'fs'
// Re-export types for backward compatibility
export { 
  InstallOptions, 
  InstallResult, 
  NsisInstallationLog, 
  NSIS_EXIT_CODES, 
  TimeoutConfiguration, 
  TimeoutEvent, 
  InstallationTimeoutStatus, 
  TimeoutUserAction, 
  TimeoutNotification,
  ErrorCategory,
  ErrorSolution,
  InstallationErrorDetails,
  RecoveryOption,
  RecoveryStep,
  SystemSnapshot,
  ProcessInfo,
  InstalledSoftwareInfo,
  RecentError,
  InstallationAttempt
}

export class UpdateInstaller extends EventEmitter {
  private activeInstallation?: ChildProcess
  private installStartTime?: number
  private abortController?: AbortController
  private installationPromise?: Promise<InstallResult>
  private installationLogs: NsisInstallationLog[] = []
  private timeoutConfig: TimeoutConfiguration = {}
  private currentPhase: string = 'preparation'
  private phaseStartTime?: number
  private timeoutEvents: TimeoutEvent[] = []
  private retryCount: number = 0
  private phaseTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private globalTimeoutId?: NodeJS.Timeout
  private pendingUserAction: boolean = false
  private resolveCallback?: (value: InstallResult) => void
  private rejectCallback?: (reason?: any) => void
  private installationAttempts: InstallationAttempt[] = []
  private correlationId: string = ''
  private progressUpdateInterval?: NodeJS.Timeout

  constructor() {
    super()
  }

  private log(level: NsisInstallationLog['level'], phase: NsisInstallationLog['phase'], message: string, details?: Record<string, any>, exitCode?: number): void {
    const logEntry: NsisInstallationLog = {
      timestamp: Date.now(),
      level,
      phase,
      message,
      details,
      exitCode,
      duration: this.installStartTime ? Date.now() - this.installStartTime : undefined
    }

    this.installationLogs.push(logEntry)
    
    // Emit structured log for external consumption
    this.emit('installationLog', logEntry)
    
    // Console logging with appropriate level
    const logPrefix = `[NSIS-${phase.toUpperCase()}]`
    const logMessage = `${logPrefix} ${message}`
    const logData = details ? ` - ${JSON.stringify(details)}` : ''
    
    switch (level) {
      case 'error':
        console.error(logMessage + logData)
        break
      case 'warn':
        console.warn(logMessage + logData)
        break
      case 'debug':
        console.debug(logMessage + logData)
        break
      default:
        console.log(logMessage + logData)
    }
  }

  public async installUpdate(options: InstallOptions): Promise<InstallResult> {
    // Clear previous logs
    this.installationLogs = []
    
    this.log('info', 'validation', 'Starting NSIS installation process', { options: { ...options, installerPath: '***' } })

    // Prevent multiple concurrent installations
    if (this.installationPromise) {
      this.log('error', 'validation', 'Installation already in progress')
      throw new Error('Installation already in progress')
    }

    const {
      installerPath,
      silentInstall = true,
      elevatePermissions = true,
      installPath,
      timeout = 10 * 60 * 1000, // 10 minutes
      createDesktopShortcut = true,
      createStartMenuShortcut = true,
      timeoutConfig = {}
    } = options
    
    // Initialize timeout configuration with defaults
    this.timeoutConfig = {
      globalTimeout: timeout,
      phaseTimeouts: {
        preparation: 30 * 1000, // 30 seconds
        extracting: 5 * 60 * 1000, // 5 minutes
        registering: 2 * 60 * 1000, // 2 minutes
        shortcuts: 30 * 1000, // 30 seconds
        uninstaller: 1 * 60 * 1000, // 1 minute
        completing: 30 * 1000 // 30 seconds
      },
      retryConfig: {
        maxRetries: 3,
        retryDelay: 5000, // 5 seconds
        retryMultiplier: 1.5,
        retryablePhases: ['preparation', 'extracting', 'registering']
      },
      fallbackConfig: {
        enableFallback: true,
        fallbackTimeout: 30 * 1000, // 30 seconds
        fallbackStrategy: 'cancel'
      },
      ...timeoutConfig
    }
    
    // Reset timeout tracking
    this.timeoutEvents = []
    this.retryCount = 0
    this.currentPhase = 'preparation'
    this.phaseStartTime = undefined
    this.clearAllTimeouts()
    
    // Generate correlation ID for this installation attempt
    this.correlationId = `install-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Record installation attempt
    this.recordInstallationAttempt('started')

    // Validate NSIS installer file exists
    this.log('debug', 'validation', 'Validating installer file existence', { installerPath })
    if (!existsSync(installerPath)) {
      this.log('error', 'validation', 'NSIS installer file not found', { installerPath })
      return { 
        success: false, 
        error: 'NSIS installer file not found',
        criticalityLevel: 'critical'
      }
    }

    // Validate NSIS installer file size
    try {
      const stat = statSync(installerPath)
      this.log('debug', 'validation', 'Installer file validated', { 
        size: stat.size, 
        sizeFormatted: `${(stat.size / 1024 / 1024).toFixed(2)} MB` 
      })
      
      if (stat.size === 0) {
        this.log('error', 'validation', 'NSIS installer file is empty')
        return { 
          success: false, 
          error: 'NSIS installer file is empty',
          criticalityLevel: 'critical'
        }
      }
    } catch (error) {
      this.log('error', 'validation', 'Failed to verify NSIS installer file', { error: error instanceof Error ? error.message : 'Unknown error' })
      return { 
        success: false, 
        error: 'Failed to verify NSIS installer file',
        criticalityLevel: 'critical'
      }
    }

    // Create abort controller for cancellation
    this.abortController = new AbortController()
    this.installStartTime = Date.now()
    
    this.log('info', 'preparation', 'Preparing installation execution', { 
      timeout: `${timeout / 1000}s`,
      silentInstall,
      elevatePermissions 
    })
    
    // Create and store the installation promise
    this.installationPromise = this.executeInstallation(installerPath, {
      silentInstall,
      elevatePermissions,
      installPath,
      timeout,
      createDesktopShortcut,
      createStartMenuShortcut
    })

    try {
      const result = await this.installationPromise
      this.log('info', 'completion', `Installation ${result.success ? 'completed successfully' : 'failed'}`, { 
        success: result.success,
        exitCode: result.exitCode,
        duration: result.duration,
        criticalityLevel: result.criticalityLevel
      })
      return result
    } finally {
      // Clean up resources
      this.log('debug', 'cleanup', 'Cleaning up installation resources')
      this.installationPromise = undefined
      this.abortController = undefined
      this.clearAllTimeouts()
    }
  }

  private async executeInstallation(installerPath: string, options: {
    silentInstall: boolean
    elevatePermissions: boolean
    installPath?: string
    timeout: number
    createDesktopShortcut: boolean
    createStartMenuShortcut: boolean
  }): Promise<InstallResult> {
    try {
      this.emitProgress('installing', 0, 'Preparing installation...', 'preparation')
      
      const result = await this.runNsisInstaller(installerPath, options)
      const duration = Date.now() - (this.installStartTime || Date.now())

      if (result.success) {
        this.emitProgress('complete', 100, 'Installation completed successfully!', 'completing')
        return { ...result, duration }
      } else {
        this.emitProgress('installing', 0, `Installation failed: ${result.error}`, 'error')
        return { ...result, duration }
      }
    } catch (error) {
      const duration = Date.now() - (this.installStartTime || Date.now())
      const errorMessage = error instanceof Error ? error.message : 'Installation failed'
      
      // Check if error was due to cancellation
      if (this.abortController?.signal.aborted) {
        this.log('info', 'execution', 'Installation cancelled by user', { duration })
        this.emitProgress('installing', 0, 'Installation cancelled by user', 'cancelled')
        
        const errorDetails = this.createErrorDetails(0, 'Installation cancelled by user', 'execution')
        const recoveryOptions = this.generateRecoveryOptions(0, errorDetails)
        
        this.recordInstallationAttempt('cancelled')
        
        return { 
          success: false, 
          error: 'Installation cancelled by user', 
          duration,
          criticalityLevel: 'low',
          requiresUserAction: false,
          isRetryable: true,
          errorDetails,
          recoveryOptions
        }
      }
      
      // Enhanced error analysis for better user experience
      const criticalityLevel = this.analyzeErrorCriticality(errorMessage)
      const isRetryable = this.isErrorRetryable(errorMessage)
      const requiresUserAction = this.doesErrorRequireUserAction(errorMessage)
      
      this.log('error', 'execution', 'Installation execution failed', {
        error: errorMessage,
        duration,
        criticalityLevel,
        isRetryable,
        requiresUserAction
      })
      
      this.emitProgress('installing', 0, `Installation error: ${errorMessage}`, 'error')
      
      // Enhanced error details for general errors
      const errorDetails = this.createErrorDetails(0, errorMessage, 'execution')
      const recoveryOptions = this.generateRecoveryOptions(0, errorDetails)
      
      this.recordInstallationAttempt('failed', 0, errorMessage)
      
      return { 
        success: false, 
        error: errorMessage, 
        duration,
        criticalityLevel,
        isRetryable,
        requiresUserAction,
        errorDetails,
        recoveryOptions
      }
    }
  }

  private async runNsisInstaller(installerPath: string, options: {
    silentInstall: boolean
    elevatePermissions: boolean
    installPath?: string
    timeout: number
    createDesktopShortcut: boolean
    createStartMenuShortcut: boolean
  }): Promise<InstallResult> {
    return new Promise((resolve, reject) => {
      // Validate NSIS installer before execution
      if (!this.validateNsisInstaller(installerPath)) {
        reject(new Error('Invalid NSIS installer file'))
        return
      }

      const args = this.buildNsisArguments(options)
      
      // Use the installer executable directly for NSIS installation
      const command = installerPath
      
      this.log('info', 'execution', 'Starting NSIS installer process', { 
        command: '***', // Hide full path for security
        args: args.map(arg => arg.startsWith('/D=') ? '/D=***' : arg), // Hide paths
        processOptions: { shell: false, windowsHide: true }
      })
      
      // NSIS installers typically run with elevated permissions by default
      // if they include a requestExecutionLevel directive
      this.activeInstallation = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false, // Use false for better security with NSIS
        windowsHide: true,
        detached: true // Run installer independently from parent process
      })

      // Unref the process to allow parent to exit independently
      this.activeInstallation.unref()

      let stdout = ''
      let stderr = ''

      // Set up enhanced timeout with phase-aware handling
      this.setupTimeoutHandling(resolve, reject, options.timeout)

      // Set up abort signal handling
      const abortHandler = () => {
        if (this.activeInstallation) {
          this.activeInstallation.kill('SIGTERM')
          this.clearAllTimeouts()
          reject(new Error('Installation cancelled'))
        }
      }

      if (this.abortController?.signal) {
        if (this.abortController.signal.aborted) {
          reject(new Error('Installation cancelled'))
          return
        }
        this.abortController.signal.addEventListener('abort', abortHandler)
      }

      this.activeInstallation.stdout?.on('data', (data) => {
        stdout += data.toString()
        this.parseInstallationProgress(data.toString())
      })

      this.activeInstallation.stderr?.on('data', (data) => {
        stderr += data.toString()
        const errorOutput = data.toString().trim()
        if (errorOutput) {
          this.log('warn', 'execution', 'NSIS installer stderr output', { output: errorOutput })
        }
      })

      this.activeInstallation.on('error', (error) => {
        this.clearAllTimeouts()
        
        // Enhanced error analysis
        const errorDetails = {
          message: error.message,
          errno: (error as any).errno,
          code: (error as any).code,
          syscall: (error as any).syscall,
          path: (error as any).path
        }
        
        this.log('error', 'execution', 'Failed to start NSIS installer process', errorDetails)
        
        // Emit error progress update
        this.emitProgress('installing', 0, `Failed to start installer: ${error.message}`, 'error')
        
        // Categorize error for better user experience
        let criticalityLevel: 'low' | 'medium' | 'high' | 'critical' = 'critical'
        let userMessage = `Failed to start installer: ${error.message}`
        
        if (error.message.includes('ENOENT')) {
          userMessage = 'Installer file not found or has been moved'
          criticalityLevel = 'critical'
        } else if (error.message.includes('EACCES')) {
          userMessage = 'Permission denied. Please run as administrator'
          criticalityLevel = 'high'
        } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
          userMessage = 'Too many open files. Please close other applications and try again'
          criticalityLevel = 'medium'
        }
        
        reject(new Error(userMessage))
      })

      this.activeInstallation.on('exit', (code, signal) => {
        this.clearAllTimeouts()
        this.clearProgressInterval() // Clear progress interval on exit
        
        // Clean up abort signal listener
        if (this.abortController?.signal) {
          this.abortController.signal.removeEventListener('abort', abortHandler)
        }
        
        this.activeInstallation = undefined

        if (signal) {
          reject(new Error(`Installation was terminated by signal: ${signal}`))
          return
        }

        // NSIS exit codes:
        // 0 = Success
        // 1 = Installation aborted by user (Cancel button)
        // 2 = Installation aborted by script
        // Other codes = Various error conditions
        
        const exitCode = code || 0
        
        this.log('info', 'execution', 'NSIS installer process exited', { 
          exitCode, 
          signal,
          stdout: stdout.length > 0 ? `${stdout.length} chars` : 'empty',
          stderr: stderr.length > 0 ? `${stderr.length} chars` : 'empty'
        })
        
        if (exitCode === NSIS_EXIT_CODES.SUCCESS) {
          this.log('info', 'completion', 'Installation completed successfully', { exitCode })
          this.recordInstallationAttempt('success')
          resolve({
            success: true,
            exitCode,
            installPath: options.installPath,
            isRetryable: false,
            requiresUserAction: false,
            criticalityLevel: 'low'
          })
        } else {
          const errorMessage = this.getNsisErrorMessage(exitCode)
          const isRetryable = this.isRetryableError(exitCode)
          const requiresUserAction = this.isUserActionRequired(exitCode)
          const criticalityLevel = this.getCriticalityLevel(exitCode)
          
          // Enhanced error details
          const errorDetails = this.createErrorDetails(exitCode, errorMessage, 'completion')
          const recoveryOptions = this.generateRecoveryOptions(exitCode, errorDetails)
          
          this.log('error', 'completion', 'Installation failed', { 
            exitCode, 
            errorMessage,
            isRetryable,
            requiresUserAction,
            criticalityLevel,
            stderr: stderr || 'No error output',
            correlationId: this.correlationId
          }, exitCode)
          
          this.recordInstallationAttempt('failed', exitCode, errorMessage)
          
          resolve({
            success: false,
            exitCode,
            error: `Installation failed with exit code ${exitCode}: ${errorMessage}`,
            isRetryable,
            requiresUserAction,
            criticalityLevel,
            errorDetails,
            recoveryOptions
          })
        }
      })

      // Start with initial progress
      this.emitProgress('installing', 5, 'Starting installation...', 'preparation')
      
      // Set up regular progress updates for smoother UI experience
      this.setupProgressInterval()
    })
  }

  private buildNsisArguments(options: {
    silentInstall: boolean
    elevatePermissions: boolean
    installPath?: string
    createDesktopShortcut: boolean
    createStartMenuShortcut: boolean
  }): string[] {
    const args: string[] = []

    // Silent installation - NSIS standard flags
    if (options.silentInstall) {
      args.push('/S')  // Silent installation (no UI)
    }

    // Additional NSIS parameters for customization
    // Note: These depend on how the NSIS installer script is configured
    
    // Desktop shortcut control (if installer supports it)
    if (!options.createDesktopShortcut) {
      args.push('/NODESKTOP')  // Skip desktop shortcut creation
    }
    
    // Start menu shortcut control (if installer supports it)  
    if (!options.createStartMenuShortcut) {
      args.push('/NOSTARTMENU')  // Skip start menu shortcut creation
    }

    // Installation directory must be last parameter in NSIS
    if (options.installPath) {
      args.push(`/D=${options.installPath}`)
    }

    return args
  }

  private validateNsisInstaller(installerPath: string): boolean {
    // Basic validation for NSIS installer
    if (!installerPath.toLowerCase().endsWith('.exe')) {
      console.warn('NSIS installer should have .exe extension')
      return false
    }
    
    // Additional validations could include:
    // - File signature verification
    // - Minimum file size check  
    // - Digital signature validation
    
    return true
  }

  private parseInstallationProgress(output: string): void {
    // Enhanced NSIS progress monitoring with phase detection
    if (!this.installStartTime) return
    
    const elapsed = Date.now() - this.installStartTime
    const phase = this.detectInstallationPhase(output, elapsed)
    
    // Update phase if changed
    if (phase !== this.currentPhase) {
      this.onPhaseChange(phase)
    }
    
    const progress = this.updateTimeBasedProgress(phase, elapsed)
    
    // Emit progress with enhanced details
    this.emitProgress('installing', progress, this.getPhaseMessage(phase), phase)
  }

  private detectInstallationPhase(output: string, elapsed: number): string {
    // Detect installation phase based on output patterns and time
    const outputLower = output.toLowerCase()
    
    // Phase detection based on common NSIS patterns
    if (outputLower.includes('extracting') || outputLower.includes('copying')) {
      return 'extracting'
    }
    if (outputLower.includes('registering') || outputLower.includes('registry')) {
      return 'registering'
    }
    if (outputLower.includes('shortcut') || outputLower.includes('menu')) {
      return 'shortcuts'
    }
    if (outputLower.includes('uninstall') || outputLower.includes('uninst')) {
      return 'uninstaller'
    }
    if (outputLower.includes('completing') || outputLower.includes('finished')) {
      return 'completing'
    }
    
    // Time-based phase detection for silent installations
    if (elapsed < 5000) {
      return 'preparation'
    } else if (elapsed < 15000) {
      return 'extracting'
    } else if (elapsed < 30000) {
      return 'registering'
    } else if (elapsed < 40000) {
      return 'shortcuts'
    } else if (elapsed < 50000) {
      return 'uninstaller'
    } else {
      return 'completing'
    }
  }

  private updateTimeBasedProgress(phase: string, elapsed: number): number {
    // NSIS-optimized time-based progress calculation with smoother transitions
    const PHASE_DURATIONS = {
      'preparation': { start: 0, duration: 3000, baseProgress: 0, maxProgress: 5 },
      'extracting': { start: 3000, duration: 15000, baseProgress: 5, maxProgress: 35 },
      'registering': { start: 18000, duration: 20000, baseProgress: 35, maxProgress: 70 },
      'shortcuts': { start: 38000, duration: 8000, baseProgress: 70, maxProgress: 85 },
      'uninstaller': { start: 46000, duration: 6000, baseProgress: 85, maxProgress: 95 },
      'completing': { start: 52000, duration: 3000, baseProgress: 95, maxProgress: 100 }
    } as const
    
    const phaseInfo = PHASE_DURATIONS[phase as keyof typeof PHASE_DURATIONS]
    if (!phaseInfo) {
      // Fallback to simple time-based calculation
      const estimatedDuration = 60000 // 1 minute
      return Math.min((elapsed / estimatedDuration) * 90, 90)
    }
    
    const phaseElapsed = Math.max(0, elapsed - phaseInfo.start)
    const phaseProgress = Math.min(phaseElapsed / phaseInfo.duration, 1)
    
    // Use easing function for smoother progress transitions
    const easedProgress = 1 - Math.pow(1 - phaseProgress, 2)
    const progressRange = phaseInfo.maxProgress - phaseInfo.baseProgress
    const currentProgress = phaseInfo.baseProgress + (easedProgress * progressRange)
    
    return Math.min(currentProgress, 95)
  }

  private getPhaseMessage(phase: string): string {
    const messages = {
      'preparation': 'Preparing installation...',
      'extracting': 'Extracting files...',
      'registering': 'Registering components...',
      'shortcuts': 'Creating shortcuts...',
      'uninstaller': 'Setting up uninstaller...',
      'completing': 'Completing installation...'
    } as const
    
    return messages[phase as keyof typeof messages] || 'Installing Sebastian...'
  }

  private getNsisErrorMessage(exitCode: number): string {
    switch (exitCode) {
      case NSIS_EXIT_CODES.SUCCESS:
        return 'Installation completed successfully'
      
      case NSIS_EXIT_CODES.USER_CANCELLED:
        return 'Installation was cancelled by user. Please run the installer again to complete the installation.'
      
      case NSIS_EXIT_CODES.SCRIPT_ABORTED:
        return 'Installation was aborted by installer script due to an internal error'
      
      case NSIS_EXIT_CODES.FATAL_ERROR:
        return 'Fatal error occurred during installation. This may be due to file corruption or system incompatibility.'
      
      case NSIS_EXIT_CODES.INVALID_PARAMETERS:
        return 'Installation failed due to invalid command line parameters'
      
      case NSIS_EXIT_CODES.ACCESS_DENIED:
        return 'Access denied. Please run the installer as administrator or check file permissions.'
      
      case NSIS_EXIT_CODES.FILE_NOT_FOUND:
        return 'Required installation files not found. The installer package may be incomplete.'
      
      case NSIS_EXIT_CODES.INSUFFICIENT_DISK_SPACE:
        return 'Not enough disk space available. Please free up disk space and try again.'
      
      case NSIS_EXIT_CODES.OUT_OF_MEMORY:
        return 'Out of memory. Please close other applications and try again.'
      
      case NSIS_EXIT_CODES.CORRUPTED_PACKAGE:
        return 'Installation package is corrupted. Please download the installer again.'
      
      case NSIS_EXIT_CODES.UNSUPPORTED_PLATFORM:
        return 'This installer is not supported on your operating system version'
      
      case NSIS_EXIT_CODES.ALREADY_INSTALLED:
        return 'A version of this software is already installed. Please uninstall it first or use the update feature.'
      
      case NSIS_EXIT_CODES.DEPENDENCY_MISSING:
        return 'Required system dependencies are missing. Please install necessary prerequisites.'
      
      case NSIS_EXIT_CODES.NETWORK_ERROR:
        return 'Network error occurred during installation. Please check your internet connection.'
      
      case NSIS_EXIT_CODES.TIMEOUT:
        return 'Installation timed out. This may be due to slow system performance or antivirus interference.'
      
      default:
        // Check for common Windows system error codes that NSIS might return
        if (exitCode >= 1000 && exitCode < 2000) {
          return `Windows system error occurred during installation (code: ${exitCode}). Please contact support.`
        }
        
        return `Unknown NSIS installation error (code: ${exitCode}). Please check system logs or contact support.`
    }
  }

  private isRetryableError(exitCode: number): boolean {
    // Determine if an error is retryable (temporary issues)
    const retryableErrors = [
      NSIS_EXIT_CODES.NETWORK_ERROR,
      NSIS_EXIT_CODES.TIMEOUT,
      NSIS_EXIT_CODES.OUT_OF_MEMORY,
      NSIS_EXIT_CODES.INSUFFICIENT_DISK_SPACE
    ] as number[]
    
    return retryableErrors.includes(exitCode)
  }

  private isUserActionRequired(exitCode: number): boolean {
    // Determine if error requires user intervention
    const userActionErrors = [
      NSIS_EXIT_CODES.USER_CANCELLED,
      NSIS_EXIT_CODES.ACCESS_DENIED,
      NSIS_EXIT_CODES.ALREADY_INSTALLED,
      NSIS_EXIT_CODES.DEPENDENCY_MISSING,
      NSIS_EXIT_CODES.UNSUPPORTED_PLATFORM
    ] as number[]
    
    return userActionErrors.includes(exitCode)
  }

  private getCriticalityLevel(exitCode: number): 'low' | 'medium' | 'high' | 'critical' {
    // Categorize error severity
    if (exitCode === NSIS_EXIT_CODES.SUCCESS) return 'low'
    
    if (([NSIS_EXIT_CODES.USER_CANCELLED] as number[]).includes(exitCode)) {
      return 'low'
    }
    
    if (([
      NSIS_EXIT_CODES.INSUFFICIENT_DISK_SPACE,
      NSIS_EXIT_CODES.NETWORK_ERROR,
      NSIS_EXIT_CODES.TIMEOUT
    ] as number[]).includes(exitCode)) {
      return 'medium'
    }
    
    if (([
      NSIS_EXIT_CODES.ACCESS_DENIED,
      NSIS_EXIT_CODES.ALREADY_INSTALLED,
      NSIS_EXIT_CODES.DEPENDENCY_MISSING
    ] as number[]).includes(exitCode)) {
      return 'high'
    }
    
    return 'critical' // FATAL_ERROR, CORRUPTED_PACKAGE, etc.
  }

  private analyzeErrorCriticality(errorMessage: string): 'low' | 'medium' | 'high' | 'critical' {
    const message = errorMessage.toLowerCase()
    
    if (message.includes('cancelled') || message.includes('abort')) {
      return 'low'
    }
    
    if (message.includes('timeout') || message.includes('disk space') || message.includes('network')) {
      return 'medium'
    }
    
    if (message.includes('permission') || message.includes('access denied') || message.includes('administrator')) {
      return 'high'
    }
    
    return 'critical'
  }

  private isErrorRetryable(errorMessage: string): boolean {
    const message = errorMessage.toLowerCase()
    
    // Retryable errors
    return message.includes('timeout') || 
           message.includes('network') || 
           message.includes('disk space') || 
           message.includes('memory') || 
           message.includes('file not found')
  }

  private doesErrorRequireUserAction(errorMessage: string): boolean {
    const message = errorMessage.toLowerCase()
    
    // Errors that require user intervention
    return message.includes('permission') || 
           message.includes('administrator') || 
           message.includes('access denied') || 
           message.includes('already installed') || 
           message.includes('dependency')
  }

  private emitProgress(stage: 'installing' | 'complete', progress: number, message: string, phase?: string, timestamp?: number): void {
    const currentTime = timestamp || Date.now()
    const estimatedTimeRemaining = this.calculateEstimatedTimeRemaining(progress, currentTime)
    
    const progressData: UpdateProgress = {
      stage,
      progress: Math.min(Math.max(progress, 0), 100),
      message,
      phase: phase as any || 'installation-progress',
      timestamp: currentTime,
      estimatedTimeRemaining
    }

    this.emit('progress', progressData)
    
    this.log('info', 'execution', 'Installation progress update', {
      stage,
      progress: Math.round(progress),
      message,
      phase,
      timestamp: new Date(currentTime).toISOString(),
      estimatedTimeRemaining: estimatedTimeRemaining ? `${Math.round(estimatedTimeRemaining / 1000)}s` : 'unknown'
    })
  }

  private calculateEstimatedTimeRemaining(progress: number, currentTime: number): number | undefined {
    if (!this.installStartTime || progress <= 0) return undefined
    
    const elapsed = currentTime - this.installStartTime
    const totalEstimatedTime = (elapsed / progress) * 100
    const remaining = totalEstimatedTime - elapsed
    
    // Return remaining time in milliseconds, minimum 0
    return Math.max(remaining, 0)
  }

  public async cancelInstallation(): Promise<void> {
    // Signal cancellation
    if (this.abortController) {
      this.abortController.abort()
    }

    // Clear progress interval
    this.clearProgressInterval()

    // Terminate active process
    if (this.activeInstallation) {
      this.activeInstallation.kill('SIGTERM')
      
      // Wait for process to exit gracefully
      await new Promise<void>((resolve) => {
        if (!this.activeInstallation) {
          resolve()
          return
        }

        const timeout = setTimeout(() => {
          // Force kill if not terminated within 5 seconds
          if (this.activeInstallation) {
            this.activeInstallation.kill('SIGKILL')
          }
          resolve()
        }, 5000)

        this.activeInstallation.once('exit', () => {
          clearTimeout(timeout)
          resolve()
        })
      })

      this.activeInstallation = undefined
    }

    // Wait for installation promise to complete
    if (this.installationPromise) {
      try {
        await this.installationPromise
      } catch (error) {
        // Expected when cancelled
      }
    }

    this.emit('installationCancelled')
  }

  public isInstalling(): boolean {
    return this.activeInstallation !== undefined
  }

  public async openInstallationLog(): Promise<void> {
    // NSIS installers don't typically create detailed logs like traditional MSI installers
    // This method is kept for compatibility but may not have a log file to open
    const logPath = `${process.env.TEMP}\\sebastian-install.log`
    if (existsSync(logPath)) {
      await shell.openPath(logPath)
    } else {
      console.warn('No NSIS installation log found')
    }
  }

  public getInstallationLogs(): NsisInstallationLog[] {
    return [...this.installationLogs]
  }

  public getLogsByPhase(phase: NsisInstallationLog['phase']): NsisInstallationLog[] {
    return this.installationLogs.filter(log => log.phase === phase)
  }

  public getLogsByLevel(level: NsisInstallationLog['level']): NsisInstallationLog[] {
    return this.installationLogs.filter(log => log.level === level)
  }

  public exportLogsAsText(): string {
    return this.installationLogs
      .map(log => {
        const timestamp = new Date(log.timestamp).toISOString()
        const details = log.details ? ` | ${JSON.stringify(log.details)}` : ''
        const exitCode = log.exitCode ? ` | Exit: ${log.exitCode}` : ''
        return `[${timestamp}] ${log.level.toUpperCase()} (${log.phase}) ${log.message}${details}${exitCode}`
      })
      .join('\n')
  }

  public cleanup(): void {
    this.log('debug', 'cleanup', 'Performing final cleanup')
    
    if (this.activeInstallation) {
      // Don't kill detached installation process
      // It will continue running independently
      this.log('info', 'cleanup', 'Detached installation process will continue running')
      this.activeInstallation = undefined
    }
    
    // Clear timeout tracking
    this.clearAllTimeouts()
    this.timeoutEvents = []
    this.retryCount = 0
    
    // Clear logs after cleanup
    this.installationLogs = []
    this.removeAllListeners()
  }
  
  private setupTimeoutHandling(resolve: (value: InstallResult) => void, reject: (reason?: any) => void, defaultTimeout: number): void {
    // Store callbacks for later use
    this.resolveCallback = resolve
    this.rejectCallback = reject
    
    // Set up global timeout as fallback
    const globalTimeout = this.timeoutConfig.globalTimeout || defaultTimeout
    this.globalTimeoutId = setTimeout(() => {
      this.handleGlobalTimeout(resolve, reject, globalTimeout)
    }, globalTimeout)
    
    // Set up initial phase timeout
    this.setupPhaseTimeout('preparation', resolve, reject)
    
    this.log('debug', 'execution', 'Timeout handling configured', {
      globalTimeout: `${globalTimeout / 1000}s`,
      phaseTimeouts: Object.entries(this.timeoutConfig.phaseTimeouts || {})
        .map(([phase, timeout]) => `${phase}: ${timeout / 1000}s`)
        .join(', ')
    })
  }
  
  private setupPhaseTimeout(phase: string, resolve: (value: InstallResult) => void, reject: (reason?: any) => void): void {
    // Clear existing phase timeout
    this.clearPhaseTimeout(phase)
    
    const phaseTimeout = this.timeoutConfig.phaseTimeouts?.[phase as keyof typeof this.timeoutConfig.phaseTimeouts]
    if (!phaseTimeout) return
    
    const timeoutId = setTimeout(() => {
      this.handlePhaseTimeout(phase, resolve, reject)
    }, phaseTimeout)
    
    this.phaseTimeouts.set(phase, timeoutId)
    
    this.log('debug', 'execution', `Phase timeout set for ${phase}`, {
      timeout: `${phaseTimeout / 1000}s`,
      phase
    })
  }
  
  private clearPhaseTimeout(phase: string): void {
    const timeoutId = this.phaseTimeouts.get(phase)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.phaseTimeouts.delete(phase)
    }
  }
  
  private clearAllTimeouts(): void {
    // Clear global timeout
    if (this.globalTimeoutId) {
      clearTimeout(this.globalTimeoutId)
      this.globalTimeoutId = undefined
    }
    
    // Clear all phase timeouts
    this.phaseTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    this.phaseTimeouts.clear()
  }
  
  private onPhaseChange(newPhase: string): void {
    const oldPhase = this.currentPhase
    this.currentPhase = newPhase
    this.phaseStartTime = Date.now()
    
    // Clear old phase timeout
    this.clearPhaseTimeout(oldPhase)
    
    // Set up new phase timeout using stored callbacks
    if (this.resolveCallback && this.rejectCallback) {
      this.setupPhaseTimeout(newPhase, this.resolveCallback, this.rejectCallback)
    }
    
    this.log('info', 'execution', `Phase changed from ${oldPhase} to ${newPhase}`, {
      oldPhase,
      newPhase,
      elapsed: this.installStartTime ? `${(Date.now() - this.installStartTime) / 1000}s` : 'unknown'
    })
  }

  private setupProgressInterval(): void {
    // Clear existing interval
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval)
    }
    
    // Set up regular progress updates every 500ms for smoother UI
    this.progressUpdateInterval = setInterval(() => {
      if (this.installStartTime && this.activeInstallation) {
        const elapsed = Date.now() - this.installStartTime
        const progress = this.updateTimeBasedProgress(this.currentPhase, elapsed)
        
        // Only emit if progress has changed significantly
        const progressData = {
          stage: 'installing' as const,
          progress,
          message: this.getPhaseMessage(this.currentPhase),
          phase: this.currentPhase,
          timestamp: Date.now(),
          estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(progress, Date.now())
        }
        
        this.emit('progress', progressData)
      }
    }, 500)
  }

  private clearProgressInterval(): void {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval)
      this.progressUpdateInterval = undefined
    }
  }
  
  private handlePhaseTimeout(phase: string, resolve: (value: InstallResult) => void, reject: (reason?: any) => void): void {
    const elapsed = this.phaseStartTime ? Date.now() - this.phaseStartTime : 0
    const timeout = this.timeoutConfig.phaseTimeouts?.[phase as keyof typeof this.timeoutConfig.phaseTimeouts] || 0
    
    const timeoutEvent: TimeoutEvent = {
      type: 'phase-timeout',
      phase,
      elapsed,
      timeout,
      retryCount: this.retryCount,
      timestamp: Date.now()
    }
    
    this.timeoutEvents.push(timeoutEvent)
    
    this.log('warn', 'execution', `Phase timeout reached for ${phase}`, {
      phase,
      elapsed: `${elapsed / 1000}s`,
      timeout: `${timeout / 1000}s`,
      retryCount: this.retryCount
    })
    
    // Emit timeout progress update
    this.emitProgress('installing', 0, `Phase ${phase} timed out`, 'timeout')
    
    // Send timeout notification to UI
    this.sendTimeoutNotification('phase-timeout', phase, elapsed, timeout)
    
    // Check if retry is possible
    if (this.canRetryPhase(phase)) {
      this.requestUserAction(phase, 'phase-timeout', resolve, reject)
    } else {
      this.handleTimeout(resolve, reject, 'phase-timeout', phase)
    }
  }
  
  private handleGlobalTimeout(resolve: (value: InstallResult) => void, reject: (reason?: any) => void, timeout: number): void {
    const elapsed = this.installStartTime ? Date.now() - this.installStartTime : 0
    
    const timeoutEvent: TimeoutEvent = {
      type: 'global-timeout',
      phase: this.currentPhase,
      elapsed,
      timeout,
      timestamp: Date.now()
    }
    
    this.timeoutEvents.push(timeoutEvent)
    
    this.log('error', 'execution', 'Global installation timeout reached', {
      elapsed: `${elapsed / 1000}s`,
      timeout: `${timeout / 1000}s`,
      phase: this.currentPhase
    })
    
    // Emit timeout progress update
    this.emitProgress('installing', 0, 'Installation timed out', 'timeout')
    
    // Send timeout notification to UI
    this.sendTimeoutNotification('global-timeout', this.currentPhase, elapsed, timeout)
    
    // Request user action for global timeout
    this.requestUserAction(this.currentPhase, 'global-timeout', resolve, reject)
  }
  
  private canRetryPhase(phase: string): boolean {
    const retryConfig = this.timeoutConfig.retryConfig
    if (!retryConfig?.retryablePhases?.includes(phase)) return false
    
    return this.retryCount < (retryConfig.maxRetries || 3)
  }
  
  private retryPhase(phase: string, resolve: (value: InstallResult) => void, reject: (reason?: any) => void): void {
    this.retryCount++
    const retryConfig = this.timeoutConfig.retryConfig
    const retryDelay = (retryConfig?.retryDelay || 5000) * Math.pow(retryConfig?.retryMultiplier || 1.5, this.retryCount - 1)
    
    this.log('info', 'execution', `Retrying phase ${phase} (attempt ${this.retryCount})`, {
      phase,
      retryCount: this.retryCount,
      retryDelay: `${retryDelay / 1000}s`
    })
    
    // Emit retry progress update
    this.emitProgress('installing', 0, `Retrying ${phase}... (${this.retryCount}/${retryConfig?.maxRetries || 3})`, 'retry')
    
    setTimeout(() => {
      // Reset phase start time
      this.phaseStartTime = Date.now()
      
      // Set up new phase timeout
      this.setupPhaseTimeout(phase, resolve, reject)
    }, retryDelay)
  }
  
  private handleTimeout(resolve: (value: InstallResult) => void, reject: (reason?: any) => void, reason: 'phase-timeout' | 'global-timeout' | 'user-timeout', phase?: string): void {
    const fallbackConfig = this.timeoutConfig.fallbackConfig
    
    if (fallbackConfig?.enableFallback) {
      this.executeFallbackStrategy(resolve, reject, reason, phase)
    } else {
      this.terminateInstallation(resolve, reject, reason, phase)
    }
  }
  
  private executeFallbackStrategy(resolve: (value: InstallResult) => void, reject: (reason?: any) => void, reason: 'phase-timeout' | 'global-timeout' | 'user-timeout', phase?: string): void {
    const fallbackConfig = this.timeoutConfig.fallbackConfig
    const strategy = fallbackConfig?.fallbackStrategy || 'cancel'
    
    this.log('info', 'execution', `Executing fallback strategy: ${strategy}`, {
      strategy,
      reason,
      phase
    })
    
    switch (strategy) {
      case 'retry':
        if (this.canRetryPhase(phase || this.currentPhase)) {
          this.retryPhase(phase || this.currentPhase, resolve, reject)
        } else {
          this.terminateInstallation(resolve, reject, reason, phase)
        }
        break
      
      case 'force-kill':
        this.forceTerminateInstallation(resolve, reject, reason, phase)
        break
      
      case 'cancel':
      default:
        this.terminateInstallation(resolve, reject, reason, phase)
        break
    }
  }
  
  private terminateInstallation(resolve: (value: InstallResult) => void, reject: (reason?: any) => void, reason: 'phase-timeout' | 'global-timeout' | 'user-timeout', phase?: string): void {
    if (this.activeInstallation) {
      this.log('info', 'execution', 'Gracefully terminating installation process')
      this.activeInstallation.kill('SIGTERM')
      
      // Give process time to terminate gracefully
      const fallbackTimeout = this.timeoutConfig.fallbackConfig?.fallbackTimeout || 30000
      setTimeout(() => {
        if (this.activeInstallation) {
          this.forceTerminateInstallation(resolve, reject, reason, phase)
        }
      }, fallbackTimeout)
    }
    
    const elapsed = this.installStartTime ? Date.now() - this.installStartTime : 0
    const errorMessage = reason === 'phase-timeout' 
      ? `Installation timed out during ${phase} phase after ${elapsed / 1000} seconds`
      : `Installation timed out after ${elapsed / 1000} seconds`
    
    resolve({
      success: false,
      error: errorMessage,
      duration: elapsed,
      isRetryable: this.canRetryPhase(phase || this.currentPhase),
      requiresUserAction: true,
      criticalityLevel: 'high',
      timeoutPhase: phase,
      timeoutReason: reason
    })
  }
  
  private forceTerminateInstallation(resolve: (value: InstallResult) => void, reject: (reason?: any) => void, reason: 'phase-timeout' | 'global-timeout' | 'user-timeout', phase?: string): void {
    if (this.activeInstallation) {
      this.log('warn', 'execution', 'Force killing installation process')
      this.activeInstallation.kill('SIGKILL')
      this.activeInstallation = undefined
    }
    
    const elapsed = this.installStartTime ? Date.now() - this.installStartTime : 0
    const errorMessage = `Installation was force terminated due to timeout (${reason})`
    
    resolve({
      success: false,
      error: errorMessage,
      duration: elapsed,
      isRetryable: false,
      requiresUserAction: true,
      criticalityLevel: 'critical',
      timeoutPhase: phase,
      timeoutReason: reason
    })
  }
  
  public getTimeoutStatus(): InstallationTimeoutStatus {
    const now = Date.now()
    const globalElapsed = this.installStartTime ? now - this.installStartTime : 0
    const phaseElapsed = this.phaseStartTime ? now - this.phaseStartTime : 0
    
    const globalTimeout = this.timeoutConfig.globalTimeout || 0
    const phaseTimeout = this.timeoutConfig.phaseTimeouts?.[this.currentPhase as keyof typeof this.timeoutConfig.phaseTimeouts] || 0
    
    return {
      isTimeoutPending: this.phaseTimeouts.size > 0 || this.globalTimeoutId !== undefined,
      currentPhase: this.currentPhase,
      phaseElapsed,
      phaseTimeout,
      globalElapsed,
      globalTimeout,
      retryCount: this.retryCount,
      maxRetries: this.timeoutConfig.retryConfig?.maxRetries || 3,
      canRetry: this.canRetryPhase(this.currentPhase),
      timeoutEvents: [...this.timeoutEvents]
    }
  }
  
  public getTimeoutEvents(): TimeoutEvent[] {
    return [...this.timeoutEvents]
  }
  
  private sendTimeoutNotification(type: 'phase-timeout' | 'global-timeout', phase: string, elapsed: number, timeout: number): void {
    const notification: TimeoutNotification = {
      type,
      phase,
      elapsed,
      timeout,
      canRetry: this.canRetryPhase(phase),
      retryCount: this.retryCount,
      maxRetries: this.timeoutConfig.retryConfig?.maxRetries || 3,
      message: type === 'phase-timeout' 
        ? `Installation timed out during ${phase} phase`
        : `Installation timed out after ${elapsed / 1000} seconds`
    }
    
    this.emit('timeout', notification)
    this.log('info', 'execution', 'Timeout notification sent', notification)
  }
  
  private requestUserAction(phase: string, reason: 'phase-timeout' | 'global-timeout', resolve: (value: InstallResult) => void, reject: (reason?: any) => void): void {
    this.pendingUserAction = true
    
    this.log('info', 'execution', `Requesting user action for ${reason}`, {
      phase,
      reason,
      canRetry: this.canRetryPhase(phase)
    })
    
    // Emit user action request
    this.emit('userActionRequired', {
      reason,
      phase,
      canRetry: this.canRetryPhase(phase),
      retryCount: this.retryCount,
      maxRetries: this.timeoutConfig.retryConfig?.maxRetries || 3
    })
    
    // Set timeout for user action (30 seconds)
    const userActionTimeout = setTimeout(() => {
      if (this.pendingUserAction) {
        this.log('warn', 'execution', 'User action timeout reached, cancelling installation')
        this.pendingUserAction = false
        this.handleTimeout(resolve, reject, reason, phase)
      }
    }, 30000)
    
    // Store timeout for cleanup
    this.phaseTimeouts.set(`user-action-${phase}`, userActionTimeout)
  }
  
  public handleUserAction(action: TimeoutUserAction): void {
    if (!this.pendingUserAction) {
      this.log('warn', 'execution', 'User action received but no action was pending')
      return
    }
    
    this.pendingUserAction = false
    
    // Clear user action timeout
    this.clearPhaseTimeout(`user-action-${action.phase || this.currentPhase}`)
    
    this.log('info', 'execution', `User action received: ${action.action}`, {
      action: action.action,
      phase: action.phase,
      reason: action.reason
    })
    
    if (!this.resolveCallback || !this.rejectCallback) {
      this.log('error', 'execution', 'No resolve/reject callbacks available for user action')
      return
    }
    
    switch (action.action) {
      case 'retry':
        if (this.canRetryPhase(action.phase || this.currentPhase)) {
          this.retryPhase(action.phase || this.currentPhase, this.resolveCallback, this.rejectCallback)
        } else {
          this.log('warn', 'execution', `Cannot retry phase ${action.phase || this.currentPhase}: retry limit reached`)
          this.handleTimeout(this.resolveCallback, this.rejectCallback, 'phase-timeout', action.phase)
        }
        break
      
      case 'cancel':
        this.terminateInstallation(this.resolveCallback, this.rejectCallback, 'user-timeout', action.phase)
        break
      
      case 'force-cancel':
        this.forceTerminateInstallation(this.resolveCallback, this.rejectCallback, 'user-timeout', action.phase)
        break
      
      case 'continue':
        // Continue installation by extending timeout
        this.extendTimeout(action.phase || this.currentPhase)
        break
      
      default:
        this.log('warn', 'execution', `Unknown user action: ${action.action}`)
        this.handleTimeout(this.resolveCallback, this.rejectCallback, 'user-timeout', action.phase)
    }
  }
  
  private extendTimeout(phase: string): void {
    if (!this.resolveCallback || !this.rejectCallback) return
    
    const extensionTime = 60000 // 1 minute extension
    
    this.log('info', 'execution', `Extending timeout for phase ${phase} by ${extensionTime / 1000}s`)
    
    // Set up new phase timeout with extension
    this.setupPhaseTimeout(phase, this.resolveCallback, this.rejectCallback)
    
    // Emit progress update
    this.emitProgress('installing', 0, `Timeout extended for ${phase}`, 'timeout-extended')
  }
  
  public exportTimeoutLogsAsText(): string {
    const timeoutLogs = this.timeoutEvents.map(event => {
      const timestamp = new Date(event.timestamp).toISOString()
      const retryInfo = event.retryCount !== undefined ? ` | Retry: ${event.retryCount}` : ''
      return `[${timestamp}] ${event.type.toUpperCase()} | Phase: ${event.phase} | Elapsed: ${event.elapsed}ms | Timeout: ${event.timeout}ms${retryInfo}`
    })
    
    const generalLogs = this.installationLogs
      .filter(log => log.phase === 'execution' && (log.message.includes('timeout') || log.message.includes('retry')))
      .map(log => {
        const timestamp = new Date(log.timestamp).toISOString()
        const details = log.details ? ` | ${JSON.stringify(log.details)}` : ''
        return `[${timestamp}] ${log.level.toUpperCase()} | ${log.message}${details}`
      })
    
    return [...timeoutLogs, ...generalLogs].join('\n')
  }

  /**
   * 향상된 에러 로깅 시스템 - 구조화된 에러 분석
   */
  public exportDetailedErrorAnalysis(): string {
    const lines: string[] = []
    
    lines.push('='.repeat(80))
    lines.push('상세한 에러 분석 리포트')
    lines.push('='.repeat(80))
    lines.push('')
    
    // 1. 에러 발생 빈도 분석
    const errorFrequency = this.analyzeErrorFrequency()
    lines.push('에러 발생 빈도:')
    lines.push('-'.repeat(40))
    Object.entries(errorFrequency).forEach(([category, count]) => {
      lines.push(`${category}: ${count}회`)
    })
    lines.push('')
    
    // 2. 단계별 에러 분석
    const phaseErrors = this.analyzePhaseErrors()
    lines.push('단계별 에러 분석:')
    lines.push('-'.repeat(40))
    Object.entries(phaseErrors).forEach(([phase, errors]) => {
      lines.push(`${phase}: ${errors.length}개 에러`)
      errors.forEach(error => {
        lines.push(`  - ${error.level.toUpperCase()}: ${error.message}`)
      })
    })
    lines.push('')
    
    // 3. 재시도 성공률 분석
    const retryAnalysis = this.analyzeRetrySuccess()
    lines.push('재시도 성공률 분석:')
    lines.push('-'.repeat(40))
    lines.push(`총 시도 횟수: ${retryAnalysis.totalAttempts}`)
    lines.push(`성공 횟수: ${retryAnalysis.successfulAttempts}`)
    lines.push(`실패 횟수: ${retryAnalysis.failedAttempts}`)
    lines.push(`성공률: ${retryAnalysis.successRate}%`)
    lines.push('')
    
    // 4. 시간 기반 성능 분석
    const performanceAnalysis = this.analyzePerformance()
    lines.push('성능 분석:')
    lines.push('-'.repeat(40))
    lines.push(`평균 설치 시간: ${performanceAnalysis.averageInstallTime}ms`)
    lines.push(`최대 설치 시간: ${performanceAnalysis.maxInstallTime}ms`)
    lines.push(`최소 설치 시간: ${performanceAnalysis.minInstallTime}ms`)
    lines.push(`타임아웃 발생 횟수: ${performanceAnalysis.timeoutCount}`)
    lines.push('')
    
    // 5. 권장 개선사항
    const recommendations = this.generateRecommendations()
    lines.push('권장 개선사항:')
    lines.push('-'.repeat(40))
    recommendations.forEach(rec => {
      lines.push(`• ${rec}`)
    })
    
    return lines.join('\n')
  }

  private analyzeErrorFrequency(): Record<string, number> {
    const frequency: Record<string, number> = {}
    
    this.installationLogs
      .filter(log => log.level === 'error')
      .forEach(log => {
        const errorType = this.categorizeLogError(log.message)
        frequency[errorType] = (frequency[errorType] || 0) + 1
      })
    
    return frequency
  }

  private analyzePhaseErrors(): Record<string, NsisInstallationLog[]> {
    const phaseErrors: Record<string, NsisInstallationLog[]> = {}
    
    this.installationLogs
      .filter(log => log.level === 'error' || log.level === 'warn')
      .forEach(log => {
        if (!phaseErrors[log.phase]) {
          phaseErrors[log.phase] = []
        }
        phaseErrors[log.phase].push(log)
      })
    
    return phaseErrors
  }

  private analyzeRetrySuccess(): {
    totalAttempts: number
    successfulAttempts: number
    failedAttempts: number
    successRate: number
  } {
    const total = this.installationAttempts.length
    const successful = this.installationAttempts.filter(a => a.result === 'success').length
    const failed = this.installationAttempts.filter(a => a.result === 'failed').length
    
    return {
      totalAttempts: total,
      successfulAttempts: successful,
      failedAttempts: failed,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0
    }
  }

  private analyzePerformance(): {
    averageInstallTime: number
    maxInstallTime: number
    minInstallTime: number
    timeoutCount: number
  } {
    const completedAttempts = this.installationAttempts.filter(a => a.result === 'success' || a.result === 'failed')
    const durations = completedAttempts.map(a => a.duration)
    
    return {
      averageInstallTime: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      maxInstallTime: durations.length > 0 ? Math.max(...durations) : 0,
      minInstallTime: durations.length > 0 ? Math.min(...durations) : 0,
      timeoutCount: this.timeoutEvents.length
    }
  }

  private categorizeLogError(message: string): string {
    if (message.includes('timeout')) return 'timeout-error'
    if (message.includes('permission') || message.includes('access')) return 'permission-error'
    if (message.includes('disk') || message.includes('space')) return 'disk-error'
    if (message.includes('network') || message.includes('download')) return 'network-error'
    if (message.includes('cancelled') || message.includes('aborted')) return 'user-cancelled'
    if (message.includes('corrupted') || message.includes('invalid')) return 'file-error'
    return 'unknown-error'
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    // 타임아웃 빈도 분석
    if (this.timeoutEvents.length > 0) {
      recommendations.push('타임아웃 발생이 감지되었습니다. 타임아웃 임계값을 조정하거나 시스템 성능을 확인해보세요.')
    }
    
    // 재시도 성공률 분석
    const retryAnalysis = this.analyzeRetrySuccess()
    if (retryAnalysis.successRate < 50) {
      recommendations.push('재시도 성공률이 낮습니다. 설치 환경 또는 시스템 요구사항을 확인해보세요.')
    }
    
    // 에러 빈도 분석
    const errorFreq = this.analyzeErrorFrequency()
    if (errorFreq['permission-error'] > 0) {
      recommendations.push('권한 관련 에러가 발생했습니다. 관리자 권한으로 실행하거나 보안 소프트웨어를 확인해보세요.')
    }
    
    if (errorFreq['disk-error'] > 0) {
      recommendations.push('디스크 공간 관련 에러가 발생했습니다. 충분한 디스크 공간을 확보해보세요.')
    }
    
    if (errorFreq['network-error'] > 0) {
      recommendations.push('네트워크 관련 에러가 발생했습니다. 인터넷 연결 상태를 확인해보세요.')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('현재 에러 로그에서 특별한 이슈가 발견되지 않았습니다.')
    }
    
    return recommendations
  }

  /**
   * 로그 압축 및 정리 기능
   */
  public compressLogs(): void {
    const maxLogs = 1000
    const maxAge = 24 * 60 * 60 * 1000 // 24시간
    const now = Date.now()
    
    // 오래된 로그 제거
    this.installationLogs = this.installationLogs.filter(log => 
      now - log.timestamp < maxAge
    )
    
    // 최대 로그 수 제한
    if (this.installationLogs.length > maxLogs) {
      this.installationLogs = this.installationLogs.slice(-maxLogs)
    }
    
    // 타임아웃 이벤트도 정리
    this.timeoutEvents = this.timeoutEvents.filter(event => 
      now - event.timestamp < maxAge
    )
    
    // 설치 시도 이력도 정리
    this.installationAttempts = this.installationAttempts.filter(attempt => 
      now - attempt.timestamp < maxAge
    )
    
    this.log('info', 'cleanup', `Logs compressed: ${this.installationLogs.length} logs, ${this.timeoutEvents.length} timeout events, ${this.installationAttempts.length} attempts`)
  }
  
  private createErrorDetails(exitCode: number, errorMessage: string, phase: string): InstallationErrorDetails {
    const category = this.categorizeError(exitCode, errorMessage)
    
    return {
      category,
      code: exitCode.toString(),
      phase,
      userMessage: this.getUserFriendlyMessage(category, exitCode, errorMessage),
      technicalMessage: errorMessage,
      systemContext: {
        platform: platform(),
        arch: arch(),
        osVersion: release(),
        availableSpace: 0, // Will be filled asynchronously
        memoryUsage: (totalmem() - freemem()) / totalmem() * 100
      },
      installerContext: {
        installerType: 'nsis',
        installerSize: this.getInstallerSize(),
        installerPath: this.getInstallerPath(),
        arguments: this.getInstallerArguments(),
        workingDirectory: process.cwd()
      },
      timestamp: Date.now(),
      correlationId: this.correlationId
    }
  }
  
  private categorizeError(exitCode: number, errorMessage: string): ErrorCategory {
    const message = errorMessage.toLowerCase()
    
    // System-level errors
    if (exitCode === NSIS_EXIT_CODES.ACCESS_DENIED || 
        message.includes('permission') || 
        message.includes('access denied') || 
        message.includes('administrator')) {
      return 'system-error'
    }
    
    // Network-related errors
    if (exitCode === NSIS_EXIT_CODES.NETWORK_ERROR || 
        message.includes('network') || 
        message.includes('connection') || 
        message.includes('download')) {
      return 'network-error'
    }
    
    // User-initiated errors
    if (exitCode === NSIS_EXIT_CODES.USER_CANCELLED || 
        message.includes('cancelled') || 
        message.includes('abort')) {
      return 'user-error'
    }
    
    // Environment-specific errors
    if (exitCode === NSIS_EXIT_CODES.INSUFFICIENT_DISK_SPACE || 
        exitCode === NSIS_EXIT_CODES.OUT_OF_MEMORY || 
        message.includes('disk space') || 
        message.includes('memory') || 
        message.includes('antivirus')) {
      return 'environment-error'
    }
    
    // Timeout errors
    if (exitCode === NSIS_EXIT_CODES.TIMEOUT || 
        message.includes('timeout') || 
        message.includes('timed out')) {
      return 'timeout-error'
    }
    
    // Installer-specific errors
    if (exitCode === NSIS_EXIT_CODES.CORRUPTED_PACKAGE || 
        exitCode === NSIS_EXIT_CODES.INVALID_PARAMETERS || 
        exitCode === NSIS_EXIT_CODES.FATAL_ERROR || 
        message.includes('corrupted') || 
        message.includes('invalid') || 
        message.includes('installer')) {
      return 'installer-error'
    }
    
    // Dependency errors
    if (exitCode === NSIS_EXIT_CODES.DEPENDENCY_MISSING || 
        exitCode === NSIS_EXIT_CODES.UNSUPPORTED_PLATFORM || 
        message.includes('dependency') || 
        message.includes('prerequisite') || 
        message.includes('unsupported')) {
      return 'dependency-error'
    }
    
    return 'unknown-error'
  }
  
  private getUserFriendlyMessage(category: ErrorCategory, exitCode: number, technicalMessage: string): string {
    switch (category) {
      case 'system-error':
        return '시스템 권한 문제로 설치에 실패했습니다. 관리자 권한으로 다시 시도해주세요.'
      
      case 'network-error':
        return '네트워크 연결 문제로 설치에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.'
      
      case 'user-error':
        return '사용자가 설치를 취소했습니다. 설치를 계속하려면 다시 시도해주세요.'
      
      case 'environment-error':
        if (technicalMessage.includes('disk space')) {
          return '디스크 공간이 부족하여 설치에 실패했습니다. 불필요한 파일을 삭제하고 다시 시도해주세요.'
        }
        if (technicalMessage.includes('memory')) {
          return '메모리가 부족하여 설치에 실패했습니다. 다른 프로그램을 종료하고 다시 시도해주세요.'
        }
        return '시스템 환경 문제로 설치에 실패했습니다. 바이러스 백신을 일시적으로 비활성화하고 다시 시도해주세요.'
      
      case 'timeout-error':
        return '설치 시간이 초과되었습니다. 시스템 성능을 확인하고 다시 시도해주세요.'
      
      case 'installer-error':
        return '설치 파일에 문제가 있습니다. 설치 파일을 다시 다운로드하고 시도해주세요.'
      
      case 'dependency-error':
        return '시스템 요구사항을 만족하지 않습니다. 필요한 구성 요소를 설치하고 다시 시도해주세요.'
      
      default:
        return '알 수 없는 오류로 설치에 실패했습니다. 지원팀에 문의해주세요.'
    }
  }
  
  private generateRecoveryOptions(exitCode: number, errorDetails: InstallationErrorDetails): RecoveryOption[] {
    const options: RecoveryOption[] = []
    
    switch (errorDetails.category) {
      case 'system-error':
        options.push({
          id: 'run-as-admin',
          solution: 'run-as-admin',
          title: '관리자 권한으로 실행',
          description: '관리자 권한으로 설치 프로그램을 다시 실행합니다.',
          priority: 'primary',
          estimatedTime: '1분',
          riskLevel: 'low',
          automated: false,
          requiresElevation: true,
          steps: [
            {
              id: 'step-1',
              title: '설치 프로그램 우클릭',
              description: '설치 파일을 우클릭하여 컨텍스트 메뉴를 엽니다.',
              type: 'action',
              automated: false
            },
            {
              id: 'step-2',
              title: '관리자 권한으로 실행',
              description: '"관리자 권한으로 실행" 옵션을 선택합니다.',
              type: 'action',
              automated: false
            }
          ]
        })
        break
        
      case 'network-error':
        options.push({
          id: 'check-network',
          solution: 'check-network',
          title: '네트워크 연결 확인',
          description: '인터넷 연결을 확인하고 다시 시도합니다.',
          priority: 'primary',
          estimatedTime: '2분',
          riskLevel: 'low',
          automated: false,
          steps: [
            {
              id: 'step-1',
              title: '인터넷 연결 확인',
              description: '웹 브라우저를 열어 인터넷 연결을 확인합니다.',
              type: 'verification',
              automated: false
            },
            {
              id: 'step-2',
              title: '방화벽 설정 확인',
              description: '방화벽이 설치 프로그램을 차단하지 않는지 확인합니다.',
              type: 'verification',
              automated: false
            }
          ]
        })
        break
        
      case 'environment-error':
        if (errorDetails.technicalMessage?.includes('disk space')) {
          options.push({
            id: 'free-space',
            solution: 'free-space',
            title: '디스크 공간 확보',
            description: '불필요한 파일을 삭제하여 디스크 공간을 확보합니다.',
            priority: 'primary',
            estimatedTime: '5분',
            riskLevel: 'medium',
            automated: false,
            steps: [
              {
                id: 'step-1',
                title: '디스크 정리 실행',
                description: '시스템 디스크 정리 도구를 사용하여 임시 파일을 삭제합니다.',
                type: 'action',
                automated: false,
                command: 'cleanmgr'
              },
              {
                id: 'step-2',
                title: '불필요한 프로그램 제거',
                description: '사용하지 않는 프로그램을 제거하여 공간을 확보합니다.',
                type: 'action',
                automated: false
              }
            ]
          })
        }
        
        options.push({
          id: 'disable-antivirus',
          solution: 'disable-antivirus',
          title: '바이러스 백신 일시 비활성화',
          description: '바이러스 백신을 일시적으로 비활성화하고 설치를 시도합니다.',
          priority: 'secondary',
          estimatedTime: '3분',
          riskLevel: 'medium',
          automated: false,
          steps: [
            {
              id: 'step-1',
              title: '바이러스 백신 설정 열기',
              description: '바이러스 백신 프로그램의 설정을 엽니다.',
              type: 'action',
              automated: false
            },
            {
              id: 'step-2',
              title: '실시간 보호 비활성화',
              description: '실시간 보호 기능을 일시적으로 비활성화합니다.',
              type: 'action',
              automated: false,
              troubleshooting: '설치 완료 후 반드시 바이러스 백신을 다시 활성화해주세요.'
            }
          ]
        })
        break
        
      case 'installer-error':
        options.push({
          id: 'reinstall',
          solution: 'reinstall',
          title: '설치 파일 다시 다운로드',
          description: '설치 파일을 다시 다운로드하고 설치를 시도합니다.',
          priority: 'primary',
          estimatedTime: '10분',
          riskLevel: 'low',
          automated: false,
          steps: [
            {
              id: 'step-1',
              title: '기존 설치 파일 삭제',
              description: '손상된 설치 파일을 삭제합니다.',
              type: 'action',
              automated: false
            },
            {
              id: 'step-2',
              title: '새 설치 파일 다운로드',
              description: '공식 웹사이트에서 최신 설치 파일을 다운로드합니다.',
              type: 'action',
              automated: false
            }
          ]
        })
        break
    }
    
    // Always add retry option
    options.push({
      id: 'retry',
      solution: 'retry',
      title: '다시 시도',
      description: '설치를 다시 시도합니다.',
      priority: 'secondary',
      estimatedTime: '5분',
      riskLevel: 'low',
      automated: true,
      steps: [
        {
          id: 'step-1',
          title: '설치 재시도',
          description: '동일한 설정으로 설치를 다시 시도합니다.',
          type: 'action',
          automated: true
        }
      ]
    })
    
    // Always add contact support option
    options.push({
      id: 'contact-support',
      solution: 'contact-support',
      title: '지원팀 문의',
      description: '문제가 지속되면 지원팀에 문의합니다.',
      priority: 'tertiary',
      estimatedTime: '24시간',
      riskLevel: 'low',
      automated: false,
      steps: [
        {
          id: 'step-1',
          title: '에러 로그 수집',
          description: '에러 로그를 수집하여 지원팀에 전달합니다.',
          type: 'action',
          automated: false
        },
        {
          id: 'step-2',
          title: '지원팀 연락',
          description: '수집된 정보와 함께 지원팀에 문의합니다.',
          type: 'action',
          automated: false
        }
      ]
    })
    
    return options
  }
  
  public async captureSystemSnapshot(): Promise<SystemSnapshot> {
    const snapshot: SystemSnapshot = {
      timestamp: Date.now(),
      availableSpace: await this.getAvailableSpace(),
      totalMemory: totalmem(),
      freeMemory: freemem(),
      cpuUsage: 0, // Would need additional implementation
      runningProcesses: await this.getRunningProcesses(),
      installedSoftware: await this.getInstalledSoftware(),
      recentErrors: this.getRecentErrors()
    }
    
    return snapshot
  }
  
  private async getAvailableSpace(): Promise<number> {
    try {
      if (platform() === 'win32') {
        const result = execSync('fsutil volume diskfree C:', { encoding: 'utf-8' })
        const match = result.match(/\d+/)
        return match ? parseInt(match[0]) : 0
      }
      return 0
    } catch (error) {
      return 0
    }
  }
  
  private getInstallerSize(): number {
    try {
      const path = this.getInstallerPath()
      if (path && existsSync(path)) {
        return statSync(path).size
      }
    } catch (error) {
      // Ignore errors
    }
    return 0
  }
  
  private getInstallerPath(): string {
    // This would need to be passed in or stored
    return ''
  }
  
  private getInstallerArguments(): string[] {
    // This would need to be stored from the installation options
    return []
  }
  
  private async getRunningProcesses(): Promise<ProcessInfo[]> {
    try {
      if (platform() === 'win32') {
        const result = execSync('tasklist /fo csv', { encoding: 'utf-8' })
        const lines = result.split('\n').slice(1) // Skip header
        return lines.slice(0, 20).map(line => { // Limit to 20 processes
          const parts = line.split(',')
          return {
            pid: parseInt(parts[1]?.replace(/"/g, '') || '0'),
            name: parts[0]?.replace(/"/g, '') || 'Unknown',
            memoryUsage: parseInt(parts[4]?.replace(/[^0-9]/g, '') || '0'),
            cpuUsage: 0
          }
        }).filter(p => p.pid > 0)
      }
      return []
    } catch (error) {
      return []
    }
  }
  
  private async getInstalledSoftware(): Promise<InstalledSoftwareInfo[]> {
    // This would require Windows registry access or other OS-specific methods
    return []
  }
  
  private getRecentErrors(): RecentError[] {
    return this.installationLogs
      .filter(log => log.level === 'error')
      .slice(-10) // Last 10 errors
      .map(log => ({
        timestamp: log.timestamp,
        source: 'installation',
        message: log.message,
        severity: 'high' as const
      }))
  }
  
  private recordInstallationAttempt(result: 'started' | 'success' | 'failed' | 'cancelled', exitCode?: number, errorMessage?: string): void {
    const attempt: InstallationAttempt = {
      timestamp: Date.now(),
      version: app.getVersion(),
      result,
      duration: this.installStartTime ? Date.now() - this.installStartTime : 0,
      errorCode: exitCode,
      errorMessage,
      phase: this.currentPhase
    }
    
    this.installationAttempts.push(attempt)
    
    // Keep only last 10 attempts
    if (this.installationAttempts.length > 10) {
      this.installationAttempts = this.installationAttempts.slice(-10)
    }
    
    this.log('info', 'execution', `Installation attempt recorded: ${result}`, attempt)
  }
  
  public getInstallationAttempts(): InstallationAttempt[] {
    return [...this.installationAttempts]
  }
  
  public async executeRecoveryAction(request: RecoveryActionRequest): Promise<RecoveryActionResult> {
    const startTime = Date.now()
    
    this.log('info', 'execution', `Executing recovery action: ${request.recoveryOptionId}`, {
      correlationId: request.correlationId,
      stepId: request.stepId,
      parameters: request.parameters
    })
    
    try {
      switch (request.recoveryOptionId) {
        case 'run-as-admin':
          return await this.executeRunAsAdmin(request)
        
        case 'check-network':
          return await this.executeCheckNetwork(request)
        
        case 'free-space':
          return await this.executeFreeSpace(request)
        
        case 'disable-antivirus':
          return await this.executeDisableAntivirus(request)
        
        case 'reinstall':
          return await this.executeReinstall(request)
        
        case 'retry':
          return await this.executeRetry(request)
        
        case 'contact-support':
          return await this.executeContactSupport(request)
        
        default:
          throw new Error(`Unknown recovery action: ${request.recoveryOptionId}`)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      this.log('error', 'execution', `Recovery action failed: ${request.recoveryOptionId}`, {
        error: errorMessage,
        duration,
        correlationId: request.correlationId
      })
      
      return {
        success: false,
        action: request.recoveryOptionId as ErrorSolution,
        message: `복구 작업 실행 중 오류가 발생했습니다: ${errorMessage}`,
        duration,
        error: errorMessage
      }
    }
  }
  
  private async executeRunAsAdmin(request: RecoveryActionRequest): Promise<RecoveryActionResult> {
    return {
      success: false,
      action: 'run-as-admin',
      message: '관리자 권한으로 실행하려면 설치 파일을 우클릭하여 "관리자 권한으로 실행"을 선택해주세요.',
      nextSteps: [
        '설치 파일을 우클릭하세요',
        '"관리자 권한으로 실행" 옵션을 선택하세요',
        'UAC 프롬프트에서 "예"를 클릭하세요'
      ],
      requiresRestart: false
    }
  }
  
  private async executeCheckNetwork(request: RecoveryActionRequest): Promise<RecoveryActionResult> {
    try {
      const startTime = Date.now()
      
      if (platform() === 'win32') {
        const result = execSync('ping -n 1 8.8.8.8', { encoding: 'utf-8', timeout: 5000 })
        const duration = Date.now() - startTime
        
        if (result.includes('TTL=')) {
          return {
            success: true,
            action: 'check-network',
            message: '네트워크 연결이 정상적으로 작동하고 있습니다.',
            duration,
            nextSteps: ['설치를 다시 시도해보세요']
          }
        }
      }
      
      return {
        success: false,
        action: 'check-network',
        message: '네트워크 연결에 문제가 있는 것 같습니다.',
        nextSteps: [
          '인터넷 연결을 확인해주세요',
          '방화벽 설정을 확인해주세요',
          '다시 시도해주세요'
        ]
      }
    } catch (error) {
      return {
        success: false,
        action: 'check-network',
        message: '네트워크 상태를 확인할 수 없습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  private async executeFreeSpace(request: RecoveryActionRequest): Promise<RecoveryActionResult> {
    try {
      const availableSpace = await this.getAvailableSpace()
      const requiredSpace = 500 * 1024 * 1024 // 500MB minimum
      
      if (availableSpace > requiredSpace) {
        return {
          success: true,
          action: 'free-space',
          message: '충분한 디스크 공간이 확보되어 있습니다.',
          nextSteps: ['설치를 다시 시도해보세요']
        }
      }
      
      if (platform() === 'win32') {
        try {
          execSync('cleanmgr /sagerun:1', { timeout: 1000 })
          return {
            success: true,
            action: 'free-space',
            message: '디스크 정리 유틸리티를 실행했습니다.',
            nextSteps: [
              '디스크 정리가 완료될 때까지 기다려주세요',
              '정리 완료 후 설치를 다시 시도해주세요'
            ]
          }
        } catch (error) {
          return {
            success: false,
            action: 'free-space',
            message: '디스크 정리 유틸리티를 실행할 수 없습니다.',
            nextSteps: [
              '수동으로 불필요한 파일을 삭제해주세요',
              '임시 파일을 정리해주세요',
              '설치를 다시 시도해주세요'
            ]
          }
        }
      }
      
      return {
        success: false,
        action: 'free-space',
        message: '디스크 공간이 부족합니다.',
        nextSteps: [
          '불필요한 파일을 삭제해주세요',
          '임시 파일을 정리해주세요',
          '설치를 다시 시도해주세요'
        ]
      }
    } catch (error) {
      return {
        success: false,
        action: 'free-space',
        message: '디스크 공간을 확인할 수 없습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  private async executeDisableAntivirus(request: RecoveryActionRequest): Promise<RecoveryActionResult> {
    return {
      success: false,
      action: 'disable-antivirus',
      message: '바이러스 백신을 수동으로 비활성화해야 합니다.',
      nextSteps: [
        '바이러스 백신 프로그램을 열어주세요',
        '실시간 보호 기능을 일시적으로 비활성화해주세요',
        '설치를 다시 시도해주세요',
        '설치 완료 후 바이러스 백신을 다시 활성화해주세요'
      ],
      requiresRestart: false
    }
  }
  
  private async executeReinstall(request: RecoveryActionRequest): Promise<RecoveryActionResult> {
    return {
      success: false,
      action: 'reinstall',
      message: '새로운 설치 파일을 다운로드해야 합니다.',
      nextSteps: [
        '공식 웹사이트로 이동하세요',
        '최신 설치 파일을 다운로드하세요',
        '기존 설치 파일을 삭제하세요',
        '새로운 설치 파일로 설치를 시도하세요'
      ],
      requiresRestart: false
    }
  }
  
  private async executeRetry(request: RecoveryActionRequest): Promise<RecoveryActionResult> {
    return {
      success: true,
      action: 'retry',
      message: '설치를 다시 시도합니다.',
      nextSteps: ['설치 과정을 모니터링하세요'],
      requiresRestart: false
    }
  }
  
  private async executeContactSupport(request: RecoveryActionRequest): Promise<RecoveryActionResult> {
    try {
      const errorLogsPath = await this.exportErrorLogs({
        includeSystemInfo: true,
        includeLogs: true,
        includeTimeouts: true,
        correlationId: request.correlationId,
        format: 'txt'
      })
      
      const supportInfo = this.getSupportInfo()
      
      // 상세 에러 분석 리포트도 생성
      const detailedAnalysis = this.exportDetailedErrorAnalysis()
      const analysisPath = join(app.getPath('temp'), `sebastian-analysis-${Date.now()}.txt`)
      writeFileSync(analysisPath, detailedAnalysis, 'utf-8')
      
      return {
        success: true,
        action: 'contact-support',
        message: '지원 정보가 준비되었습니다.',
        nextSteps: [
          `에러 로그: ${errorLogsPath}`,
          `상세 분석 리포트: ${analysisPath}`,
          `지원 이메일: ${supportInfo.supportEmail}`,
          `문제 해결 가이드: ${supportInfo.troubleshootingGuideUrl}`,
          `GitHub 이슈: ${supportInfo.githubIssueUrl}`,
          `온라인 문서: ${supportInfo.documentationUrl}`,
          '로그 파일들을 지원 팀에 전달해주세요'
        ]
      }
    } catch (error) {
      return {
        success: false,
        action: 'contact-support',
        message: '지원 정보를 준비하는 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 지원 정보 시스템 - 현재 앱 버전 및 플랫폼에 맞는 지원 정보 제공
   */
  public getSupportInfo(): {
    version: string
    buildDate: string
    platform: string
    logFileLocation: string
    supportEmail: string
    documentationUrl: string
    githubIssueUrl: string
    troubleshootingGuideUrl: string
    knowledgeBaseUrl: string
    communityForumUrl: string
    supportHours: string
    expectedResponseTime: string
  } {
    const appVersion = app.getVersion()
    const currentPlatform = platform()
    const tempPath = app.getPath('temp')
    
    return {
      version: appVersion,
      buildDate: new Date().toISOString().split('T')[0],
      platform: `${currentPlatform} ${arch()}`,
      logFileLocation: join(tempPath, 'sebastian-logs'),
      supportEmail: 'support@sebastian.dev',
      documentationUrl: 'https://github.com/JaekyungCho2140/sebastian/wiki',
      githubIssueUrl: 'https://github.com/JaekyungCho2140/sebastian/issues',
      troubleshootingGuideUrl: 'https://github.com/JaekyungCho2140/sebastian/wiki/Troubleshooting',
      knowledgeBaseUrl: 'https://github.com/JaekyungCho2140/sebastian/wiki/FAQ',
      communityForumUrl: 'https://github.com/JaekyungCho2140/sebastian/discussions',
      supportHours: '평일 09:00-18:00 (KST)',
      expectedResponseTime: '24-48시간 내 답변 (평일 기준)'
    }
  }

  /**
   * 자가 진단 도구 - 사용자가 스스로 문제를 해결할 수 있도록 도움
   */
  public performSelfDiagnostics(): {
    diagnosticResults: Array<{
      category: string
      status: 'pass' | 'fail' | 'warning'
      message: string
      recommendation?: string
    }>
    overallStatus: 'healthy' | 'issues' | 'critical'
  } {
    const results = []
    
    // 1. 시스템 리소스 확인
    const freeMemory = freemem()
    const totalMemory = totalmem()
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100
    
    if (memoryUsage > 90) {
      results.push({
        category: 'memory',
        status: 'fail' as const,
        message: `메모리 사용량이 높습니다 (${memoryUsage.toFixed(1)}%)`,
        recommendation: '실행 중인 불필요한 프로그램을 종료하세요'
      })
    } else if (memoryUsage > 80) {
      results.push({
        category: 'memory',
        status: 'warning' as const,
        message: `메모리 사용량이 높습니다 (${memoryUsage.toFixed(1)}%)`,
        recommendation: '메모리 사용량을 모니터링하세요'
      })
    } else {
      results.push({
        category: 'memory',
        status: 'pass' as const,
        message: `메모리 사용량이 정상입니다 (${memoryUsage.toFixed(1)}%)`
      })
    }
    
    // 2. 로그 파일 상태 확인
    const logCount = this.installationLogs.length
    if (logCount > 5000) {
      results.push({
        category: 'logs',
        status: 'warning' as const,
        message: `로그 파일이 많습니다 (${logCount}개)`,
        recommendation: '로그 파일을 정리하세요'
      })
    } else {
      results.push({
        category: 'logs',
        status: 'pass' as const,
        message: `로그 파일 상태가 정상입니다 (${logCount}개)`
      })
    }
    
    // 3. 에러 발생 빈도 확인
    const errorCount = this.installationLogs.filter(log => log.level === 'error').length
    if (errorCount > 10) {
      results.push({
        category: 'errors',
        status: 'fail' as const,
        message: `에러 발생이 많습니다 (${errorCount}개)`,
        recommendation: '시스템 환경을 확인하거나 지원팀에 문의하세요'
      })
    } else if (errorCount > 5) {
      results.push({
        category: 'errors',
        status: 'warning' as const,
        message: `에러가 간헐적으로 발생합니다 (${errorCount}개)`,
        recommendation: '에러 패턴을 모니터링하세요'
      })
    } else {
      results.push({
        category: 'errors',
        status: 'pass' as const,
        message: `에러 발생이 정상 범위입니다 (${errorCount}개)`
      })
    }
    
    // 4. 타임아웃 발생 확인
    const timeoutCount = this.timeoutEvents.length
    if (timeoutCount > 3) {
      results.push({
        category: 'timeouts',
        status: 'fail' as const,
        message: `타임아웃이 자주 발생합니다 (${timeoutCount}회)`,
        recommendation: '네트워크 연결이나 시스템 성능을 확인하세요'
      })
    } else if (timeoutCount > 1) {
      results.push({
        category: 'timeouts',
        status: 'warning' as const,
        message: `타임아웃이 간헐적으로 발생합니다 (${timeoutCount}회)`,
        recommendation: '타임아웃 설정을 조정하는 것을 고려하세요'
      })
    } else {
      results.push({
        category: 'timeouts',
        status: 'pass' as const,
        message: `타임아웃 발생이 정상 범위입니다 (${timeoutCount}회)`
      })
    }
    
    // 전체 상태 판정
    const failCount = results.filter(r => r.status === 'fail').length
    const warningCount = results.filter(r => r.status === 'warning').length
    
    let overallStatus: 'healthy' | 'issues' | 'critical'
    if (failCount > 0) {
      overallStatus = 'critical'
    } else if (warningCount > 0) {
      overallStatus = 'issues'
    } else {
      overallStatus = 'healthy'
    }
    
    return {
      diagnosticResults: results,
      overallStatus
    }
  }

  /**
   * 도움말 시스템 - 사용자가 자주 묻는 질문들에 대한 답변 제공
   */
  public getHelpTopics(): Array<{
    id: string
    title: string
    category: string
    description: string
    solution: string
    relatedLinks?: string[]
  }> {
    return [
      {
        id: 'install-failed',
        title: '설치가 실패했습니다',
        category: 'installation',
        description: '설치 과정에서 오류가 발생하여 설치가 완료되지 않았습니다.',
        solution: '1. 관리자 권한으로 실행해보세요\n2. 안티바이러스 소프트웨어를 일시적으로 비활성화하세요\n3. 충분한 디스크 공간이 있는지 확인하세요\n4. 기존 설치 파일이 손상되지 않았는지 확인하세요',
        relatedLinks: [
          'https://github.com/JaekyungCho2140/sebastian/wiki/Installation-Issues',
          'https://github.com/JaekyungCho2140/sebastian/wiki/Admin-Permissions'
        ]
      },
      {
        id: 'slow-installation',
        title: '설치가 너무 느립니다',
        category: 'performance',
        description: '설치 과정이 예상보다 오래 걸리고 있습니다.',
        solution: '1. 백그라운드 프로그램을 종료하세요\n2. 네트워크 연결을 확인하세요\n3. 충분한 메모리가 있는지 확인하세요\n4. 안티바이러스 실시간 스캔을 일시적으로 비활성화하세요',
        relatedLinks: [
          'https://github.com/JaekyungCho2140/sebastian/wiki/Performance-Issues'
        ]
      },
      {
        id: 'permission-error',
        title: '권한 오류가 발생합니다',
        category: 'permissions',
        description: '설치 중 권한 관련 오류가 발생했습니다.',
        solution: '1. 설치 파일을 우클릭하여 "관리자 권한으로 실행"을 선택하세요\n2. 사용자 계정 컨트롤(UAC) 설정을 확인하세요\n3. 설치 대상 폴더의 권한을 확인하세요\n4. 관리자 계정으로 로그인하여 설치하세요',
        relatedLinks: [
          'https://github.com/JaekyungCho2140/sebastian/wiki/Admin-Permissions',
          'https://github.com/JaekyungCho2140/sebastian/wiki/UAC-Settings'
        ]
      },
      {
        id: 'update-failed',
        title: '업데이트가 실패했습니다',
        category: 'update',
        description: '자동 업데이트 과정에서 오류가 발생했습니다.',
        solution: '1. 네트워크 연결을 확인하세요\n2. 방화벽이나 프록시 설정을 확인하세요\n3. 수동으로 최신 버전을 다운로드하여 설치하세요\n4. 임시 파일을 삭제하고 다시 시도하세요',
        relatedLinks: [
          'https://github.com/JaekyungCho2140/sebastian/wiki/Update-Issues',
          'https://github.com/JaekyungCho2140/sebastian/releases'
        ]
      },
      {
        id: 'timeout-error',
        title: '타임아웃 오류가 발생합니다',
        category: 'network',
        description: '설치나 업데이트 과정에서 타임아웃이 발생했습니다.',
        solution: '1. 네트워크 연결이 안정적인지 확인하세요\n2. 다른 네트워크 집약적인 프로그램을 종료하세요\n3. 시간대를 변경하여 다시 시도하세요\n4. 모바일 핫스팟을 사용하여 시도해보세요',
        relatedLinks: [
          'https://github.com/JaekyungCho2140/sebastian/wiki/Network-Issues'
        ]
      }
    ]
  }

  /**
   * 도움말 검색 기능
   */
  public searchHelp(query: string): Array<{
    id: string
    title: string
    category: string
    description: string
    solution: string
    relevanceScore: number
  }> {
    const helpTopics = this.getHelpTopics()
    const searchTerms = query.toLowerCase().split(' ')
    
    return helpTopics
      .map(topic => {
        let score = 0
        const searchText = `${topic.title} ${topic.description} ${topic.solution}`.toLowerCase()
        
        searchTerms.forEach(term => {
          if (searchText.includes(term)) {
            score += 1
          }
        })
        
        return {
          ...topic,
          relevanceScore: score
        }
      })
      .filter(topic => topic.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }
  
  public async exportErrorLogs(request: ErrorLogExportRequest): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `sebastian-error-logs-${timestamp}.${request.format}`
    const filepath = join(app.getPath('temp'), filename)
    
    try {
      let content = ''
      
      if (request.format === 'txt') {
        content = this.generateTextErrorReport(request)
      } else {
        content = JSON.stringify(this.generateJsonErrorReport(request), null, 2)
      }
      
      writeFileSync(filepath, content, 'utf-8')
      
      this.log('info', 'execution', 'Error logs exported', {
        filepath,
        format: request.format,
        correlationId: request.correlationId
      })
      
      return filepath
    } catch (error) {
      this.log('error', 'execution', 'Failed to export error logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: request.correlationId
      })
      throw error
    }
  }
  
  private generateTextErrorReport(request: ErrorLogExportRequest): string {
    const lines: string[] = []
    
    lines.push('='.repeat(80))
    lines.push('Sebastian 설치 에러 리포트')
    lines.push('='.repeat(80))
    lines.push('')
    
    if (request.includeSystemInfo) {
      lines.push('시스템 정보:')
      lines.push(`- 플랫폼: ${platform()} ${arch()}`)
      lines.push(`- OS 버전: ${release()}`)
      lines.push(`- 메모리: ${Math.round(freemem() / 1024 / 1024)}MB / ${Math.round(totalmem() / 1024 / 1024)}MB`)
      lines.push(`- 앱 버전: ${app.getVersion()}`)
      lines.push(`- 상관관계 ID: ${request.correlationId || this.correlationId}`)
      lines.push('')
    }
    
    if (request.includeLogs) {
      lines.push('설치 로그:')
      lines.push('-'.repeat(40))
      lines.push(this.exportLogsAsText())
      lines.push('')
    }
    
    if (request.includeTimeouts) {
      lines.push('타임아웃 로그:')
      lines.push('-'.repeat(40))
      lines.push(this.exportTimeoutLogsAsText())
      lines.push('')
    }
    
    lines.push('설치 시도 이력:')
    lines.push('-'.repeat(40))
    this.installationAttempts.forEach(attempt => {
      lines.push(`[${new Date(attempt.timestamp).toISOString()}] ${attempt.result} (${attempt.duration}ms)`)
      if (attempt.errorMessage) {
        lines.push(`  에러: ${attempt.errorMessage}`)
      }
    })
    
    return lines.join('\n')
  }
  
  private generateJsonErrorReport(request: ErrorLogExportRequest): any {
    const report: any = {
      timestamp: new Date().toISOString(),
      correlationId: request.correlationId || this.correlationId,
      appVersion: app.getVersion()
    }
    
    if (request.includeSystemInfo) {
      report.systemInfo = {
        platform: platform(),
        arch: arch(),
        osVersion: release(),
        totalMemory: totalmem(),
        freeMemory: freemem(),
        currentPhase: this.currentPhase
      }
    }
    
    if (request.includeLogs) {
      report.installationLogs = this.installationLogs
    }
    
    if (request.includeTimeouts) {
      report.timeoutEvents = this.timeoutEvents
    }
    
    report.installationAttempts = this.installationAttempts
    
    return report
  }
  
  public getRecoveryOptionsForCorrelation(correlationId: string): RecoveryOption[] {
    return this.generateRecoveryOptions(0, {
      category: 'unknown-error',
      code: '0',
      phase: 'unknown',
      userMessage: '알 수 없는 오류가 발생했습니다.',
      timestamp: Date.now(),
      correlationId
    } as InstallationErrorDetails)
  }
}

export default UpdateInstaller