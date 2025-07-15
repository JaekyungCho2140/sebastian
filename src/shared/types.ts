// Shared types between main and renderer processes

export interface AppState {
  version: string
  isUpdateAvailable: boolean
  lastUpdateCheck: number
  ignoredVersion?: string
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
}

export interface UpdateProgress {
  stage: 'downloading' | 'installing' | 'complete'
  progress: number // 0-100
  message: string
  downloadSize?: number
  downloadedSize?: number
  speed?: number // bytes per second
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
  UPDATE_ERROR: 'update-error'
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
  [IPC_CHANNELS.DOWNLOAD_UPDATE]: void
  [IPC_CHANNELS.INSTALL_UPDATE]: void
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
}

// Events that can be sent from main to renderer
export interface IpcEvents {
  [IPC_CHANNELS.UPDATE_AVAILABLE]: UpdateInfo
  [IPC_CHANNELS.UPDATE_DOWNLOADED]: void
  [IPC_CHANNELS.SHOW_ERROR_DIALOG]: ErrorDialogData
  [IPC_CHANNELS.SHOW_UPDATE_DIALOG]: UpdateDialogData
  [IPC_CHANNELS.UPDATE_PROGRESS]: UpdateProgress
  [IPC_CHANNELS.UPDATE_ERROR]: string
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
      downloadUpdate: () => Promise<void>
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
    }
  }
}