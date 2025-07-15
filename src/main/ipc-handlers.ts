import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { 
  IPC_CHANNELS, 
  IpcRequests, 
  IpcResponses, 
  IpcErrorResponse,
  AppState,
  UpdateInfo,
  IpcError,
  RendererErrorReport,
  ErrorDialogData
} from '../shared/types'
import { getStateManager } from './state-manager'
import { UpdateService } from './services/updateService'
import { LocalErrorReporter } from './services/local-error-reporter'

// Error handler wrapper
function createErrorResponse(error: unknown, channel?: string): IpcErrorResponse {
  const message = error instanceof Error ? error.message : 'Unknown error occurred'
  const code = error instanceof IpcError ? error.code : 'UNKNOWN_ERROR'
  
  return {
    error: true,
    message,
    code,
    channel
  }
}

// Type-safe handler wrapper
function createHandler<T extends keyof IpcRequests>(
  channel: T,
  handler: (
    request: IpcRequests[T]
  ) => Promise<IpcResponses[T]> | IpcResponses[T]
): void {
  ipcMain.handle(channel, async (event, request: IpcRequests[T]) => {
    try {
      console.log(`IPC Handler: ${channel}`, request)
      const result = await handler(request)
      console.log(`IPC Response: ${channel}`, result)
      return result
    } catch (error) {
      console.error(`IPC Handler Error: ${channel}`, error)
      return createErrorResponse(error, channel)
    }
  })
}

// Update service instance
let updateService: UpdateService | null = null

// Error reporter instance
let errorReporter: LocalErrorReporter | null = null

// Initialize IPC handlers
export function setupIpcHandlers(): void {
  const stateManager = getStateManager()
  
  // Initialize error reporter
  errorReporter = new LocalErrorReporter({
    reportingLevel: 'medium',
    maxFiles: 100,
    maxAge: 30
  })
  
  // Initialize update service
  updateService = new UpdateService(stateManager, {
    githubRepo: 'JaekyungCho2140/sebastian', // Replace with your actual GitHub repo
    checkInterval: 24 * 60 * 60 * 1000, // 24 hours
    maxRetries: 3,
    retryDelay: 5000,
    requestTimeout: 30000
  })
  
  // Start update service
  updateService.start().catch(console.error)

  // Get version handler
  createHandler(IPC_CHANNELS.GET_VERSION, async () => {
    return stateManager.getState().version
  })

  // Show success dialog handler
  createHandler(IPC_CHANNELS.SHOW_SUCCESS_DIALOG, async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    
    await dialog.showMessageBox(focusedWindow || BrowserWindow.getAllWindows()[0], {
      type: 'info',
      title: 'Success!',
      message: '성공적으로 실행되었습니다!',
      detail: 'Sebastian 애플리케이션이 정상적으로 동작하고 있습니다.',
      buttons: ['확인']
    })
  })

  // Check for updates handler
  createHandler(IPC_CHANNELS.CHECK_FOR_UPDATES, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      const result = await updateService.checkForUpdates()
      
      if (result.error) {
        throw new IpcError(result.error, 'UPDATE_CHECK_FAILED')
      }
      
      return result.updateInfo || null
    } catch (error) {
      console.error('Update check failed:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Update check failed',
        'UPDATE_CHECK_ERROR'
      )
    }
  })

  // Get app state handler
  createHandler(IPC_CHANNELS.GET_APP_STATE, async () => {
    return stateManager.getState()
  })

  // Set app state handler
  createHandler(IPC_CHANNELS.SET_APP_STATE, async (partialState) => {
    stateManager.setState(partialState)
    
    // Broadcast state change to all windows
    const newState = stateManager.getState()
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('app-state-changed', newState)
    })
    
    console.log('App state updated:', newState)
  })

  // Minimize window handler
  createHandler(IPC_CHANNELS.MINIMIZE_WINDOW, async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.minimize()
    }
  })

  // Close window handler
  createHandler(IPC_CHANNELS.CLOSE_WINDOW, async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.close()
    }
  })

  // Error reporting handler
  createHandler(IPC_CHANNELS.REPORT_ERROR, async (errorReport: RendererErrorReport) => {
    if (!errorReporter) {
      throw new IpcError('Error reporter not initialized', 'ERROR_REPORTER_NOT_INITIALIZED')
    }
    
    try {
      // Convert renderer error report to main process error report
      const error = errorReport.error instanceof Error 
        ? errorReport.error 
        : new Error(String(errorReport.error))
      
      // Add renderer-specific context
      const context = {
        ...errorReport.context,
        sessionId: errorReporter.getSessionId(),
        url: errorReport.url,
        customData: {
          processType: 'renderer',
          line: errorReport.line,
          column: errorReport.column,
          stack: errorReport.stack,
          ...errorReport.context?.customData
        }
      }
      
      const reportId = await errorReporter.captureError(
        error,
        errorReport.errorType,
        'renderer',
        errorReport.severity || 'medium',
        context
      )
      
      return reportId
    } catch (error) {
      console.error('Failed to process renderer error report:', error)
      throw new IpcError(
        'Failed to process error report', 
        'ERROR_REPORT_PROCESSING_FAILED'
      )
    }
  })

  // App restart handler
  createHandler(IPC_CHANNELS.RESTART_APP, async () => {
    console.log('Restarting application...')
    
    // Small delay to ensure response is sent back
    setTimeout(() => {
      app.relaunch()
      app.exit(0)
    }, 100)
  })

  // Update now handler
  createHandler(IPC_CHANNELS.UPDATE_NOW, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    // This will be handled by the update manager
    console.log('Update now requested')
  })

  // Update later handler
  createHandler(IPC_CHANNELS.UPDATE_LATER, async () => {
    console.log('Update later requested')
  })

  // Ignore update handler
  createHandler(IPC_CHANNELS.IGNORE_UPDATE, async (version: string) => {
    console.log('Ignoring update version:', version)
    // Store ignored version in state
    stateManager.setState({ ignoredVersion: version })
  })

  // Download update handler
  createHandler(IPC_CHANNELS.DOWNLOAD_UPDATE, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      const updateInfo = updateService.getCurrentDownloadInfo()
      if (!updateInfo) {
        throw new IpcError('No update information available', 'NO_UPDATE_INFO')
      }
      
      await updateService.downloadUpdate(updateInfo)
    } catch (error) {
      console.error('Download failed:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Download failed',
        'DOWNLOAD_FAILED'
      )
    }
  })

  // Install update handler
  createHandler(IPC_CHANNELS.INSTALL_UPDATE, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      // Use the current install path
      const installPath = updateService.getCurrentInstallPath()
      if (!installPath) {
        throw new IpcError('No file to install', 'NO_FILE_TO_INSTALL')
      }
      
      await updateService.installUpdate(installPath)
      
      // Schedule app restart after successful installation
      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 2000) // 2 second delay to show completion message
      
    } catch (error) {
      console.error('Installation failed:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Installation failed',
        'INSTALLATION_FAILED'
      )
    }
  })

  // Setup update service event listeners
  if (updateService) {
    updateService.on('updateAvailable', (updateInfo: UpdateInfo) => {
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, updateInfo)
      })
    })

    updateService.on('downloadProgress', (progress) => {
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, progress)
      })
    })

    updateService.on('installProgress', (progress) => {
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, progress)
      })
    })

    updateService.on('downloadComplete', (data) => {
      console.log('Download completed:', data)
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_DOWNLOADED)
      })
    })

    updateService.on('installComplete', (data) => {
      console.log('Installation completed:', data)
    })

    updateService.on('updateError', (error) => {
      console.error('Update error:', error)
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_ERROR, error.error)
      })
    })

    updateService.on('downloadError', (error) => {
      console.error('Download error:', error)
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_ERROR, error.error)
      })
    })

    updateService.on('installError', (error) => {
      console.error('Installation error:', error)
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_ERROR, error.error)
      })
    })
  }

  console.log('IPC handlers initialized')
}

// Show error dialog in renderer process
export function showErrorDialog(errorData: ErrorDialogData): void {
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send(IPC_CHANNELS.SHOW_ERROR_DIALOG, errorData)
  })
}

// Get current app state (for use by other modules)
export function getAppState(): AppState {
  return getStateManager().getState()
}

// Update app state (for use by other modules)
export function updateAppState(updates: Partial<AppState>): void {
  const stateManager = getStateManager()
  stateManager.setState(updates)
  
  // Broadcast state change to all windows
  const newState = stateManager.getState()
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('app-state-changed', newState)
  })
}

// Cleanup function to stop services
export async function cleanup(): Promise<void> {
  if (updateService) {
    await updateService.stop()
    updateService = null
  }
}