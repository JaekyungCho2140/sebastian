// Shared types between main and renderer processes

export interface AppState {
  version: string
  isUpdateAvailable: boolean
  lastUpdateCheck: number
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
}

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
  UPDATE_DOWNLOADED: 'update-downloaded'
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
}

// Events that can be sent from main to renderer
export interface IpcEvents {
  [IPC_CHANNELS.UPDATE_AVAILABLE]: UpdateInfo
  [IPC_CHANNELS.UPDATE_DOWNLOADED]: void
  [IPC_CHANNELS.SHOW_ERROR_DIALOG]: ErrorDialogData
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
}

// Window object extensions
declare global {
  interface Window {
    showErrorDialog?: (errorData: ErrorDialogData) => void
  }
}