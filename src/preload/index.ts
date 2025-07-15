import { contextBridge, ipcRenderer } from 'electron'
import log from 'electron-log/renderer'
import { 
  IPC_CHANNELS, 
  IpcRequests, 
  IpcResponses, 
  IpcEvents,
  IpcErrorResponse,
  AppState,
  UpdateInfo,
  RendererErrorReport,
  ErrorDialogData,
  UpdateProgress,
  UpdateDialogData
} from '../shared/types'

// Configure renderer logging
log.transports.console.level = 'debug'

log.info('Preload script loaded')

// Type-safe IPC invoke wrapper
async function safeInvoke<T extends keyof IpcRequests>(
  channel: T,
  ...args: IpcRequests[T] extends void ? [] : [IpcRequests[T]]
): Promise<IpcResponses[T]> {
  try {
    log.debug(`IPC invoke: ${channel}`)
    const result = await ipcRenderer.invoke(channel, ...args)
    
    // Check if result is an error response
    if (result && typeof result === 'object' && result.error === true) {
      const errorResponse = result as IpcErrorResponse
      log.error(`IPC Error [${errorResponse.code}]: ${errorResponse.message}`)
      throw new Error(`IPC Error [${errorResponse.code}]: ${errorResponse.message}`)
    }
    
    log.debug(`IPC invoke success: ${channel}`)
    return result
  } catch (error) {
    log.error(`IPC invoke failed for channel "${channel}":`, error)
    throw error
  }
}

// Event listener wrapper with type safety
function safeOn<T extends keyof IpcEvents>(
  channel: T,
  callback: (data: IpcEvents[T]) => void
): void {
  const wrappedCallback = (event: Electron.IpcRendererEvent, data: IpcEvents[T]) => {
    callback(data)
  }
  ipcRenderer.on(channel, wrappedCallback)
}


// Generic event listener methods
function safeRemoveListener<T extends keyof IpcEvents>(
  channel: T,
  callback: (data: IpcEvents[T]) => void
): void {
  const wrappedCallback = (event: Electron.IpcRendererEvent, data: IpcEvents[T]) => {
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
  invoke: <T extends keyof IpcRequests>(
    channel: T,
    ...args: IpcRequests[T] extends void ? [] : [IpcRequests[T]]
  ) => safeInvoke(channel, ...args),
  
  // Generic event listener methods
  on: <T extends keyof IpcEvents>(channel: T, callback: (data: IpcEvents[T]) => void) => {
    safeOn(channel, callback)
  },
  
  removeListener: <T extends keyof IpcEvents>(channel: T, callback: (data: IpcEvents[T]) => void) => {
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