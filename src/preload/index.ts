import { contextBridge, ipcRenderer } from 'electron'

// IPC Channel constants - temporarily hardcoded to fix module loading issue
const IPC_CHANNELS = {
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
  UPDATE_NOW: 'update-now',
  UPDATE_LATER: 'update-later',
  IGNORE_UPDATE: 'ignore-update',
  DOWNLOAD_UPDATE: 'download-update',
  INSTALL_UPDATE: 'install-update',
  UPDATE_PROGRESS: 'update-progress',
  UPDATE_ERROR: 'update-error',
  SHOW_UPDATE_DIALOG: 'show-update-dialog',
  // M4 processing channels
  SELECT_M4_FOLDER: 'select-m4-folder',
  VALIDATE_M4_FOLDER: 'validate-m4-folder',
  // M4 settings channels
  GET_M4_SETTINGS: 'get-m4-settings',
  SET_M4_SETTINGS: 'set-m4-settings',
  RESET_M4_SETTINGS: 'reset-m4-settings',
  MIGRATE_M4_SETTINGS: 'migrate-m4-settings',
  VALIDATE_M4_SETTINGS: 'validate-m4-settings',
  ADD_RECENT_M4_FOLDER: 'add-recent-m4-folder',
  REMOVE_RECENT_M4_FOLDER: 'remove-recent-m4-folder',
  CLEANUP_RECENT_M4_FOLDERS: 'cleanup-recent-m4-folders',
  // M4 error reporting channels
  REPORT_M4_ERROR: 'report-m4-error',
  M4_ERROR_CONTEXT_UPDATE: 'm4-error-context-update',
  GET_M4_ERROR_STATS: 'get-m4-error-stats',
  EXPORT_M4_ERROR_LOGS: 'export-m4-error-logs',
  CLEAR_M4_ERROR_LOGS: 'clear-m4-error-logs',
  // M4 error events (Main -> Renderer)
  M4_ERROR_REPORTED: 'm4-error-reported',
  M4_ERROR_CONTEXT_UPDATED: 'm4-error-context-updated',
  // M4 Dialogue merge channels
  START_M4_DIALOGUE_MERGE: 'start-m4-dialogue-merge',
  M4_DIALOGUE_MERGE_PROGRESS: 'm4-dialogue-merge-progress',
  // M4 String merge channels
  START_M4_STRING_MERGE: 'start-m4-string-merge',
  M4_STRING_MERGE_PROGRESS: 'm4-string-merge-progress'
} as const

// NOTE: The following types are imported from shared/types.ts in the actual build.
// They are temporarily duplicated here to fix module loading issues in the preload script.
// DO NOT modify these types here - modify them in shared/types.ts instead.

interface IpcErrorResponse {
  error: true
  code: string
  message: string
}

interface AppState {
  version: string
  isUpdateAvailable: boolean
  lastUpdateCheck: number
  ignoredVersion?: string
  userPreferences: {
    theme: 'light' | 'dark'
    language: 'ko' | 'en'
  }
}

interface UpdateInfo {
  version: string
  releaseDate: string
  downloadUrl: string
  changelog: string
  downloadSize?: number
}

interface RendererErrorReport {
  message: string
  stack?: string
  componentStack?: string
  errorBoundary?: string
  errorInfo?: any
  userAgent?: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'javascript' | 'promise' | 'network' | 'ui' | 'user'
  context?: Record<string, any>
  userId?: string
  sessionId?: string
}

interface ErrorDialogData {
  title: string
  message: string
  details?: string
  showRestartButton?: boolean
  errorId?: string
}

interface UpdateProgress {
  stage: 'downloading' | 'installing' | 'complete'
  progress: number
  message: string
  downloadSize?: number
  downloadedSize?: number
  speed?: number
}

interface UpdateDialogData {
  updateInfo: UpdateInfo
  isUpdateAvailable: boolean
}

// NOTE: M4 types are imported from shared/types.ts in the actual build.
// They are temporarily duplicated here to fix module loading issues in the preload script.
// DO NOT modify these types here - modify them in shared/types.ts instead.

// M4 processing interfaces
interface M4FolderSelectionResult {
  success: boolean
  folderPath?: string
  error?: string
}

interface M4FileValidationResult {
  isValid: boolean
  missingFiles: string[]
  foundFiles: string[]
  processType: 'dialogue' | 'string'
  errorMessage?: string
}

interface M4FolderValidationRequest {
  folderPath: string
  processType: 'dialogue' | 'string'
}

// M4 Settings interfaces
interface M4Settings {
  version: string
  folderPaths: {
    dialogue: {
      inputFolder: string
      outputFolder: string
    }
    string: {
      inputFolder: string
      outputFolder: string
    }
    commonOutputDirectory: string
  }
  outputSettings: {
    defaultOutputDirectory: string
    outputFileNaming: {
      pattern: string
      includeTimestamp: boolean
      timestampFormat: string
      includeProcessType: boolean
      customPrefix: string
    }
    createBackup: boolean
    backupRetentionDays: number
    compressOutput: boolean
    outputFormat: 'xlsx' | 'xlsm' | 'csv'
  }
  processingOptions: {
    autoOpenOutput: boolean
    preserveOriginalFiles: boolean
    stopOnError: boolean
    enableVerboseLogging: boolean
    enableParallelProcessing: boolean
    maxWorkerThreads: number
    memoryLimit: number
    processingTimeout: number
    notificationSettings: {
      notifyOnStart: boolean
      notifyOnComplete: boolean
      notifyOnError: boolean
      soundNotification: boolean
      systemNotification: boolean
    }
    validationSettings: {
      enableFileValidation: boolean
      enableDataValidation: boolean
      strictValidation: boolean
      warningOnValidationFailure: boolean
      customValidationRules: string[]
    }
  }
  recentFolders: {
    dialogue: Array<{
      path: string
      lastUsed: number
      usageCount: number
      alias?: string
      isFavorite: boolean
      validationStatus: 'valid' | 'invalid' | 'unknown'
    }>
    string: Array<{
      path: string
      lastUsed: number
      usageCount: number
      alias?: string
      isFavorite: boolean
      validationStatus: 'valid' | 'invalid' | 'unknown'
    }>
    maxItems: number
    autoCleanup: boolean
  }
  defaults: {
    defaultProcessType: 'dialogue' | 'string'
    defaultInputFolder: string
    defaultOutputFolder: string
    defaultProcessingOptions: Record<string, any>
    customDefaults: Record<string, any>
  }
  lastUpdated: number
}

// M4 Error interfaces
// NOTE: These types are defined in shared/types.ts
// M4ErrorContext.stage is a number type in shared/types.ts
interface M4ErrorReportRequest {
  errorType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  stackTrace?: string
  context: M4ErrorContext
  timestamp: number
  correlationId: string
  workerId?: string
  taskId?: string
  recoverable?: boolean
  retryable?: boolean
  userMessage?: string
  technicalMessage?: string
  resolutionSteps?: string[]
}

interface M4ErrorContext {
  processType: 'dialogue' | 'string'
  stage: number  // NOTE: This is a number, not ProcessStep enum
  fileName?: string
  filePath?: string
  processedFiles?: number
  totalFiles?: number
  memoryUsage?: number
  sheetName?: string
  rowNumber?: number
  columnNumber?: number
  fieldValue?: string
  dataType?: string
  validationRule?: string
  operation?: 'read' | 'write' | 'create' | 'delete' | 'move'
  fileSize?: number
  permissions?: string
  encoding?: string
  threadId?: string
  isMainThread?: boolean
  parentPort?: boolean
  taskQueue?: number
  customData?: Record<string, any>
}

interface M4ErrorContextUpdate {
  correlationId: string
  context: Partial<M4ErrorContext>
  timestamp: number
}

interface M4ErrorStats {
  totalErrors: number
  errorsByType: Record<string, number>
  errorsBySeverity: Record<string, number>
  errorsByProcessStep: Record<string, number>
  errorsByProcessType: Record<'dialogue' | 'string', number>
  lastErrorTime?: number
  errorRate?: number
  avgMemoryUsage?: number
  topErrorFiles?: { fileName: string; count: number }[]
}

interface M4ErrorLogExportRequest {
  startDate?: number
  endDate?: number
  errorTypes?: string[]
  severities?: string[]
  processTypes?: ('dialogue' | 'string')[]
  maxRecords?: number
  outputFormat?: 'json' | 'csv' | 'txt'
  includeSensitiveData?: boolean
}

interface M4ErrorReportedEvent {
  reportId: string
  correlationId: string
  errorType: string
  severity: string
  message: string
  timestamp: number
  processType: 'dialogue' | 'string'
  fileName?: string
  recoverable?: boolean
  retryable?: boolean
}

// M4 Dialogue merge types
interface M4DialogueMergeRequest {
  inputFolder: string
  outputFolder: string
}

interface M4DialogueMergeProgress {
  current: number
  total: number
  status: string
  percentage: number
}

interface M4DialogueMergeResult {
  success: boolean
  outputPath?: string
  error?: string
}

// M4 String merge interfaces
interface M4StringMergeRequest {
  inputFolder: string
  outputFolder: string
}

interface M4StringMergeProgress {
  current: number
  total: number
  currentFile?: string
  step?: string
  processedFiles?: number
  percentage: number
  message?: string
  status: string
}

interface M4StringMergeResult {
  success: boolean
  outputPath?: string
  error?: string
  processedFiles?: number
  elapsedTime?: number
}

console.log('Preload script loaded')

// Type-safe IPC invoke wrapper
async function safeInvoke(
  channel: string,
  ...args: any[]
): Promise<any> {
  try {
    console.log(`IPC invoke: ${channel}`)
    const result = await ipcRenderer.invoke(channel, ...args)
    
    // Check if result is an error response
    if (result && typeof result === 'object' && result.error === true) {
      const errorResponse = result as IpcErrorResponse
      console.error(`IPC Error [${errorResponse.code}]: ${errorResponse.message}`)
      throw new Error(`IPC Error [${errorResponse.code}]: ${errorResponse.message}`)
    }
    
    console.log(`IPC invoke success: ${channel}`)
    return result
  } catch (error) {
    console.error(`IPC invoke failed for channel "${channel}":`, error)
    throw error
  }
}

// Event listener wrapper with type safety
function safeOn(
  channel: string,
  callback: (data: any) => void
): void {
  const wrappedCallback = (event: Electron.IpcRendererEvent, data: any) => {
    callback(data)
  }
  ipcRenderer.on(channel, wrappedCallback)
}

// Generic event listener methods
function safeRemoveListener(
  channel: string,
  callback: (data: any) => void
): void {
  const wrappedCallback = (event: Electron.IpcRendererEvent, data: any) => {
    callback(data)
  }
  ipcRenderer.removeListener(channel, wrappedCallback)
}

// Add generic event listener methods to the API
const electronAPI = {
  // System information
  getVersion: () => safeInvoke(IPC_CHANNELS.GET_VERSION),
  
  // Dialog methods
  showSuccessDialog: () => safeInvoke(IPC_CHANNELS.SHOW_SUCCESS_DIALOG),
  
  // Update checking
  checkForUpdates: () => safeInvoke(IPC_CHANNELS.CHECK_FOR_UPDATES),
  
  // Application state
  getAppState: () => safeInvoke(IPC_CHANNELS.GET_APP_STATE),
  setAppState: (state: Partial<AppState>) => safeInvoke(IPC_CHANNELS.SET_APP_STATE, state),
  
  // Window management
  minimizeWindow: () => safeInvoke(IPC_CHANNELS.MINIMIZE_WINDOW),
  closeWindow: () => safeInvoke(IPC_CHANNELS.CLOSE_WINDOW),
  
  // Error reporting
  reportError: (errorReport: RendererErrorReport) => safeInvoke(IPC_CHANNELS.REPORT_ERROR, errorReport),
  
  // App restart
  restartApp: () => safeInvoke(IPC_CHANNELS.RESTART_APP),
  
  // Update methods
  updateNow: () => safeInvoke(IPC_CHANNELS.UPDATE_NOW),
  updateLater: () => safeInvoke(IPC_CHANNELS.UPDATE_LATER),
  ignoreUpdate: (version: string) => safeInvoke(IPC_CHANNELS.IGNORE_UPDATE, version),
  downloadUpdate: (updateInfo?: UpdateInfo) => safeInvoke(IPC_CHANNELS.DOWNLOAD_UPDATE, updateInfo),
  installUpdate: () => safeInvoke(IPC_CHANNELS.INSTALL_UPDATE),
  
  // Generic invoke method
  invoke: (channel: string, ...args: any[]) => safeInvoke(channel, ...args),
  
  // Development/debugging methods
  resetCircuitBreaker: () => safeInvoke('reset-circuit-breaker'),
  getCircuitBreakerStatus: () => safeInvoke('get-circuit-breaker-status'),
  forceUpdateCheck: () => safeInvoke('force-update-check'),
  mockUpdateAvailable: () => safeInvoke('mock-update-available'),
  
  // M4 processing methods
  selectM4Folder: (): Promise<M4FolderSelectionResult> => safeInvoke(IPC_CHANNELS.SELECT_M4_FOLDER),
  validateM4Folder: (request: M4FolderValidationRequest): Promise<M4FileValidationResult> => safeInvoke(IPC_CHANNELS.VALIDATE_M4_FOLDER, request),
  cancelM4Processing: (): Promise<void> => safeInvoke('cancel-m4-processing'),
  startM4DialogueMerge: (request: M4DialogueMergeRequest): Promise<M4DialogueMergeResult> => safeInvoke(IPC_CHANNELS.START_M4_DIALOGUE_MERGE, request),
  
  // M4 String merge functions  
  startM4StringMerge: (request: M4StringMergeRequest): Promise<M4StringMergeResult> => safeInvoke(IPC_CHANNELS.START_M4_STRING_MERGE, request),
  
  // M4 settings methods
  getM4Settings: (): Promise<M4Settings> => safeInvoke(IPC_CHANNELS.GET_M4_SETTINGS),
  setM4Settings: (settings: Partial<M4Settings>): Promise<void> => safeInvoke(IPC_CHANNELS.SET_M4_SETTINGS, settings),
  resetM4Settings: (): Promise<M4Settings> => safeInvoke(IPC_CHANNELS.RESET_M4_SETTINGS),
  migrateM4Settings: (oldSettings: any, targetVersion?: string): Promise<M4Settings> => safeInvoke(IPC_CHANNELS.MIGRATE_M4_SETTINGS, { oldSettings, targetVersion }),
  validateM4Settings: (settings: M4Settings): Promise<{ isValid: boolean; errors: string[] }> => safeInvoke(IPC_CHANNELS.VALIDATE_M4_SETTINGS, settings),
  addRecentM4Folder: (processType: 'dialogue' | 'string', folderPath: string, alias?: string): Promise<M4Settings> => safeInvoke(IPC_CHANNELS.ADD_RECENT_M4_FOLDER, { processType, folderPath, alias }),
  removeRecentM4Folder: (processType: 'dialogue' | 'string', folderPath: string): Promise<M4Settings> => safeInvoke(IPC_CHANNELS.REMOVE_RECENT_M4_FOLDER, { processType, folderPath }),
  cleanupRecentM4Folders: (maxAge?: number): Promise<M4Settings> => safeInvoke(IPC_CHANNELS.CLEANUP_RECENT_M4_FOLDERS, { maxAge }),
  
  // M4 error reporting methods
  reportM4Error: (errorRequest: M4ErrorReportRequest): Promise<string | null> => safeInvoke(IPC_CHANNELS.REPORT_M4_ERROR, errorRequest),
  updateM4ErrorContext: (correlationId: string, context: Partial<M4ErrorContext>): Promise<void> => safeInvoke(IPC_CHANNELS.M4_ERROR_CONTEXT_UPDATE, { correlationId, context, timestamp: Date.now() }),
  getM4ErrorStats: (): Promise<M4ErrorStats> => safeInvoke(IPC_CHANNELS.GET_M4_ERROR_STATS),
  exportM4ErrorLogs: (request: M4ErrorLogExportRequest): Promise<string> => safeInvoke(IPC_CHANNELS.EXPORT_M4_ERROR_LOGS, request),
  clearM4ErrorLogs: (): Promise<void> => safeInvoke(IPC_CHANNELS.CLEAR_M4_ERROR_LOGS),
  
  // Generic event listener methods
  on: (channel: string, callback: (data: any) => void) => {
    safeOn(channel, callback)
  },
  
  removeListener: (channel: string, callback: (data: any) => void) => {
    safeRemoveListener(channel, callback)
  },
  
  // Remove all listeners for a channel
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
  
  // Utility to check if API is available
  isAvailable: () => true,
  
  // Specific event listeners for convenience
  onUpdateAvailable: (callback: (updateInfo: UpdateInfo) => void) => {
    safeOn(IPC_CHANNELS.UPDATE_AVAILABLE, callback)
  },
  
  onUpdateDownloaded: (callback: () => void) => {
    safeOn(IPC_CHANNELS.UPDATE_DOWNLOADED, callback)
  },
  
  onShowErrorDialog: (callback: (errorData: ErrorDialogData) => void) => {
    safeOn(IPC_CHANNELS.SHOW_ERROR_DIALOG, callback)
  },
  
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => {
    safeOn(IPC_CHANNELS.UPDATE_PROGRESS, callback)
  },
  
  onUpdateError: (callback: (error: string) => void) => {
    safeOn(IPC_CHANNELS.UPDATE_ERROR, callback)
  },
  
  onShowUpdateDialog: (callback: (data: UpdateDialogData) => void) => {
    safeOn(IPC_CHANNELS.SHOW_UPDATE_DIALOG, callback)
  },
  
  // M4 settings event listeners
  onM4SettingsChanged: (callback: (settings: M4Settings) => void) => {
    safeOn('m4-settings-changed', callback)
  },
  
  onM4SettingsReset: (callback: (settings: M4Settings) => void) => {
    safeOn('m4-settings-reset', callback)
  },
  
  onM4SettingsMigrated: (callback: (settings: M4Settings) => void) => {
    safeOn('m4-settings-migrated', callback)
  },
  
  onM4RecentFolderAdded: (callback: (data: { processType: 'dialogue' | 'string'; folderPath: string; settings: M4Settings }) => void) => {
    safeOn('m4-recent-folder-added', callback)
  },
  
  onM4RecentFolderRemoved: (callback: (data: { processType: 'dialogue' | 'string'; folderPath: string; settings: M4Settings }) => void) => {
    safeOn('m4-recent-folder-removed', callback)
  },
  
  onM4RecentFoldersCleaned: (callback: (settings: M4Settings) => void) => {
    safeOn('m4-recent-folders-cleaned', callback)
  },
  
  // M4 error event listeners
  onM4ErrorReported: (callback: (event: M4ErrorReportedEvent) => void) => {
    safeOn(IPC_CHANNELS.M4_ERROR_REPORTED, callback)
  },
  
  onM4ErrorContextUpdated: (callback: (update: M4ErrorContextUpdate) => void) => {
    safeOn(IPC_CHANNELS.M4_ERROR_CONTEXT_UPDATED, callback)
  },
  
  // M4 progress update listener
  onM4ProgressUpdate: (callback: (update: any) => void) => {
    safeOn('m4-progress-update', callback)
  },
  
  // M4 Dialogue merge progress listener
  onM4DialogueMergeProgress: (callback: (progress: M4DialogueMergeProgress) => void) => {
    safeOn(IPC_CHANNELS.M4_DIALOGUE_MERGE_PROGRESS, callback)
  },
  
  onM4StringMergeProgress: (callback: (progress: M4StringMergeProgress) => void) => {
    safeOn(IPC_CHANNELS.M4_STRING_MERGE_PROGRESS, callback)
  },
  
  // Performance profiling methods
  getPerformanceStats: (): Promise<Record<string, any>> => safeInvoke('get-performance-stats'),
  getPerformanceReport: (): Promise<any> => safeInvoke('get-performance-report'),
  startProfiling: (sessionName: string): Promise<void> => safeInvoke('start-profiling', sessionName),
  stopProfiling: (): Promise<any> => safeInvoke('stop-profiling'),
  clearPerformanceData: (): Promise<void> => safeInvoke('clear-performance-data'),
  setProfilingEnabled: (enabled: boolean): Promise<void> => safeInvoke('set-profiling-enabled', enabled)
}

// Re-export the API from the contextBridge setup
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// All types are defined in shared/types.ts
// The types duplicated above are temporary to fix module loading issues