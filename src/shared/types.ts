// Shared types between main and renderer processes

export interface AppState {
  version: string
  isUpdateAvailable: boolean
  lastUpdateCheck: number
  ignoredVersion?: string
  ignoreUntil?: number // 24시간 후 재체크를 위한 타임스탬프
  userPreferences: {
    theme: 'light' | 'dark'
    language: 'ko' | 'en'
  }
}

export interface UpdateInfo {
  version: string
  releaseDate: string
  downloadUrl: string
  changelog: string
  downloadSize?: number
  installerType?: 'msi' | 'nsis' | 'exe' // Support multiple installer types (primary: NSIS)
}

export interface UpdateProgress {
  stage: 'downloading' | 'installing' | 'complete' | 'preparing' | 'validating' | 'cleanup'
  progress: number // 0-100
  message: string
  downloadSize?: number
  downloadedSize?: number
  speed?: number // bytes per second
  phase?: 'resource-cleanup' | 'service-shutdown' | 'filesystem-prep' | 'installation-start' | 'installation-progress' | 'installation-complete' | 'preparation'
  exitCode?: number
  isRetryable?: boolean
  timestamp?: number
  estimatedTimeRemaining?: number
}

export interface UpdateDialogData {
  updateInfo: UpdateInfo
  isUpdateAvailable: boolean
}

export type UpdateAction = 'now' | 'later' | 'ignore'

// IPC Channel constants
export const IPC_CHANNELS = {
  GET_VERSION: 'get-version',
  SHOW_SUCCESS_DIALOG: 'show-success-dialog',
  CHECK_FOR_UPDATES: 'check-for-updates',
  GET_APP_STATE: 'get-app-state',
  SET_APP_STATE: 'set-app-state',
  MINIMIZE_WINDOW: 'minimize-window',
  CLOSE_WINDOW: 'close-window',
  REPORT_ERROR: 'report-error',
  SHOW_ERROR_DIALOG: 'show-error-dialog',
  RESTART_APP: 'restart-app',
  UPDATE_AVAILABLE: 'update-available',
  UPDATE_DOWNLOADED: 'update-downloaded',
  SHOW_UPDATE_DIALOG: 'show-update-dialog',
  UPDATE_NOW: 'update-now',
  UPDATE_LATER: 'update-later',
  IGNORE_UPDATE: 'ignore-update',
  DOWNLOAD_UPDATE: 'download-update',
  INSTALL_UPDATE: 'install-update',
  UPDATE_PROGRESS: 'update-progress',
  UPDATE_ERROR: 'update-error',
  // Enhanced NSIS installation channels
  NSIS_INSTALLATION_PHASE: 'nsis-installation-phase',
  NSIS_INSTALLATION_LOG: 'nsis-installation-log',
  NSIS_INSTALLATION_COMPLETE: 'nsis-installation-complete',
  NSIS_INSTALLATION_FAILED: 'nsis-installation-failed',
  NSIS_INSTALLATION_ERROR: 'nsis-installation-error',
  CANCEL_INSTALLATION: 'cancel-installation',
  GET_INSTALLATION_STATUS: 'get-installation-status',
  // Timeout handling channels
  INSTALLATION_TIMEOUT: 'installation-timeout',
  RETRY_INSTALLATION: 'retry-installation',
  FORCE_CANCEL_INSTALLATION: 'force-cancel-installation',
  GET_TIMEOUT_STATUS: 'get-timeout-status',
  TIMEOUT_USER_ACTION: 'timeout-user-action',
  // Error recovery channels
  EXECUTE_RECOVERY_ACTION: 'execute-recovery-action',
  GET_RECOVERY_OPTIONS: 'get-recovery-options',
  GET_SYSTEM_SNAPSHOT: 'get-system-snapshot',
  EXPORT_ERROR_LOGS: 'export-error-logs',
  // Support system channels
  GET_SUPPORT_INFO: 'get-support-info',
  PERFORM_SELF_DIAGNOSTICS: 'perform-self-diagnostics',
  GET_HELP_TOPICS: 'get-help-topics',
  SEARCH_HELP: 'search-help',
  EXPORT_DETAILED_ERROR_ANALYSIS: 'export-detailed-error-analysis',
  COMPRESS_LOGS: 'compress-logs'
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]

// Request/Response types for each IPC channel
export interface RendererErrorReport {
  error: Error | string
  errorType: ErrorType
  severity?: ErrorSeverity
  context?: Partial<ErrorContext>
  url?: string
  line?: number
  column?: number
  stack?: string
}

export interface IpcRequests {
  [IPC_CHANNELS.GET_VERSION]: void
  [IPC_CHANNELS.SHOW_SUCCESS_DIALOG]: void
  [IPC_CHANNELS.CHECK_FOR_UPDATES]: void
  [IPC_CHANNELS.GET_APP_STATE]: void
  [IPC_CHANNELS.SET_APP_STATE]: Partial<AppState>
  [IPC_CHANNELS.MINIMIZE_WINDOW]: void
  [IPC_CHANNELS.CLOSE_WINDOW]: void
  [IPC_CHANNELS.REPORT_ERROR]: RendererErrorReport
  [IPC_CHANNELS.RESTART_APP]: void
  [IPC_CHANNELS.UPDATE_NOW]: void
  [IPC_CHANNELS.UPDATE_LATER]: void
  [IPC_CHANNELS.IGNORE_UPDATE]: string // version to ignore
  [IPC_CHANNELS.DOWNLOAD_UPDATE]: UpdateInfo | void
  [IPC_CHANNELS.INSTALL_UPDATE]: Partial<InstallOptions> | void
  [IPC_CHANNELS.CANCEL_INSTALLATION]: void
  [IPC_CHANNELS.GET_INSTALLATION_STATUS]: void
  [IPC_CHANNELS.RETRY_INSTALLATION]: void
  [IPC_CHANNELS.FORCE_CANCEL_INSTALLATION]: void
  [IPC_CHANNELS.GET_TIMEOUT_STATUS]: void
  [IPC_CHANNELS.TIMEOUT_USER_ACTION]: TimeoutUserAction
  [IPC_CHANNELS.EXECUTE_RECOVERY_ACTION]: RecoveryActionRequest
  [IPC_CHANNELS.GET_RECOVERY_OPTIONS]: string // correlationId
  [IPC_CHANNELS.GET_SYSTEM_SNAPSHOT]: void
  [IPC_CHANNELS.EXPORT_ERROR_LOGS]: ErrorLogExportRequest
  [IPC_CHANNELS.GET_SUPPORT_INFO]: void
  [IPC_CHANNELS.PERFORM_SELF_DIAGNOSTICS]: void
  [IPC_CHANNELS.GET_HELP_TOPICS]: void
  [IPC_CHANNELS.SEARCH_HELP]: string // search query
  [IPC_CHANNELS.EXPORT_DETAILED_ERROR_ANALYSIS]: void
  [IPC_CHANNELS.COMPRESS_LOGS]: void
}

export interface IpcResponses {
  [IPC_CHANNELS.GET_VERSION]: string
  [IPC_CHANNELS.SHOW_SUCCESS_DIALOG]: void
  [IPC_CHANNELS.CHECK_FOR_UPDATES]: UpdateInfo | null
  [IPC_CHANNELS.GET_APP_STATE]: AppState
  [IPC_CHANNELS.SET_APP_STATE]: void
  [IPC_CHANNELS.MINIMIZE_WINDOW]: void
  [IPC_CHANNELS.CLOSE_WINDOW]: void
  [IPC_CHANNELS.REPORT_ERROR]: string | null // Returns error report ID
  [IPC_CHANNELS.RESTART_APP]: void
  [IPC_CHANNELS.UPDATE_NOW]: void
  [IPC_CHANNELS.UPDATE_LATER]: void
  [IPC_CHANNELS.IGNORE_UPDATE]: void
  [IPC_CHANNELS.DOWNLOAD_UPDATE]: void
  [IPC_CHANNELS.INSTALL_UPDATE]: void
  [IPC_CHANNELS.CANCEL_INSTALLATION]: void
  [IPC_CHANNELS.GET_INSTALLATION_STATUS]: InstallationStatus
  [IPC_CHANNELS.RETRY_INSTALLATION]: void
  [IPC_CHANNELS.FORCE_CANCEL_INSTALLATION]: void
  [IPC_CHANNELS.GET_TIMEOUT_STATUS]: InstallationTimeoutStatus
  [IPC_CHANNELS.TIMEOUT_USER_ACTION]: void
  [IPC_CHANNELS.EXECUTE_RECOVERY_ACTION]: RecoveryActionResult
  [IPC_CHANNELS.GET_RECOVERY_OPTIONS]: RecoveryOption[]
  [IPC_CHANNELS.GET_SYSTEM_SNAPSHOT]: SystemSnapshot
  [IPC_CHANNELS.EXPORT_ERROR_LOGS]: string // file path
  [IPC_CHANNELS.GET_SUPPORT_INFO]: SupportInformation
  [IPC_CHANNELS.PERFORM_SELF_DIAGNOSTICS]: SelfDiagnosticReport
  [IPC_CHANNELS.GET_HELP_TOPICS]: HelpTopic[]
  [IPC_CHANNELS.SEARCH_HELP]: HelpSearchResult[]
  [IPC_CHANNELS.EXPORT_DETAILED_ERROR_ANALYSIS]: string // file path
  [IPC_CHANNELS.COMPRESS_LOGS]: void
  
  // Development/debugging handlers
  'reset-circuit-breaker': { success: boolean; message: string }
  'get-circuit-breaker-status': { isOpen: boolean; resetTime: number; retryCount: number }
  'force-update-check': UpdateInfo | null
  'mock-update-available': UpdateInfo
}

// Events that can be sent from main to renderer
export interface IpcEvents {
  [IPC_CHANNELS.UPDATE_AVAILABLE]: UpdateInfo
  [IPC_CHANNELS.UPDATE_DOWNLOADED]: void
  [IPC_CHANNELS.SHOW_ERROR_DIALOG]: ErrorDialogData
  [IPC_CHANNELS.SHOW_UPDATE_DIALOG]: UpdateDialogData
  [IPC_CHANNELS.UPDATE_PROGRESS]: UpdateProgress
  [IPC_CHANNELS.UPDATE_ERROR]: string
  [IPC_CHANNELS.INSTALLATION_TIMEOUT]: TimeoutNotification
  [IPC_CHANNELS.NSIS_INSTALLATION_ERROR]: EnhancedErrorDialogData
}

// Error types for IPC communication
export class IpcError extends Error {
  constructor(
    message: string,
    public code: string,
    public channel?: string
  ) {
    super(message)
    this.name = 'IpcError'
  }
}

export interface IpcErrorResponse {
  error: true
  message: string
  code: string
  channel?: string
}

// Error Reporting Types
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorType = 'javascript' | 'promise-rejection' | 'react-component' | 'main-process' | 'ipc' | 'filesystem' | 'network'
export type ProcessType = 'main' | 'renderer' | 'preload'

export interface SystemInfo {
  platform: string
  arch: string
  osVersion: string
  nodeVersion: string
  electronVersion: string
  appVersion: string
  totalMemory: number
  freeMemory: number
  cpuModel: string
  cpuCount: number
}

export interface ErrorBreadcrumb {
  timestamp: number
  category: string
  message: string
  level: 'debug' | 'info' | 'warning' | 'error'
  data?: Record<string, any>
}

export interface ErrorContext {
  userId?: string
  sessionId: string
  url?: string
  userAgent?: string
  viewport?: { width: number; height: number }
  customData?: Record<string, any>
}

export interface ErrorReport {
  id: string
  timestamp: number
  severity: ErrorSeverity
  errorType: ErrorType
  processType: ProcessType
  message: string
  stack?: string
  filename?: string
  lineno?: number
  colno?: number
  systemInfo: SystemInfo
  context: ErrorContext
  breadcrumbs: ErrorBreadcrumb[]
  tags?: string[]
  fingerprint?: string
}

export interface ErrorReportingConfig {
  maxBreadcrumbs: number
  maxFileSize: number
  maxFiles: number
  maxAge: number // days
  maxTotalSize: number // bytes
  enableDataMasking: boolean
  sensitiveDataPatterns: string[]
  reportingLevel: ErrorSeverity
  enableSystemInfo: boolean
}

// Error Dialog Types
export interface ErrorDialogData {
  title: string
  message: string
  error?: Error
  details?: string
  stack?: string
  timestamp?: number
  severity?: ErrorSeverity
  errorType?: string
  context?: any
  url?: string
}

// Installation related types (generic for all installer types)
export interface InstallOptions {
  installerPath: string
  silentInstall?: boolean
  elevatePermissions?: boolean
  installPath?: string
  timeout?: number
  createDesktopShortcut?: boolean
  createStartMenuShortcut?: boolean
  // NSIS-specific options
  noDesktop?: boolean
  noStartMenu?: boolean
  installerType?: 'msi' | 'nsis' | 'exe'
  // Extended NSIS parameters
  additionalArgs?: string[]
  preserveAppData?: boolean
  forceCloseApp?: boolean
  logLevel?: 'normal' | 'verbose' | 'minimal'
  // Enhanced timeout configuration
  timeoutConfig?: TimeoutConfiguration
}

export interface InstallResult {
  success: boolean
  exitCode?: number
  error?: string
  installPath?: string
  duration?: number
  isRetryable?: boolean
  requiresUserAction?: boolean
  criticalityLevel?: 'low' | 'medium' | 'high' | 'critical'
  timeoutPhase?: string
  timeoutReason?: 'phase-timeout' | 'global-timeout' | 'user-timeout'
  // Enhanced error reporting
  errorDetails?: InstallationErrorDetails
  recoveryOptions?: RecoveryOption[]
}

export interface InstallationLog {
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  phase: 'validation' | 'preparation' | 'execution' | 'completion' | 'cleanup'
  message: string
  details?: Record<string, any>
  exitCode?: number
  duration?: number
}

export interface InstallationStatus {
  isInstalling: boolean
  phase?: UpdateProgress['phase']
  progress?: number
  message?: string
  logs?: InstallationLog[]
}

// NSIS-specific configuration types
export interface NsisConfiguration {
  oneClick: boolean
  perMachine: boolean
  allowToChangeInstallationDirectory: boolean
  createDesktopShortcut: boolean
  createStartMenuShortcut: boolean
  shortcutName: string
  installerLanguages: string[]
  warningsAsErrors: boolean
  uninstallDisplayName?: string
  license?: string
  installerIcon?: string
  uninstallerIcon?: string
  installerHeader?: string
  installerSidebar?: string
  uninstallerSidebar?: string
  differentialPackage?: boolean
}

// NSIS Exit Codes
export const NSIS_EXIT_CODES = {
  SUCCESS: 0,
  USER_CANCELLED: 1,
  SCRIPT_ABORTED: 2,
  FATAL_ERROR: 3,
  INVALID_PARAMETERS: 4,
  ACCESS_DENIED: 5,
  FILE_NOT_FOUND: 6,
  INSUFFICIENT_DISK_SPACE: 7,
  OUT_OF_MEMORY: 8,
  CORRUPTED_PACKAGE: 9,
  UNSUPPORTED_PLATFORM: 10,
  ALREADY_INSTALLED: 11,
  DEPENDENCY_MISSING: 12,
  NETWORK_ERROR: 13,
  TIMEOUT: 14,
  UNKNOWN_ERROR: 999
} as const

export type NsisExitCode = typeof NSIS_EXIT_CODES[keyof typeof NSIS_EXIT_CODES]

// Enhanced error categorization system
export type ErrorCategory = 
  | 'system-error'      // OS-level errors (permissions, file system, etc.)
  | 'installer-error'   // Installer-specific errors (corrupted, incompatible, etc.)
  | 'network-error'     // Network-related errors
  | 'user-error'        // User-initiated errors (cancelled, invalid input, etc.)
  | 'environment-error' // Environment-specific errors (antivirus, insufficient space, etc.)
  | 'timeout-error'     // Timeout-related errors
  | 'dependency-error'  // Missing dependencies or prerequisites
  | 'unknown-error'     // Unclassified errors

export type ErrorSolution = 
  | 'retry'             // Simple retry
  | 'run-as-admin'      // Run with administrator privileges
  | 'disable-antivirus' // Temporarily disable antivirus
  | 'free-space'        // Free up disk space
  | 'close-programs'    // Close other programs
  | 'check-network'     // Check network connection
  | 'reinstall'         // Reinstall application
  | 'contact-support'   // Contact support
  | 'update-system'     // Update operating system
  | 'check-compatibility' // Check system compatibility
  | 'manual-cleanup'    // Manual cleanup required

export interface InstallationErrorDetails {
  category: ErrorCategory
  code: string
  phase: string
  userMessage: string
  technicalMessage?: string
  systemContext?: {
    platform: string
    arch: string
    osVersion: string
    availableSpace: number
    memoryUsage: number
    runningProcesses?: string[]
  }
  installerContext?: {
    installerType: string
    installerSize: number
    installerPath: string
    arguments: string[]
    workingDirectory: string
  }
  timestamp: number
  correlationId: string
}

export interface RecoveryOption {
  id: string
  solution: ErrorSolution
  title: string
  description: string
  priority: 'primary' | 'secondary' | 'tertiary'
  estimatedTime: string
  riskLevel: 'low' | 'medium' | 'high'
  steps: RecoveryStep[]
  automated: boolean
  requiresRestart?: boolean
  requiresElevation?: boolean
}

export interface RecoveryStep {
  id: string
  title: string
  description: string
  type: 'action' | 'verification' | 'information'
  automated: boolean
  command?: string
  expectedResult?: string
  troubleshooting?: string
}

// Enhanced error dialog data
export interface EnhancedErrorDialogData extends ErrorDialogData {
  errorDetails?: InstallationErrorDetails
  recoveryOptions?: RecoveryOption[]
  supportInfo?: SupportInfo
  showTechnicalDetails?: boolean
  allowReporting?: boolean
}

export interface SupportInfo {
  version: string
  buildDate: string
  platform: string
  logFileLocation: string
  supportEmail: string
  documentationUrl: string
  githubIssueUrl: string
  troubleshootingGuideUrl: string
}

// Error reporting enhancement
export interface ErrorReportMetadata {
  errorCategory: ErrorCategory
  solutions: ErrorSolution[]
  userActions: string[]
  systemSnapshot: SystemSnapshot
  installationHistory: InstallationAttempt[]
  correlationId: string
}

export interface SystemSnapshot {
  timestamp: number
  availableSpace: number
  totalMemory: number
  freeMemory: number
  cpuUsage: number
  runningProcesses: ProcessInfo[]
  installedSoftware: InstalledSoftwareInfo[]
  recentErrors: RecentError[]
}

export interface ProcessInfo {
  pid: number
  name: string
  memoryUsage: number
  cpuUsage: number
}

export interface InstalledSoftwareInfo {
  name: string
  version: string
  installDate: string
  publisher: string
}

export interface RecentError {
  timestamp: number
  source: string
  message: string
  severity: ErrorSeverity
}

export interface InstallationAttempt {
  timestamp: number
  version: string
  result: 'success' | 'failed' | 'cancelled' | 'started'
  duration: number
  errorCode?: number
  errorMessage?: string
  phase?: string
}

// Timeout configuration for installation phases
export interface TimeoutConfiguration {
  // Global timeout (fallback)
  globalTimeout?: number
  // Phase-specific timeouts
  phaseTimeouts?: {
    preparation?: number
    extracting?: number
    registering?: number
    shortcuts?: number
    uninstaller?: number
    completing?: number
  }
  // Retry configuration
  retryConfig?: {
    maxRetries?: number
    retryDelay?: number
    retryMultiplier?: number
    retryablePhases?: string[]
  }
  // Fallback configuration
  fallbackConfig?: {
    enableFallback?: boolean
    fallbackTimeout?: number
    fallbackStrategy?: 'retry' | 'cancel' | 'force-kill'
  }
}

// Timeout event types
export interface TimeoutEvent {
  type: 'phase-timeout' | 'global-timeout' | 'retry-timeout'
  phase: string
  elapsed: number
  timeout: number
  retryCount?: number
  timestamp: number
}

// Enhanced installation status with timeout information
export interface InstallationTimeoutStatus {
  isTimeoutPending: boolean
  currentPhase: string
  phaseElapsed: number
  phaseTimeout: number
  globalElapsed: number
  globalTimeout: number
  retryCount: number
  maxRetries: number
  canRetry: boolean
  timeoutEvents: TimeoutEvent[]
}

// Timeout user action types
export type TimeoutUserActionType = 'retry' | 'cancel' | 'force-cancel' | 'continue'

export interface TimeoutUserAction {
  action: TimeoutUserActionType
  phase?: string
  reason?: string
}

// Timeout notification for UI
export interface TimeoutNotification {
  type: 'phase-timeout' | 'global-timeout'
  phase: string
  elapsed: number
  timeout: number
  canRetry: boolean
  retryCount: number
  maxRetries: number
  message: string
}

// Recovery action results
export interface RecoveryActionResult {
  success: boolean
  action: ErrorSolution
  message: string
  nextSteps?: string[]
  requiresRestart?: boolean
  duration?: number
  error?: string
}

// Recovery action request
export interface RecoveryActionRequest {
  correlationId: string
  recoveryOptionId: string
  stepId?: string
  parameters?: Record<string, any>
}

// Error log export request
export interface ErrorLogExportRequest {
  includeSystemInfo: boolean
  includeLogs: boolean
  includeTimeouts: boolean
  correlationId?: string
  format: 'txt' | 'json'
}

// 지원 정보 시스템 타입
export interface SupportInformation {
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
}

// 자가 진단 결과 타입
export interface DiagnosticResult {
  category: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  recommendation?: string
}

export interface SelfDiagnosticReport {
  diagnosticResults: DiagnosticResult[]
  overallStatus: 'healthy' | 'issues' | 'critical'
}

// 도움말 시스템 타입
export interface HelpTopic {
  id: string
  title: string
  category: string
  description: string
  solution: string
  relatedLinks?: string[]
}

export interface HelpSearchResult extends HelpTopic {
  relevanceScore: number
}

// Window object extensions
declare global {
  interface Window {
    showErrorDialog?: (errorData: ErrorDialogData) => void
    electronAPI: {
      // System
      getVersion: () => Promise<string>
      isAvailable: () => boolean
      
      // Dialog
      showSuccessDialog: () => Promise<void>
      
      // Updates
      checkForUpdates: () => Promise<UpdateInfo | null>
      updateNow: () => Promise<void>
      updateLater: () => Promise<void>
      ignoreUpdate: (version: string) => Promise<void>
      downloadUpdate: (updateInfo?: UpdateInfo) => Promise<void>
      installUpdate: () => Promise<void>
      
      // State
      getAppState: () => Promise<AppState>
      setAppState: (state: Partial<AppState>) => Promise<void>
      
      // Window
      minimizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      
      // Error reporting
      reportError: (errorData: ErrorDialogData) => Promise<void>
      
      // App control
      restartApp: () => Promise<void>
      
      // Event listeners
      on: (channel: string, callback: (...args: any[]) => void) => void
      removeAllListeners: (channel: string) => void
      onUpdateAvailable: (callback: (updateInfo: UpdateInfo) => void) => void
      onUpdateDownloaded: (callback: () => void) => void
      onShowErrorDialog: (callback: (errorData: ErrorDialogData) => void) => void
      onUpdateProgress: (callback: (progress: UpdateProgress) => void) => void
      onUpdateError: (callback: (error: string) => void) => void
      onShowUpdateDialog: (callback: (data: UpdateDialogData) => void) => void
      
      // Development/debugging functions
      resetCircuitBreaker: () => Promise<{ success: boolean; message: string }>
      getCircuitBreakerStatus: () => Promise<{ isOpen: boolean; resetTime: number; retryCount: number }>
      forceUpdateCheck: () => Promise<UpdateInfo | null>
      mockUpdateAvailable: () => Promise<UpdateInfo>
    }
  }
}