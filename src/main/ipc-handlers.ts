import { ipcMain, dialog, BrowserWindow } from 'electron'
import { 
  IPC_CHANNELS, 
  IpcRequests, 
  IpcResponses, 
  IpcErrorResponse,
  AppState,
  UpdateInfo,
  IpcError 
} from '../shared/types'
import { getStateManager } from './state-manager'
import { UpdateService } from './services/updateService'

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

// Initialize IPC handlers
export function setupIpcHandlers(): void {
  const stateManager = getStateManager()
  
  // Initialize update service
  updateService = new UpdateService(stateManager, {
    githubRepo: 'jkcho/sebastian', // Replace with your actual GitHub repo
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

  console.log('IPC handlers initialized')
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