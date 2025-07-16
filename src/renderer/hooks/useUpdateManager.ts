import { useState, useEffect, useCallback } from 'react'
import { UpdateInfo, UpdateProgress, UpdateDialogData, IPC_CHANNELS } from '../../shared/types'

export interface UpdateManagerState {
  isUpdateAvailable: boolean
  updateInfo: UpdateInfo | null
  isCheckingForUpdates: boolean
  isDownloading: boolean
  isInstalling: boolean
  downloadProgress: UpdateProgress | null
  error: string | null
  isShowingUpdateDialog: boolean
  ignoredVersion: string | null
}

export interface UpdateManagerActions {
  checkForUpdates: () => Promise<void>
  updateNow: () => void
  updateLater: () => void
  ignoreUpdate: () => void
  hideUpdateDialog: () => void
  showUpdateDialog: () => void
  clearError: () => void
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
}

export const useUpdateManager = (): UpdateManagerState & UpdateManagerActions => {
  const [state, setState] = useState<UpdateManagerState>({
    isUpdateAvailable: false,
    updateInfo: null,
    isCheckingForUpdates: false,
    isDownloading: false,
    isInstalling: false,
    downloadProgress: null,
    error: null,
    isShowingUpdateDialog: false,
    ignoredVersion: null
  })

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isCheckingForUpdates: true, error: null }))
      
      const updateInfo = await window.electronAPI.checkForUpdates()
      
      if (updateInfo) {
        setState(prev => ({ 
          ...prev, 
          isUpdateAvailable: true, 
          updateInfo,
          isShowingUpdateDialog: updateInfo.version !== prev.ignoredVersion
        }))
      } else {
        setState(prev => ({ ...prev, isUpdateAvailable: false, updateInfo: null }))
      }
    } catch (error) {
      console.error('Failed to check for updates:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to check for updates' 
      }))
    } finally {
      setState(prev => ({ ...prev, isCheckingForUpdates: false }))
    }
  }, [])

  // Download update
  const downloadUpdate = useCallback(async () => {
    if (!state.updateInfo?.downloadUrl) return

    try {
      setState(prev => ({ ...prev, isDownloading: true, error: null }))
      await window.electronAPI.downloadUpdate(state.updateInfo)
    } catch (error) {
      console.error('Failed to download update:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to download update',
        isDownloading: false
      }))
    }
  }, [state.updateInfo])

  // Install update
  const installUpdate = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isInstalling: true, error: null }))
      await window.electronAPI.installUpdate()
    } catch (error) {
      console.error('Failed to install update:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to install update',
        isInstalling: false
      }))
    }
  }, [])

  // Update now - download and install
  const updateNow = useCallback(() => {
    setState(prev => ({ ...prev, isShowingUpdateDialog: false }))
    downloadUpdate()
  }, [downloadUpdate])

  // Update later - close dialog
  const updateLater = useCallback(() => {
    setState(prev => ({ ...prev, isShowingUpdateDialog: false }))
  }, [])

  // Ignore update - mark version as ignored
  const ignoreUpdate = useCallback(() => {
    if (state.updateInfo?.version) {
      setState(prev => ({ 
        ...prev, 
        ignoredVersion: state.updateInfo!.version,
        isShowingUpdateDialog: false,
        isUpdateAvailable: false
      }))
      
      window.electronAPI.ignoreUpdate(state.updateInfo.version)
        .catch((error: Error) => console.error('Failed to ignore update:', error))
    }
  }, [state.updateInfo?.version])

  // Dialog management
  const hideUpdateDialog = useCallback(() => {
    setState(prev => ({ ...prev, isShowingUpdateDialog: false }))
  }, [])

  const showUpdateDialog = useCallback(() => {
    setState(prev => ({ ...prev, isShowingUpdateDialog: true }))
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Listen for IPC events
  useEffect(() => {
    const handleUpdateAvailable = (updateInfo: UpdateInfo) => {
      setState(prev => ({ 
        ...prev, 
        isUpdateAvailable: true, 
        updateInfo,
        isShowingUpdateDialog: updateInfo.version !== prev.ignoredVersion
      }))
    }

    const handleUpdateProgress = (progress: UpdateProgress) => {
      setState(prev => ({ 
        ...prev, 
        downloadProgress: progress,
        isDownloading: progress.stage === 'downloading',
        isInstalling: progress.stage === 'installing'
      }))

      // Auto-install when download is complete
      if (progress.stage === 'complete' && progress.progress === 100) {
        setTimeout(() => {
          installUpdate()
        }, 1000)
      }
    }

    const handleUpdateError = (error: string) => {
      setState(prev => ({ 
        ...prev, 
        error,
        isDownloading: false,
        isInstalling: false
      }))
    }

    const handleShowUpdateDialog = (data: UpdateDialogData) => {
      setState(prev => ({ 
        ...prev, 
        isUpdateAvailable: data.isUpdateAvailable,
        updateInfo: data.updateInfo,
        isShowingUpdateDialog: data.updateInfo.version !== prev.ignoredVersion
      }))
    }

    // Register listeners
    window.electronAPI.on(IPC_CHANNELS.UPDATE_AVAILABLE, handleUpdateAvailable)
    window.electronAPI.on(IPC_CHANNELS.UPDATE_PROGRESS, handleUpdateProgress)
    window.electronAPI.on(IPC_CHANNELS.UPDATE_ERROR, handleUpdateError)
    window.electronAPI.on(IPC_CHANNELS.SHOW_UPDATE_DIALOG, handleShowUpdateDialog)

    return () => {
      // Cleanup listeners
      window.electronAPI.removeAllListeners(IPC_CHANNELS.UPDATE_AVAILABLE)
      window.electronAPI.removeAllListeners(IPC_CHANNELS.UPDATE_PROGRESS)
      window.electronAPI.removeAllListeners(IPC_CHANNELS.UPDATE_ERROR)
      window.electronAPI.removeAllListeners(IPC_CHANNELS.SHOW_UPDATE_DIALOG)
    }
  }, [installUpdate])

  return {
    ...state,
    checkForUpdates,
    updateNow,
    updateLater,
    ignoreUpdate,
    hideUpdateDialog,
    showUpdateDialog,
    clearError,
    downloadUpdate,
    installUpdate
  }
}

export default useUpdateManager