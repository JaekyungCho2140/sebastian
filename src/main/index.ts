import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { setupIpcHandlers, cleanup } from './ipc-handlers'
import { initializeStateManager } from './state-manager'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Get primary display dimensions for centering
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
  
  // Calculate center position
  const windowWidth = 640
  const windowHeight = 480
  const x = Math.round((screenWidth - windowWidth) / 2)
  const y = Math.round((screenHeight - windowHeight) / 2)

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
    mainWindow?.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
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
  // Initialize state manager first
  initializeStateManager()
  
  // Set up IPC handlers
  setupIpcHandlers()
  
  // Then create the window
  createWindow()
})

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Quit when all windows are closed
app.on('window-all-closed', async () => {
  // Cleanup services before quitting
  await cleanup()
  
  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== 'darwin') {
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
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })
})

// Handle app quit
app.on('before-quit', async () => {
  // Cleanup services before quitting
  await cleanup()
})