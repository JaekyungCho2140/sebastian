import { contextBridge, ipcRenderer } from 'electron'

// IPC Channel constants - copied from shared/types to avoid module dependency in preload
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
  SHOW_UPDATE_DIALOG: 'show-update-dialog'
} as const

// Basic type interfaces for preload context
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
  downloadUpdate: () => safeInvoke(IPC_CHANNELS.DOWNLOAD_UPDATE),
  installUpdate: () => safeInvoke(IPC_CHANNELS.INSTALL_UPDATE),
  
  // Generic invoke method
  invoke: (channel: string, ...args: any[]) => safeInvoke(channel, ...args),
  
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
  }
}

// Re-export the API from the contextBridge setup
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Types are defined in shared/types.ts