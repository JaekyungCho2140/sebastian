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
  ErrorDialogData,
  TimeoutUserAction,
  InstallationTimeoutStatus,
  RecoveryActionRequest,
  RecoveryActionResult,
  ErrorLogExportRequest,
  SupportInformation,
  SelfDiagnosticReport,
  HelpTopic,
  HelpSearchResult,
  M4FolderSelectionResult,
  M4FileValidationResult,
  M4FolderValidationRequest,
  M4Settings,
  M4ErrorReportRequest,
  M4ErrorContextUpdate,
  M4ErrorStats,
  M4ErrorLogExportRequest,
  M4ErrorReportedEvent,
  ErrorBreadcrumb
} from '../shared/types'
import { getStateManager } from './state-manager'
import { UpdateService } from './services/updateService'
import { LocalErrorReporter } from './services/local-error-reporter'
import { RemoteErrorReporter } from './services/remote-error-reporter'
import { M4ErrorReporter } from './services/m4-error-reporter'
import { InstallOptions, UpdateInstaller } from './services/updateInstaller'
import { 
  FolderDialogService, 
  FolderSelectionResult, 
  M4FileValidationResult as ServiceM4FileValidationResult
} from '../services/folderDialogService'
import { 
  PerformanceProfiler, 
  globalProfiler,
  PerformanceReport,
  ProfilerConfig as ProfilingConfig
} from '../services/m4/performance/profiler'

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

// Performance profiler instance
const ipcProfiler = globalProfiler.isEnabled() ? globalProfiler : null

// Type-safe handler wrapper
function createHandler<T extends keyof IpcRequests & keyof IpcResponses>(
  channel: T,
  handler: (
    request: IpcRequests[T]
  ) => Promise<IpcResponses[T]> | IpcResponses[T]
): void {
  ipcMain.handle(channel, async (event, request: IpcRequests[T]) => {
    const measurementId = ipcProfiler?.begin(`IPC.${channel}`, {
      channel,
      requestSize: request ? JSON.stringify(request).length : 0
    })
    
    try {
      console.log(`IPC Handler: ${channel}`, request)
      const result = await handler(request)
      console.log(`IPC Response: ${channel}`, result)
      
      if (measurementId) {
        ipcProfiler?.end(measurementId)
      }
      
      return result
    } catch (error) {
      console.error(`IPC Handler Error: ${channel}`, error)
      
      if (measurementId) {
        ipcProfiler?.end(measurementId)
      }
      
      return createErrorResponse(error, channel)
    }
  })
}

// Update service instance
let updateService: UpdateService | null = null

// Error reporter instance
let errorReporter: LocalErrorReporter | null = null

// M4 error reporter instance
let m4ErrorReporter: M4ErrorReporter | null = null

// Folder dialog service instance
let folderDialogService: FolderDialogService | null = null

// NSIS installation process manager
async function initiateNsisInstallation(installPath: string, customOptions?: Partial<InstallOptions>): Promise<void> {
  console.log('Initiating NSIS installation with enhanced progress monitoring...')
  
  if (!updateService) {
    throw new Error('Update service not available')
  }
  
  const installationStartTime = Date.now()
  
  // Phase 1: Resource cleanup and preparation (2 seconds)
  console.log('Phase 1: Cleaning up resources...')
  
  // Close all windows gracefully
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(window => {
    window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
      stage: 'preparing',
      progress: 5,
      message: 'Initializing installation process...',
      phase: 'preparation',
      timestamp: Date.now()
    })
    window.webContents.send(IPC_CHANNELS.NSIS_INSTALLATION_PHASE, {
      phase: 'preparation',
      message: 'Preparing for NSIS installation - cleaning up resources',
      timestamp: Date.now()
    })
  })
  
  // Progress update: Closing windows
  await new Promise(resolve => setTimeout(resolve, 500))
  windows.forEach(window => {
    window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
      stage: 'preparing',
      progress: 15,
      message: 'Closing application windows...',
      phase: 'resource-cleanup',
      timestamp: Date.now()
    })
  })
  
  // Allow time for renderer processes to clean up
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Phase 2: Service shutdown (1 second)
  console.log('Phase 2: Shutting down services...')
  
  windows.forEach(window => {
    window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
      stage: 'preparing',
      progress: 30,
      message: 'Shutting down services...',
      phase: 'service-shutdown',
      timestamp: Date.now()
    })
  })
  
  // Stop update service and clean up resources
  await updateService.stop()
  
  // Additional cleanup time
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Phase 3: File system preparation (500ms)
  console.log('Phase 3: Preparing file system...')
  
  windows.forEach(window => {
    window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
      stage: 'preparing',
      progress: 50,
      message: 'Preparing file system...',
      phase: 'filesystem-prep',
      timestamp: Date.now(),
      estimatedTimeRemaining: 2000
    })
    window.webContents.send(IPC_CHANNELS.NSIS_INSTALLATION_PHASE, {
      phase: 'filesystem-prep',
      message: 'Releasing file handles and preparing for installation',
      timestamp: Date.now()
    })
  })
  
  // Ensure all file handles are released
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Phase 4: Start installation process
  console.log('Phase 4: Starting NSIS installation...')
  
  windows.forEach(window => {
    window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
      stage: 'installing',
      progress: 0,
      message: 'Starting installation...',
      phase: 'installation-start',
      timestamp: Date.now(),
      estimatedTimeRemaining: 60000
    })
    window.webContents.send(IPC_CHANNELS.NSIS_INSTALLATION_PHASE, {
      phase: 'installation-start',
      message: 'Launching NSIS installer with enhanced monitoring',
      timestamp: Date.now()
    })
  })

  // Set up progress monitoring interval
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - installationStartTime
    const estimatedTotal = 65000 // 65 seconds estimated total
    const progressPercentage = Math.min((elapsed / estimatedTotal) * 100, 95)
    
    windows.forEach(window => {
      window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
        stage: 'installing',
        progress: progressPercentage,
        message: `Installing Sebastian... (${Math.round(progressPercentage)}%)`,
        phase: 'installation-progress',
        timestamp: Date.now(),
        estimatedTimeRemaining: Math.max(estimatedTotal - elapsed, 0)
      })
    })
  }, 2000) // Update every 2 seconds
  
  // Start installation with proper error handling
  setTimeout(async () => {
    try {
      if (!updateService) {
        console.error('Update service not available for installation')
        clearInterval(progressInterval)
        handleInstallationFailure()
        return
      }
      
      // Run NSIS installation with optimized parameters
      const installOptions = {
        silentInstall: true,
        elevatePermissions: true,
        timeout: 15 * 60 * 1000, // 15 minutes timeout
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        // NSIS specific optimizations
        installPath: undefined, // Let NSIS choose default location
        // User preferences from app state
        ...getInstallationPreferences(),
        // Custom options from caller
        ...customOptions
      }
      
      console.log('NSIS installation options:', installOptions)
      
      // Start installation - this returns immediately after spawning the process
      updateService.installUpdate(installPath, installOptions)
        .then(() => {
          // Installation completed successfully
          clearInterval(progressInterval)
          console.log('NSIS installation completed successfully')
          
          windows.forEach(window => {
            window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
              stage: 'complete',
              progress: 100,
              message: 'Installation completed successfully!',
              phase: 'installation-complete',
              timestamp: Date.now()
            })
            window.webContents.send(IPC_CHANNELS.NSIS_INSTALLATION_COMPLETE, {
              success: true,
              message: 'Sebastian has been updated successfully',
              timestamp: Date.now()
            })
          })
          
          setTimeout(() => {
            app.relaunch()
            app.exit(0)
          }, 1000)
        })
        .catch((installError) => {
          clearInterval(progressInterval)
          console.error('NSIS installation failed:', installError)
          handleInstallationFailure()
        })
      
      // Wait a bit to ensure installer process has started
      setTimeout(() => {
        console.log('Installer process started, now safe to quit app')
        app.quit()
      }, 3000) // Wait 3 seconds to ensure installer is running
      
    } catch (error) {
      clearInterval(progressInterval)
      console.error('Failed to start installation:', error)
      handleInstallationFailure()
    }
  }, 1000)
}

// Get installation preferences from app state
function getInstallationPreferences(): Partial<InstallOptions> {
  const stateManager = getStateManager()
  const state = stateManager.getState()
  
  // Default preferences
  const defaultPreferences = {
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    silentInstall: true,
    elevatePermissions: true
  }
  
  // You can extend this to read from user preferences
  // For now, we'll use sensible defaults with potential for customization
  return {
    ...defaultPreferences,
    // Custom preferences based on app state could be added here
    // For example, if user has specific language preferences:
    // installerLanguage: state.userPreferences.language === 'ko' ? 'Korean' : 'English'
  }
}

// Handle installation failure with proper recovery
function handleInstallationFailure(): void {
  console.log('Handling installation failure - restarting current app')
  
  // Small delay to ensure logging
  setTimeout(() => {
    app.relaunch()
    app.exit(1)
  }, 1000)
}

// Initialize IPC handlers
export function setupIpcHandlers(): void {
  console.log('=== IPC HANDLERS: SETUP STARTING ===')
  
  const stateManager = getStateManager()
  console.log('StateManager retrieved:', !!stateManager)
  
  // Test StateManager functionality
  try {
    const testState = stateManager.getState()
    console.log('StateManager test - current state:', testState)
  } catch (stateError) {
    console.error('StateManager test failed:', stateError)
  }
  
  // Initialize error reporter
  console.log('Initializing error reporter...')
  errorReporter = new LocalErrorReporter({
    reportingLevel: 'medium',
    maxFiles: 100,
    maxAge: 30
  })
  console.log('Error reporter initialized successfully')

  // Initialize M4 error reporter
  console.log('Initializing M4 error reporter...')
  // RemoteErrorReporter 인스턴스 생성 (비활성화 상태)
  const remoteReporter = new RemoteErrorReporter(
    errorReporter, // LocalErrorReporter 인스턴스
    false, // enableRemoteReporting
    '' // Sentry DSN (empty since we're not using it)
  )
  
  m4ErrorReporter = new M4ErrorReporter(
    errorReporter,
    remoteReporter,
    {
      enableLocalLogging: true,
      enableRemoteReporting: false,
      separateM4Logs: true,
      maxM4Files: 200,
      maxM4FileSize: 10 * 1024 * 1024, // 10MB
      maxM4Age: 90, // 90일
      logRotationEnabled: true
    }
  )
  console.log('M4 error reporter initialized successfully')
  
  // Initialize folder dialog service
  console.log('Initializing folder dialog service...')
  folderDialogService = new FolderDialogService()
  console.log('Folder dialog service initialized successfully')
  
  // Initialize update service
  console.log('=== IPC HANDLERS: INITIALIZING UPDATE SERVICE ===')
  
  try {
    updateService = new UpdateService(stateManager, {
      githubRepo: 'JaekyungCho2140/sebastian', // Replace with your actual GitHub repo
      checkInterval: 24 * 60 * 60 * 1000, // 24 hours
      maxRetries: 3,
      retryDelay: 5000,
      requestTimeout: 30000
    })
    
    console.log('UpdateService instance created successfully')
    
    // Start update service with comprehensive error handling
    updateService.start()
      .then(() => {
        console.log('=== UPDATE SERVICE STARTED SUCCESSFULLY ===')
      })
      .catch((error) => {
        console.error('=== UPDATE SERVICE START FAILED ===')
        console.error('Error details:', error)
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available')
        
        // Continue with IPC setup even if update service fails
        console.log('Continuing with IPC setup despite UpdateService failure...')
      })
  } catch (initError) {
    console.error('=== UPDATE SERVICE INITIALIZATION FAILED ===')
    console.error('Initialization error:', initError)
    console.error('Error stack:', initError instanceof Error ? initError.stack : 'No stack available')
    
    // Set updateService to null so other handlers can check
    updateService = null
  }

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
  createHandler(IPC_CHANNELS.DOWNLOAD_UPDATE, async (event, updateInfo?: UpdateInfo) => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      // Use provided updateInfo or fallback to stored info
      if (!updateInfo) {
        updateInfo = updateService.getCurrentDownloadInfo()
      }
      
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
  createHandler(IPC_CHANNELS.INSTALL_UPDATE, async (customOptions?: Partial<InstallOptions> | void) => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      // Use the current install path
      const installPath = updateService.getCurrentInstallPath()
      if (!installPath) {
        throw new IpcError('No file to install', 'NO_FILE_TO_INSTALL')
      }
      
      console.log('Starting NSIS installation process...')
      console.log('Custom installation options:', customOptions)
      
      // Notify all windows about installation start
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
          stage: 'preparing',
          progress: 0,
          message: 'Preparing for installation...',
          phase: 'resource-cleanup'
        })
      })
      
      // Start graceful shutdown sequence for NSIS installation
      await initiateNsisInstallation(installPath, customOptions || undefined)
      
    } catch (error) {
      console.error('Installation failed:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Installation failed',
        'INSTALLATION_FAILED'
      )
    }
  })

  // Cancel installation handler
  createHandler(IPC_CHANNELS.CANCEL_INSTALLATION, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      updateService.cancelInstallation()
      
      // Notify all windows about cancellation
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
          stage: 'complete',
          progress: 0,
          message: 'Installation cancelled by user'
        })
      })
      
    } catch (error) {
      console.error('Failed to cancel installation:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to cancel installation',
        'CANCEL_INSTALLATION_FAILED'
      )
    }
  })

  // Get installation status handler
  createHandler(IPC_CHANNELS.GET_INSTALLATION_STATUS, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    return {
      isInstalling: updateService.isInstalling(),
      currentInstallPath: updateService.getCurrentInstallPath(),
      isDownloading: updateService.isDownloading(),
      currentDownloadInfo: updateService.getCurrentDownloadInfo()
    }
  })

  // Retry installation handler
  createHandler(IPC_CHANNELS.RETRY_INSTALLATION, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      const installPath = updateService.getCurrentInstallPath()
      if (!installPath) {
        throw new IpcError('No file to install', 'NO_FILE_TO_INSTALL')
      }
      
      console.log('Retrying NSIS installation...')
      
      // Notify all windows about retry
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
          stage: 'preparing',
          progress: 0,
          message: 'Retrying installation...',
          phase: 'retry'
        })
      })
      
      // Start installation retry
      await initiateNsisInstallation(installPath)
      
    } catch (error) {
      console.error('Installation retry failed:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Installation retry failed',
        'INSTALLATION_RETRY_FAILED'
      )
    }
  })

  // Force cancel installation handler
  createHandler(IPC_CHANNELS.FORCE_CANCEL_INSTALLATION, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      // Force cancel with immediate termination
      updateService.forceCancelInstallation()
      
      // Notify all windows about force cancellation
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
          stage: 'complete',
          progress: 0,
          message: 'Installation force cancelled'
        })
      })
      
    } catch (error) {
      console.error('Failed to force cancel installation:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to force cancel installation',
        'FORCE_CANCEL_INSTALLATION_FAILED'
      )
    }
  })

  // Get timeout status handler
  createHandler(IPC_CHANNELS.GET_TIMEOUT_STATUS, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    return updateService.getTimeoutStatus()
  })

  // Handle timeout user action
  createHandler(IPC_CHANNELS.TIMEOUT_USER_ACTION, async (action: TimeoutUserAction) => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Processing timeout user action:', action)
      updateService.handleTimeoutUserAction(action)
      
      // Notify all windows about user action
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
          stage: 'installing',
          progress: 0,
          message: `User selected: ${action.action}`,
          phase: 'user-action'
        })
      })
      
    } catch (error) {
      console.error('Failed to process timeout user action:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to process timeout user action',
        'TIMEOUT_USER_ACTION_FAILED'
      )
    }
  })

  // Execute recovery action handler
  createHandler(IPC_CHANNELS.EXECUTE_RECOVERY_ACTION, async (request: RecoveryActionRequest) => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Executing recovery action:', request)
      const result = await updateService.executeRecoveryAction(request)
      
      // Notify all windows about recovery action result
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
          stage: 'installing',
          progress: 0,
          message: `Recovery action: ${result.message}`,
          phase: 'recovery-action'
        })
      })
      
      return result
    } catch (error) {
      console.error('Failed to execute recovery action:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to execute recovery action',
        'RECOVERY_ACTION_FAILED'
      )
    }
  })

  // Get recovery options handler
  createHandler(IPC_CHANNELS.GET_RECOVERY_OPTIONS, async (correlationId: string) => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Getting recovery options for correlation ID:', correlationId)
      return updateService.getRecoveryOptions(correlationId)
    } catch (error) {
      console.error('Failed to get recovery options:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to get recovery options',
        'GET_RECOVERY_OPTIONS_FAILED'
      )
    }
  })

  // Get system snapshot handler
  createHandler(IPC_CHANNELS.GET_SYSTEM_SNAPSHOT, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Getting system snapshot...')
      return await updateService.getSystemSnapshot()
    } catch (error) {
      console.error('Failed to get system snapshot:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to get system snapshot',
        'GET_SYSTEM_SNAPSHOT_FAILED'
      )
    }
  })

  // Export error logs handler
  createHandler(IPC_CHANNELS.EXPORT_ERROR_LOGS, async (request: ErrorLogExportRequest) => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Exporting error logs:', request)
      const filePath = await updateService.exportErrorLogs(request)
      
      // Notify all windows about log export
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
          stage: 'complete',
          progress: 100,
          message: `Error logs exported to: ${filePath}`,
          phase: 'log-export'
        })
      })
      
      return filePath
    } catch (error) {
      console.error('Failed to export error logs:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to export error logs',
        'EXPORT_ERROR_LOGS_FAILED'
      )
    }
  })

  // Get support info handler
  createHandler(IPC_CHANNELS.GET_SUPPORT_INFO, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Getting support info...')
      return updateService.getSupportInfo()
    } catch (error) {
      console.error('Failed to get support info:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to get support info',
        'GET_SUPPORT_INFO_FAILED'
      )
    }
  })

  // Perform self diagnostics handler
  createHandler(IPC_CHANNELS.PERFORM_SELF_DIAGNOSTICS, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Performing self diagnostics...')
      return updateService.performSelfDiagnostics()
    } catch (error) {
      console.error('Failed to perform self diagnostics:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to perform self diagnostics',
        'PERFORM_SELF_DIAGNOSTICS_FAILED'
      )
    }
  })

  // Get help topics handler
  createHandler(IPC_CHANNELS.GET_HELP_TOPICS, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Getting help topics...')
      return updateService.getHelpTopics()
    } catch (error) {
      console.error('Failed to get help topics:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to get help topics',
        'GET_HELP_TOPICS_FAILED'
      )
    }
  })

  // Search help handler
  createHandler(IPC_CHANNELS.SEARCH_HELP, async (query: string) => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Searching help with query:', query)
      return updateService.searchHelp(query)
    } catch (error) {
      console.error('Failed to search help:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to search help',
        'SEARCH_HELP_FAILED'
      )
    }
  })

  // Export detailed error analysis handler
  createHandler(IPC_CHANNELS.EXPORT_DETAILED_ERROR_ANALYSIS, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Exporting detailed error analysis...')
      const analysis = updateService.exportDetailedErrorAnalysis()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `sebastian-error-analysis-${timestamp}.txt`
      const filepath = require('path').join(require('electron').app.getPath('temp'), filename)
      
      require('fs').writeFileSync(filepath, analysis, 'utf-8')
      
      // Notify all windows about analysis export
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
          stage: 'complete',
          progress: 100,
          message: `Error analysis exported to: ${filepath}`,
          phase: 'analysis-export'
        })
      })
      
      return filepath
    } catch (error) {
      console.error('Failed to export detailed error analysis:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to export detailed error analysis',
        'EXPORT_DETAILED_ERROR_ANALYSIS_FAILED'
      )
    }
  })

  // Compress logs handler
  createHandler(IPC_CHANNELS.COMPRESS_LOGS, async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Compressing logs...')
      updateService.compressLogs()
      
      // Notify all windows about log compression
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
          stage: 'complete',
          progress: 100,
          message: 'Logs compressed successfully',
          phase: 'log-compression'
        })
      })
    } catch (error) {
      console.error('Failed to compress logs:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to compress logs',
        'COMPRESS_LOGS_FAILED'
      )
    }
  })

  // M4 processing handlers
  console.log('Registering M4 processing IPC handlers...')
  
  // Select M4 folder handler
  createHandler(IPC_CHANNELS.SELECT_M4_FOLDER, async () => {
    if (!folderDialogService) {
      throw new IpcError('Folder dialog service not initialized', 'FOLDER_DIALOG_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      const result = await folderDialogService.openFolderDialog()
      return result
    } catch (error) {
      console.error('Failed to open folder dialog:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to open folder dialog',
        'FOLDER_DIALOG_FAILED'
      )
    }
  })
  
  // Validate M4 folder handler
  createHandler(IPC_CHANNELS.VALIDATE_M4_FOLDER, async (request: M4FolderValidationRequest) => {
    if (!folderDialogService) {
      throw new IpcError('Folder dialog service not initialized', 'FOLDER_DIALOG_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      let validationResult
      
      if (request.processType === 'dialogue') {
        validationResult = folderDialogService.validateM4DialogueFiles(request.folderPath)
      } else {
        validationResult = folderDialogService.validateM4StringFiles(request.folderPath)
      }
      
      const result: M4FileValidationResult = {
        ...validationResult,
        processType: request.processType,
        errorMessage: !validationResult.isValid ? folderDialogService.generateValidationErrorMessage(
          validationResult, 
          request.processType
        ) : undefined
      }
      
      return result
    } catch (error) {
      console.error('Failed to validate M4 folder:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to validate M4 folder',
        'M4_FOLDER_VALIDATION_FAILED'
      )
    }
  })
  
  // ============================================================================
  // M4 Settings IPC Handlers
  // ============================================================================
  
  console.log('Registering M4 settings IPC handlers...')
  
  // Get M4 settings handler
  createHandler(IPC_CHANNELS.GET_M4_SETTINGS, async () => {
    try {
      const settings = stateManager.getM4Settings()
      console.log('M4 settings retrieved successfully')
      return settings
    } catch (error) {
      console.error('Failed to get M4 settings:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to get M4 settings',
        'GET_M4_SETTINGS_FAILED'
      )
    }
  })
  
  // Set M4 settings handler
  createHandler(IPC_CHANNELS.SET_M4_SETTINGS, async (settings: Partial<M4Settings>) => {
    try {
      const updatedSettings = stateManager.saveM4Settings(settings)
      
      // Broadcast M4 settings change to all windows
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('m4-settings-changed', updatedSettings)
      })
      
      console.log('M4 settings updated successfully')
    } catch (error) {
      console.error('Failed to set M4 settings:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to set M4 settings',
        'SET_M4_SETTINGS_FAILED'
      )
    }
  })
  
  // Reset M4 settings handler
  createHandler(IPC_CHANNELS.RESET_M4_SETTINGS, async () => {
    try {
      const resetSettings = stateManager.resetM4Settings()
      
      // Broadcast M4 settings reset to all windows
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('m4-settings-reset', resetSettings)
      })
      
      console.log('M4 settings reset successfully')
      return resetSettings
    } catch (error) {
      console.error('Failed to reset M4 settings:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to reset M4 settings',
        'RESET_M4_SETTINGS_FAILED'
      )
    }
  })
  
  // Migrate M4 settings handler
  createHandler(IPC_CHANNELS.MIGRATE_M4_SETTINGS, async (request: { oldSettings: any; targetVersion?: string }) => {
    try {
      const migratedSettings = stateManager.migrateM4Settings(request.oldSettings, request.targetVersion)
      
      // Broadcast M4 settings migration to all windows
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('m4-settings-migrated', migratedSettings)
      })
      
      console.log('M4 settings migrated successfully')
      return migratedSettings
    } catch (error) {
      console.error('Failed to migrate M4 settings:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to migrate M4 settings',
        'MIGRATE_M4_SETTINGS_FAILED'
      )
    }
  })
  
  // Validate M4 settings handler
  createHandler(IPC_CHANNELS.VALIDATE_M4_SETTINGS, async (settings: M4Settings) => {
    try {
      const validation = stateManager.validateM4Settings(settings)
      console.log('M4 settings validation completed:', validation)
      return validation
    } catch (error) {
      console.error('Failed to validate M4 settings:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to validate M4 settings',
        'VALIDATE_M4_SETTINGS_FAILED'
      )
    }
  })
  
  // Add recent M4 folder handler
  createHandler(IPC_CHANNELS.ADD_RECENT_M4_FOLDER, async (request: { processType: 'dialogue' | 'string'; folderPath: string; alias?: string }) => {
    try {
      const updatedSettings = stateManager.updateLastUsedFolder(
        request.processType,
        request.folderPath,
        request.alias
      )
      
      // Broadcast recent folder update to all windows
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('m4-recent-folder-added', {
          processType: request.processType,
          folderPath: request.folderPath,
          settings: updatedSettings
        })
      })
      
      console.log('Recent M4 folder added successfully')
      return updatedSettings
    } catch (error) {
      console.error('Failed to add recent M4 folder:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to add recent M4 folder',
        'ADD_RECENT_M4_FOLDER_FAILED'
      )
    }
  })
  
  // Remove recent M4 folder handler
  createHandler(IPC_CHANNELS.REMOVE_RECENT_M4_FOLDER, async (request: { processType: 'dialogue' | 'string'; folderPath: string }) => {
    try {
      const updatedSettings = stateManager.removeRecentM4Folder(
        request.processType,
        request.folderPath
      )
      
      // Broadcast recent folder removal to all windows
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('m4-recent-folder-removed', {
          processType: request.processType,
          folderPath: request.folderPath,
          settings: updatedSettings
        })
      })
      
      console.log('Recent M4 folder removed successfully')
      return updatedSettings
    } catch (error) {
      console.error('Failed to remove recent M4 folder:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to remove recent M4 folder',
        'REMOVE_RECENT_M4_FOLDER_FAILED'
      )
    }
  })
  
  // Cleanup recent M4 folders handler
  createHandler(IPC_CHANNELS.CLEANUP_RECENT_M4_FOLDERS, async (request: { maxAge?: number }) => {
    try {
      const updatedSettings = stateManager.cleanupRecentM4Folders(request.maxAge)
      
      // Broadcast cleanup completion to all windows
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('m4-recent-folders-cleaned', updatedSettings)
      })
      
      console.log('Recent M4 folders cleaned up successfully')
      return updatedSettings
    } catch (error) {
      console.error('Failed to cleanup recent M4 folders:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to cleanup recent M4 folders',
        'CLEANUP_RECENT_M4_FOLDERS_FAILED'
      )
    }
  })
  
  // ============================================================================
  // M4 Error Reporting IPC Handlers
  // ============================================================================
  
  console.log('Registering M4 error reporting IPC handlers...')
  
  // Report M4 error handler
  createHandler(IPC_CHANNELS.REPORT_M4_ERROR, async (errorRequest: M4ErrorReportRequest) => {
    if (!m4ErrorReporter) {
      throw new IpcError('M4 error reporter not initialized', 'M4_ERROR_REPORTER_NOT_INITIALIZED')
    }
    
    try {
      const reportId = await m4ErrorReporter.reportM4Error(errorRequest)
      
      if (reportId) {
        // M4 에러가 보고되었음을 모든 윈도우에 알림
        const errorEvent: M4ErrorReportedEvent = {
          reportId,
          correlationId: errorRequest.correlationId,
          errorType: errorRequest.errorType,
          severity: errorRequest.severity,
          message: errorRequest.message,
          timestamp: errorRequest.timestamp,
          processType: errorRequest.context.processType,
          fileName: errorRequest.context.fileName,
          recoverable: errorRequest.recoverable,
          retryable: errorRequest.retryable
        }
        
        BrowserWindow.getAllWindows().forEach(window => {
          window.webContents.send(IPC_CHANNELS.M4_ERROR_REPORTED, errorEvent)
        })
        
        console.log('M4 error reported successfully:', reportId)
      }
      
      return reportId
    } catch (error) {
      console.error('Failed to report M4 error:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to report M4 error',
        'M4_ERROR_REPORT_FAILED'
      )
    }
  })
  
  // Update M4 error context handler
  createHandler(IPC_CHANNELS.M4_ERROR_CONTEXT_UPDATE, async (contextUpdate: M4ErrorContextUpdate) => {
    if (!m4ErrorReporter) {
      throw new IpcError('M4 error reporter not initialized', 'M4_ERROR_REPORTER_NOT_INITIALIZED')
    }
    
    try {
      await m4ErrorReporter.updateM4ErrorContext(
        contextUpdate.correlationId,
        contextUpdate.context
      )
      
      // 컨텍스트 업데이트를 모든 윈도우에 알림
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.M4_ERROR_CONTEXT_UPDATED, contextUpdate)
      })
      
      console.log('M4 error context updated:', contextUpdate.correlationId)
    } catch (error) {
      console.error('Failed to update M4 error context:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to update M4 error context',
        'M4_ERROR_CONTEXT_UPDATE_FAILED'
      )
    }
  })
  
  // Get M4 error stats handler
  createHandler(IPC_CHANNELS.GET_M4_ERROR_STATS, async () => {
    if (!m4ErrorReporter) {
      throw new IpcError('M4 error reporter not initialized', 'M4_ERROR_REPORTER_NOT_INITIALIZED')
    }
    
    try {
      const stats = m4ErrorReporter.getM4ErrorStats()
      console.log('M4 error stats generated successfully')
      return stats
    } catch (error) {
      console.error('Failed to generate M4 error stats:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to generate M4 error stats',
        'M4_ERROR_STATS_FAILED'
      )
    }
  })
  
  // Export M4 error logs handler
  createHandler(IPC_CHANNELS.EXPORT_M4_ERROR_LOGS, async (request: M4ErrorLogExportRequest) => {
    if (!m4ErrorReporter) {
      throw new IpcError('M4 error reporter not initialized', 'M4_ERROR_REPORTER_NOT_INITIALIZED')
    }
    
    try {
      const filePath = await m4ErrorReporter.exportM4ErrorLogs(request)
      
      // 로그 내보내기 완료를 모든 윈도우에 알림
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
          stage: 'complete',
          progress: 100,
          message: `M4 error logs exported to: ${filePath}`,
          phase: 'm4-log-export'
        })
      })
      
      console.log('M4 error logs exported successfully:', filePath)
      return filePath
    } catch (error) {
      console.error('Failed to export M4 error logs:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to export M4 error logs',
        'M4_ERROR_LOGS_EXPORT_FAILED'
      )
    }
  })
  
  // Clear M4 error logs handler
  createHandler(IPC_CHANNELS.CLEAR_M4_ERROR_LOGS, async () => {
    if (!m4ErrorReporter) {
      throw new IpcError('M4 error reporter not initialized', 'M4_ERROR_REPORTER_NOT_INITIALIZED')
    }
    
    try {
      await m4ErrorReporter.clearM4ErrorLogs()
      
      // 로그 정리 완료를 모든 윈도우에 알림
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, {
          stage: 'complete',
          progress: 100,
          message: 'M4 error logs cleared successfully',
          phase: 'm4-log-clear'
        })
      })
      
      console.log('M4 error logs cleared successfully')
    } catch (error) {
      console.error('Failed to clear M4 error logs:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to clear M4 error logs',
        'M4_ERROR_LOGS_CLEAR_FAILED'
      )
    }
  })
  
  // Development/debugging handlers - using direct ipcMain.handle
  console.log('Registering development IPC handlers...')
  
  // Reset circuit breaker handler
  ipcMain.handle('reset-circuit-breaker', async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Resetting circuit breaker...')
      updateService.resetCircuitBreaker()
      return { success: true, message: 'Circuit breaker reset successfully' }
    } catch (error) {
      console.error('Failed to reset circuit breaker:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to reset circuit breaker',
        'RESET_CIRCUIT_BREAKER_FAILED'
      )
    }
  })

  // Get circuit breaker status handler
  ipcMain.handle('get-circuit-breaker-status', async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Getting circuit breaker status...')
      return updateService.getCircuitBreakerStatus()
    } catch (error) {
      console.error('Failed to get circuit breaker status:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to get circuit breaker status',
        'GET_CIRCUIT_BREAKER_STATUS_FAILED'
      )
    }
  })

  // Force update check handler
  ipcMain.handle('force-update-check', async () => {
    if (!updateService) {
      throw new IpcError('Update service not initialized', 'UPDATE_SERVICE_NOT_INITIALIZED')
    }
    
    try {
      console.log('Force update check requested...')
      const result = await updateService.forceUpdateCheck()
      
      if (result.error) {
        throw new IpcError(result.error, 'FORCE_UPDATE_CHECK_FAILED')
      }
      
      return result.updateInfo || null
    } catch (error) {
      console.error('Force update check failed:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Force update check failed',
        'FORCE_UPDATE_CHECK_ERROR'
      )
    }
  })

  // Mock update available handler
  ipcMain.handle('mock-update-available', async () => {
    try {
      console.log('Triggering mock update available...')
      
      // Create fake update info for testing
      const mockUpdateInfo: UpdateInfo = {
        version: 'v0.1.30-test',
        releaseDate: new Date().toISOString(),
        downloadUrl: 'https://github.com/JaekyungCho2140/sebastian/releases/download/v0.1.29/Sebastian-0.1.29-Setup.exe',
        changelog: '## Test Update v0.1.30\n\n### 🧪 Development Testing\n- This is a mock update for testing the auto-update system\n- UI changes: "Sebastian +++" → "Sebastian Test"\n- This update is for development purposes only\n\n### 🔧 Technical Changes\n- Enhanced update testing capabilities\n- Improved circuit breaker handling\n- Better development workflow',
        downloadSize: 157180000 // ~157MB
      }
      
      // Trigger the update available event
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, mockUpdateInfo)
      })
      
      // Update app state
      stateManager.setState({
        isUpdateAvailable: true,
        lastUpdateCheck: Date.now()
      })
      
      console.log('Mock update available event triggered')
      return mockUpdateInfo
    } catch (error) {
      console.error('Failed to trigger mock update:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to trigger mock update',
        'MOCK_UPDATE_FAILED'
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
      console.log('NSIS installation completed:', data)
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.NSIS_INSTALLATION_COMPLETE, {
          installPath: data.installPath,
          duration: data.duration,
          exitCode: data.exitCode
        })
      })
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
      console.error('NSIS installation error:', error)
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.NSIS_INSTALLATION_FAILED, {
          error: error.error,
          exitCode: error.exitCode,
          isRetryable: error.isRetryable
        })
        
        // Send enhanced error dialog data if available
        if (error.errorDetails) {
          window.webContents.send(IPC_CHANNELS.NSIS_INSTALLATION_ERROR, {
            title: 'Installation Error',
            message: error.errorDetails.userMessage,
            errorDetails: error.errorDetails,
            recoveryOptions: error.recoveryOptions,
            supportInfo: {
              version: require('../../package.json').version,
              platform: require('os').platform(),
              supportEmail: 'support@sebastian.dev',
              documentationUrl: 'https://github.com/sebastian/docs',
              githubIssueUrl: 'https://github.com/sebastian/issues',
              troubleshootingGuideUrl: 'https://github.com/sebastian/troubleshooting'
            },
            showTechnicalDetails: true,
            allowReporting: true
          })
        }
      })
    })

    // Enhanced NSIS installation logging
    updateService.on('installationLog', (logEntry) => {
      console.log('NSIS installation log:', logEntry)
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.NSIS_INSTALLATION_LOG, logEntry)
      })
    })

    // Installation timeout events
    updateService.on('timeout', (timeoutNotification) => {
      console.log('Installation timeout:', timeoutNotification)
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.INSTALLATION_TIMEOUT, timeoutNotification)
      })
    })

    // User action required events
    updateService.on('userActionRequired', (actionRequest) => {
      console.log('User action required:', actionRequest)
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('user-action-required', actionRequest)
      })
    })
  }

  console.log('Development IPC handlers registered successfully')
  console.log('M4 settings IPC handlers registered successfully')
  
  // ============================================================================
  // Performance Profiling IPC Handlers
  // ============================================================================
  
  console.log('Registering performance profiling IPC handlers...')
  
  // Get performance statistics handler
  createHandler(IPC_CHANNELS.GET_PERFORMANCE_STATS, async () => {
    try {
      const stats = globalProfiler.getStatistics()
      console.log('Performance statistics retrieved')
      return stats
    } catch (error) {
      console.error('Failed to get performance statistics:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to get performance statistics',
        'GET_PERFORMANCE_STATS_FAILED'
      )
    }
  })
  
  // Get performance report handler
  createHandler(IPC_CHANNELS.GET_PERFORMANCE_REPORT, async () => {
    try {
      if (!globalProfiler.isEnabled()) {
        // Return empty report if profiler is not enabled
        return {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          totalDuration: 0,
          measurements: [],
          statistics: {},
          slowOperations: [],
          timeline: [],
          recommendations: ['Performance profiling is not enabled']
        } as PerformanceReport
      }
      
      // Generate report without stopping profiler
      const report = await globalProfiler.stop()
      
      // Restart profiler if it was running
      if (report) {
        globalProfiler.start('Main Process')
      }
      
      console.log('Performance report generated')
      return report || {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        totalDuration: 0,
        measurements: [],
        statistics: {},
        slowOperations: [],
        timeline: [],
        recommendations: []
      } as PerformanceReport
    } catch (error) {
      console.error('Failed to get performance report:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to get performance report',
        'GET_PERFORMANCE_REPORT_FAILED'
      )
    }
  })
  
  // Start profiling handler
  createHandler(IPC_CHANNELS.START_PROFILING, async (request: ProfilingConfig | void) => {
    try {
      if (request) {
        globalProfiler.setEnabled(request.enabled !== false)
      } else {
        globalProfiler.setEnabled(true)
      }
      globalProfiler.start('Profiling Session')
      console.log('Performance profiling started')
    } catch (error) {
      console.error('Failed to start profiling:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to start profiling',
        'START_PROFILING_FAILED'
      )
    }
  })
  
  // Stop profiling handler
  createHandler(IPC_CHANNELS.STOP_PROFILING, async () => {
    try {
      const report = await globalProfiler.stop()
      console.log('Performance profiling stopped')
      return report || {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        totalDuration: 0,
        measurements: [],
        statistics: {},
        slowOperations: [],
        timeline: [],
        recommendations: []
      } as PerformanceReport
    } catch (error) {
      console.error('Failed to stop profiling:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to stop profiling',
        'STOP_PROFILING_FAILED'
      )
    }
  })
  
  // Clear performance data handler
  createHandler(IPC_CHANNELS.CLEAR_PERFORMANCE_DATA, async () => {
    try {
      // Stop and restart profiler to clear data
      await globalProfiler.stop()
      console.log('Performance data cleared')
    } catch (error) {
      console.error('Failed to clear performance data:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to clear performance data',
        'CLEAR_PERFORMANCE_DATA_FAILED'
      )
    }
  })
  
  // Set profiling enabled handler
  createHandler(IPC_CHANNELS.SET_PROFILING_ENABLED, async (enabled: boolean) => {
    try {
      globalProfiler.setEnabled(enabled)
      console.log('Performance profiling enabled:', enabled)
    } catch (error) {
      console.error('Failed to set profiling enabled:', error)
      throw new IpcError(
        error instanceof Error ? error.message : 'Failed to set profiling enabled',
        'SET_PROFILING_ENABLED_FAILED'
      )
    }
  })
  
  console.log('Performance profiling IPC handlers registered successfully')
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

// Get M4 error reporter instance (for use by other modules)
export function getM4ErrorReporter(): M4ErrorReporter | null {
  return m4ErrorReporter
}

// Report M4 error from other modules
export async function reportM4Error(errorRequest: M4ErrorReportRequest): Promise<string | null> {
  if (!m4ErrorReporter) {
    console.error('M4 error reporter not initialized')
    return null
  }
  
  try {
    const reportId = await m4ErrorReporter.reportM4Error(errorRequest)
    
    if (reportId) {
      // M4 에러가 보고되었음을 모든 윈도우에 알림
      const errorEvent: M4ErrorReportedEvent = {
        reportId,
        correlationId: errorRequest.correlationId,
        errorType: errorRequest.errorType,
        severity: errorRequest.severity,
        message: errorRequest.message,
        timestamp: errorRequest.timestamp,
        processType: errorRequest.context.processType,
        fileName: errorRequest.context.fileName,
        recoverable: errorRequest.recoverable,
        retryable: errorRequest.retryable
      }
      
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send(IPC_CHANNELS.M4_ERROR_REPORTED, errorEvent)
      })
    }
    
    return reportId
  } catch (error) {
    console.error('Failed to report M4 error:', error)
    return null
  }
}

// Add M4 breadcrumb from other modules
export function addM4Breadcrumb(breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>): void {
  if (m4ErrorReporter) {
    m4ErrorReporter.addBreadcrumb(
      breadcrumb.category,
      breadcrumb.message,
      breadcrumb.level,
      breadcrumb.data
    )
  }
}

// Cleanup function to stop services
export async function cleanup(): Promise<void> {
  if (updateService) {
    await updateService.stop()
    updateService = null
  }
  
  // M4 error reporter cleanup
  if (m4ErrorReporter) {
    // M4 에러 리포터는 별도 정리 로직이 필요하지 않음
    // 메모리 참조만 정리
    m4ErrorReporter = null
  }
}