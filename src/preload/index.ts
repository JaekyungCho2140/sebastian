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
  ErrorDialogData
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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
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
  
  // Event listeners
  onUpdateAvailable: (callback: (updateInfo: UpdateInfo) => void) => {
    safeOn(IPC_CHANNELS.UPDATE_AVAILABLE, callback)
  },
  
  onUpdateDownloaded: (callback: () => void) => {
    safeOn(IPC_CHANNELS.UPDATE_DOWNLOADED, callback)
  },
  
  onShowErrorDialog: (callback: (errorData: ErrorDialogData) => void) => {
    safeOn(IPC_CHANNELS.SHOW_ERROR_DIALOG, callback)
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
  
  // Utility to check if API is available
  isAvailable: () => true
})

// Types for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>
      showSuccessDialog: () => Promise<void>
      checkForUpdates: () => Promise<UpdateInfo | null>
      getAppState: () => Promise<AppState>
      setAppState: (state: Partial<AppState>) => Promise<void>
      minimizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      reportError: (errorReport: RendererErrorReport) => Promise<string | null>
      restartApp: () => Promise<void>
      onUpdateAvailable: (callback: (updateInfo: UpdateInfo) => void) => void
      onUpdateDownloaded: (callback: () => void) => void
      onShowErrorDialog: (callback: (errorData: ErrorDialogData) => void) => void
      removeAllListeners: (channel: string) => void
      isAvailable: () => boolean
    }
  }
}