import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import log from 'electron-log'
import { setupIpcHandlers, cleanup } from './ipc-handlers'
import { initializeStateManager } from './state-manager'
import { LocalErrorReporter } from './services/local-error-reporter'

// Configure electron-log
log.transports.console.level = 'debug'
log.transports.file.level = 'info'
log.transports.file.maxSize = 10 * 1024 * 1024 // 10MB
log.transports.file.fileName = 'sebastian.log'

// Configure file transport settings
log.transports.file.resolvePathFn = () => {
  const userDataPath = app.getPath('userData')
  const logsDir = join(userDataPath, 'logs')
  
  // Ensure logs directory exists
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true })
  }
  
  return join(logsDir, 'sebastian.log')
}

// Set log format
log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}'
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}'

// Configure file rotation
log.transports.file.archiveLogFn = (file) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${file.path}.${timestamp}.old`
}

// Initialize logging and log startup info
const logPath = log.transports.file.getFile().path
log.info('Sebastian application starting...')
log.info(`Log file location: ${logPath}`)

const isDev = process.env.NODE_ENV === 'development'

// Initialize error reporter
const errorReporter = new LocalErrorReporter({
  reportingLevel: isDev ? 'low' : 'medium',
  maxFiles: isDev ? 50 : 100,
  maxAge: isDev ? 7 : 30, // Keep logs for shorter time in development
})

// Setup global error handlers
process.on('uncaughtException', async (error: Error) => {
  log.error('Uncaught Exception:', error)
  
  try {
    const reportId = await errorReporter.captureError(
      error,
      'main-process',
      'main',
      'critical',
      {
        sessionId: errorReporter.getSessionId(),
        customData: {
          processType: 'main',
          errorType: 'uncaughtException',
          isDev
        }
      }
    )
    
    if (reportId) {
      log.info(`Error report generated: ${reportId}`)
    }
  } catch (reportError) {
    log.error('Failed to generate error report:', reportError)
  }
  
  // Exit gracefully in production, continue in development
  if (!isDev) {
    process.exit(1)
  }
})

process.on('unhandledRejection', async (reason: any, promise: Promise<any>) => {
  const error = reason instanceof Error ? reason : new Error(String(reason))
  log.error('Unhandled Rejection at:', promise, 'reason:', error)
  
  try {
    const reportId = await errorReporter.captureError(
      error,
      'promise-rejection',
      'main',
      'high',
      {
        sessionId: errorReporter.getSessionId(),
        customData: {
          processType: 'main',
          errorType: 'unhandledRejection',
          promise: promise.toString(),
          isDev
        }
      }
    )
    
    if (reportId) {
      log.info(`Error report generated: ${reportId}`)
    }
  } catch (reportError) {
    log.error('Failed to generate error report:', reportError)
  }
})

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  log.info('Creating main window...')
  // Get primary display dimensions for centering
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
  
  // Calculate center position
  const windowWidth = 640
  const windowHeight = 480
  const x = Math.round((screenWidth - windowWidth) / 2)
  const y = Math.round((screenHeight - windowHeight) / 2)
  
  log.debug(`Window position: ${x}x${y}, size: ${windowWidth}x${windowHeight}`)

  // Create the browser window with fixed dimensions
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    resizable: false,
    maximizable: false,
    minimizable: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  // Load the renderer
  if (isDev) {
    mainWindow.loadURL('http://localhost:3002')
    // Open DevTools but suppress autofill warnings
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    log.info('Main window ready, showing window')
    mainWindow?.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    log.info('Main window closed')
    mainWindow = null
  })

  // Prevent window from being maximized
  mainWindow.on('maximize', () => {
    mainWindow?.unmaximize()
  })

  // Handle minimize/restore states
  mainWindow.on('minimize', () => {
    // Window minimized
  })

  mainWindow.on('restore', () => {
    // Window restored from minimized state
  })
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  log.info('Electron app ready, initializing components...')
  
  // Initialize state manager first
  initializeStateManager()
  log.info('State manager initialized')
  
  // Set up IPC handlers
  setupIpcHandlers()
  log.info('IPC handlers setup complete')
  
  // Then create the window
  createWindow()
  log.info('Main window created')
})

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  log.warn('Another instance is already running, quitting...')
  app.quit()
} else {
  app.on('second-instance', () => {
    log.info('Second instance detected, focusing main window')
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Quit when all windows are closed
app.on('window-all-closed', async () => {
  log.info('All windows closed, cleaning up...')
  // Cleanup services before quitting
  await cleanup()
  
  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== 'darwin') {
    log.info('Quitting application')
    app.quit()
  }
})

// On macOS, re-create window when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })
})

// Handle app quit
app.on('before-quit', async () => {
  // Cleanup services before quitting
  await cleanup()
})