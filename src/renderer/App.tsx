import React, { useEffect } from 'react'
import MainContent from './components/MainContent'
import Footer from './components/Footer'
import ErrorDialog from './components/ErrorDialog'
import UpdateDialog from './components/UpdateDialog'
import UpdateProgressDialog from './components/UpdateProgressDialog'
import DevPanel from './components/DevPanel'
import { useErrorDialog, createErrorDialogData } from './hooks/useErrorDialog'
import { useUpdateManager } from './hooks/useUpdateManager'

const App: React.FC = () => {
  const { isOpen, errorData, showError, closeDialog, reportError, restartApp } = useErrorDialog()
  const updateManager = useUpdateManager()

  // 전역 에러 핸들러 설정
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorData = createErrorDialogData(
        new Error(event.message),
        'JavaScript Error',
        'An error occurred during script execution.',
        'high'
      )
      showError(errorData)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))
      
      const errorData = createErrorDialogData(
        error,
        'Promise Rejection Error',
        'An unhandled Promise rejection occurred.',
        'high'
      )
      showError(errorData)
    }

    // 전역 에러 리스너 등록
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // 컴포넌트에서 에러 다이얼로그를 사용할 수 있도록 전역 함수 등록
    window.showErrorDialog = showError
    
    // 개발 모드에서만 디버깅 함수들을 전역에 등록
    if (process.env.NODE_ENV === 'development') {
      ;(window as any).__sebastian_dev = {
        // Mock update functions
        mockUpdate: async () => {
          try {
            const result = await window.electronAPI?.mockUpdateAvailable?.()
            console.log('Mock update triggered:', result)
            return result
          } catch (error) {
            console.error('Mock update failed:', error)
            throw error
          }
        },
        
        // Circuit breaker functions
        resetCircuitBreaker: async () => {
          try {
            const result = await window.electronAPI?.resetCircuitBreaker?.()
            console.log('Circuit breaker reset:', result)
            return result
          } catch (error) {
            console.error('Circuit breaker reset failed:', error)
            throw error
          }
        },
        
        getCircuitBreakerStatus: async () => {
          try {
            const result = await window.electronAPI?.getCircuitBreakerStatus?.()
            console.log('Circuit breaker status:', result)
            return result
          } catch (error) {
            console.error('Failed to get circuit breaker status:', error)
            throw error
          }
        },
        
        // Force update check
        forceUpdateCheck: async () => {
          try {
            const result = await window.electronAPI?.forceUpdateCheck?.()
            console.log('Force update check result:', result)
            return result
          } catch (error) {
            console.error('Force update check failed:', error)
            throw error
          }
        },
        
        // Helper functions
        help: () => {
          console.log(`
🛠️ Sebastian Development Tools

Available functions:
  __sebastian_dev.mockUpdate()          - Trigger a mock update dialog
  __sebastian_dev.resetCircuitBreaker() - Reset the circuit breaker
  __sebastian_dev.getCircuitBreakerStatus() - Get current circuit breaker status
  __sebastian_dev.forceUpdateCheck()    - Force an update check
  __sebastian_dev.help()                - Show this help message

Example usage:
  await __sebastian_dev.mockUpdate()
  await __sebastian_dev.resetCircuitBreaker()
  const status = await __sebastian_dev.getCircuitBreakerStatus()
          `)
        }
      }
      
      console.log('🛠️ Sebastian development tools loaded. Type __sebastian_dev.help() for usage.')
    }

    // 메인 프로세스로부터 에러 다이얼로그 표시 요청 수신
    if (window.electronAPI?.onShowErrorDialog) {
      window.electronAPI.onShowErrorDialog(showError)
    }

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      delete window.showErrorDialog
      
      // 개발 모드 디버깅 함수들 정리
      if (process.env.NODE_ENV === 'development') {
        delete (window as any).__sebastian_dev
      }
      
      // IPC 리스너 정리
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('show-error-dialog')
      }
    }
  }, [showError])

  return (
    <div className="app-container">
      <MainContent />
      <Footer />
      
      <ErrorDialog
        isOpen={isOpen}
        errorData={errorData}
        onClose={closeDialog}
        onReport={reportError}
        onRestart={restartApp}
      />
      
      <UpdateDialog
        isOpen={updateManager.isShowingUpdateDialog}
        updateData={updateManager.updateInfo ? {
          updateInfo: updateManager.updateInfo,
          isUpdateAvailable: updateManager.isUpdateAvailable
        } : null}
        onClose={updateManager.hideUpdateDialog}
        onUpdateNow={updateManager.updateNow}
        onUpdateLater={updateManager.updateLater}
        onIgnoreUpdate={updateManager.ignoreUpdate}
      />
      
      <UpdateProgressDialog
        isOpen={updateManager.isDownloading || updateManager.isInstalling}
        progress={updateManager.downloadProgress}
        onCancel={updateManager.isDownloading ? () => {
          // TODO: Implement cancel download
        } : undefined}
        canCancel={updateManager.isDownloading && !updateManager.isInstalling}
      />
      
      {/* Development Panel - only visible in development mode */}
      <DevPanel />
    </div>
  )
}

export default App